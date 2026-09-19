"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { isAdmin } from "@/lib/access";
import { isValidEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import {
  quarantineArticleMedia,
  reconcileTakenDownMedia,
  checkQuarantineHealth,
  describeQuarantine,
  quarantineSeverity,
  type QuarantineResult,
  type QuarantineSeverity,
} from "@/lib/mediaQuarantine";
import { QUARANTINE_BATCH_SIZE } from "@/lib/constants";

async function requireAdmin() {
  const session = await auth();
  // session.user.role comes from the JWT and can be stale after a DB role
  // change (see CLAUDE.md JWT role staleness audit) — re-verify against the
  // current DB record before allowing any admin action.
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    throw new Error("Brak uprawnień.");
  }
  return session;
}

export type FormState = { error?: string; success?: boolean };

// Result of an emergency takedown / hide (ETAP 13.3C). `message` is shown to
// the acting admin only; nothing here is ever rendered publicly.
// `severity` is set by the media-quarantine part of an operation (13.3C.2): the
// DB takedown itself always succeeds (fail-safe), but the file move may not.
export type TakedownState = { error?: string; success?: boolean; message?: string; severity?: QuarantineSeverity };

const TAKEDOWN_REASON_MIN = 3;
const TAKEDOWN_REASON_MAX = 1000;

/**
 * Fresh DB check of ADMIN (never the JWT role — see requireAdmin above), but
 * returning null instead of throwing so a denied caller gets a normal
 * "Brak uprawnień." result. The acting admin's id ALWAYS comes from the
 * session here, never from any argument or form field.
 */
async function currentAdminId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAdmin(userId))) return null;
  return userId;
}

function parseTakedownReason(raw: unknown): { reason: string } | { error: string } {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (reason.length < TAKEDOWN_REASON_MIN) {
    return { error: `Podaj powód (co najmniej ${TAKEDOWN_REASON_MIN} znaki).` };
  }
  if (reason.length > TAKEDOWN_REASON_MAX) {
    return { error: `Powód jest za długi (maksymalnie ${TAKEDOWN_REASON_MAX} znaków).` };
  }
  return { reason };
}

async function runQuarantine(articleId: string): Promise<QuarantineResult | null> {
  try {
    return await quarantineArticleMedia(articleId);
  } catch (err) {
    console.error("[takedown] quarantine run failed", articleId, err instanceof Error ? err.name : "error");
    return null;
  }
}

export async function createEditorAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "EDITOR");

  if (!name || !email || !password) {
    return { error: "Imię, e-mail i hasło są wymagane." };
  }
  if (!isValidEmail(email)) {
    return { error: "Podaj prawidłowy adres e-mail." };
  }
  if (password.length < 10) {
    return { error: "Hasło musi mieć co najmniej 10 znaków." };
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return { error: "Nieprawidłowa rola." };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "Użytkownik z tym e-mailem już istnieje." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role } });

  revalidatePath("/panel/admin");
  return { success: true };
}

export async function moderateArticleAction(
  articleId: string,
  approve: boolean,
  note?: string
): Promise<FormState> {
  await requireAdmin();

  // Neither this app nor any admin action ever deletes an Article, so there
  // is no real window for the row to disappear between this check and the
  // update below — this pre-check alone is enough to keep a bad/stale ID
  // (typed by hand, or a tampered direct call to this action) from
  // surfacing as an unhandled Prisma P2025 (500) instead of a normal result.
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, authorId: true, title: true, status: true },
  });
  if (!article) {
    return { error: "Artykuł nie istnieje." };
  }
  // ETAP 13.3C: a takedown must not be silently undone (and its reviewNote
  // semantics must not be mixed in) by the approve/reject flow. There is no
  // restore flow yet; a taken-down article stays taken down.
  if (article.status === "TAKEN_DOWN") {
    return { error: "Artykuł jest ukryty awaryjnie — nie można go zatwierdzić ani odrzucić." };
  }

  const moderated = await prisma.$transaction(async (tx) => {
    // Conditional on "not taken down": an emergency takedown committed between
    // the pre-check above and this write must win, never be overwritten.
    const updated = await tx.article.updateMany({
      where: { id: articleId, status: { not: "TAKEN_DOWN" } },
      data: approve
        ? { status: "PUBLISHED", publishedAt: new Date(), reviewNote: null }
        : { status: "REJECTED", reviewNote: note ?? null },
    });
    if (updated.count === 0) return false;

    await createNotification(
      {
        userId: article.authorId,
        type: "ARTICLE_MODERATED",
        title: approve ? "Artykuł zatwierdzony" : "Artykuł odrzucony",
        message: approve
          ? `Twój artykuł „${article.title}” został zatwierdzony i opublikowany.`
          : `Twój artykuł „${article.title}” został odrzucony.`,
        // REJECTED articles aren't publicly viewable (see /artykul/[id]/page.tsx),
        // so only an approved article can link straight to its own page.
        link: approve ? `/artykul/${articleId}` : "/panel/dodaj",
      },
      tx,
    );
    return true;
  });
  if (!moderated) {
    return { error: "Artykuł jest ukryty awaryjnie — nie można go zatwierdzić ani odrzucić." };
  }

  revalidatePath("/panel/admin");
  revalidatePath("/");
  return { success: true };
}

export async function addPaymentAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return { error: "Podaj opis i poprawną kwotę." };
  }

  await prisma.payment.create({
    data: { description, amountCents: Math.round(amount * 100) },
  });

  revalidatePath("/panel/admin");
  return { success: true };
}

export async function markPaymentPaidAction(paymentId: string): Promise<FormState> {
  await requireAdmin();

  // Same reasoning as moderateArticleAction above: Payment rows are never
  // deleted anywhere in this app, so this pre-check is sufficient to turn a
  // bad/nonexistent ID into a normal result instead of an unhandled P2025.
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true } });
  if (!payment) {
    return { error: "Płatność nie istnieje." };
  }

  await prisma.payment.update({ where: { id: paymentId }, data: { status: "PAID" } });
  revalidatePath("/panel/admin");
  return { success: true };
}

/**
 * ETAP 13.3C — ADMIN-only emergency takedown of an article.
 *
 * VISIBILITY takedown, not a delete: the row, its Media rows, purchases,
 * access grants, commissions and author are all kept. Order (deliberate):
 *   1. short DB transaction: status -> TAKEN_DOWN (+ reason/time/actor/previous
 *      status, + neutral author notification). From this commit on the
 *      article is out of every public listing and its page is 404.
 *   2. AFTER the commit, outside any transaction: move the article's local
 *      files out of public/uploads (see lib/mediaQuarantine.ts) and mark each
 *      Media row as quarantined.
 * A crash or file error after step 1 leaves the article hidden with some
 * media not yet quarantined — visible to the admin as "media bez kwarantanny"
 * and healed by simply running this action again (idempotent).
 */
export async function emergencyTakedownArticleAction(
  articleId: string,
  _prevState: TakedownState | undefined,
  formData: FormData
): Promise<TakedownState> {
  const adminId = await currentAdminId();
  if (!adminId) return { error: "Brak uprawnień." };

  if (typeof articleId !== "string" || !articleId || articleId.length > 191) {
    return { error: "Artykuł nie istnieje." };
  }
  const parsed = parseTakedownReason(formData?.get("reason"));
  if ("error" in parsed) return { error: parsed.error };

  let outcome: "DONE" | "ALREADY" | "NOT_FOUND";
  try {
    outcome = await prisma.$transaction(async (tx) => {
      const article = await tx.article.findUnique({
        where: { id: articleId },
        select: { id: true, status: true, authorId: true, title: true },
      });
      if (!article) return "NOT_FOUND" as const;
      if (article.status === "TAKEN_DOWN") return "ALREADY" as const;

      // Conditional on the status we just read: if a concurrent takedown got
      // there first this updates nothing and we report "already".
      const updated = await tx.article.updateMany({
        where: { id: articleId, status: article.status },
        data: {
          status: "TAKEN_DOWN",
          takedownAt: new Date(),
          takedownReason: parsed.reason,
          takedownById: adminId,
          takedownPreviousStatus: article.status,
        },
      });
      if (updated.count === 0) return "ALREADY" as const;

      const author = await tx.user.findUnique({ where: { id: article.authorId }, select: { deletedAt: true } });
      if (author && !author.deletedAt) {
        await createNotification(
          {
            userId: article.authorId,
            type: "ARTICLE_MODERATED",
            title: "Treść ograniczona",
            message: `Twoja publikacja „${article.title}” została ograniczona przez administrację.`,
            link: "/panel/dodaj",
          },
          tx,
        );
      }
      return "DONE" as const;
    });
  } catch (err) {
    console.error("[takedown] article transaction failed", err instanceof Error ? err.name : "error");
    return { error: "Nie udało się ukryć artykułu. Spróbuj ponownie." };
  }

  if (outcome === "NOT_FOUND") return { error: "Artykuł nie istnieje." };

  // Also on "ALREADY": a previous run may have been interrupted mid-quarantine.
  // The takedown above is ALREADY committed and is never rolled back because of
  // a filesystem problem — a broken quarantine only shows up here (and in the
  // admin panel) as a CRITICAL result to be retried/repaired.
  const quarantineResult = await runQuarantine(articleId);
  const quarantine = describeQuarantine(quarantineResult);
  const severity: QuarantineSeverity = quarantineResult ? quarantineSeverity(quarantineResult) : "CRITICAL";

  revalidatePath("/");
  revalidatePath("/mapa");
  revalidatePath("/eksploruj");
  revalidatePath("/szukaj");
  // Not revalidating /artykul/<id> on purpose: that page is dynamic (already
  // 404 from the next request on), and re-rendering it here would replace the
  // admin's result message with a 404 screen.
  revalidatePath("/panel/admin");

  const head = outcome === "DONE" ? "Artykuł został ukryty awaryjnie." : "Artykuł był już ukryty.";
  return { success: true, message: `${head} ${quarantine}`, severity };
}

/**
 * Re-runs the media quarantine for an already taken-down article (after a
 * failed/partial move). Takes no reason: the stored takedown data is untouched.
 */
export async function retryArticleQuarantineAction(
  articleId: string,
  // Only here so the action fits <form action> via useActionState(prev, formData).
  /* eslint-disable @typescript-eslint/no-unused-vars */
  _prevState?: TakedownState,
  _formData?: FormData
  /* eslint-enable @typescript-eslint/no-unused-vars */
): Promise<TakedownState> {
  const adminId = await currentAdminId();
  if (!adminId) return { error: "Brak uprawnień." };
  if (typeof articleId !== "string" || !articleId || articleId.length > 191) {
    return { error: "Artykuł nie istnieje." };
  }
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article) return { error: "Artykuł nie istnieje." };
  // Only ever quarantines media of an article that is already taken down.
  if (article.status !== "TAKEN_DOWN") return { error: "Artykuł nie jest ukryty awaryjnie." };

  const quarantineResult = await runQuarantine(articleId);
  revalidatePath("/panel/admin");
  return {
    success: true,
    message: describeQuarantine(quarantineResult),
    severity: quarantineResult ? quarantineSeverity(quarantineResult) : "CRITICAL",
  };
}

export type QuarantineActionState = TakedownState & { nextCursor?: string | null };

/**
 * ETAP 13.3C.2 — ADMIN-only "check and repair quarantine". Runs the full
 * preflight and one BOUNDED reconciliation batch over the media of TAKEN_DOWN
 * articles (the DB is the source of truth; nothing else on disk is touched).
 * Idempotent and safe to run repeatedly or concurrently. A `cursor` from the
 * previous result continues with the next batch.
 */
export async function reconcileQuarantineAction(
  _prevState: QuarantineActionState | undefined,
  formData: FormData
): Promise<QuarantineActionState> {
  const adminId = await currentAdminId();
  if (!adminId) return { error: "Brak uprawnień." };

  const rawCursor = formData?.get("cursor");
  const cursor = typeof rawCursor === "string" && rawCursor.length > 0 && rawCursor.length <= 191 ? rawCursor : null;

  let outcome: { health: Awaited<ReturnType<typeof checkQuarantineHealth>>; result: QuarantineResult };
  try {
    const health = await checkQuarantineHealth();
    const result = await reconcileTakenDownMedia({ limit: QUARANTINE_BATCH_SIZE, afterId: cursor });
    outcome = { health, result };
  } catch (err) {
    console.error("[quarantine] reconcile action failed", err instanceof Error ? err.name : "error");
    return { success: true, severity: "CRITICAL", message: "Nie udało się wykonać sprawdzenia kwarantanny — ponów operację." };
  }
  const { health, result } = outcome;

  revalidatePath("/panel/admin");
  const severity = quarantineSeverity(result);
  const healthPart = health.status === "OK" ? "Kwarantanna: OK." : `Kwarantanna: ${health.status === "WARNING" ? "OSTRZEŻENIE" : "BŁĄD"} (${health.code}${health.detail ? `, ${health.detail}` : ""}).`;
  const batch = `Sprawdzono mediów: ${result.checked}${result.hasMore ? " (jest więcej — uruchom ponownie, aby sprawdzić kolejną partię)" : ""}.`;
  return {
    success: true,
    severity: health.status === "ERROR" && severity === "OK" ? "ERROR" : severity,
    message: `${healthPart} ${batch} ${describeQuarantine(result)}`,
    nextCursor: result.nextCursor,
  };
}

/**
 * ETAP 13.3C — ADMIN-only emergency hide of a comment. The row (body, author,
 * article) is kept; only hiddenAt/hiddenReason/hiddenById are set, and every
 * public read filters on hiddenAt IS NULL.
 */
export async function emergencyHideCommentAction(
  commentId: string,
  _prevState: TakedownState | undefined,
  formData: FormData
): Promise<TakedownState> {
  const adminId = await currentAdminId();
  if (!adminId) return { error: "Brak uprawnień." };

  if (typeof commentId !== "string" || !commentId || commentId.length > 191) {
    return { error: "Komentarz nie istnieje." };
  }
  const parsed = parseTakedownReason(formData?.get("reason"));
  if ("error" in parsed) return { error: parsed.error };

  let articleId: string | null = null;
  let outcome: "DONE" | "ALREADY" | "NOT_FOUND";
  try {
    outcome = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true, articleId: true, hiddenAt: true },
      });
      if (!comment) return "NOT_FOUND" as const;
      articleId = comment.articleId;
      if (comment.hiddenAt) return "ALREADY" as const;

      const updated = await tx.comment.updateMany({
        where: { id: commentId, hiddenAt: null },
        data: { hiddenAt: new Date(), hiddenReason: parsed.reason, hiddenById: adminId },
      });
      if (updated.count === 0) return "ALREADY" as const;

      const author = await tx.user.findUnique({ where: { id: comment.authorId }, select: { deletedAt: true } });
      if (author && !author.deletedAt) {
        await createNotification(
          {
            userId: comment.authorId,
            type: "ARTICLE_MODERATED",
            title: "Treść ograniczona",
            message: "Twój komentarz został ograniczony przez administrację.",
          },
          tx,
        );
      }
      return "DONE" as const;
    });
  } catch (err) {
    console.error("[takedown] comment transaction failed", err instanceof Error ? err.name : "error");
    return { error: "Nie udało się ukryć komentarza. Spróbuj ponownie." };
  }

  if (outcome === "NOT_FOUND") return { error: "Komentarz nie istnieje." };

  if (articleId) revalidatePath(`/artykul/${articleId}`);
  return {
    success: true,
    message: outcome === "DONE" ? "Komentarz został ukryty awaryjnie." : "Komentarz był już ukryty.",
  };
}
