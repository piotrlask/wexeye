"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "./actions";

const CONFIRM_WORD = "USUŃ";

export default function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, undefined);
  const router = useRouter();
  const [confirmWord, setConfirmWord] = useState("");

  useEffect(() => {
    if (!state?.success) return;
    const timeout = setTimeout(() => router.push("/"), 2000);
    return () => clearTimeout(timeout);
  }, [state?.success, router]);

  if (state?.success) {
    return (
      <p className="text-sm text-green-600">
        Konto zostało usunięte. Za chwilę zostaniesz przekierowany/a na stronę główną.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <p className="text-sm text-black/60 dark:text-white/60">
        Ta operacja jest nieodwracalna. Twoje imię i dane profilowe zostaną zastąpione napisem
        „Usunięty użytkownik”, a logowanie na to konto nie będzie już możliwe. Twoje artykuły i
        komentarze pozostaną widoczne publicznie, ale z anonimowym autorem. Historia zakupów i
        rozliczeń zostaje zachowana.
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
        {`Wpisz „${CONFIRM_WORD}”, aby potwierdzić`}
        <input
          name="confirmWord"
          type="text"
          required
          value={confirmWord}
          onChange={(e) => setConfirmWord(e.target.value)}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending || confirmWord !== CONFIRM_WORD}
        className="self-start rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Usuwanie..." : "Usuń konto"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
