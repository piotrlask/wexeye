import { prisma } from "@/lib/prisma";
import MapLoader from "@/components/MapLoader";
import type { MapPost } from "@/components/WorldMap";

export default async function MapaPage() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", locationHidden: false, latitude: { not: null }, longitude: { not: null } },
    include: { author: true, media: true },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  const posts: MapPost[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    postType: a.postType,
    category: a.category,
    city: a.city,
    country: a.country,
    latitude: a.latitude!,
    longitude: a.longitude!,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    authorName: a.author.name,
    coverUrl: a.media.find((m) => m.type === "PHOTO")?.url ?? null,
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Mapa WEXEYE</h1>
      {posts.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Brak publikacji z podaną lokalizacją.
        </p>
      ) : (
        <MapLoader posts={posts} />
      )}
    </div>
  );
}
