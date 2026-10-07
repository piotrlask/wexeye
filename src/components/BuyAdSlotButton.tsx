"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AD_PRICE_CENTS, formatPrice, PAYMENT_CONSENT_TEXT } from "@/lib/constants";

export default function BuyAdSlotButton({
  authorId,
  articleId,
  loggedIn,
}: {
  authorId: string;
  articleId: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function buy() {
    if (!loggedIn) {
      router.push(`/login?next=/artykul/${articleId}`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId, articleId, consent: true }),
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

  if (confirming) {
    return (
      <div className="flex h-full min-h-32 w-full flex-col justify-center gap-2 rounded-lg border-2 border-dashed border-black/20 p-3 text-xs dark:border-white/20">
        <p className="text-black/70 dark:text-white/70">{PAYMENT_CONSENT_TEXT}</p>
        <div className="flex gap-2">
          <button
            onClick={buy}
            disabled={loading}
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Przekierowywanie..." : "Akceptuję i płacę"}
          </button>
          <button onClick={() => setConfirming(false)} disabled={loading} className="underline">
            Wróć
          </button>
        </div>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => (loggedIn ? setConfirming(true) : buy())}
      disabled={loading}
      className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-black/20 p-3 text-center text-sm hover:border-black/40 disabled:opacity-50 dark:border-white/20 dark:hover:border-white/40"
    >
      <span className="font-medium">
        {loading ? "Przekierowywanie..." : "Wykup reklamę"}
      </span>
      <span className="text-xs text-black/60 dark:text-white/60">
        pod tekstami tego autora · {formatPrice(AD_PRICE_CENTS)} / 30 dni
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </button>
  );
}
