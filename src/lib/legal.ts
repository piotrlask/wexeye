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

// Date of the last edit to the interim legal pages (shown as-is to visitors).
export const LEGAL_LAST_UPDATED = "19 września 2026";

/**
 * mailto: link with an optional generic-category subject. Only ever built from
 * the static addresses/subjects above — never from user, session or request
 * data.
 */
export function mailtoHref(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
