"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type NotificationActionState = { error?: string; success?: boolean };

/**
 * Ownership is enforced in the WHERE clause itself (userId must match the
 * caller's own session id), not via a separate pre-check — so a notification
 * id belonging to another user simply matches zero rows instead of being
 * readable or writable via a crafted id.
 */
export async function markNotificationReadAction(notificationId: string): Promise<NotificationActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Musisz być zalogowany." };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/powiadomienia");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Musisz być zalogowany." };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/powiadomienia");
  return { success: true };
}
