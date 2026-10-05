import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private, per-user and transactional areas are kept out of search engines.
// This is a crawler hint only — access control is enforced in src/proxy.ts and
// the server actions, never by robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/panel",
        "/dodaj",
        "/reklama",
        "/powiadomienia",
        "/znajomi",
        "/reset-hasla",
        "/nie-pamietam-hasla",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
