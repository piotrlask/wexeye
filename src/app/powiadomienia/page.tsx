import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NotificationsClient from "./NotificationsClient";

export default async function PowiadomieniaPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

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
