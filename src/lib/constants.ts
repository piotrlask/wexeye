export const ROLES = ["READER", "EDITOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ARTICLE_STATUSES = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const MEDIA_TYPES = ["PHOTO", "VIDEO", "REEL"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

// --- WEXEYE content model ---------------------------------------------------

export const POST_TYPES = ["PHOTO", "VIDEO", "STORY", "ALERT", "LIVE", "EVENT", "OPINION"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  PHOTO: "Photo",
  VIDEO: "Video",
  STORY: "Story",
  ALERT: "Alert",
  LIVE: "Live",
  EVENT: "Event",
  OPINION: "Opinion",
};

export const CATEGORIES = [
  "News",
  "Alerts",
  "Local",
  "Witness",
  "People",
  "Community",
  "Culture",
  "Sports",
  "Weather & Nature",
  "Traffic",
  "Business",
  "Places & Deals",
  "Events",
  "Stories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SOURCE_TYPES = ["WITNESSED", "TOLD", "FOUND_ONLINE", "UNKNOWN"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  WITNESSED: "I witnessed this myself",
  TOLD: "Someone told me",
  FOUND_ONLINE: "I found this online",
  UNKNOWN: "I don't know",
};

// Feed tabs shown on the homepage. "category" filters by CATEGORIES; a null
// category means the tab uses its own custom query (see src/lib/feed.ts).
export const FEED_TABS = [
  { key: "near-you", label: "Near You" },
  { key: "trending", label: "Trending" },
  { key: "live", label: "Live" },
  { key: "alerts", label: "Alerts", category: "Alerts" },
  { key: "news", label: "News", category: "News" },
  { key: "witness", label: "Witness", category: "Witness" },
  { key: "people", label: "People", category: "People" },
  { key: "stories", label: "Stories", category: "Stories" },
] as const;
export type FeedTabKey = (typeof FEED_TABS)[number]["key"];

// --- Paywall / commission model -------------------------------------------
//
// Readers pay for content access; editors never pay anything to join or
// remain active. Each unlock event (one-time purchase, or one article
// consumed from a subscription quota) generates a fixed "commission base"
// which cascades up the buying-power chain: the article author's direct
// sponsor keeps 5% of that base, their sponsor keeps 10%, up to 5 sponsor
// levels up get 25%. Whatever isn't claimed by an existing ancestor stays
// with the company. See src/lib/commissions.ts for the distribution logic.

export const PURCHASE_TYPES = ["ARTICLE", "SUB20", "SUB30"] as const;
export type PurchaseType = (typeof PURCHASE_TYPES)[number];

export const PURCHASE_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "CANCELED", "PAST_DUE"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PRICING = {
  ARTICLE: { label: "Pojedynczy artykuł", amountCents: 200, articlesPerPeriod: 1 },
  SUB20: { label: "Subskrypcja — 20 artykułów/mies.", amountCents: 2000, articlesPerPeriod: 20 },
  SUB30: { label: "Subskrypcja — bez limitu", amountCents: 3000, articlesPerPeriod: Infinity },
} as const satisfies Record<
  PurchaseType,
  { label: string; amountCents: number; articlesPerPeriod: number }
>;

// Revenue treated as "generated" by a single unlock, for commission purposes.
// One-time purchases: the full price. Subscriptions: price divided by quota
// (SUB30's effective quota is capped at 30 commission-eligible unlocks/month;
// further reads that month don't generate additional commission).
export const COMMISSION_BASE_CENTS: Record<PurchaseType, number> = {
  ARTICLE: PRICING.ARTICLE.amountCents,
  SUB20: Math.round(PRICING.SUB20.amountCents / PRICING.SUB20.articlesPerPeriod),
  SUB30: Math.round(PRICING.SUB30.amountCents / 30),
};

export const SUB30_MONTHLY_COMMISSION_CAP = 30;

// % of the commission base earned by the Nth sponsor level above the article's author.
export const COMMISSION_LEVEL_PCT = [5, 10, 15, 20, 25] as const;
export const MAX_COMMISSION_LEVELS = COMMISSION_LEVEL_PCT.length;

export const MAX_DIRECT_REFERRALS = 5;

// --- Editorial team structure -----------------------------------------------
//
// Each editor's "redakcja" (team) tree goes at most this many levels deep
// below them (matches MAX_DIRECT_REFERRALS: up to 5 people per level).
export const TEAM_TREE_DEPTH = 5;

// A team member is "on track" (green dot) only if both are true this week:
// they published at least one article, and they've recruited their full
// 5 direct reports. Missing either shows red.
export const TEAM_WEEKLY_POST_QUOTA = 1;

// --- Social profile ---------------------------------------------------------

export const GENDERS = ["WOMAN", "MAN", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  WOMAN: "Kobieta",
  MAN: "Mężczyzna",
  OTHER: "Inne",
};

export const FRIENDSHIP_STATUSES = ["PENDING", "ACCEPTED"] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

export const REACTION_TYPES = ["OK", "NOT_OK"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

// --- Author ad slots ---------------------------------------------------------
//
// Anyone can buy a 30-day ad slot to run under one author's published
// articles ($50 flat). Up to AD_SLOTS_PER_AUTHOR ads can be ACTIVE for the
// same author at once. Revenue is split as a fixed table, not the tiered
// commission scheme: 30% to the author, 30% to the platform admin(s), and
// 10% each to the author's first 4 sponsor levels — the same incentive to
// write (and supervise) good, advertiser-attracting articles as the content
// commission engine, but funded by advertisers instead of readers. See
// src/lib/ads.ts for the distribution logic.

export const AD_PRICE_CENTS = 5000;
export const AD_DURATION_DAYS = 30;
export const AD_SLOTS_PER_AUTHOR = 3;

export const AD_REVENUE_SPLIT_PCT = {
  AUTHOR: 30,
  ADMIN: 30,
  LEVEL1: 10,
  LEVEL2: 10,
  LEVEL3: 10,
  LEVEL4: 10,
} as const;
export type AdRevenueRole = keyof typeof AD_REVENUE_SPLIT_PCT;

export const AD_PURCHASE_STATUSES = ["PENDING", "PAID", "ACTIVE", "EXPIRED"] as const;
export type AdPurchaseStatus = (typeof AD_PURCHASE_STATUSES)[number];

// --- Article view counting ---------------------------------------------------
//
// viewCount only increments through recordArticleViewAction, called from a
// small Client Component after the article page actually mounts in a real
// browser — never from the page's own Server Component render. That means a
// plain HTTP GET (curl, a naive scraper, a refresh script) never executes any
// JS and therefore never counts, without needing to store an IP or add any
// infrastructure. The action itself also skips the increment if the viewer's
// browser already carries this article's dedupe cookie, so a genuine refresh
// within the window doesn't inflate the count either.

export const ARTICLE_VIEW_COOKIE_PREFIX = "wxv_";
export const ARTICLE_VIEW_DEDUPE_SECONDS = 60 * 60 * 4; // 4h

// --- Notifications ------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "FRIEND_REQUEST",
  "FRIEND_ACCEPTED",
  "ARTICLE_MODERATED",
  "ARTICLE_SHARED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
