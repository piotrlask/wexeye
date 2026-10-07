/**
 * True when a session token was issued before the account's last password
 * change and must therefore be rejected.
 *
 * `iat` (JWT "issued at") has whole-second resolution, while passwordChangedAt
 * is stored in milliseconds. Comparing the raw values rejected a login made in
 * the same second as the change (e.g. right after a password reset) as if it
 * predated it; both sides are compared at second resolution instead.
 */
export function issuedBeforePasswordChange(passwordChangedAt: Date | null | undefined, iat: number | undefined): boolean {
  if (!passwordChangedAt || !iat) return false;
  return Math.floor(passwordChangedAt.getTime() / 1000) > iat;
}
