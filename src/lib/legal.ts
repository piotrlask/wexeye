// Single source of truth for the operator identity and public contact
// addresses shown across the interim legal pages and the footer. Presentation
// only: this app does not send mail to, or check the configuration of, any of
// these mailboxes.

export const OPERATOR = {
  name: "APIL Sp. z o.o.",
  street: "ul. Kilińskiego 19/18",
  postalCode: "19-300",
  city: "Ełk",
  country: "Polska",
  nip: "8481885096",
  krs: "0001032649",
  regon: "525129960",
} as const;

export const CONTACT_EMAILS = {
  general: "kontakt@wexeye.com",
  privacy: "privacy@wexeye.com",
  legal: "legal@wexeye.com",
  copyright: "copyright@wexeye.com",
  safety: "safety@wexeye.com",
} as const;

// Hosting / database / file storage / backups provider (verified 2026-10-05:
// atthost.pl is a netart.com brand; server IP in a Polish NetArt network).
export const HOSTING_PROVIDER = {
  name: "netart.com sp. z o.o.",
  address: "ul. Pana Tadeusza 2, 30-727 Kraków",
  krs: "0001000590",
  location: "Polska",
} as const;

// Age rule decided by the operator (2026-10-05): 18+, or 16–17 with the
// consent of a parent or legal guardian.
export const MIN_AGE = 18;
export const MIN_AGE_WITH_PARENTAL_CONSENT = 16;
export const AGE_CONFIRMATIONS = ["18_PLUS", "16_PARENTAL"] as const;
export type AgeConfirmation = (typeof AGE_CONFIRMATIONS)[number];

// Date of the last edit to the interim legal pages (shown as-is to visitors).
export const LEGAL_LAST_UPDATED = "6 października 2026";

/**
 * mailto: link with an optional generic-category subject. Only ever built from
 * the static addresses/subjects above — never from user, session or request
 * data.
 */
export function mailtoHref(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
