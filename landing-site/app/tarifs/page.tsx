import type { Metadata } from "next";
import { Check, GraduationCap, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site-shell";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

export const metadata: Metadata = {
  title: "Tarifs Campus 360 — Gratuit, Premium, Wallet",
  description:
    "Tarifs transparents : gratuit (3 PDFs/mois), Premium 9 900 FCFA/mois (-50% rentrée), Wallet à la carte. Sans engagement.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: "Tarifs Campus 360",
    description: "Gratuit, Premium, Wallet. Sans engagement.",
    url: "/tarifs",
  },
};

const plans = [
  {
    name: "Étudiant",
    icon: GraduationCap,
    price: "Gratuit",
    description: "Pour découvrir Campus 360",
    features: [
      "Accès au catalogue complet",
      "Prévisualisation gratuite",
      "3 PDF gratuits par mois",
      "Assistant IA (5 requêtes/jour)",
    ],
    cta: "Télécharger l'app",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Premium",
    icon: Sparkles,
    price: "9 900 FCFA",
    oldPrice: "9 900 FCFA",
    promoPrice: "4 950 FCFA",
    description: "Pour les sérieux de la révisions",
    period: "/mois",
    features: [
      "Accès illimité au catalogue",
      "PDFs illimités",
      "Assistant IA illimité",
      "Fiches de révision générées",
      "Mode hors-ligne prioritaire",
      "Support prioritaire",
    ],
    cta: "Passer Premium",
    ctaVariant: "primary" as const,
    popular: true,
  },
  {
    name: "Wallet",
    icon: Wallet,
    price: "À la carte",
    description: "Paye uniquement ce que tu achètes",
    features: [
      "Recharge par Mobile Money",
      "Cartes bancaires acceptées",
      "Codes promo disponibles",
      "Solde jamais expiré",
      "Achats à l'unité dès 500 FCFA",
    ],
    cta: "Recharger mon wallet",
    ctaVariant: "secondary" as const,
    popular: false,
  },
];

const faq = [
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Premium est sans engagement. Tu peux annuler depuis l'app ou en contactant le support. Le remboursement est garanti 14 jours.",
  },
  {
    q: "Comment payer ?",
    a: "Orange Money, MTN Mobile Money, cartes Visa/Mastercard. Le paiement est sécurisé et une facture PDF est générée automatiquement.",
  },
  {
    q: "Mes achats restent-ils si j'annule ?",
    a: "Oui. Tous les PDFs achetés via le wallet restent à toi pour toujours, même sans abonnement actif.",
  },
  {
    q: "Puis-je partager mon compte Premium ?",
    a: "Non. Le compte est personnel. Mais notre programme de parrainage te permet d'offrir 1 mois Premium à 3 amis chaque année.",
  },
];

export default function TarifsPage() {
  return (
    <SiteShell>
      <section className="py-20 lg:py-28 border-b border-[var(--color-ink-faint)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker justify-center flex mb-6">Promo Rentrée · -50% sur Premium</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] mb-6">
            Des tarifs transparents.
          </h1>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Pas d&apos;engagement. Pas de frais cachés. Tu paies uniquement
            pour ce dont tu as besoin.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-px bg-[var(--color-ink)]/10 border border-[var(--color-ink)]/10">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative p-6 lg:p-8 flex flex-col ${
                    plan.popular
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "bg-[var(--color-paper)]"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-[var(--color-sienna)] text-white text-[0.6875rem] font-mono font-bold tracking-wide uppercase px-3 py-1.5">
                      Populaire
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-5">
                    <Icon className={`w-6 h-6 ${plan.popular ? "text-[var(--color-sienna-tone)]" : "text-[var(--color-sienna)]"}`} strokeWidth={1.5} />
                    <div>
                      <h3 className="font-display font-bold text-lg">
                        {plan.name}
                      </h3>
                      <p className={`text-sm ${plan.popular ? "text-[var(--color-paper)]/65" : "text-[var(--color-ink-muted)]"}`}>
                        {plan.description}
                      </p>
                    </div>
                  </div>
                  <div className="mb-7">
                    {plan.promoPrice ? (
                      <div>
                        <span className={`text-sm line-through mr-2 ${plan.popular ? "text-[var(--color-paper)]/50" : "text-[var(--color-ink-subtle)]"}`}>{plan.oldPrice}</span>
                        <span className="font-display text-3xl font-extrabold tracking-[-0.02em]">
                          {plan.promoPrice}
                        </span>
                        {plan.period && (
                          <span className={`text-sm ${plan.popular ? "text-[var(--color-paper)]/65" : "text-[var(--color-ink-muted)]"}`}>
                            {" "}
                            {plan.period}
                          </span>
                        )}
                        <div className="font-mono text-xs mt-1.5 font-semibold text-[var(--color-sienna-tone)] tracking-wide uppercase">
                          -50% promo rentrée
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-display text-3xl font-extrabold tracking-[-0.02em]">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className={`text-sm ${plan.popular ? "text-[var(--color-paper)]/65" : "text-[var(--color-ink-muted)]"}`}>
                            {" "}
                            {plan.period}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            plan.popular ? "text-[var(--color-emerald-tone)]" : "text-[var(--color-emerald)]"
                          }`}
                        />
                        <span className={plan.popular ? "text-[var(--color-paper)]/85" : "text-[var(--color-ink-muted)]"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <a href={APK_URL} download="campus-360.apk" className="block">
                    <Button
                      variant={plan.popular ? "secondary" : "outline"}
                      className={`w-full ${plan.popular ? "" : ""}`}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-[var(--color-paper-deep)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="space-y-0 border-t border-[var(--color-ink)]/10">
            {faq.map((item) => (
              <details
                key={item.q}
                className="py-5 border-b border-[var(--color-ink)]/10 group"
              >
                <summary className="cursor-pointer font-display font-semibold text-[var(--color-ink)] flex items-center justify-between list-none">
                  {item.q}
                  <span className="text-[var(--color-sienna)] text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}