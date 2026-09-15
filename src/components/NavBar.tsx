import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Avatar from "@/components/Avatar";

const MAIN_LINKS = [
  { href: "/", label: "Home" },
  { href: "/mapa", label: "Map" },
  { href: "/?tab=near-you", label: "Near You" },
  { href: "/?tab=live", label: "Live" },
  { href: "/?tab=news", label: "News" },
  { href: "/?tab=stories", label: "Stories" },
  { href: "/eksploruj", label: "Explore" },
];

export default async function NavBar() {
  const session = await auth();
  const user = session?.user;
  const [avatarUrl, unreadNotificationCount] = user?.id
    ? await Promise.all([
        prisma.user
          .findUnique({ where: { id: user.id }, select: { avatarUrl: true } })
          .then((u) => u?.avatarUrl ?? null),
        prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      ])
    : [null, 0];

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wexeye-eye.png" alt="" className="h-7 w-auto dark:invert" />
            wexeye
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {MAIN_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/szukaj" className="hover:underline">
            Search
          </Link>
          <Link
            href="/dodaj"
            className="rounded bg-black px-3 py-1.5 font-medium text-white hover:opacity-90 dark:bg-white dark:text-black"
          >
            + POST
          </Link>
          {user && (
            <>
              <Link href="/znajomi" className="hover:underline">
                Znajomi
              </Link>
              <Link href="/powiadomienia" className="hover:underline">
                Notifications{unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ""}
              </Link>
            </>
          )}

          {(user?.role === "EDITOR" || user?.role === "ADMIN") && (
            <Link href="/panel/dodaj" className="hover:underline">
              Panel redaktora
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/panel/admin" className="hover:underline">
              Panel admina
            </Link>
          )}

          {user ? (
            <>
              <Link href="/panel" className="flex items-center gap-2 hover:underline">
                <Avatar name={user.name ?? "?"} avatarUrl={avatarUrl} size="sm" />
                {user.name}{" "}
                <span className="text-black/50 dark:text-white/50">
                  ({user.role === "ADMIN" ? "administrator" : user.role === "EDITOR" ? "redaktor" : "czytelnik"})
                </span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="rounded border px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10">
                  Wyloguj
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/rejestracja" className="hover:underline">
                Zarejestruj się
              </Link>
              <Link href="/login" className="rounded border px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10">
                Zaloguj
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
