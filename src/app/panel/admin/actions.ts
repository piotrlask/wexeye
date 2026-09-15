"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { isAdmin } from "@/lib/access";
import { isValidEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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
    select: { id: true, authorId: true, title: true },
  });
  if (!article) {
    return { error: "Artykuł nie istnieje." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.article.update({
      where: { id: articleId },
      data: approve
        ? { status: "PUBLISHED", publishedAt: new Date(), reviewNote: null }
        : { status: "REJECTED", reviewNote: note ?? null },
    });

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
  });

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
