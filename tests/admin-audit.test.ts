import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ADMIN_ACTIONS, sanitizeDetails } from "../src/lib/adminAudit";

// P1-12: every admin mutation leaves an audit entry; entries never carry e-mails.
test("details are short and never contain an e-mail address", () => {
  assert.equal(sanitizeDetails(undefined), null);
  assert.equal(sanitizeDetails("rola EDITOR dla jan@example.com"), "rola EDITOR dla [e-mail]");
  assert.equal(sanitizeDetails("x".repeat(900))!.length, 500);
});

test("each admin action records its audit entry after success", () => {
  const src = readFileSync(new URL("../src/app/panel/admin/actions.ts", import.meta.url), "utf8");
  const auditLines = src.split("\n").filter((l) => l.includes("recordAdminAction(") && !l.includes("import"));
  for (const a of ADMIN_ACTIONS) assert.ok(auditLines.some((l) => l.includes(`"${a}"`)), a);
  const exported = [...src.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  assert.equal(exported.length, 8);
  // 8 actions; moderation records one of two kinds from a single call site
  assert.equal(auditLines.length, 8);
});
