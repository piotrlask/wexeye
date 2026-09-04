"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockWithSubscriptionAction } from "./actions";

export default function UnlockButton({
  articleId,
  remaining,
}: {
  articleId: string;
  remaining: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await unlockWithSubscriptionAction(articleId);
          if (result.success) router.refresh();
        })
      }
      className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {isPending
        ? "Odblokowywanie..."
        : `Odblokuj tym artykułem${remaining !== null ? ` (pozostało ${remaining})` : ""}`}
    </button>
  );
}
