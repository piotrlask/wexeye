import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { NotificationType } from "@/lib/constants";

type Db = typeof prisma | Prisma.TransactionClient;

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

/**
 * Server-only helper. `userId` must always be derived from trusted
 * server-side data (session/DB lookups) by the caller — never from
 * client-supplied input — since this is the sole recipient boundary.
 */
export async function createNotification(input: NotificationInput, db: Db = prisma) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });
}

export async function createNotifications(inputs: NotificationInput[], db: Db = prisma) {
  if (inputs.length === 0) return;
  return db.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    })),
  });
}
