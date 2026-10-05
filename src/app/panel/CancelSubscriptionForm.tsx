"use client";

import { useActionState } from "react";
import { cancelSubscriptionAction, type CancelSubscriptionState } from "./actions";

export default function CancelSubscriptionForm({ periodEnd }: { periodEnd: string }) {
  const [state, formAction, pending] = useActionState<CancelSubscriptionState | undefined, FormData>(
    cancelSubscriptionAction,
    undefined
  );

  if (state?.ok) {
    return (
      <p className="mt-2 text-sm text-green-700 dark:text-green-400">
        Subskrypcja anulowana. Dostęp pozostaje do {periodEnd}; kolejne płatności nie zostaną pobrane.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 text-sm">
      <label className="flex items-start gap-2">
        <input type="checkbox" name="confirm" required className="mt-1" />
        <span>
          Chcę anulować subskrypcję. Dostęp pozostanie do {periodEnd}, potem subskrypcja nie zostanie odnowiona.
        </span>
      </label>
      {state?.error && <p className="text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded border border-black/30 px-3 py-1 disabled:opacity-50 dark:border-white/30"
      >
        {pending ? "Anulowanie..." : "Anuluj subskrypcję"}
      </button>
    </form>
  );
}
