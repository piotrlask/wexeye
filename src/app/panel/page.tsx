import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRICING } from "@/lib/constants";
import BecomeEditorForm from "./BecomeEditorForm";
import CheckoutButtons from "@/components/CheckoutButtons";
import ProfileForm from "./ProfileForm";
import { getAcceptedFriendIds } from "@/lib/friends";
import Avatar from "@/components/Avatar";

const TIER_LABELS: Record<string, string> = {
  SUB20: PRICING.SUB20.label,
  SUB30: PRICING.SUB30.label,
};

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ joinEditor?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { joinEditor } = await searchParams;

  const [user, subscription, purchases, friendCount, pendingReceivedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        gender: true,
        age: true,
        role: true,
        referralCode: true,
      },
    }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.purchase.findMany({
      where: { userId: session.user.id, status: "PAID" },
      include: { article: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }],
      },
    }),
    prisma.friendship.count({ where: { addresseeId: session.user.id, status: "PENDING" } }),
  ]);

  if (!user) return null;

  const friendIds = await getAcceptedFriendIds(user.id);
  const friendShares = friendIds.length
    ? await prisma.share.findMany({
        where: { userId: { in: friendIds } },
        include: {
          user: { select: { name: true, avatarUrl: true } },
          article: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Twoje konto</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Profil</h2>
        <ProfileForm name={user.name} avatarUrl={user.avatarUrl} city={user.city} gender={user.gender} age={user.age} />
        <p className="mt-4 text-sm">
          <Link href={`/profil/${user.id}`} className="underline">
            Zobacz swój publiczny profil
          </Link>
          {" · "}
          <Link href="/znajomi" className="underline">
            Znajomi ({friendCount})
            {pendingReceivedCount > 0 && (
              <span className="ml-1 rounded-full bg-black px-1.5 py-0.5 text-xs text-white dark:bg-white dark:text-black">
                {pendingReceivedCount} nowe
              </span>
            )}
          </Link>
        </p>
      </section>

      {friendShares.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Od znajomych</h2>
          <ul className="flex flex-col gap-2">
            {friendShares.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <Avatar name={s.user.name} avatarUrl={s.user.avatarUrl} size="sm" />
                <span>
                  <span className="text-black/60 dark:text-white/60">{s.user.name} udostępnił(a):</span>{" "}
                  <Link href={`/artykul/${s.articleId}`} className="underline">
                    {s.article.title}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Dostęp do treści</h2>
        {subscription && subscription.status === "ACTIVE" && subscription.currentPeriodEnd > new Date() ? (
          <p className="text-sm">
            Aktywna subskrypcja: <strong>{TIER_LABELS[subscription.tier]}</strong>
            {subscription.tier === "SUB20" && (
              <> — wykorzystano {subscription.articlesUsedInPeriod}/20 artykułów w tym okresie.</>
            )}
            {" "}Odnowienie: {subscription.currentPeriodEnd.toLocaleDateString("pl-PL")}.
          </p>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            Brak aktywnej subskrypcji. Pojedyncze artykuły możesz kupić bezpośrednio na ich stronie za{" "}
            {(PRICING.ARTICLE.amountCents / 100).toFixed(2)}$.
          </p>
        )}
        <div className="mt-4">
          <CheckoutButtons />
        </div>
      </section>

      {purchases.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Historia zakupów</h2>
          <ul className="flex flex-col gap-2">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span>{p.article ? p.article.title : TIER_LABELS[p.type] ?? p.type}</span>
                <span className="text-black/60 dark:text-white/60">
                  {(p.amountCents / 100).toFixed(2)}$ · {p.createdAt.toLocaleDateString("pl-PL")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className={
          joinEditor && user.role === "READER"
            ? "rounded-lg border-2 border-black p-4 dark:border-white"
            : undefined
        }
      >
        <h2 className="mb-3 text-lg font-semibold">Zespół redakcyjny</h2>
        {user.role === "READER" && (
          <>
            {joinEditor && (
              <p className="mb-3 text-sm">
                Aby dodać publikację, dołącz najpierw (bezpłatnie) do zespołu redakcyjnego.
              </p>
            )}
            <p className="mb-3 text-sm text-black/60 dark:text-white/60">
              Dołączenie do zespołu redakcyjnego jest bezpłatne. Jako redaktor będziesz mógł dodawać
              treści i zarabiać na udziale w przychodach generowanych przez Twój zespół.
            </p>
            <BecomeEditorForm />
          </>
        )}
        {user.role !== "READER" && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Jesteś już częścią zespołu redakcyjnego ({user.role === "ADMIN" ? "administrator" : "redaktor"}).
            Twój kod polecający: <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">{user.referralCode}</code>
          </p>
        )}
      </section>
    </div>
  );
}
