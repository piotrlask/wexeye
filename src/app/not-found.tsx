import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nie znaleziono strony",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm font-medium text-gray-500">Błąd 404</p>
      <h1 className="mt-2 text-2xl font-semibold">Nie znaleziono strony</h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        Strona nie istnieje albo została usunięta. Sprawdź adres lub przejdź do strony głównej.
      </p>
      <div className="mt-8 flex justify-center gap-4 text-sm">
        <Link href="/" className="font-medium underline">
          Strona główna
        </Link>
        <Link href="/eksploruj" className="font-medium underline">
          Eksploruj
        </Link>
      </div>
    </main>
  );
}
