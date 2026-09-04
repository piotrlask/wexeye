"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import EyeIcon from "@/components/EyeIcon";
import { setReactionAction } from "./actions";

export default function ReactionButtons({
  articleId,
  okCount,
  notOkCount,
  myReaction,
  loggedIn,
}: {
  articleId: string;
  okCount: number;
  notOkCount: number;
  myReaction: "OK" | "NOT_OK" | null;
  loggedIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function react(type: "OK" | "NOT_OK") {
    if (!loggedIn) return;
    startTransition(async () => {
      await setReactionAction(articleId, type);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={isPending || !loggedIn}
        onClick={() => react("OK")}
        title="OK"
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50 ${
          myReaction === "OK"
            ? "border-green-500 bg-green-500/10 text-green-600"
            : "border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        }`}
      >
        <EyeIcon className="h-12 w-20 text-green-500" />
        {okCount}
      </button>
      <button
        disabled={isPending || !loggedIn}
        onClick={() => react("NOT_OK")}
        title="Not OK"
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50 ${
          myReaction === "NOT_OK"
            ? "border-red-500 bg-red-500/10 text-red-600"
            : "border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        }`}
      >
        <EyeIcon className="h-12 w-20 text-red-500" />
        {notOkCount}
      </button>
      {!loggedIn && (
        <span className="text-xs text-black/50 dark:text-white/50">
          <a href="/login" className="underline">
            Zaloguj się
          </a>
          , aby oceniać.
        </span>
      )}
    </div>
  );
}
