/**
 * Basic web-form email format check — not an RFC 5322 parser and not a
 * mailbox-existence check. Rejects obviously malformed input (missing "@",
 * missing local/domain part, whitespace, no dot in the domain); accepts
 * everything else, including "+" tags and multi-label domains.
 */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_FORMAT.test(email);
}
