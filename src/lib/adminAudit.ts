import { prisma } from "@/lib/prisma";

export const ADMIN_ACTIONS = [
  "USER_CREATED",
  "ARTICLE_APPROVED",
  "ARTICLE_REJECTED",
  "PAYMENT_ADDED",
  "PAYMENT_MARKED_PAID",
  "ARTICLE_TAKEN_DOWN",
  "QUARANTINE_RETRY",
  "QUARANTINE_RECONCILE",
  "COMMENT_HIDDEN",
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

const DETAILS_MAX = 500;

/** Keeps the summary short and free of anything that looks like an e-mail address. */
export function sanitizeDetails(details: string | undefined): string | null {
  if (!details) return null;
  const clean = details.replace(/[^\s@]+@[^\s@]+/g, "[e-mail]").replace(/\s+/g, " ").trim();
  return clean.slice(0, DETAILS_MAX) || null;
}

/**
 * P1-12: append one entry to the admin audit trail. Called only AFTER the
 * action itself succeeded. A failing audit write is logged but never undoes
 * or blocks the admin action that already happened.
 */
export async function recordAdminAction(
  actorId: string,
  action: AdminAction,
  target: { type: string; id?: string | null },
  details?: string
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        targetType: target.type.slice(0, 32),
        targetId: target.id ? target.id.slice(0, 191) : null,
        details: sanitizeDetails(details),
      },
    });
  } catch (err) {
    console.error("[admin-audit] write failed", action, err instanceof Error ? err.name : "error");
  }
}
