import { prisma } from "@/lib/prisma";
import {
  COMMISSION_BASE_CENTS,
  COMMISSION_LEVEL_PCT,
  MAX_COMMISSION_LEVELS,
  type PurchaseType,
} from "@/lib/constants";

/**
 * Called once per unlock event (one-time article purchase, or one article
 * consumed from a subscription quota). Walks up the article author's sponsor
 * chain up to MAX_COMMISSION_LEVELS ancestors and credits each one their
 * level's percentage of the commission base. Ancestors beyond the chain's
 * length (e.g. the author is a root editor with no sponsor) simply don't get
 * paid — that share stays with the company, it is never redirected to admin.
 */
export async function distributeCommission(articleId: string, purchaseType: PurchaseType) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { authorId: true },
  });
  if (!article) return;

  const baseCents = COMMISSION_BASE_CENTS[purchaseType];

  let currentUserId: string = article.authorId;
  for (let level = 1; level <= MAX_COMMISSION_LEVELS; level++) {
    const current = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { sponsor: { select: { id: true } } },
    });
    const sponsor = current?.sponsor;
    if (!sponsor) break; // reached a root editor (no sponsor above them) — chain ends here

    const pct = COMMISSION_LEVEL_PCT[level - 1];
    const amountCents = Math.round((baseCents * pct) / 100);

    await prisma.commission.create({
      data: { editorId: sponsor.id, articleId, level, amountCents },
    });

    currentUserId = sponsor.id;
  }
}
