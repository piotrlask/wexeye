"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendFriendRequestAction,
  acceptFriendRequestAction,
  removeFriendshipAction,
} from "@/app/znajomi/actions";
import type { FriendRelation } from "@/lib/friends";

export default function FriendButton({
  targetUserId,
  relation,
  friendshipId,
}: {
  targetUserId: string;
  relation: FriendRelation;
  friendshipId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  if (relation === "self") return null;

  if (relation === "friends") {
    return (
      <button
        disabled={isPending}
        onClick={() => friendshipId && run(() => removeFriendshipAction(friendshipId))}
        className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        ✓ Znajomi — usuń
      </button>
    );
  }

  if (relation === "pending-sent") {
    return (
      <button
        disabled={isPending}
        onClick={() => friendshipId && run(() => removeFriendshipAction(friendshipId))}
        className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        Zaproszenie wysłane — anuluj
      </button>
    );
  }

  if (relation === "pending-received") {
    return (
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => friendshipId && run(() => acceptFriendRequestAction(friendshipId))}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Zaakceptuj zaproszenie
        </button>
        <button
          disabled={isPending}
          onClick={() => friendshipId && run(() => removeFriendshipAction(friendshipId))}
          className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
        >
          Odrzuć
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => run(() => sendFriendRequestAction(targetUserId))}
      className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
      Zaproś do znajomych
    </button>
  );
}
