"use client";

import { useState, useTransition } from "react";
import { moderateArticleAction, type FormState } from "./actions";

const REVIEW_NOTE_MAX = 1000;

type PreviewMedia = { id: string; type: string; url: string };

export default function ModerationItem({
  articleId,
  title,
  author,
  category,
  subcategory,
  body,
  media,
}: {
  articleId: string;
  title: string;
  author: string;
  category: string;
  subcategory: string | null;
  body: string;
  media: PreviewMedia[];
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState("");

  function approve() {
    setResult(null);
    startTransition(async () => {
      setResult(await moderateArticleAction(articleId, true));
    });
  }

  function submitReject(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Odrzucić artykuł „${title}”? Autor zobaczy Twoją notatkę (jeśli ją dodasz).`)) return;
    setResult(null);
    const trimmed = note.trim();
    startTransition(async () => {
      const res = await moderateArticleAction(articleId, false, trimmed || undefined);
      setResult(res);
      if (res.success) setShowReject(false);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-black/60 dark:text-white/60">
            {author} · {category}
            {subcategory && ` · ${subcategory}`}
          </p>
        </div>
        {!showReject && (
          <div className="flex shrink-0 gap-2">
            <button
              disabled={isPending}
              onClick={approve}
              className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50"
            >
              Zatwierdź
            </button>
            <button
              disabled={isPending}
              onClick={() => setShowReject(true)}
              className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
            >
              Odrzuć
            </button>
          </div>
        )}
      </div>

      {/* ETAP 13.3C.4F.1 (A2): full content preview so a moderator never
          approves/rejects "blind" — collapsed by default. ADMIN-only, same as
          the rest of this page (see requireAdmin() in actions.ts and the
          fresh isAdmin() check gating the whole /panel/admin page). This does
          not add any new public route: these media URLs are the same ones
          already written under public/uploads by addContentAction. */}
      <details className="text-black/70 dark:text-white/70">
        <summary className="cursor-pointer text-xs font-medium text-black/50 dark:text-white/50">
          Podgląd treści
        </summary>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{body}</p>
        {media.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {media.map((m) =>
              m.type === "PHOTO" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id} src={m.url} alt="" className="aspect-video w-full rounded object-cover" />
              ) : (
                <video key={m.id} src={m.url} controls className="aspect-video w-full rounded" />
              )
            )}
          </div>
        )}
      </details>

      {showReject && (
        <form onSubmit={submitReject} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs">
            Uwagi dla autora (opcjonalnie)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={REVIEW_NOTE_MAX}
              rows={2}
              placeholder="Dlaczego treść nie została zatwierdzona?"
              className="rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
            >
              {isPending ? "Odrzucanie..." : "Potwierdź odrzucenie"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowReject(false);
                setNote("");
              }}
              className="rounded border border-black/20 px-3 py-1 disabled:opacity-50 dark:border-white/20"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
      {result?.success && <p className="text-xs text-green-600">Przetworzono.</p>}
    </li>
  );
}
