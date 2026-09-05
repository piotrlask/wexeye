import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleArticleIds, previewBody } from "@/lib/access";
import PostCard from "@/components/PostCard";
import type { FeedPost } from "@/lib/feed";

export default async function SzukajPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let posts: FeedPost[] = [];
  let people: { id: string; name: string; role: string }[] = [];

  if (query) {
    const session = await auth();

    const [articles, users] = await Promise.all([
      prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          // Matching against the full body (including the paid half) is fine
          // to do server-side — only the returned result is access-limited
          // below, so a match inside paywalled text still surfaces the
          // article, just without revealing the matched text itself.
          OR: [
            { title: { contains: query } },
            { body: { contains: query } },
            { hashtags: { contains: query } },
            { city: { contains: query } },
            { country: { contains: query } },
          ],
        },
        include: { author: true, media: true, _count: { select: { witnesses: true, comments: true } } },
        orderBy: { publishedAt: "desc" },
        take: 30,
      }),
      prisma.user.findMany({
        where: { name: { contains: query } },
        select: { id: true, name: true, role: true },
        take: 20,
      }),
    ]);

    // Same rule as the feed: an article the viewer hasn't unlocked only ever
    // gets its free preview sent to the client, never the full body.
    const accessibleIds = await getAccessibleArticleIds(session?.user?.id, articles.map((a) => a.id));

    posts = articles.map((a) => ({
      ...a,
      body: accessibleIds.has(a.id) ? a.body : previewBody(a.body),
      witnessCount: a._count.witnesses,
      commentCount: a._count.comments,
    }));
    people = users;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Szukaj</h1>
      <form className="mb-8">
        <input
          name="q"
          defaultValue={query}
          placeholder="Publikacje, hashtagi, miasta, osoby…"
          className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </form>

      {!query && <p className="text-sm text-black/60 dark:text-white/60">Wpisz szukaną frazę.</p>}

      {query && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Publikacje ({posts.length})</h2>
          {posts.length === 0 ? (
            <p className="mb-8 text-sm text-black/60 dark:text-white/60">Brak wyników.</p>
          ) : (
            <div className="mb-8 grid gap-6 sm:grid-cols-2">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold">Osoby ({people.length})</h2>
          {people.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Brak wyników.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                >
                  {p.name} <span className="text-black/50 dark:text-white/50">({p.role})</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
