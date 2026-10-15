import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/landing/page-hero";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Campus 360",
  description: "Comment réinitialiser ton mot de passe Campus 360 avec le code envoyé par e-mail.",
  alternates: { canonical: "/mot-de-passe-oublie" },
};

export default function MotDePasseOubliePage() {
  return (
    <SiteShell>
      <PageHero kicker="Compte" title="Mot de passe" accent="oublié ?" subtitle="Réinitialise-le depuis l'application, avec le code envoyé par e-mail." compact />
      <section className="py-16 lg:py-20">
        <div className="reveal max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="space-y-4 text-[var(--color-ink-light)] list-decimal pl-5">
            <li>Dans l&apos;application, ouvre l&apos;écran de connexion et touche « Mot de passe oublié ».</li>
            <li>Saisis l&apos;adresse e-mail de ton compte. Un code à usage unique t&apos;est envoyé.</li>
            <li>Saisis le code, puis choisis ton nouveau mot de passe.</li>
          </ol>
          <p className="mt-8 text-sm text-[var(--color-ink-light)]">
            Pas reçu le code ? Vérifie tes spams, puis{" "}
            <Link href="/contact" className="text-[var(--color-sienna)] hover:underline">
              contacte-nous
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
