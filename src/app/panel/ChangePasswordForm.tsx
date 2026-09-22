"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      {/* ETAP 13.3C.4F.1 (A11): passwordChangedAt (set by changePasswordAction)
          invalidates every existing JWT on its next read (see src/auth.ts's
          jwt callback) — the user should know that BEFORE submitting, not be
          surprised by a silent logout. */}
      <p className="text-sm text-black/60 dark:text-white/60">
        Po zmianie hasła zostaniesz wylogowany i konieczne będzie ponowne zalogowanie.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Obecne hasło
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nowe hasło
        <input
          name="newPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Powtórz nowe hasło
        <input
          name="newPasswordConfirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Zapisywanie..." : "Zmień hasło"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Hasło zostało zmienione.</p>}
    </form>
  );
}
