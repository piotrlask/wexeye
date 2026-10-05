"use client";

import Link from "next/link";

// Route-level error boundary. Shows only a generic message and Next's opaque
// digest (useful for matching server logs) — never the error message or stack.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm font-medium text-gray-500">Błąd</p>
      <h1 className="mt-2 text-2xl font-semibold">Coś poszło nie tak</h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        Nie udało się wyświetlić tej strony. Spróbuj ponownie za chwilę.
      </p>
      {error.digest && <p className="mt-2 text-xs text-gray-400">Kod błędu: {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-4 text-sm">
        <button type="button" onClick={() => reset()} className="font-medium underline">
          Spróbuj ponownie
        </button>
        <Link href="/" className="font-medium underline">
          Strona główna
        </Link>
      </div>
    </main>
  );
}
