import assert from "node:assert/strict";
import { test } from "node:test";
import { issuedBeforePasswordChange } from "../src/lib/sessionValidity";
import { articleDescription } from "../src/lib/seo";

// P1-04 / P2: session issued in the same second as a password change is valid.
test("token from the same second as the password change is accepted; an older one is rejected", () => {
  const changed = new Date("2026-10-07T07:00:00.750Z");
  const sec = Math.floor(changed.getTime() / 1000);
  assert.equal(issuedBeforePasswordChange(changed, sec), false);
  assert.equal(issuedBeforePasswordChange(changed, sec + 5), false);
  assert.equal(issuedBeforePasswordChange(changed, sec - 1), true);
  assert.equal(issuedBeforePasswordChange(null, sec - 100), false);
  assert.equal(issuedBeforePasswordChange(changed, undefined), false);
});

// P1-04: meta description never contains text from the paid half.
test("article description is cut from the free preview only", () => {
  const body = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
  const d = articleDescription(body);
  assert.ok(d.length <= 160);
  assert.ok(d.startsWith("w0 w1"));
  assert.ok(!/\bw1[0-9]{2}\b/.test(d)); // words 100+ (paid half) never appear
  const short = articleDescription("jedno dwa trzy cztery");
  assert.equal(short, "jedno dwa");
});
