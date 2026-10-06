import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { paymentsEnabled } from "../src/lib/stripe";

// P0-11: payment UI and APIs are offered only when Stripe is fully configured.
test("payments are enabled only with a real API key AND a webhook signing secret", () => {
  assert.equal(paymentsEnabled(undefined, undefined), false);
  assert.equal(paymentsEnabled("", ""), false);
  assert.equal(paymentsEnabled("sk_test_placeholder", "whsec_abc"), false);
  assert.equal(paymentsEnabled("sk_live_abc123", undefined), false);
  assert.equal(paymentsEnabled("sk_live_abc123", ""), false);
  assert.equal(paymentsEnabled("pk_live_abc123", "whsec_abc"), false);
  assert.equal(paymentsEnabled("sk_test_abc123", "whsec_abc"), true);
  assert.equal(paymentsEnabled("sk_live_abc123", "whsec_abc"), true);
});

test("checkout APIs refuse with 503 when payments are disabled", () => {
  for (const f of ["src/app/api/checkout/route.ts", "src/app/api/checkout-ad/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /if \(!PAYMENTS_ENABLED\) \{\s*return NextResponse\.json\(\{ error: PAYMENTS_DISABLED_MESSAGE \}, \{ status: 503 \}\);/);
  }
});

test("payment buttons are gated in every place they render", () => {
  assert.match(readFileSync("src/app/artykul/[id]/page.tsx", "utf8"), /<CheckoutButtons articleId=\{article\.id\} enabled=\{PAYMENTS_ENABLED\} \/>/);
  assert.match(readFileSync("src/app/panel/page.tsx", "utf8"), /<CheckoutButtons enabled=\{PAYMENTS_ENABLED\} \/>/);
  assert.match(readFileSync("src/components/AdSlots.tsx", "utf8"), /PAYMENTS_ENABLED \? <BuyAdSlotButton/);
});

test("webhook fulfils only paid sessions and handles delayed payments", () => {
  const src = readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8");
  assert.match(src, /case "checkout\.session\.async_payment_succeeded":/);
  assert.match(src, /if \(session\.payment_status !== "paid" && session\.payment_status !== "no_payment_required"\) break;/);
  assert.match(src, /stripe\.webhooks\.constructEvent\(body, signature, webhookSecret\)/);
  assert.doesNotMatch(src, /\(err as Error\)\.message/);
});
