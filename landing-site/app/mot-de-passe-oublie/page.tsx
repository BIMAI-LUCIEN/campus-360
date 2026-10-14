import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Campus 360",
  description: "Comment réinitialiser ton mot de passe Campus 360 avec le code envoyé par e-mail.",
  alternates: { canonical: "/mot-de-passe-oublie" },
};

export default function MotDePasseOubliePage() {
  return (
    <SiteShell>
      <section className="py-20 lg:py-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold font-display mb-6 text-[var(--color-ink)]">
            Mot de passe oublié
          </h1>
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
