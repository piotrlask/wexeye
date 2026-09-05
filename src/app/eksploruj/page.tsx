import Link from "next/link";
import { auth } from "@/auth";
import { CATEGORIES } from "@/lib/constants";
import { getFeedPosts } from "@/lib/feed";
import PostCard from "@/components/PostCard";

export default async function EksplorujPage() {
  const session = await auth();
  const posts = await getFeedPosts({ tab: "trending", userId: session?.user?.id });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Explore</h1>

      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/?tab=trending&category=${encodeURIComponent(cat)}`}
            className="rounded-full border border-black/20 px-3 py-1.5 text-sm hover:border-black/40 dark:border-white/20"
          >
            {cat}
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Popularne teraz</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Brak publikacji.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.slice(0, 10).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
