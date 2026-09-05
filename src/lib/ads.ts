import { prisma } from "@/lib/prisma";
import { AD_DURATION_DAYS, AD_REVENUE_SPLIT_PCT, AD_SLOTS_PER_AUTHOR, type AdRevenueRole } from "@/lib/constants";

export async function getActiveAdsForAuthor(authorId: string) {
  return prisma.adPurchase.findMany({
    where: { authorId, status: "ACTIVE", endsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    take: AD_SLOTS_PER_AUTHOR,
  });
}

/**
 * Splits one ad purchase's payment 30% author / 30% admin(s) / 10% each to
 * the author's first 4 sponsor levels. Unlike the reader-funded commission
 * engine, unclaimed levels (author has fewer than 4 ancestors) just aren't
 * paid out — nobody absorbs the remainder here, since admin already has its
 * own fixed 30% cut rather than "whatever's left".
 */
export async function distributeAdRevenue(purchaseId: string) {
  const purchase = await prisma.adPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return;

  // Guards against being called twice for the same purchase (e.g. a
  // redelivered Stripe webhook) — without this every share gets paid again.
  const existingShare = await prisma.adRevenueShare.findFirst({ where: { purchaseId } });
  if (existingShare) return;

  const shares: { userId: string; role: AdRevenueRole; amountCents: number }[] = [];
  const pctOf = (pct: number) => Math.round((purchase.amountCents * pct) / 100);

  shares.push({ userId: purchase.authorId, role: "AUTHOR", amountCents: pctOf(AD_REVENUE_SPLIT_PCT.AUTHOR) });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length > 0) {
    const adminTotal = pctOf(AD_REVENUE_SPLIT_PCT.ADMIN);
    const perAdmin = Math.round(adminTotal / admins.length);
    for (const admin of admins) {
      shares.push({ userId: admin.id, role: "ADMIN", amountCents: perAdmin });
    }
  }

  const levelKeys = ["LEVEL1", "LEVEL2", "LEVEL3", "LEVEL4"] as const;
  let currentUserId: string = purchase.authorId;
  for (const levelKey of levelKeys) {
    const current = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { sponsor: { select: { id: true } } },
    });
    const sponsor = current?.sponsor;
    if (!sponsor) break;

    shares.push({ userId: sponsor.id, role: levelKey, amountCents: pctOf(AD_REVENUE_SPLIT_PCT[levelKey]) });
    currentUserId = sponsor.id;
  }

  await prisma.adRevenueShare.createMany({
    data: shares.map((s) => ({ purchaseId, userId: s.userId, role: s.role, amountCents: s.amountCents })),
  });
}

export type ActivateAdPurchaseResult = "activated" | "slot-full";

/**
 * Runs when the advertiser submits their creative, not at payment time —
 * revenue is only ever earned by an ad that actually goes live. Distributing
 * it at checkout.session.completed instead would pay out authors/admins/
 * sponsors for slots the advertiser paid for but abandoned before uploading
 * anything.
 *
 * This is also the ONLY place that ever sets status "ACTIVE" — i.e. the only
 * place an ad actually occupies one of the author's AD_SLOTS_PER_AUTHOR
 * slots. The checkout route's slot check (checkout-ad/route.ts) only limits
 * how many PENDING purchases get created off a snapshot of currently-active
 * ads; it does nothing to stop several already-PAID purchases for the same
 * author from all activating later and blowing past the limit. So the count
 * check has to live here, guarded the same way as the sponsor-slot limit in
 * becomeEditorAction (panel/actions.ts): lock the author's User row first,
 * so two activations for the same author can't both read "2/3 active" and
 * both proceed to 4 — the second one blocks until the first commits, then
 * (because the count query becomes this transaction's first consistent read,
 * taken only after the lock is acquired) sees the up-to-date count.
 */
export async function activateAdPurchase(
  purchaseId: string,
  mediaType: string,
  mediaUrl: string,
  linkUrl: string
): Promise<ActivateAdPurchaseResult> {
  const purchase = await prisma.adPurchase.findUnique({
    where: { id: purchaseId },
    select: { authorId: true },
  });
  if (!purchase) {
    throw new Error(`AdPurchase ${purchaseId} not found`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${purchase.authorId} FOR UPDATE`;

      const activeCount = await tx.adPurchase.count({
        where: { authorId: purchase.authorId, status: "ACTIVE", endsAt: { gt: new Date() } },
      });
      if (activeCount >= AD_SLOTS_PER_AUTHOR) {
        throw new Error("AD_SLOT_FULL");
      }

      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + AD_DURATION_DAYS * 24 * 60 * 60 * 1000);
      await tx.adPurchase.update({
        where: { id: purchaseId },
        data: { status: "ACTIVE", mediaType, mediaUrl, linkUrl, startsAt, endsAt },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "AD_SLOT_FULL") {
      return "slot-full";
    }
    throw err;
  }

  await distributeAdRevenue(purchaseId);
  return "activated";
}
