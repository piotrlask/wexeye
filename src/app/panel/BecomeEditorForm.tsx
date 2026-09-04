"use client";

import { useActionState } from "react";
import { becomeEditorAction } from "./actions";

export default function BecomeEditorForm() {
  const [state, formAction, pending] = useActionState(becomeEditorAction, undefined);

  if (state?.success) {
    return (
      <p className="text-sm text-green-600">
        Gotowe! Masz teraz konto redaktora. Odśwież stronę, aby zobaczyć panel redaktora w menu.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Kod polecający redaktora (opcjonalnie)
        <input
          name="referralCode"
          placeholder="zostaw puste, aby dołączyć bezpośrednio"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Dołączanie..." : "Zostań redaktorem (bezpłatnie)"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
