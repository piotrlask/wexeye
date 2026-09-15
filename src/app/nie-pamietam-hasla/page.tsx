"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Nie pamiętam hasła</h1>

      {state?.message ? (
        <p className="text-sm text-black/80 dark:text-white/80">{state.message}</p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            E-mail
            <input
              name="email"
              type="email"
              required
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? "Wysyłanie..." : "Wyślij link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-black/60 dark:text-white/60">
        <Link href="/login" className="underline">
          Wróć do logowania
        </Link>
      </p>
    </div>
  );
}
