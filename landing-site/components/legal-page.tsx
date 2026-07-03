import { ReactNode } from "react";
import { SiteShell } from "./site-shell";

interface LegalPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function LegalPage({ title, description, children }: LegalPageProps) {
  return (
    <SiteShell hidePromo>
      <article className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display mb-4">{title}</h1>
          <p className="text-lg text-[var(--color-ink-light)] mb-8">{description}</p>
          <div className="prose prose-sm max-w-none text-[var(--color-ink-light)] space-y-6">
            {children}
          </div>
          <p className="mt-12 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-ink-lighter)]">
            Dernière mise à jour : juillet 2026
          </p>
        </div>
      </article>
    </SiteShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold font-display text-[var(--color-ink)] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}