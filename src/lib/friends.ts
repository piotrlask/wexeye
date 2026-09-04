import { prisma } from "@/lib/prisma";

export type FriendRelation = "self" | "friends" | "pending-sent" | "pending-received" | "none";

export async function getFriendRelation(viewerId: string | undefined, targetId: string): Promise<FriendRelation> {
  if (!viewerId) return "none";
  if (viewerId === targetId) return "self";

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: viewerId },
      ],
    },
  });

  if (!friendship) return "none";
  if (friendship.status === "ACCEPTED") return "friends";
  return friendship.requesterId === viewerId ? "pending-sent" : "pending-received";
}

export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}
