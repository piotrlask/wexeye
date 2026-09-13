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

  const requesterId = session.user.id;
  const addresseeId = targetUserId;

  try {
    // A relationship between two users is the same regardless of who sent
    // the request (getFriendRelation/getAcceptedFriendIds both look in
    // either direction), but the schema stores it as one directed row, so
    // two concurrent requests in OPPOSITE directions (A invites B at the
    // same moment B invites A) could each pass the "no existing row" check
    // before either commits, producing two rows for what the app treats as
    // one relationship — the @@unique([requesterId, addresseeId]) index
    // only catches the same-direction case. Locking both users' rows in a
    // fixed (sorted) order — same pattern as becomeEditorAction's sponsor
    // lock — serializes any concurrent attempt touching this pair, in
    // either direction, so the second transaction's existence check always
    // sees the first one's committed row.
    const [firstId, secondId] = [requesterId, addresseeId].sort();
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id IN (${firstId}, ${secondId}) ORDER BY id FOR UPDATE`;

      const existing = await tx.friendship.findFirst({
        where: {
          OR: [
            { requesterId, addresseeId },
            { requesterId: addresseeId, addresseeId: requesterId },
          ],
        },
      });
      if (existing) throw new Error("ALREADY_EXISTS");

      await tx.friendship.create({ data: { requesterId, addresseeId, status: "PENDING" } });
    });
  } catch (err) {
    // Defense in depth, not the primary guard: the lock above already
    // serializes same-pair attempts, but if a same-direction row ever slips
    // through some other path, the DB's own @@unique index still rejects it
    // with P2002 — treated the same as our own "already exists" check, not
    // swallowed as a generic catch-all.
    const isKnownDuplicate =
      (err instanceof Error && err.message === "ALREADY_EXISTS") ||
      (typeof err === "object" && err !== null && "code" in err && err.code === "P2002");
    if (isKnownDuplicate) {
      return { error: "Zaproszenie już istnieje." };
    }
    throw err;
  }

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
