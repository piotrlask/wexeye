"use client";

import { useTransition } from "react";
import { markPaymentPaidAction } from "./actions";

export default function PaymentRow({
  paymentId,
  description,
  amount,
  status,
}: {
  paymentId: string;
  description: string;
  amount: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
      <span>
        {description} — {amount}
      </span>
      {status === "PAID" ? (
        <span className="text-green-600">Opłacone</span>
      ) : (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => markPaymentPaidAction(paymentId))}
          className="rounded border px-3 py-1 disabled:opacity-50"
        >
          Oznacz jako opłacone
        </button>
      )}
    </li>
  );
}
