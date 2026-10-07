import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renewalUpdate } from "../src/lib/subscriptionRenewal";

// P0-11 (local Stripe TEST E2E): replays of real webhooks exposed two non-idempotent paths.
const NOV6 = new Date("2026-11-06T22:00:36Z");
const NOV6_S = NOV6.getTime() / 1000;
const DEC6_S = new Date("2026-12-06T22:00:36Z").getTime() / 1000;

test("invoice.paid redelivered for the current period does not reset the monthly quota", () => {
  assert.deepEqual(renewalUpdate({ currentPeriodEnd: NOV6 }, NOV6_S, "active"), { status: "ACTIVE" });
});

test("invoice.paid for a new period resets the quota and moves the period end", () => {
  assert.deepEqual(renewalUpdate({ currentPeriodEnd: NOV6 }, DEC6_S, "active"), {
    status: "ACTIVE",
    currentPeriodEnd: new Date(DEC6_S * 1000),
    articlesUsedInPeriod: 0,
  });
});

test("a late invoice.paid never resurrects a subscription Stripe reports as canceled", () => {
  assert.deepEqual(renewalUpdate({ currentPeriodEnd: NOV6 }, NOV6_S, "canceled"), {});
  assert.equal(renewalUpdate({ currentPeriodEnd: NOV6 }, DEC6_S, "canceled").status, undefined);
});

test("ad webhook only moves PENDING purchases to PAID (an ACTIVE ad is never pulled back)", () => {
  const src = readFileSync(new URL("../src/app/api/webhooks/stripe/route.ts", import.meta.url), "utf8");
  assert.match(src, /adPurchase\.updateMany\(\{\s*where: \{ id: adPurchaseId, status: "PENDING" \}/);
  assert.doesNotMatch(src, /adPurchase\.update\(\{\s*where: \{ id: adPurchaseId \}/);
});

test("checkout events for unknown users/articles are acknowledged before any write (no 500 retry loop)", () => {
  const src = readFileSync(new URL("../src/app/api/webhooks/stripe/route.ts", import.meta.url), "utf8");
  const guard = src.indexOf("if (!knownUser || !knownArticle)");
  assert.ok(guard > 0);
  assert.ok(guard < src.indexOf("prisma.purchase.create"));
});
