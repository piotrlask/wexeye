"use client";

import { useState, useTransition } from "react";
import { shareWithFriendsAction } from "./actions";

export default function ShareButton({ articleId, loggedIn }: { articleId: string; loggedIn: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [shared, setShared] = useState(false);

  if (!loggedIn) return null;

  return (
    <button
      disabled={isPending || shared}
      onClick={() =>
        startTransition(async () => {
          const result = await shareWithFriendsAction(articleId);
          if (result.success) setShared(true);
        })
      }
      className="rounded-full border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
    >
      {shared ? "Udostępniono znajomym" : "Udostępnij znajomym"}
    </button>
  );
}
