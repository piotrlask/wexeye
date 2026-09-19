"use client";

import { useActionState } from "react";
import { retryArticleQuarantineAction, type TakedownState } from "./actions";

/** One taken-down article in the admin list, with a retry for the media quarantine (ETAP 13.3C). */
export default function TakedownRow({
  articleId,
  title,
  author,
  takedownAt,
  reason,
  unquarantinedMedia,
}: {
  articleId: string;
  title: string;
  author: string;
  takedownAt: string;
  reason: string;
  unquarantinedMedia: number;
}) {
  const bound = retryArticleQuarantineAction.bind(null, articleId);
  const [state, formAction, pending] = useActionState<TakedownState | undefined, FormData>(bound, undefined);

  return (
    <li className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
      <p className="font-medium">{title}</p>
      <p className="text-black/60 dark:text-white/60">
        {author} · ukryto {takedownAt}
      </p>
      <p className="mt-1 break-words text-black/70 dark:text-white/70">Powód: {reason}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className={unquarantinedMedia > 0 ? "text-red-700 dark:text-red-400" : "text-black/50 dark:text-white/50"}>
          Media bez kwarantanny: {unquarantinedMedia}
        </span>
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-black/20 px-2 py-0.5 disabled:opacity-50 dark:border-white/20"
          >
            {pending ? "Przenoszenie..." : "Ponów kwarantannę mediów"}
          </button>
        </form>
      </div>
      {state?.error && <p className="mt-1 text-red-600">{state.error}</p>}
      {state?.success && (
        <p
          className={
            state.severity === "CRITICAL" || state.severity === "ERROR"
              ? "mt-1 font-semibold text-red-700 dark:text-red-400"
              : state.severity === "WARNING"
                ? "mt-1 text-amber-700 dark:text-amber-400"
                : "mt-1 text-green-700 dark:text-green-400"
          }
        >
          {state.message}
        </p>
      )}
    </li>
  );
}
