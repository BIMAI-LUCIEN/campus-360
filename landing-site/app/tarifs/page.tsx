import type { Metadata } from "next";
import { Pricing } from "@/components/pricing";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/landing/page-hero";

export const metadata: Metadata = {
  title: "Tarifs Campus 360 — Orange Money & MTN MoMo",
  description:
    "Candidature à 300 FCFA avec CV adapté, packs dès 1 000 FCFA, rapport de stage à 2 000 FCFA, mémoire à 4 000 FCFA, PDF gratuits. Sans abonnement.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: "Tarifs Campus 360",
    description: "Des tarifs adaptés aux étudiants d'Afrique francophone. Paiement par Mobile Money.",
    url: "/tarifs",
  },
};

const faq = [
  {
    q: "Comment fonctionne le paiement par Mobile Money ?",
    a: "Lorsque tu recharges ton wallet, l'application initie une transaction vers ton compte Orange Money ou MTN MoMo. Tu valides sur ton téléphone avec ton code PIN et ton solde est crédité.",
  },
  {
    q: "Y a-t-il un abonnement avec précompte automatique ?",
    a: "Non. Il n'y a pas d'abonnement : ton wallet est débité seulement quand tu lances une action ou achètes un pack ou un Pass, une seule fois.",
  },
  {
    q: "Combien coûte une candidature ?",
    a: "300 FCFA pour une offre non rémunérée, 500 FCFA pour une offre rémunérée, CV adapté et lettre compris. Avec un pack : 5 candidatures pour 1 000 FCFA ou 12 pour 2 000 FCFA.",
  },
  {
    q: "Puis-je tester l'IA gratuitement ?",
    a: "Oui : tous les PDF se lisent gratuitement, avec 3 actions IA gratuites par jour. Pendant le lancement, 1 000 coins sont offerts à l'inscription.",
  },
];

export default function TarifsPage() {
  return (
    <SiteShell>
      <PageHero kicker="Tarifs" title="Tu paies seulement ce que tu" accent="utilises." subtitle="PDF gratuits, 1 000 coins offerts au lancement, candidatures dès 300 FCFA avec CV adapté. Aucun abonnement." />

      <Pricing />

      {/* FAQ Tarifs */}
      <section className="py-20 lg:py-28 bg-[var(--color-paper)] border-t border-[var(--color-ink-faint)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold text-center mb-12 text-[var(--color-ink)]">
            Questions fréquentes sur le paiement
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {faq.map((item) => (
              <div
                key={item.q}
                className="reveal p-6 rounded-2xl bg-[var(--color-paper-soft)] border border-[var(--color-ink-faint)]"
              >
                <h3 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2.5">
                  {item.q}
                </h3>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
