"use server";

import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isReader } from "@/lib/access";
import { CONTACT_EMAILS } from "@/lib/legal";
import { MAX_DIRECT_REFERRALS, GENDERS } from "@/lib/constants";
import {
  getClientIp,
  checkChangePasswordRateLimit,
  recordFailedChangePasswordAttempt,
  checkDeleteAccountRateLimit,
  recordFailedDeleteAccountAttempt,
} from "@/lib/rateLimit";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type BecomeEditorState = { error?: string; success?: boolean };

export async function becomeEditorAction(
  _prevState: BecomeEditorState | undefined,
  formData: FormData
): Promise<BecomeEditorState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }
  // session.user.role comes from the JWT and can be stale after a DB role
  // change (see CLAUDE.md JWT role staleness audit) — re-verify against the
  // current DB record, same as isAdmin()/hasStaffAccess() elsewhere.
  if (!(await isReader(session.user.id))) {
    return { error: "To konto nie może dołączyć do zespołu redakcyjnego." };
  }

  const referralCode = String(formData.get("referralCode") ?? "").trim();

  if (!referralCode) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "EDITOR", sponsorId: null },
    });
    revalidatePath("/panel");
    return { success: true };
  }

  const sponsor = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true, role: true, deletedAt: true },
  });
  // A deleted (ETAP 12.4) account keeps its role and referralCode (only
  // identifying data is scrubbed), so it must be rejected explicitly here —
  // otherwise its code would still work as a live sponsor.
  if (!sponsor || sponsor.deletedAt || (sponsor.role !== "EDITOR" && sponsor.role !== "ADMIN")) {
    return { error: "Nieprawidłowy kod polecający." };
  }

  try {
    // Locks the sponsor's row for the duration of the transaction, so two
    // people joining under the same referral code at the same moment can't
    // both read "4/5 slots used" and both get accepted, landing at 6. The
    // same lock serializes against deleteAccountAction (which locks the
    // account's own row first), so the deletedAt re-check below sees a
    // concurrent deletion that committed while this request was waiting.
    await prisma.$transaction(async (tx) => {
      const lockedSponsor = (
        await tx.$queryRaw<{ id: string; deletedAt: Date | null }[]>`SELECT id, deletedAt FROM User WHERE id = ${sponsor.id} FOR UPDATE`
      )[0];
      if (!lockedSponsor || lockedSponsor.deletedAt) {
        throw new Error("SPONSOR_INVALID");
      }
      if (sponsor.role === "EDITOR") {
        const directCount = await tx.user.count({ where: { sponsorId: sponsor.id } });
        if (directCount >= MAX_DIRECT_REFERRALS) {
          throw new Error("SPONSOR_FULL");
        }
      }
      await tx.user.update({
        where: { id: session.user.id },
        data: { role: "EDITOR", sponsorId: sponsor.id },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SPONSOR_FULL") {
      return { error: "Ten redaktor osiągnął już limit 5 osób w swoim zespole." };
    }
    if (err instanceof Error && err.message === "SPONSOR_INVALID") {
      return { error: "Nieprawidłowy kod polecający." };
    }
    throw err;
  }

  revalidatePath("/panel");
  return { success: true };
}

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateProfileAction(
  _prevState: UpdateProfileState | undefined,
  formData: FormData
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const city = String(formData.get("city") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();

  if (gender && !GENDERS.includes(gender as (typeof GENDERS)[number])) {
    return { error: "Nieprawidłowa płeć." };
  }

  let age: number | null = null;
  if (ageRaw) {
    age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      return { error: "Podaj poprawny wiek (13–120)." };
    }
  }

  let avatarUrl: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: "Zdjęcie profilowe przekracza limit 5 MB." };
    }
    const ext = ALLOWED_AVATAR_TYPES[avatarFile.type];
    if (!ext) {
      return { error: "Obsługiwane formaty zdjęcia: JPG, PNG, WEBP." };
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filename = `avatar-${randomUUID()}${ext}`;
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);
    avatarUrl = `/uploads/${filename}`;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { city: city || null, gender: gender || null, age, ...(avatarUrl ? { avatarUrl } : {}) },
  });

  revalidatePath("/panel");
  revalidatePath(`/profil/${session.user.id}`);
  return { success: true };
}

export type ChangePasswordState = { error?: string; success?: boolean };

// Length only — same convention as registration/reset (see rejestracja/actions.ts,
// reset-hasla/actions.ts). No new complexity rules invented here.
const MIN_PASSWORD_LENGTH = 10;

export async function changePasswordAction(
  _prevState: ChangePasswordState | undefined,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");

  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    return { error: "Wypełnij wszystkie pola." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Nowe hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.` };
  }
  if (newPassword !== newPasswordConfirm) {
    return { error: "Nowe hasła nie są identyczne." };
  }

  // Ownership comes exclusively from session.user.id — never from any
  // client-supplied field — and email/passwordHash are re-read fresh from
  // the DB rather than trusted from the (possibly stale) JWT/session.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) {
    return { error: "Musisz być zalogowany." };
  }

  // Keyed by the account's own email (not IP) — see rateLimit.ts's module
  // doc comment for why: this action always requires an existing session,
  // so the threat is a hijacked/shared session guessing the CURRENT
  // password, not anonymous multi-IP abuse.
  if (!(await checkChangePasswordRateLimit(user.email))) {
    return { error: "Zbyt wiele prób. Spróbuj ponownie za kilka minut." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const ip = await getClientIp();
    await recordFailedChangePasswordAttempt(ip, user.email);
    return { error: "Obecne hasło jest nieprawidłowe." };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  // Single statement — atomic by itself, no $transaction needed (no second
  // table involved, unlike resetPasswordWithToken). Setting passwordHash and
  // passwordChangedAt together here is what drives the EXISTING JWT
  // invalidation mechanism in auth.ts's jwt callback — no second mechanism
  // is created or needed.
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() },
  });

  return { success: true };
}

export type DeleteAccountState = { error?: string; success?: boolean };

// Must match exactly (case-sensitive) — a second, independent confirmation
// gate alongside the password, deliberately not tied to any password policy.
const DELETE_ACCOUNT_CONFIRM_WORD = "USUŃ";

// The exact shape updateProfileAction writes for avatars (see above).
const AVATAR_URL_PATTERN = /^\/uploads\/avatar-[A-Za-z0-9-]+\.(jpg|png|webp)$/;

export async function deleteAccountAction(
  _prevState: DeleteAccountState | undefined,
  formData: FormData
): Promise<DeleteAccountState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  // Deliberately NOT trimmed/case-folded: the confirmation must match
  // exactly ("USUŃ"), so "USUŃ " (trailing space), "usuń", "Usuń", "USUN" are
  // all rejected.
  const confirmWord = String(formData.get("confirmWord") ?? "");

  if (!currentPassword) {
    return { error: "Podaj obecne hasło." };
  }
  if (confirmWord !== DELETE_ACCOUNT_CONFIRM_WORD) {
    return { error: `Wpisz dokładnie „${DELETE_ACCOUNT_CONFIRM_WORD}”, aby potwierdzić.` };
  }

  // Ownership comes exclusively from session.user.id — never from any
  // client-supplied field. Re-read fresh from the DB (not JWT/session cache),
  // same convention as changePasswordAction above.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true, role: true, avatarUrl: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    return { error: "Musisz być zalogowany." };
  }

  // Keyed by the account's own email, same reasoning as
  // checkChangePasswordRateLimit — this action always requires an existing
  // session, so the threat is a hijacked/shared session brute-forcing the
  // current password, not anonymous multi-IP abuse. A separate, smaller
  // limit than CHANGE_PASSWORD: this is the more consequential operation.
  if (!(await checkDeleteAccountRateLimit(user.email))) {
    return { error: "Zbyt wiele prób. Spróbuj ponownie za kilka minut." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const ip = await getClientIp();
    await recordFailedDeleteAccountAttempt(ip, user.email);
    return { error: "Obecne hasło jest nieprawidłowe." };
  }

  // Computed once, outside the transaction — bcrypt's cost factor makes this
  // the most expensive step here, and it doesn't depend on anything read
  // inside the transaction, so there's no reason to hold row locks while it
  // runs. A throwaway, unknowable hash permanently blocks login on this
  // account regardless of the deletedAt check elsewhere (defense in depth).
  const anonymizedHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  try {
    await prisma.$transaction(async (tx) => {
      // LOCK ORDER MATTERS. For an ADMIN the ADMIN rows are locked FIRST, in a
      // fixed order (ORDER BY id), before this account's own row. Locking the
      // own row first and the whole ADMIN set second made two admins deleting
      // at the same instant take the same locks in opposite orders — a
      // textbook lock-order inversion that MySQL resolved with a deadlock
      // (error 1213) and an unhandled 500 for the loser. With one global
      // order the second transaction simply waits for the first to commit and
      // then sees the up-to-date admin set, so two concurrent "last admin"
      // deletions can never both proceed (which would leave zero admins).
      let admins: { id: string }[] | null = null;
      if (user.role === "ADMIN") {
        admins = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM User WHERE role = 'ADMIN' AND deletedAt IS NULL ORDER BY id FOR UPDATE
        `;
      }

      // Locks this user's own row for the duration of the transaction so a
      // concurrent request against the same account (e.g. a replayed/second
      // submit) can't interleave with this one — mirrors becomeEditorAction's
      // sponsor-row lock. Also re-reads role/deletedAt fresh under the lock,
      // guarding against a race with something else changing them between
      // the read above and here.
      const rows = await tx.$queryRaw<{ id: string; role: string; deletedAt: Date | null }[]>`
        SELECT id, role, deletedAt FROM User WHERE id = ${user.id} FOR UPDATE
      `;
      const lockedUser = rows[0];
      if (!lockedUser || lockedUser.deletedAt) {
        throw new Error("ALREADY_DELETED");
      }

      if (lockedUser.role === "ADMIN") {
        // Normally already locked above. Only reached with admins === null if
        // the role became ADMIN between the pre-read and the own-row lock (a
        // promotion racing this request) — lock the set now; any deadlock in
        // that vanishingly rare case is handled by the catch block below.
        admins ??= await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM User WHERE role = 'ADMIN' AND deletedAt IS NULL ORDER BY id FOR UPDATE
        `;
        if (admins.length <= 1) {
          throw new Error("LAST_ADMIN");
        }
      }

      // An active subscription means Stripe will keep billing this account
      // after it's anonymized, with no way left for the (now logged-out)
      // user to see or manage it — canceling the Stripe side is a separate,
      // not-yet-built process (ETAP 12.3 finding), so this is a hard block
      // rather than something this stage can safely work around.
      const subscription = await tx.subscription.findUnique({
        where: { userId: user.id },
        select: { status: true },
      });
      if (subscription?.status === "ACTIVE") {
        throw new Error("ACTIVE_SUBSCRIPTION");
      }

      // Friendships (both directions, any status) and this account's own
      // notifications/reset tokens are deleted outright — nothing else has a
      // foreign key to any of these three tables' rows, so this is safe.
      // Everything else (Article, Comment, Reaction, Share, Witness,
      // ArticleAccess, Purchase, Subscription, Commission, AdPurchase,
      // AdRevenueShare) is left completely untouched, per the approved
      // ETAP 12.3 design — Wariant C for content, full retention for
      // financial history.
      await tx.friendship.deleteMany({
        where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
      });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });

      await tx.user.update({
        where: { id: user.id },
        data: {
          // deleted-${id}@... keeps `email` unique without a lookup (id is
          // already unique) and can never collide with a real address — the
          // reserved .invalid TLD (RFC 2606) is guaranteed unroutable.
          email: `deleted-${user.id}@wexeye.invalid`,
          name: "Usunięty użytkownik",
          passwordHash: anonymizedHash,
          // Same field ChangePasswordAction uses to invalidate JWTs — every
          // existing session for this account is rejected on its next read
          // via the SAME jwt-callback mechanism, no parallel session system.
          passwordChangedAt: new Date(),
          avatarUrl: null,
          city: null,
          gender: null,
          age: null,
          // The actual, permanent source of truth for "this account is
          // deleted" — checked independently in auth.ts/access.ts, not
          // inferred from the anonymized email or name.
          deletedAt: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LAST_ADMIN") {
      return { error: "Nie możesz usunąć konta — jesteś jedynym administratorem." };
    }
    if (err instanceof Error && err.message === "ACTIVE_SUBSCRIPTION") {
      return {
        error: `Masz aktywną subskrypcję. Napisz na ${CONTACT_EMAILS.general} (lub użyj strony /kontakt), aby ją anulować przed usunięciem konta.`,
      };
    }
    if (err instanceof Error && err.message === "ALREADY_DELETED") {
      return { error: "Musisz być zalogowany." };
    }
    // A lock-wait deadlock/serialization failure (MySQL 1213 surfaces from
    // $queryRaw as P2010 with meta.code "1213"; Prisma's own transaction
    // conflict is P2034) means InnoDB rolled THIS transaction back, so
    // nothing was changed — report a retryable condition instead of a 500.
    const e = err as { code?: string; meta?: { code?: string } } | null;
    if (e && (e.code === "P2034" || (e.code === "P2010" && e.meta?.code === "1213"))) {
      return { error: "Nie udało się teraz dokończyć operacji. Spróbuj ponownie za chwilę." };
    }
    throw err;
  }

  // Avatar cleanup happens ONLY after the transaction above has committed
  // successfully, and is best-effort: a failure to delete the file must
  // never be treated as if the account deletion itself failed (the DB state
  // is already correct and final at this point), and must never roll back
  // or contradict it. An orphaned file here is the same harmless, known
  // pattern as F-12-06 (avatar replacement doesn't delete the old file).
  // Only a file this app itself wrote as an avatar may ever be removed here:
  // updateProfileAction always stores "/uploads/avatar-<uuid>.<ext>", so any
  // other shape (a path with "..", a bare article/ad media name, an external
  // URL) is never touched — a corrupted/tampered avatarUrl must not be able
  // to delete article media, ad media, or anything outside uploads. The
  // resolved path is re-checked to sit directly in the uploads directory,
  // and the file is kept if another user row still points at it.
  if (user.avatarUrl && AVATAR_URL_PATTERN.test(user.avatarUrl)) {
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const filePath = path.resolve(uploadsDir, path.basename(user.avatarUrl));
    if (path.dirname(filePath) === uploadsDir) {
      try {
        if ((await prisma.user.count({ where: { avatarUrl: user.avatarUrl } })) === 0) {
          await unlink(filePath);
        }
      } catch {
        // Non-fatal — see comment above. Deliberately no error log containing
        // a file path derived from user data.
      }
    }
  }

  // Clears the session cookie immediately so the UI reflects "logged out"
  // right away, instead of waiting for the next request to hit the jwt
  // callback's own (already sufficient) deletedAt/passwordChangedAt checks.
  // redirect: false so this Server Action can still return state for the
  // client to show a final confirmation message before navigating away.
  await signOut({ redirect: false });

  return { success: true };
}
