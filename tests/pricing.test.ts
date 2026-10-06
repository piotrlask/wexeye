import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AD_DURATION_DAYS,
  AD_PRICE_CENTS,
  AD_REVENUE_SPLIT_PCT,
  COMMISSION_BASE_CENTS,
  CURRENCY,
  formatPrice,
  PRICING,
} from "../src/lib/constants";

// Operator price list 2026-10-06 (PLN, gross). Stripe expects integer minor units (grosze).
test("price list in PLN grosze — exact operator decision", () => {
  assert.equal(CURRENCY, "pln");
  assert.equal(PRICING.ARTICLE.amountCents, 999);
  assert.equal(PRICING.SUB20.amountCents, 7999);
  assert.equal(PRICING.SUB30.amountCents, 11999);
  assert.equal(AD_PRICE_CENTS, 19900);
  assert.equal(AD_DURATION_DAYS, 30);
});

test("every Stripe amount is a positive integer (no 9.99-units bug)", () => {
  for (const v of [...Object.values(PRICING).map((p) => p.amountCents), AD_PRICE_CENTS, ...Object.values(COMMISSION_BASE_CENTS)]) {
    assert.ok(Number.isInteger(v) && v > 0, `not an integer minor-unit amount: ${v}`);
  }
});

test("Stripe Checkout receives amountCents directly as unit_amount in CURRENCY", () => {
  for (const f of ["src/app/api/checkout/route.ts", "src/app/api/checkout-ad/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /currency: CURRENCY,/);
    assert.match(src, /unit_amount: (pricing\.amountCents|AD_PRICE_CENTS),/);
    assert.doesNotMatch(src, /unit_amount:[^,\n]*(\/ ?100|\* ?100|toFixed|parseFloat)/);
  }
});

test("displayed prices are formatted in złoty", () => {
  const norm = (s: string) => s.replace(/\s/g, " ");
  assert.equal(norm(formatPrice(999)), "9,99 zł");
  assert.equal(norm(formatPrice(7999)), "79,99 zł");
  assert.equal(norm(formatPrice(11999)), "119,99 zł");
  assert.equal(norm(formatPrice(19900)), "199,00 zł");
});

test("commission bases and ad revenue split follow the new prices", () => {
  assert.equal(COMMISSION_BASE_CENTS.ARTICLE, 999);
  assert.equal(COMMISSION_BASE_CENTS.SUB20, Math.round(7999 / 20));
  assert.equal(COMMISSION_BASE_CENTS.SUB30, Math.round(11999 / 30));
  const totalPct = Object.values(AD_REVENUE_SPLIT_PCT).reduce((a, b) => a + b, 0);
  assert.ok(totalPct <= 100, `ad split exceeds 100%: ${totalPct}`);
  const shares = Object.values(AD_REVENUE_SPLIT_PCT).map((pct) => Math.round((AD_PRICE_CENTS * pct) / 100));
  assert.ok(shares.reduce((a, b) => a + b, 0) <= AD_PRICE_CENTS);
});

test("no hard-coded dollar amounts or USD left in the app", () => {
  const files = [
    "src/lib/constants.ts",
    "src/app/panel/page.tsx",
    "src/app/panel/admin/page.tsx",
    "src/app/panel/dodaj/page.tsx",
    "src/app/reklama/[id]/page.tsx",
    "src/components/CheckoutButtons.tsx",
    "src/components/BuyAdSlotButton.tsx",
    "src/app/regulamin/page.tsx",
  ];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /toFixed\(2\)\}\$|\busd\b|\bUSD\b/, f);
  }
});
