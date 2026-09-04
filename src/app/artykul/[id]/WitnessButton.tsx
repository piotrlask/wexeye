"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markWitnessAction } from "./actions";

export default function WitnessButton({
  articleId,
  count,
  alreadyMarked,
  loggedIn,
}: {
  articleId: string;
  count: number;
  alreadyMarked: boolean;
  loggedIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!loggedIn) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        {count} {count === 1 ? "osoba potwierdziła" : "osób potwierdziło"} bycie świadkiem.{" "}
        <a href="/login" className="underline">
          Zaloguj się
        </a>
        , aby też oznaczyć.
      </p>
    );
  }

  return (
    <button
      disabled={isPending || alreadyMarked}
      onClick={() =>
        startTransition(async () => {
          await markWitnessAction(articleId);
          router.refresh();
        })
      }
      className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
    >
      {alreadyMarked ? `✓ Jesteś świadkiem (${count})` : `I witnessed this (${count})`}
    </button>
  );
}
