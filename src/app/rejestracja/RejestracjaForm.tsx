"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "./actions";
import { MIN_AGE, MIN_AGE_WITH_PARENTAL_CONSENT } from "@/lib/legal";

export default function RejestracjaForm() {
  const [state, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-semibold">Rejestracja</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Załóż darmowe konto czytelnika. Możliwość dołączenia do zespołu redakcyjnego (bezpłatnie)
        znajdziesz później w swoim panelu.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Imię i nazwisko
          <input
            name="name"
            required
            autoComplete="name"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hasło
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
          <span className="text-xs text-black/60 dark:text-white/60">Minimum 10 znaków.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Powtórz hasło
          <input
            name="passwordConfirm"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Wiek</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="ageConfirmation" value="18_PLUS" required className="mt-1" />
            <span>Mam ukończone {MIN_AGE} lat.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="ageConfirmation" value="16_PARENTAL" className="mt-1" />
            <span>
              Mam ukończone {MIN_AGE_WITH_PARENTAL_CONSENT} lat i mam zgodę rodzica lub opiekuna prawnego na założenie
              konta.
            </span>
          </label>
        </fieldset>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" required className="mt-1" />
          <span>
            Akceptuję{" "}
            <Link href="/regulamin" className="underline" target="_blank">
              Regulamin
            </Link>{" "}
            i zapoznałem/zapoznałam się z{" "}
            <Link href="/prywatnosc" className="underline" target="_blank">
              Polityką prywatności
            </Link>
            .
          </span>
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Tworzenie konta..." : "Zarejestruj się"}
        </button>
      </form>
      <p className="mt-4 text-sm text-black/60 dark:text-white/60">
        Masz już konto? <Link href="/login" className="underline">Zaloguj się</Link>
      </p>
    </div>
  );
}
