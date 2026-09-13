import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { getAccessibleArticleIds, previewBody } from "@/lib/access";
import { FEED_TABS, type FeedTabKey } from "@/lib/constants";
import type { Article, Media } from "@prisma/client";

export type FeedPost = Article & {
  // PostCard only ever renders the author's name — select just that instead
  // of pulling the full User row (passwordHash, stripeCustomerId, etc.)
  // into every feed/search query.
  author: { name: string };
  media: Media[];
  witnessCount: number;
  commentCount: number;
  distanceKm?: number;
};

const NEAR_YOU_RADIUS_KM = 100;

export async function getFeedPosts(params: {
  // undefined = plain "Home" view: newest first, no tab-specific filter/sort.
  tab: FeedTabKey | undefined;
  category?: string;
  lat?: number;
  lng?: number;
  userId?: string;
}): Promise<FeedPost[]> {
  const { tab, category, lat, lng, userId } = params;
  const tabDef = FEED_TABS.find((t) => t.key === tab);
  const tabCategory = tabDef && "category" in tabDef ? tabDef.category : undefined;

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (category) where.category = category;
  else if (tabCategory) where.category = tabCategory;
  if (tab === "live") where.postType = "LIVE";

  const orderBy =
    tab === "trending"
      ? [{ viewCount: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { name: true } },
      media: true,
      _count: { select: { witnesses: true, comments: true } },
    },
    orderBy,
    take: 50,
  });

  // Articles the viewer hasn't unlocked ship only the free preview — never
  // the full body — so the paywalled text never leaves the server for them.
  const accessibleIds = await getAccessibleArticleIds(userId, articles.map((a) => a.id));

  let posts: FeedPost[] = articles.map((a) => ({
    ...a,
    body: accessibleIds.has(a.id) ? a.body : previewBody(a.body),
    witnessCount: a._count.witnesses,
    commentCount: a._count.comments,
  }));

  if (tab === "near-you" && lat !== undefined && lng !== undefined) {
    posts = posts
      .filter((p) => p.latitude !== null && p.longitude !== null)
      .map((p) => ({ ...p, distanceKm: haversineKm(lat, lng, p.latitude!, p.longitude!) }))
      .filter((p) => p.distanceKm! <= NEAR_YOU_RADIUS_KM)
      .sort((a, b) => a.distanceKm! - b.distanceKm!);
  }

  return posts;
}
