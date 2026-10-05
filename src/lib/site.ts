// Canonical public origin of the site (apex host, HTTPS). Baked in at build
// time from NEXT_PUBLIC_BASE_URL; the fallback matches the production target.
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://wexeye.com").replace(/\/+$/, "");
