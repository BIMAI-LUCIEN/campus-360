import type { Metadata } from "next";
import { Pricing } from "@/components/pricing";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Tarifs Campus 360 — Orange Money & MTN MoMo",
  description:
    "Tarifs transparents sans frais cachés : 1ère candidature offerte, Pack 5 candidatures à 500 FCFA, Pass Étudiant à 2 000 FCFA et Pass Pro à 3 500 FCFA.",
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
    a: "Lorsque tu recharges ou actives un pass, l'application initie une transaction sécurisée vers ton compte Orange Money ou MTN MoMo. Tu valides la transaction sur ton téléphone avec ton code PIN et ton solde est crédité instantanément.",
  },
  {
    q: "Y a-t-il un abonnement avec précompte automatique ?",
    a: "Non. Aucun abonnement automatique ni prélèvement surprise. Tu recharges ton solde uniquement quand tu en as besoin.",
  },
  {
    q: "Est-ce que mes PDFs téléchargés restent accessibles ?",
    a: "Oui. Tous les cours, fiches et annales téléchargés restent enregistrés sur ton téléphone et sont lisibles à tout moment en mode hors-ligne, même sans solde.",
  },
  {
    q: "Puis-je tester l'IA gratuitement ?",
    a: "Absolument. Dès la création de ton profil, la 1ère candidature IA avec CV officiel RH et lettre de motivation te sont offertes à 100%.",
  },
];

export default function TarifsPage() {
  return (
    <SiteShell>
      <section className="py-20 lg:py-28 border-b border-[var(--color-ink-faint)] bg-[var(--color-paper-deep)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker justify-center flex mb-4">Tarification claire & équitable</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] mb-6 leading-[1.05] text-[var(--color-ink)]">
            Sans engagement, sans frais cachés.
          </h1>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Paye uniquement ce dont tu as besoin avec ton téléphone Orange Money ou MTN MoMo.
          </p>
        </div>
      </section>

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
                className="p-6 rounded-2xl bg-[var(--color-paper-soft)] border border-[var(--color-ink-faint)]"
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
