"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NearYouLocation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "unsupported">("idle");

  const hasCoords = searchParams.has("lat") && searchParams.has("lng");

  useEffect(() => {
    if (hasCoords) return;
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", pos.coords.latitude.toFixed(4));
        params.set("lng", pos.coords.longitude.toFixed(4));
        router.replace(`/?${params.toString()}`);
      },
      () => setStatus("denied"),
      { timeout: 8000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords]);

  if (hasCoords) return null;

  if (status === "locating") {
    return (
      <p className="mb-4 text-sm text-black/60 dark:text-white/60">Ustalanie Twojej lokalizacji…</p>
    );
  }
  if (status === "denied" || status === "unsupported") {
    return (
      <p className="mb-4 text-sm text-black/60 dark:text-white/60">
        Nie udało się ustalić lokalizacji — zezwól przeglądarce na dostęp do lokalizacji, aby zobaczyć
        publikacje z Twojej okolicy.
      </p>
    );
  }
  return null;
}
