"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "./actions";

const INVALID_LINK_MESSAGE = "Link resetowania hasła jest nieprawidłowy lub wygasł.";

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);
  // null = still checking; "" = checked, nothing found; otherwise the token.
  const [token, setToken] = useState<string | null>(null);
  // Clearing the hash below is NOT idempotent — React Strict Mode runs
  // effects twice in development, and a second run would read the
  // already-cleared hash and overwrite the real token with "". This ref
  // makes the read-and-clear happen effectively once regardless.
  const hasReadToken = useRef(false);

  useEffect(() => {
    if (hasReadToken.current) return;
    hasReadToken.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const found = params.get("token") ?? "";
    setToken(found);

    // Strip the fragment from the address bar (and from this history entry)
    // immediately — no reason for the token to linger anywhere visible once
    // it's been read into memory. This never touches the server: it's a
    // pure client-side History API call, not a navigation.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (state?.success) {
    return (
      <div>
        <p className="text-sm text-black/80 dark:text-white/80">
          Hasło zostało zmienione. Możesz się teraz zalogować.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  // Still reading the fragment on first render (avoids a flash of the
  // "invalid" message before useEffect has had a chance to run).
  if (token === null) {
    return null;
  }

  if (!token) {
    return <p className="text-sm text-red-600">{INVALID_LINK_MESSAGE}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-sm">
        Nowe hasło
        <input
          name="password"
          type="password"
          required
          minLength={10}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Powtórz nowe hasło
        <input
          name="passwordConfirm"
          type="password"
          required
          minLength={10}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Zapisywanie..." : "Ustaw nowe hasło"}
      </button>
    </form>
  );
}
