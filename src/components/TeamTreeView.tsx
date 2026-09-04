import type { TeamNode } from "@/lib/team";

const ROLE_LABELS: Record<string, string> = { ADMIN: "administrator", EDITOR: "redaktor" };

function StatusDot({ node }: { node: TeamNode }) {
  return (
    <span
      title={
        node.onTrack
          ? "Na bieżąco: tekst w tym tygodniu + pełny zespół (5/5)"
          : `Zaległości: ${node.postedThisWeek ? "" : "brak tekstu w tym tygodniu"}${
              !node.postedThisWeek && !node.hasFullTeam ? ", " : ""
            }${node.hasFullTeam ? "" : `zespół ${node.directCount}/5`}`
      }
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        node.onTrack ? "bg-green-500" : "bg-red-500"
      }`}
    />
  );
}

function TeamNodeItem({ node }: { node: TeamNode }) {
  return (
    <li className="mt-2">
      <div className="flex items-center gap-2 text-sm">
        <StatusDot node={node} />
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-black/50 dark:text-white/50">
          {ROLE_LABELS[node.role] ?? node.role} · zespół {node.directCount}/5
          {!node.postedThisWeek && " · brak tekstu w tym tygodniu"}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-3 border-l border-black/10 pl-4 dark:border-white/10">
          {node.children.map((child) => (
            <TeamNodeItem key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TeamTreeLegend() {
  return (
    <p className="text-xs text-black/50 dark:text-white/50">
      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500 align-middle" /> na bieżąco
      (tekst w tym tygodniu + pełny zespół 5/5) &nbsp;
      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" /> zaległości
    </p>
  );
}

export default function TeamTreeView({
  root,
  totalCount,
  isSelf = true,
  showLegend = true,
}: {
  root: TeamNode;
  totalCount: number;
  isSelf?: boolean;
  showLegend?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="font-semibold">{root.name}</span>
        <span className="text-xs text-black/50 dark:text-white/50">
          {isSelf ? "(Ty)" : ROLE_LABELS[root.role] ?? root.role} · {root.directCount}/5 bezpośrednio
          zrekrutowanych · {totalCount} osób łącznie w zespole (do 5 poziomów w dół)
        </span>
      </div>
      {root.children.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          {isSelf
            ? "Nikt jeszcze nie dołączył pod Twoim kodem polecającym."
            : "Nikt jeszcze nie dołączył pod tym kodem polecającym."}
        </p>
      ) : (
        <ul>
          {root.children.map((child) => (
            <TeamNodeItem key={child.id} node={child} />
          ))}
        </ul>
      )}
      {showLegend && (
        <div className="mt-4">
          <TeamTreeLegend />
        </div>
      )}
    </div>
  );
}
