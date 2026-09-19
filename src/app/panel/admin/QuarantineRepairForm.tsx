"use client";

import { useActionState } from "react";
import { reconcileQuarantineAction, type QuarantineActionState } from "./actions";

/**
 * "Sprawdź i napraw kwarantannę" (ETAP 13.3C.2): runs the preflight plus one
 * bounded reconciliation batch. When the result says there is more, the next
 * press continues with the next batch (cursor).
 */
export default function QuarantineRepairForm() {
  const [state, formAction, pending] = useActionState<QuarantineActionState | undefined, FormData>(
    reconcileQuarantineAction,
    undefined
  );
  const bad = state?.severity === "CRITICAL" || state?.severity === "ERROR";

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="cursor" value={state?.nextCursor ?? ""} />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/30 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/30"
      >
        {pending ? "Sprawdzanie..." : state?.nextCursor ? "Sprawdź kolejną partię" : "Sprawdź i napraw kwarantannę"}
      </button>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p
          className={`mt-2 text-sm ${
            bad
              ? "font-semibold text-red-700 dark:text-red-400"
              : state.severity === "WARNING"
                ? "text-amber-700 dark:text-amber-400"
                : "text-green-700 dark:text-green-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
