"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCommentAction, type CommentState } from "./actions";

export default function CommentForm({ articleId }: { articleId: string }) {
  const actionWithId = addCommentAction.bind(null, articleId);
  const [state, formAction, pending] = useActionState<CommentState | undefined, FormData>(
    actionWithId,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Dodaj komentarz…"
        className="rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Wysyłanie..." : "Skomentuj"}
      </button>
    </form>
  );
}
