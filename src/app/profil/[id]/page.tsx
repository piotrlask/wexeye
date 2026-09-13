import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getFriendRelation, getAcceptedFriendIds } from "@/lib/friends";
import { GENDER_LABELS, type Gender } from "@/lib/constants";
import FriendButton from "@/components/FriendButton";
import Avatar from "@/components/Avatar";

const ROLE_LABELS: Record<string, string> = { ADMIN: "administrator", EDITOR: "redaktor", READER: "czytelnik" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profileUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, role: true, city: true, gender: true, age: true },
  });
  if (!profileUser) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;

  const [relation, friendship] = await Promise.all([
    getFriendRelation(viewerId, id),
    viewerId
      ? prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: viewerId, addresseeId: id },
              { requesterId: id, addresseeId: viewerId },
            ],
          },
        })
      : null,
  ]);

  // Age/gender/city and the friends list are private — visible only to the
  // profile owner and their accepted friends. Everyone else (including
  // logged-out visitors) only ever gets name/avatar/role. The friends list
  // isn't even queried when the viewer isn't authorized to see it.
  const canSeePrivate = relation === "self" || relation === "friends";

  const friendIds = canSeePrivate ? await getAcceptedFriendIds(id) : [];
  const friends = friendIds.length
    ? await prisma.user.findMany({
        where: { id: { in: friendIds } },
        select: { id: true, name: true, city: true, avatarUrl: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profileUser.name} avatarUrl={profileUser.avatarUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold">{profileUser.name}</h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              {ROLE_LABELS[profileUser.role] ?? profileUser.role}
              {canSeePrivate && profileUser.city && ` · ${profileUser.city}`}
              {canSeePrivate && profileUser.gender && ` · ${GENDER_LABELS[profileUser.gender as Gender] ?? profileUser.gender}`}
              {canSeePrivate && profileUser.age !== null && ` · ${profileUser.age} lat`}
            </p>
          </div>
        </div>
        <FriendButton targetUserId={id} relation={relation} friendshipId={friendship?.id} />
      </div>

      {canSeePrivate && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Znajomi ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Brak znajomych.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {friends.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/profil/${f.id}`}
                    className="flex items-center gap-3 rounded border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    <Avatar name={f.name} avatarUrl={f.avatarUrl} size="sm" />
                    <span>
                      {f.name}
                      {f.city && <span className="text-black/50 dark:text-white/50"> · {f.city}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
