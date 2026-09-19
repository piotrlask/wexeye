import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FriendButton from "@/components/FriendButton";
import Avatar from "@/components/Avatar";

export default async function ZnajomiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const personSelect = { id: true, name: true, city: true, avatarUrl: true } as const;

  const [incoming, outgoing, accepted, searchResults] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: { requester: { select: personSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { requesterId: userId, status: "PENDING" },
      include: { addressee: { select: personSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: { select: personSelect }, addressee: { select: personSelect } },
      orderBy: { respondedAt: "desc" },
    }),
    query
      ? prisma.user.findMany({
          // Deleted (ETAP 12.4) accounts must never be proposed as a new friend.
          where: { name: { contains: query }, id: { not: userId }, deletedAt: null },
          select: personSelect,
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const friends = accepted.map((f) => (f.requesterId === userId ? f.addressee : f.requester));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Znajomi</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Znajdź osoby</h2>
        <form className="mb-4">
          <input
            name="q"
            defaultValue={query}
            placeholder="Szukaj po imieniu i nazwisku…"
            className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </form>
        {query && (
          <ul className="flex flex-col gap-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-white/60">Brak wyników.</p>
            ) : (
              searchResults.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                >
                  <Link href={`/profil/${u.id}`} className="flex items-center gap-3 hover:underline">
                    <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
                    {u.name}
                    {u.city && <span className="text-black/50 dark:text-white/50"> · {u.city}</span>}
                  </Link>
                  <FriendButton targetUserId={u.id} relation="none" />
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Zaproszenia do Ciebie ({incoming.length})</h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <Link href={`/profil/${f.requester.id}`} className="flex items-center gap-3 hover:underline">
                  <Avatar name={f.requester.name} avatarUrl={f.requester.avatarUrl} size="sm" />
                  {f.requester.name}
                  {f.requester.city && (
                    <span className="text-black/50 dark:text-white/50"> · {f.requester.city}</span>
                  )}
                </Link>
                <FriendButton targetUserId={f.requester.id} relation="pending-received" friendshipId={f.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Wysłane zaproszenia ({outgoing.length})</h2>
          <ul className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <Link href={`/profil/${f.addressee.id}`} className="flex items-center gap-3 hover:underline">
                  <Avatar name={f.addressee.name} avatarUrl={f.addressee.avatarUrl} size="sm" />
                  {f.addressee.name}
                  {f.addressee.city && (
                    <span className="text-black/50 dark:text-white/50"> · {f.addressee.city}</span>
                  )}
                </Link>
                <FriendButton targetUserId={f.addressee.id} relation="pending-sent" friendshipId={f.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Twoi znajomi ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">Nie masz jeszcze znajomych.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {friends.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/profil/${f.id}`}
                  className="flex items-center gap-3 rounded border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  <Avatar name={f.name} avatarUrl={f.avatarUrl} size="sm" />
                  {f.name}
                  {f.city && <span className="text-black/50 dark:text-white/50"> · {f.city}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
