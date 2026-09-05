/**
 * Guards against open-redirect via user-controlled "next" / "redirectTo"
 * parameters. Only a same-origin, path-relative URL is considered safe:
 *
 * - must start with a single "/" (rejects absolute URLs like
 *   "https://evil.com" and scheme-relative ones like "javascript:...")
 * - the second character must not be "/" or "\" (rejects "//evil.com" and
 *   "/\evil.com" — browsers can treat both as protocol-relative, i.e. as
 *   "https://evil.com", even though they pass a naive `startsWith("/")` check)
 *
 * Returns `path` unchanged when it's safe, otherwise `fallback`.
 */
export function getSafeRedirectPath(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
