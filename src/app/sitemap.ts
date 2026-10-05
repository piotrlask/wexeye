import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// Rendered per request: the build machine has no database, and published
// articles change continuously.
export const dynamic = "force-dynamic";

// Upper bound well below the 50 000-URL limit of a single sitemap file.
const MAX_ARTICLES = 5000;

const STATIC_PATHS = [
  "/",
  "/eksploruj",
  "/mapa",
  "/regulamin",
  "/prywatnosc",
  "/cookies",
  "/zasady-spolecznosci",
  "/kontakt",
  "/zglos-naruszenie",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));

  // Only PUBLISHED articles (TAKEN_DOWN/PENDING/REJECTED/DRAFT are excluded by
  // the status filter). Profiles are intentionally not listed.
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, publishedAt: true, createdAt: true },
      orderBy: { publishedAt: "desc" },
      take: MAX_ARTICLES,
    });
    for (const a of articles) {
      entries.push({ url: `${SITE_URL}/artykul/${a.id}`, lastModified: a.publishedAt ?? a.createdAt });
    }
  } catch (error) {
    // A database outage must not turn the sitemap into a 500 for crawlers;
    // the static part is still valid.
    console.error("sitemap: article query failed", error instanceof Error ? error.message : error);
  }

  return entries;
}
