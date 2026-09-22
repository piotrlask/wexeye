"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Logowanie</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
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
            autoComplete="current-password"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Logowanie..." : "Zaloguj się"}
        </button>
      </form>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        <Link href="/nie-pamietam-hasla" className="underline">Nie pamiętam hasła</Link>
      </p>
      <p className="mt-4 text-sm text-black/60 dark:text-white/60">
        Nie masz konta? <Link href="/rejestracja" className="underline">Zarejestruj się</Link>
      </p>
    </div>
  );
}
