"use client";

import { useEffect, useState } from "react";
import { PRICING, type PurchaseType } from "@/lib/constants";

export default function CheckoutButtons({ articleId }: { articleId?: string }) {
  const [loading, setLoading] = useState<PurchaseType | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        body: JSON.stringify({ type, articleId }),
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
      <div className="flex flex-wrap gap-2">
        {options.map((type) => (
          <button
            key={type}
            onClick={() => checkout(type)}
            disabled={loading !== null}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading === type ? "Przekierowywanie..." : `${PRICING[type].label} — ${(PRICING[type].amountCents / 100).toFixed(2)}$`}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
