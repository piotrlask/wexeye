"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { consumeSubscriptionQuota } from "@/lib/access";
import { distributeCommission } from "@/lib/commissions";
import { prisma } from "@/lib/prisma";
import {
  SUB30_MONTHLY_COMMISSION_CAP,
  ARTICLE_VIEW_COOKIE_PREFIX,
  ARTICLE_VIEW_DEDUPE_SECONDS,
} from "@/lib/constants";

/**
 * Counts one article view — called only from ViewTracker, after the article
 * page has actually mounted in a real browser (see constants.ts for why).
 * Authoritative dedupe check: re-reads the cookie itself rather than trusting
 * the caller, so this stays correct even if ViewTracker is ever invoked more
 * than once for the same view (e.g. React Strict Mode's dev double-effect).
 */
export async function recordArticleViewAction(articleId: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = `${ARTICLE_VIEW_COOKIE_PREFIX}${articleId}`;
  if (cookieStore.get(cookieName)) return;

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") return;

  await prisma.article.update({ where: { id: articleId }, data: { viewCount: { increment: 1 } } });

  cookieStore.set(cookieName, "1", {
    maxAge: ARTICLE_VIEW_DEDUPE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export type UnlockState = { error?: string; success?: boolean };

export async function unlockWithSubscriptionAction(articleId: string): Promise<UnlockState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") {
    return { error: "Artykuł nie jest dostępny." };
  }

  const result = await consumeSubscriptionQuota(session.user.id, articleId);
  if (result === "no-quota") {
    return { error: "Brak dostępnego limitu w Twojej subskrypcji." };
  }

  if (result === "newly-unlocked") {
    const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    // SUB30 grants unlimited article ACCESS, but only the first
    // SUB30_MONTHLY_COMMISSION_CAP unlocks each period are commission-eligible
    // (consumeSubscriptionQuota already incremented articlesUsedInPeriod, so
    // its new value is this unlock's 1-based position in the period).
    const commissionEligible =
      sub && (sub.tier === "SUB20" || sub.articlesUsedInPeriod <= SUB30_MONTHLY_COMMISSION_CAP);
    if (sub && commissionEligible) {
      await distributeCommission(articleId, sub.tier as "SUB20" | "SUB30");
    }
  }

  revalidatePath(`/artykul/${articleId}`);
  return { success: true };
}

export type CommentState = { error?: string; success?: boolean };

export async function addCommentAction(
  articleId: string,
  _prevState: CommentState | undefined,
  formData: FormData
): Promise<CommentState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany, aby komentować." };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    return { error: "Komentarz nie może być pusty." };
  }
  if (body.length > 2000) {
    return { error: "Komentarz jest za długi (max 2000 znaków)." };
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") {
    return { error: "Artykuł nie jest dostępny." };
  }

  await prisma.comment.create({
    data: { body, articleId, authorId: session.user.id },
  });

  revalidatePath(`/artykul/${articleId}`);
  return { success: true };
}

export type ReactionState = { error?: string; success?: boolean };

/** Sets the caller's OK/NOT_OK reaction on an article; clicking the same one again removes it. */
export async function setReactionAction(articleId: string, type: "OK" | "NOT_OK"): Promise<ReactionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") {
    return { error: "Artykuł nie jest dostępny." };
  }

  const existing = await prisma.reaction.findUnique({
    where: { userId_articleId: { userId: session.user.id, articleId } },
  });

  if (existing?.type === type) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.upsert({
      where: { userId_articleId: { userId: session.user.id, articleId } },
      create: { userId: session.user.id, articleId, type },
      update: { type },
    });
  }

  revalidatePath(`/artykul/${articleId}`);
  return { success: true };
}

export type ShareState = { error?: string; success?: boolean };

export async function shareWithFriendsAction(articleId: string): Promise<ShareState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") {
    return { error: "Artykuł nie jest dostępny." };
  }

  await prisma.share.create({
    data: { userId: session.user.id, articleId },
  });

  revalidatePath(`/artykul/${articleId}`);
  revalidatePath("/panel");
  return { success: true };
}

export type WitnessState = { error?: string; success?: boolean };

export async function markWitnessAction(articleId: string): Promise<WitnessState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Musisz być zalogowany." };
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") {
    return { error: "Artykuł nie jest dostępny." };
  }

  await prisma.witness.upsert({
    where: { userId_articleId: { userId: session.user.id, articleId } },
    create: { userId: session.user.id, articleId },
    update: {},
  });

  revalidatePath(`/artykul/${articleId}`);
  return { success: true };
}
