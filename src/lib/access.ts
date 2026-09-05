import { prisma } from "@/lib/prisma";

/** Staff (editors/admins) always have full read access to every article. */
export async function hasStaffAccess(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "EDITOR" || user?.role === "ADMIN";
}

export async function hasArticleAccess(userId: string | undefined, articleId: string): Promise<boolean> {
  if (!userId) return false;
  if (await hasStaffAccess(userId)) return true;

  const grant = await prisma.articleAccess.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });
  return Boolean(grant);
}

/**
 * Same rule as hasArticleAccess, batched for a whole list of articles instead
 * of one query per article — used by feeds/search so they can decide per post
 * whether to ship the full body or just the free preview (see previewBody).
 */
export async function getAccessibleArticleIds(
  userId: string | undefined,
  articleIds: string[]
): Promise<Set<string>> {
  if (!userId || articleIds.length === 0) return new Set();
  if (await hasStaffAccess(userId)) return new Set(articleIds);

  const grants = await prisma.articleAccess.findMany({
    where: { userId, articleId: { in: articleIds } },
    select: { articleId: true },
  });
  return new Set(grants.map((g) => g.articleId));
}

/**
 * The free preview of an article body: the first half of its words, rounded
 * up — the exact same rule artykul/[id]/page.tsx uses to compute its
 * `visibleText`. Any caller sending article content to a viewer without
 * access (feeds, search) MUST run the body through this before it leaves the
 * server — sending the full body and hiding the rest with CSS is not
 * sufficient, since the hidden text would still be present in the HTML/RSC
 * payload and readable via view-source/DevTools.
 */
export function previewBody(body: string): string {
  const words = body.split(/\s+/);
  const half = Math.max(1, Math.ceil(words.length / 2));
  return words.slice(0, half).join(" ");
}

export type UnlockResult = "already-unlocked" | "newly-unlocked" | "no-quota";

/**
 * Grants a subscriber access to an article by consuming one unit of their
 * period quota. Returns "newly-unlocked" only the first time — callers should
 * distribute commission only on that result, never on "already-unlocked",
 * or repeat visits would generate duplicate payouts for the same purchase.
 */
export async function consumeSubscriptionQuota(userId: string, articleId: string): Promise<UnlockResult> {
  const existing = await prisma.articleAccess.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });
  if (existing) return "already-unlocked";

  // The whole check-then-increment runs inside one transaction with the
  // subscription row locked (SELECT ... FOR UPDATE), so two concurrent
  // unlocks from the same user can't both read the same pre-increment count
  // and both slip under the quota.
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { tier: string; status: string; currentPeriodEnd: Date; articlesUsedInPeriod: number }[]
    >`SELECT tier, status, currentPeriodEnd, articlesUsedInPeriod FROM Subscription WHERE userId = ${userId} FOR UPDATE`;
    const sub = rows[0];
    if (!sub || sub.status !== "ACTIVE" || sub.currentPeriodEnd < new Date()) return "no-quota";

    const quota = sub.tier === "SUB30" ? Infinity : 20;
    if (sub.articlesUsedInPeriod >= quota) return "no-quota";

    await tx.articleAccess.create({
      data: { userId, articleId, grantedVia: "SUBSCRIPTION" },
    });
    await tx.subscription.update({
      where: { userId },
      data: { articlesUsedInPeriod: { increment: 1 } },
    });

    return "newly-unlocked";
  });
}
