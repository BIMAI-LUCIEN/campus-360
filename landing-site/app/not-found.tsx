import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell hidePromo>
      <section className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="text-8xl font-extrabold font-display text-brand-500 mb-4">404</div>
          <h1 className="text-3xl font-extrabold font-display mb-3">
            Page introuvable
          </h1>
          <p className="text-[var(--color-ink-light)] mb-8">
            La page que tu cherches n&apos;existe pas (ou plus). Mais on a plein d&apos;autres choses intéressantes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button>Retour à l&apos;accueil</Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline">Lire le blog</Button>
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}