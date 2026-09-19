import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { getAccessibleArticleIds, previewBody } from "@/lib/access";
import { FEED_TABS, type FeedTabKey } from "@/lib/constants";
import type { Article, Media } from "@prisma/client";

// Fields of an Article row that must never leave the server inside a public
// feed/search post: exact coordinates (ETAP 13.3C, locationHidden) and the
// admin-only moderation notes/takedown data.
const SERVER_ONLY_ARTICLE_FIELDS = [
  "latitude",
  "longitude",
  "reviewNote",
  "takedownAt",
  "takedownReason",
  "takedownById",
  "takedownPreviousStatus",
] as const;
type ServerOnlyArticleFields = (typeof SERVER_ONLY_ARTICLE_FIELDS)[number];

export type FeedPost = Omit<Article, ServerOnlyArticleFields> & {
  // PostCard only ever renders the author's name — select just that instead
  // of pulling the full User row (passwordHash, stripeCustomerId, etc.)
  // into every feed/search query.
  author: { name: string };
  media: Media[];
  witnessCount: number;
  commentCount: number;
  distanceKm?: number;
};

/**
 * Turns an Article row (with the includes the feed/search queries use) into
 * the public post shape. Single choke point for what a public listing may
 * carry:
 *  - coordinates and moderation data are always dropped;
 *  - if locationHidden, the place fields (city/region/country/continent) are
 *    dropped too, so nothing that identifies where the author was can reach
 *    HTML, RSC payload or props for that post (ETAP 13.3C, F-13.3A-02).
 * The full row stays in the DB for authorized internal use.
 */
export function toFeedPost(
  a: Article & {
    author: { name: string };
    media: Media[];
    _count: { witnesses: number; comments: number };
  },
  body: string,
  distanceKm?: number
): FeedPost {
  const { _count, ...rest } = a;
  const post: Record<string, unknown> = {
    ...rest,
    body,
    witnessCount: _count.witnesses,
    commentCount: _count.comments,
  };
  for (const field of SERVER_ONLY_ARTICLE_FIELDS) delete post[field];
  if (distanceKm !== undefined) post.distanceKm = distanceKm;
  if (a.locationHidden) {
    post.city = null;
    post.region = null;
    post.country = null;
    post.continent = null;
  }
  return post as FeedPost;
}

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
  // Near You is location-based discovery. An article whose author hid its
  // location must not take part in it at all — not as a result, not through
  // distance, not through ranking. Filtered in the DB query (before `take`),
  // so hidden articles can't influence which/what order others come back in.
  if (tab === "near-you") where.locationHidden = false;

  const orderBy =
    tab === "trending"
      ? [{ viewCount: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { name: true } },
      media: true,
      _count: { select: { witnesses: true, comments: { where: { hiddenAt: null } } } },
    },
    orderBy,
    take: 50,
  });

  // Articles the viewer hasn't unlocked ship only the free preview — never
  // the full body — so the paywalled text never leaves the server for them.
  const accessibleIds = await getAccessibleArticleIds(userId, articles.map((a) => a.id));

  const nearYou = tab === "near-you" && lat !== undefined && lng !== undefined;

  const posts: FeedPost[] = [];
  for (const a of articles) {
    const body = accessibleIds.has(a.id) ? a.body : previewBody(a.body);
    if (!nearYou) {
      posts.push(toFeedPost(a, body));
      continue;
    }
    // Distance is computed from the exact coordinates here, server-side only,
    // and only for articles whose location is public (see the query filter;
    // the locationHidden check is repeated as defense in depth).
    if (a.locationHidden || a.latitude === null || a.longitude === null) continue;
    const distanceKm = haversineKm(lat, lng, a.latitude, a.longitude);
    if (distanceKm > NEAR_YOU_RADIUS_KM) continue;
    posts.push(toFeedPost(a, body, distanceKm));
  }

  if (nearYou) posts.sort((a, b) => a.distanceKm! - b.distanceKm!);

  return posts;
}
