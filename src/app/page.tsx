import Link from "next/link";
import { CATEGORIES, FEED_TABS, type FeedTabKey } from "@/lib/constants";
import { getFeedPosts } from "@/lib/feed";
import PostCard from "@/components/PostCard";
import NearYouLocation from "@/components/NearYouLocation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string; lat?: string; lng?: string }>;
}) {
  const params = await searchParams;
  // No ?tab= at all = plain "Home": newest first, nothing highlighted. Picking a
  // pill (including Trending) always sets an explicit tab in the URL.
  const tab: FeedTabKey | undefined = FEED_TABS.some((t) => t.key === params.tab)
    ? (params.tab as FeedTabKey)
    : undefined;
  const category = params.category && CATEGORIES.includes(params.category as (typeof CATEGORIES)[number])
    ? params.category
    : undefined;
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;

  const posts = await getFeedPosts({ tab, category, lat, lng });

  function tabHref(key: FeedTabKey) {
    const qs = new URLSearchParams();
    qs.set("tab", key);
    return `/?${qs.toString()}`;
  }

  function categoryHref(cat: string) {
    const qs = new URLSearchParams();
    if (tab) qs.set("tab", tab);
    if (cat !== category) qs.set("category", cat);
    return `/?${qs.toString()}`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-black/10 pb-3 dark:border-white/10">
        <Link
          href="/"
          className={`rounded-full px-3 py-1 text-sm ${
            !tab
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Home
        </Link>
        {FEED_TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === t.key
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={categoryHref(cat)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              category === cat
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/20 text-black/70 hover:border-black/40 dark:border-white/20 dark:text-white/70"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {tab === "near-you" && <NearYouLocation />}

      {posts.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          {tab === "near-you"
            ? "Brak publikacji w promieniu 100 km od Ciebie."
            : "Brak publikacji w tej kategorii."}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
