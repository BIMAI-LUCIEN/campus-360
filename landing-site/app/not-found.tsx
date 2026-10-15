import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/landing/page-hero";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell hidePromo>
      <PageHero kicker="Erreur 404" title="Page" accent="introuvable." subtitle="La page que tu cherches n'existe pas, ou plus.">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button>Retour à l&apos;accueil</Button>
          </Link>
          <Link href="/fonctionnalites">
            <Button variant="outline">Voir les fonctionnalités</Button>
          </Link>
        </div>
      </PageHero>
    </SiteShell>
  );
}