"use client";

import { useState } from "react";
import { AD_PRICE_CENTS } from "@/lib/constants";

export default function BuyAdSlotButton({
  authorId,
  articleId,
  loggedIn,
}: {
  authorId: string;
  articleId: string;
  loggedIn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    if (!loggedIn) {
      window.location.href = `/login?next=/artykul/${articleId}`;
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId, articleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się rozpocząć płatności.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Nie udało się połączyć z płatnościami.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={buy}
      disabled={loading}
      className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-black/20 p-3 text-center text-sm hover:border-black/40 disabled:opacity-50 dark:border-white/20 dark:hover:border-white/40"
    >
      <span className="font-medium">
        {loading ? "Przekierowywanie..." : "Wykup reklamę"}
      </span>
      <span className="text-xs text-black/50 dark:text-white/50">
        pod tekstami tego autora · {(AD_PRICE_CENTS / 100).toFixed(0)}$ / miesiąc
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </button>
  );
}
