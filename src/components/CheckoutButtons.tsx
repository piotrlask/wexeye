"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, PAYMENT_CONSENT_TEXT, PRICING, type PurchaseType } from "@/lib/constants";

export default function CheckoutButtons({ articleId }: { articleId?: string }) {
  const [loading, setLoading] = useState<PurchaseType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  // Stripe Checkout URL to navigate to — external destination, so the
  // actual navigation happens in an effect rather than directly inside the
  // click handler.
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  async function checkout(type: PurchaseType) {
    setError(null);
    setLoading(type);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, articleId, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się rozpocząć płatności.");
        setLoading(null);
        return;
      }
      setRedirectUrl(data.url);
    } catch {
      setError("Nie udało się połączyć z płatnościami.");
      setLoading(null);
    }
  }

  const options: PurchaseType[] = articleId ? ["ARTICLE", "SUB20", "SUB30"] : ["SUB20", "SUB30"];

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-2 text-xs text-black/70 dark:text-white/70">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          {PAYMENT_CONSENT_TEXT}{" "}
          <Link href="/regulamin#platnosci" className="underline" target="_blank">
            Zasady płatności
          </Link>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((type) => (
          <button
            key={type}
            onClick={() => checkout(type)}
            disabled={loading !== null || !consent}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading === type ? "Przekierowywanie..." : `${PRICING[type].label} — ${formatPrice(PRICING[type].amountCents)}`}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
