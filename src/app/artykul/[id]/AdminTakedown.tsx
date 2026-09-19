"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  emergencyTakedownArticleAction,
  emergencyHideCommentAction,
  type TakedownState,
} from "@/app/panel/admin/actions";

/**
 * Admin-only emergency takedown control (ETAP 13.3C). Rendered by the article
 * page only when a fresh DB check says the viewer is ADMIN — but that is just
 * a UI convenience: the server actions re-verify ADMIN on every call.
 * Two steps on purpose (open the panel, give a reason, then confirm).
 */
export default function AdminTakedown({ kind, targetId }: { kind: "article" | "comment"; targetId: string }) {
  const bound =
    kind === "article"
      ? emergencyTakedownArticleAction.bind(null, targetId)
      : emergencyHideCommentAction.bind(null, targetId);
  const [state, formAction, pending] = useActionState<TakedownState | undefined, FormData>(bound, undefined);

  const isArticle = kind === "article";
  const confirmText = isArticle
    ? "Ukryć ten artykuł awaryjnie? Zniknie z widoku publicznego, a jego pliki zostaną przeniesione do kwarantanny."
    : "Ukryć ten komentarz awaryjnie? Zniknie z widoku publicznego.";

  return (
    <details className="mt-2 rounded border border-red-600/40 p-2 text-sm">
      <summary className="cursor-pointer font-medium text-red-700 dark:text-red-400">
        Ukryj awaryjnie (administrator)
      </summary>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(confirmText)) e.preventDefault();
        }}
        className="mt-2 flex flex-col gap-2"
      >
        <p className="text-xs text-black/60 dark:text-white/60">
          {isArticle
            ? "Ukrycie jest natychmiastowe. Nic nie jest kasowane: artykuł, płatności i prowizje zostają w bazie, a pliki multimedialne trafiają do prywatnej kwarantanny."
            : "Ukrycie jest natychmiastowe. Komentarz i jego autor zostają w bazie."}{" "}
          Powód jest widoczny tylko dla administratorów.
        </p>
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={1000}
          rows={2}
          placeholder="Powód ukrycia (wymagany)"
          className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
        >
          {pending ? "Ukrywanie..." : "Potwierdź ukrycie awaryjne"}
        </button>
        {state?.error && <p className="text-red-600">{state.error}</p>}
        {state?.success && (
          <p
            className={
              state.severity === "CRITICAL" || state.severity === "ERROR"
                ? "font-semibold text-red-700 dark:text-red-400"
                : state.severity === "WARNING"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-green-700 dark:text-green-400"
            }
          >
            {state.message}{" "}
            {isArticle && (
              <Link href="/panel/admin" className="underline">
                Przejdź do panelu administratora
              </Link>
            )}
          </p>
        )}
      </form>
    </details>
  );
}
