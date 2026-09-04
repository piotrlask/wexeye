import { prisma } from "@/lib/prisma";
import { MAX_DIRECT_REFERRALS, TEAM_TREE_DEPTH, TEAM_WEEKLY_POST_QUOTA } from "@/lib/constants";

export type TeamNode = {
  id: string;
  name: string;
  email: string;
  role: string;
  directCount: number;
  postedThisWeek: boolean;
  hasFullTeam: boolean;
  onTrack: boolean;
  children: TeamNode[];
};

/**
 * Builds the "redakcja" tree rooted at `rootUserId`: up to TEAM_TREE_DEPTH
 * levels of sponsees, breadth-first. Every user in the tree gets a
 * green/red status: green only if they published at least one post in the
 * last 7 days AND have their full 5 direct recruits, red otherwise.
 *
 * Fetches level-by-level (at most TEAM_TREE_DEPTH queries) instead of
 * recursing per-node, so this stays cheap regardless of how many editors
 * are in the tree.
 */
export async function getTeamTree(rootUserId: string): Promise<TeamNode | null> {
  const root = await prisma.user.findUnique({ where: { id: rootUserId } });
  if (!root) return null;

  const usersById = new Map<string, { id: string; name: string; email: string; role: string }>();
  usersById.set(root.id, root);
  const childIdsByParent = new Map<string, string[]>();

  let currentLevelIds = [root.id];
  for (let depth = 0; depth < TEAM_TREE_DEPTH && currentLevelIds.length > 0; depth++) {
    const children = await prisma.user.findMany({
      where: { sponsorId: { in: currentLevelIds } },
      select: { id: true, name: true, email: true, role: true, sponsorId: true },
    });
    for (const c of children) {
      usersById.set(c.id, c);
      const siblings = childIdsByParent.get(c.sponsorId!) ?? [];
      siblings.push(c.id);
      childIdsByParent.set(c.sponsorId!, siblings);
    }
    currentLevelIds = children.map((c) => c.id);
  }

  const allIds = [...usersById.keys()];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [postCounts, directCounts] = await Promise.all([
    prisma.article.groupBy({
      by: ["authorId"],
      where: { authorId: { in: allIds }, createdAt: { gte: weekAgo } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["sponsorId"],
      where: { sponsorId: { in: allIds } },
      _count: { _all: true },
    }),
  ]);

  const postedThisWeekByUser = new Map(postCounts.map((p) => [p.authorId, p._count._all]));
  const directCountBySponsor = new Map(
    directCounts.filter((d) => d.sponsorId).map((d) => [d.sponsorId as string, d._count._all])
  );

  function buildNode(id: string, depth: number): TeamNode {
    const u = usersById.get(id)!;
    const directCount = directCountBySponsor.get(id) ?? 0;
    const postedThisWeek = (postedThisWeekByUser.get(id) ?? 0) >= TEAM_WEEKLY_POST_QUOTA;
    const hasFullTeam = directCount >= MAX_DIRECT_REFERRALS;
    const childIds = depth < TEAM_TREE_DEPTH ? (childIdsByParent.get(id) ?? []) : [];

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      directCount,
      postedThisWeek,
      hasFullTeam,
      onTrack: postedThisWeek && hasFullTeam,
      children: childIds.map((cid) => buildNode(cid, depth + 1)),
    };
  }

  return buildNode(root.id, 0);
}

export function countDescendants(node: TeamNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

/**
 * The whole editorial organization as a forest: one tree per "root" account
 * (editor or admin with no sponsor of their own — i.e. not recruited by
 * anyone). Used by the admin panel to show every branch, not just the
 * viewing admin's personal recruits.
 */
export async function getAllTeamTrees(): Promise<TeamNode[]> {
  const roots = await prisma.user.findMany({
    where: { sponsorId: null, role: { in: ["EDITOR", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const trees = await Promise.all(roots.map((r) => getTeamTree(r.id)));
  return trees.filter((t): t is TeamNode => t !== null);
}
