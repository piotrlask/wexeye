import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { FEED_TABS, type FeedTabKey } from "@/lib/constants";
import type { Article, Media, User } from "@prisma/client";

export type FeedPost = Article & {
  author: User;
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
}): Promise<FeedPost[]> {
  const { tab, category, lat, lng } = params;
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
    include: { author: true, media: true, _count: { select: { witnesses: true, comments: true } } },
    orderBy,
    take: 50,
  });

  let posts: FeedPost[] = articles.map((a) => ({
    ...a,
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
