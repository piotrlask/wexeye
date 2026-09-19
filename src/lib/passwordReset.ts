import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateRawToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Invalidates every still-usable token this user already has, then issues a
 * new one — guarantees only the most recently requested link can ever work.
 * Returns the RAW token; only this return value (used to build the email
 * link) ever holds the plaintext token. Nothing here persists or logs it.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return rawToken;
}

export type ValidatedPasswordResetToken = { userId: string };

/**
 * Cheap, read-only pre-check (exists, unused, unexpired, owning user still
 * exists) — used only to short-circuit obviously-bad tokens before paying
 * for bcrypt. NOT the security boundary: resetPasswordWithToken() re-checks
 * every one of these conditions atomically at write time, since a token
 * could be consumed by a concurrent request in between.
 */
export async function validatePasswordResetToken(rawToken: string): Promise<ValidatedPasswordResetToken | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, usedAt: true, expiresAt: true, user: { select: { id: true, deletedAt: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user || record.user.deletedAt) {
    return null;
  }
  return { userId: record.userId };
}

export type ResetPasswordResult = "success" | "invalid";

/**
 * The actual security boundary. Atomically claims the token (a conditional
 * UPDATE that only matches an unused, unexpired row) and updates the user's
 * password in the same transaction — so two concurrent requests for the same
 * token can never both succeed: the UPDATE takes a row lock, so the second
 * transaction's claim always sees the first one's committed `usedAt` and
 * matches zero rows, regardless of what either request read earlier. Under
 * real contention the losing side can also fail at the transaction-engine
 * level instead (e.g. Prisma P2028, "unable to start a transaction in the
 * given time") rather than cleanly reading zero rows — treated identically
 * as "invalid" here, since the safe default on ANY error is to assume the
 * reset did NOT succeed, never to assume it did.
 */
export async function resetPasswordWithToken(rawToken: string, newPasswordHash: string): Promise<ResetPasswordResult> {
  const tokenHash = hashToken(rawToken);

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) return "invalid";

      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { userId: true },
      });
      if (!record) return "invalid";

      // A deleted (ETAP 12.4) account can never be revived/modified through a
      // reset token, even a stale one issued before deletion.
      const user = await tx.user.findUnique({ where: { id: record.userId }, select: { id: true, deletedAt: true } });
      if (!user || user.deletedAt) return "invalid";

      // passwordChangedAt in the SAME write as passwordHash — an active JWT
      // issued before this moment is rejected on its next read (see
      // src/auth.ts's `jwt` callback). Can't land out of sync with the
      // password itself: same transaction, same statement.
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() },
      });

      return "success";
    });
  } catch {
    // Neutral, secret-free diagnostic only — the transaction may have failed
    // at the engine level (e.g. under contention) rather than returning a
    // clean "invalid" — never log the token itself.
    console.error("resetPasswordWithToken: transaction failed");
    return "invalid";
  }
}
