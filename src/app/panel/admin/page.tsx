import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/access";
import { getAllTeamTrees, countDescendants } from "@/lib/team";
import CreateEditorForm from "./CreateEditorForm";
import PaymentForm from "./PaymentForm";
import ModerationItem from "./ModerationItem";
import PaymentRow from "./PaymentRow";
import TeamTreeView, { TeamTreeLegend } from "@/components/TeamTreeView";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrator", EDITOR: "Redaktor" };

const TABS = [
  { key: "zarzadzanie", label: "Zarządzanie" },
  { key: "redakcja", label: "Redakcja" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  // Defense in depth: middleware.ts already gates /panel/admin to ADMIN,
  // but this page must not rely on that alone (see CLAUDE.md #8 — same fix
  // already applied to /panel/dodaj). session.user.role comes from the JWT
  // and can be stale after a DB role change, so re-verify against the
  // current DB record — checked before any admin data is fetched, since
  // ManagementTab/TeamTab below only run once we reach here.
  if (!session?.user?.id || !(await isAdmin(session.user.id))) return null;

  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "zarzadzanie";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Panel administracyjny</h1>

      <div className="mb-8 flex gap-2 border-b border-black/10 pb-3 dark:border-white/10">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/panel/admin?tab=${t.key}`}
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

      {tab === "zarzadzanie" ? <ManagementTab /> : <TeamTab />}
    </div>
  );
}

async function ManagementTab() {
  const [team, pendingArticles, payments, commissionTotals, revenue, adRevenueTotals, activeAds, adRevenueTotal] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.article.findMany({
        where: { status: "PENDING" },
        include: { author: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.commission.groupBy({ by: ["editorId"], _sum: { amountCents: true } }),
      prisma.purchase.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
      prisma.adRevenueShare.groupBy({ by: ["userId"], _sum: { amountCents: true } }),
      prisma.adPurchase.findMany({
        // status stays "ACTIVE" past endsAt — nothing flips it to EXPIRED on
        // its own — so this must also filter by endsAt, or the admin panel
        // keeps listing lapsed ads as currently running.
        where: { status: "ACTIVE", endsAt: { gt: new Date() } },
        include: { advertiser: true, author: true },
        orderBy: { startsAt: "asc" },
      }),
      prisma.adPurchase.aggregate({ where: { status: { in: ["PAID", "ACTIVE", "EXPIRED"] } }, _sum: { amountCents: true } }),
    ]);

  const commissionByEditorId = new Map(commissionTotals.map((c) => [c.editorId, c._sum.amountCents ?? 0]));
  const adEarningsByUserId = new Map(adRevenueTotals.map((a) => [a.userId, a._sum.amountCents ?? 0]));
  const totalRevenueCents = revenue._sum.amountCents ?? 0;
  const totalCommissionsCents = commissionTotals.reduce((sum, c) => sum + (c._sum.amountCents ?? 0), 0);
  const totalAdRevenueCents = adRevenueTotal._sum.amountCents ?? 0;

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Zespół redakcyjny</h2>
        <CreateEditorForm />
        <ul className="mt-4 flex flex-col gap-2">
          {team.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              <span>
                {u.name} <span className="text-black/50 dark:text-white/50">({u.email})</span>
              </span>
              <span className="text-black/60 dark:text-white/60">
                {ROLE_LABELS[u.role] ?? u.role}
                {(u.role === "EDITOR" || u.role === "ADMIN") && (
                  <> · {((commissionByEditorId.get(u.id) ?? 0) / 100).toFixed(2)}$ prowizji</>
                )}
                {(adEarningsByUserId.get(u.id) ?? 0) > 0 && (
                  <> · {((adEarningsByUserId.get(u.id) ?? 0) / 100).toFixed(2)}$ z reklam</>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Przychody</h2>
        <p className="text-sm">
          Łączny przychód od czytelników: <strong>{(totalRevenueCents / 100).toFixed(2)}$</strong>
        </p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Wypłacone prowizje redaktorom: {(totalCommissionsCents / 100).toFixed(2)}$ · pozostaje firmie:{" "}
          {((totalRevenueCents - totalCommissionsCents) / 100).toFixed(2)}$
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Reklamy</h2>
        <p className="mb-4 text-sm">
          Łączny przychód z reklam: <strong>{(totalAdRevenueCents / 100).toFixed(2)}$</strong>
        </p>
        {activeAds.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">Brak aktywnych reklam.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeAds.map((ad) => (
              <li
                key={ad.id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span>
                  {ad.advertiser.name} → pod tekstami {ad.author.name}
                </span>
                <span className="text-black/60 dark:text-white/60">
                  do {ad.endsAt?.toLocaleDateString("pl-PL")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Kontrola treści</h2>
        {pendingArticles.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">Brak treści oczekujących na zatwierdzenie.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendingArticles.map((a) => (
              <ModerationItem
                key={a.id}
                articleId={a.id}
                title={a.title}
                author={a.author.name}
                category={a.category}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Płatności</h2>
        <PaymentForm />
        <ul className="mt-4 flex flex-col gap-2">
          {payments.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Brak zapisanych płatności.</p>
          ) : (
            payments.map((p) => (
              <PaymentRow
                key={p.id}
                paymentId={p.id}
                description={p.description}
                amount={`${(p.amountCents / 100).toFixed(2)} ${p.currency}`}
                status={p.status}
              />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

async function TeamTab() {
  const trees = await getAllTeamTrees();

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Struktura całej redakcji (drzewo, do 5 poziomów)</h2>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Każde drzewo zaczyna się od redaktora, który dołączył bez kodu polecającego (bezpośrednio pod
        administracją).
      </p>

      {trees.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Brak redaktorów w systemie.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {trees.map((tree) => (
            <div key={tree.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              <TeamTreeView
                root={tree}
                totalCount={countDescendants(tree)}
                isSelf={false}
                showLegend={false}
              />
            </div>
          ))}
        </div>
      )}

      {trees.length > 0 && (
        <div className="mt-6">
          <TeamTreeLegend />
        </div>
      )}
    </div>
  );
}
