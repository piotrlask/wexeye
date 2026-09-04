"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPaymentAction } from "./actions";

export default function PaymentForm() {
  const [state, formAction, pending] = useActionState(addPaymentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Opis
        <input name="description" required placeholder="np. honorarium za sierpień" className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kwota (PLN)
        <input name="amount" type="number" min="0.01" step="0.01" required className="rounded border border-black/20 px-3 py-2 dark:border-white/20" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Dodawanie..." : "Dodaj płatność"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
