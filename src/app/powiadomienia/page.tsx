import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NotificationsClient from "./NotificationsClient";

export default async function PowiadomieniaPage() {
  const session = await auth();
  const userId = session?.user?.id;
  // ETAP 13.3C.4F.1 (A3/18): a guest previously got a silently blank page —
  // send them to log in and back, same "next" mechanism the proxy uses for
  // /panel. This path is a fixed literal (not user input), so there is
  // nothing here for getSafeRedirectPath to validate.
  if (!userId) redirect("/login?next=%2Fpowiadomienia");

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, message: true, link: true, readAt: true, createdAt: true },
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Powiadomienia</h1>
      <NotificationsClient notifications={notifications} unreadCount={unreadCount} />
    </div>
  );
}
