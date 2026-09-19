import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED, mailtoHref } from "@/lib/legal";

// Thin layout helpers shared by the interim legal pages so they all match the
// rest of the app (same container width, heading sizes, muted text and link
// styling as e.g. /panel) without introducing a separate design system.

export function LegalPage({
  title,
  interimNote,
  showUpdated = true,
  children,
}: {
  title: string;
  interimNote?: string;
  showUpdated?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {showUpdated && (
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Data ostatniej aktualizacji: {LEGAL_LAST_UPDATED}
        </p>
      )}
      {interimNote && (
        <p className="mt-4 rounded border border-black/10 p-3 text-sm text-black/70 dark:border-white/10 dark:text-white/70">
          {interimNote}
        </p>
      )}
      {children}
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed">{children}</p>;
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">{children}</ul>;
}

/** Visible-address mailto link; long addresses wrap instead of overflowing on small screens. */
export function MailLink({ email, subject }: { email: string; subject?: string }) {
  return (
    <a href={mailtoHref(email, subject)} className="break-all underline">
      {email}
    </a>
  );
}
