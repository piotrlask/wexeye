"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type FriendActionState = { error?: string; success?: boolean };

export async function sendFriendRequestAction(targetUserId: string): Promise<FriendActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Musisz być zalogowany." };
  if (session.user.id === targetUserId) return { error: "Nie możesz zaprosić samego siebie." };

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return { error: "Nie znaleziono użytkownika." };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: session.user.id },
      ],
    },
  });
  if (existing) return { error: "Zaproszenie już istnieje." };

  await prisma.friendship.create({
    data: { requesterId: session.user.id, addresseeId: targetUserId, status: "PENDING" },
  });

  revalidatePath("/znajomi");
  revalidatePath(`/profil/${targetUserId}`);
  return { success: true };
}

async function requireFriendshipParty(friendshipId: string, userId: string) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) return null;
  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) return null;
  return friendship;
}

export async function acceptFriendRequestAction(friendshipId: string): Promise<FriendActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Musisz być zalogowany." };

  const friendship = await requireFriendshipParty(friendshipId, session.user.id);
  if (!friendship || friendship.addresseeId !== session.user.id) {
    return { error: "Nie można zaakceptować tego zaproszenia." };
  }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  revalidatePath("/znajomi");
  return { success: true };
}

export async function removeFriendshipAction(friendshipId: string): Promise<FriendActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Musisz być zalogowany." };

  const friendship = await requireFriendshipParty(friendshipId, session.user.id);
  if (!friendship) return { error: "Nie znaleziono zaproszenia." };

  await prisma.friendship.delete({ where: { id: friendshipId } });

  revalidatePath("/znajomi");
  return { success: true };
}
