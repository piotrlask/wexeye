"use client";

import Link from "next/link";

// Last-resort boundary for errors in the root layout itself. It replaces the
// whole document, so it renders its own <html>/<body>. Plain markup only: the
// app's stylesheet may not be available here and the CSP blocks inline styles.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="pl">
      <body>
        <main>
          <h1>Serwis jest chwilowo niedostępny</h1>
          <p>Spróbuj ponownie za chwilę.</p>
          {error.digest && <p>Kod błędu: {error.digest}</p>}
          <p>
            <Link href="/">Strona główna</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
