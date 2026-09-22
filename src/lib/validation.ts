// ETAP 13.3C.4F.1 — shared server-side length guard for the plain (un-widened)
// `String` columns in schema.prisma, which Prisma maps to MySQL VARCHAR(191)
// unless a migration explicitly widened them to TEXT (see
// prisma/migrations/20260828120000_widen_text_columns). A value longer than
// this silently truncates in some MySQL modes and throws a raw Prisma/DB
// error in strict mode — either way the user must never see a bare DB
// exception, so every server action writing user input into one of these
// columns must check this BEFORE the write, not rely on the HTML `maxLength`
// attribute alone (that only constrains a real browser, not a direct POST).
export const VARCHAR_191_MAX = 191;

/**
 * True when `value`'s length is within a VARCHAR(N) column's limit
 * (default 191, i.e. every un-widened `String` column in schema.prisma).
 */
export function fitsVarchar(value: string, max: number = VARCHAR_191_MAX): boolean {
  return value.length <= max;
}
