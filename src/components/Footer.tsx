import Link from "next/link";
import { OPERATOR } from "@/lib/legal";

const FOOTER_LINKS = [
  { href: "/regulamin", label: "Regulamin" },
  { href: "/prywatnosc", label: "Prywatność" },
  { href: "/cookies", label: "Cookies" },
  { href: "/zasady-spolecznosci", label: "Zasady społeczności" },
  { href: "/zglos-naruszenie", label: "Zgłoś naruszenie" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm">
        <p>
          <span className="font-semibold">WexEye</span>
          <span className="text-black/60 dark:text-white/60"> · {OPERATOR.name}</span>
        </p>
        <nav aria-label="Informacje prawne i kontakt">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-black/50 dark:text-white/50">
          © {new Date().getFullYear()} {OPERATOR.name}
        </p>
      </div>
    </footer>
  );
}
