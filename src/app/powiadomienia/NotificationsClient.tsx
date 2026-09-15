"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";

export type NotificationListItem = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export default function NotificationsClient({
  notifications,
  unreadCount,
}: {
  notifications: NotificationListItem[];
  unreadCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  if (notifications.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Nie masz jeszcze żadnych powiadomień.</p>;
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            disabled={isPending}
            onClick={() => run(() => markAllNotificationsReadAction())}
            className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            Oznacz wszystkie jako przeczytane
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {notifications.map((n) => {
          const unread = !n.readAt;
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className={unread ? "font-semibold" : ""}>{n.title}</span>
                {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="nieprzeczytane" />}
              </div>
              <p className="text-black/70 dark:text-white/70">{n.message}</p>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">{n.createdAt.toLocaleString("pl-PL")}</p>
            </>
          );

          const itemClassName = `block rounded border px-3 py-2 text-sm ${
            unread
              ? "border-black/20 bg-black/[0.03] dark:border-white/20 dark:bg-white/[0.06]"
              : "border-black/10 dark:border-white/10"
          }`;

          return (
            <li key={n.id}>
              {n.link ? (
                <Link
                  href={n.link}
                  onClick={() => unread && run(() => markNotificationReadAction(n.id))}
                  className={`${itemClassName} hover:bg-black/5 dark:hover:bg-white/10`}
                >
                  {content}
                </Link>
              ) : (
                <div className={itemClassName}>
                  {content}
                  {unread && (
                    <button
                      disabled={isPending}
                      onClick={() => run(() => markNotificationReadAction(n.id))}
                      className="mt-2 rounded border border-black/20 px-2 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
                    >
                      Oznacz jako przeczytane
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
