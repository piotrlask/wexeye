import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStaffAccess } from "@/lib/access";
import { getTeamTree, countDescendants } from "@/lib/team";
import ContentForm from "./ContentForm";
import TeamTreeView from "@/components/TeamTreeView";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Szkic",
  PENDING: "Czeka na zatwierdzenie",
  PUBLISHED: "Opublikowany",
  REJECTED: "Odrzucony",
  TAKEN_DOWN: "Ograniczony przez administrację",
};

const TABS = [
  { key: "tresci", label: "Treści" },
  { key: "redakcja", label: "Redakcja" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function DodajPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  // Defense in depth: middleware.ts already gates this route to EDITOR/ADMIN,
  // but the page itself must not rely on that alone (see CLAUDE.md #8).
  if (!userId || !(await hasStaffAccess(userId))) return null;

  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "tresci";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Panel redaktora</h1>

      <div className="mb-6 flex gap-2 border-b border-black/10 pb-3 dark:border-white/10">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/panel/dodaj?tab=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === t.key
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "tresci" ? (
        <ContentTab userId={userId} />
      ) : (
        <TeamTab userId={userId} />
      )}
    </div>
  );
}

async function ContentTab({ userId }: { userId: string }) {
  const myArticles = await prisma.article.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <>
      <ContentForm />

      <h2 className="mt-10 mb-4 text-lg font-semibold">Twoje zgłoszenia</h2>
      {myArticles.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Brak zgłoszeń.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {myArticles.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              <span>{a.title}</span>
              <span className="text-black/60 dark:text-white/60">{STATUS_LABELS[a.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function TeamTab({ userId }: { userId: string }) {
  const [user, commissions, adRevenue, tree] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
    prisma.commission.aggregate({ where: { editorId: userId }, _sum: { amountCents: true } }),
    prisma.adRevenueShare.aggregate({ where: { userId }, _sum: { amountCents: true } }),
    getTeamTree(userId),
  ]);

  const totalEarnedCents = commissions._sum.amountCents ?? 0;
  const totalAdEarnedCents = adRevenue._sum.amountCents ?? 0;

  return (
    <>
      <section className="mb-8 rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
        <p>
          Zarobki z prowizji: <strong>{(totalEarnedCents / 100).toFixed(2)}$</strong>
        </p>
        <p className="mt-1">
          Zarobki z reklam: <strong>{(totalAdEarnedCents / 100).toFixed(2)}$</strong>
        </p>
        <p className="mt-1 text-black/60 dark:text-white/60">
          Twój kod polecający:{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">{user?.referralCode}</code>
        </p>
      </section>

      <h2 className="mb-4 text-lg font-semibold">Struktura Twojego zespołu (drzewo, do 5 poziomów)</h2>
      {tree && <TeamTreeView root={tree} totalCount={countDescendants(tree)} />}
    </>
  );
}
