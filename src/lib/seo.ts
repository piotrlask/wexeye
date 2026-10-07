import { previewBody } from "@/lib/access";

export const SITE_NAME = "WexEye";
export const SITE_TAGLINE = "Wiadomości z pierwszej ręki — relacje świadków z Twojej okolicy";

/**
 * Meta description for an article. Built ONLY from the free preview half of
 * the body (the same rule the article page uses for non-buyers) — a meta tag
 * or social-card snippet must never carry text from the paid part.
 */
export function articleDescription(body: string, max = 160): string {
  const free = previewBody(body).replace(/\s+/g, " ").trim();
  if (free.length <= max) return free;
  const cut = free.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
