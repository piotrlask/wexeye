"use client";

import { useTransition } from "react";
import { moderateArticleAction } from "./actions";

export default function ModerationItem({
  articleId,
  title,
  author,
  category,
}: {
  articleId: string;
  title: string;
  author: string;
  category: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-black/60 dark:text-white/60">
          {author} · {category}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => moderateArticleAction(articleId, true))}
          className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50"
        >
          Zatwierdź
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => moderateArticleAction(articleId, false))}
          className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
        >
          Odrzuć
        </button>
      </div>
    </li>
  );
}
