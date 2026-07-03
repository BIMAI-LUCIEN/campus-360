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
      <section className="py-16 lg:py-24 bg-gradient-to-br from-brand-50 via-white to-brand-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-bold rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Promo Rentrée : -50% sur Premium
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            Des tarifs{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              transparents
            </span>
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Pas d&apos;engagement. Pas de frais cachés. Tu paies uniquement
            pour ce dont tu as besoin.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-6 lg:p-8 flex flex-col transition-all hover:-translate-y-1 ${
                    plan.popular
                      ? "bg-brand-500 text-white shadow-xl shadow-brand-500/30 scale-[1.02]"
                      : "bg-white border border-[var(--color-border)] shadow-sm hover:shadow-lg"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                      Le plus populaire
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        plan.popular ? "bg-white/20 text-white" : "bg-brand-50 text-brand-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg font-display ${plan.popular ? "text-white" : "text-[var(--color-ink)]"}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-sm ${plan.popular ? "text-white/80" : "text-[var(--color-ink-light)]"}`}>
                        {plan.description}
                      </p>
                    </div>
                  </div>
                  <div className="mb-6">
                    {plan.promoPrice ? (
                      <div>
                        <span className="text-sm line-through text-white/60 mr-2">{plan.oldPrice}</span>
                        <span className={`text-3xl font-extrabold font-display ${plan.popular ? "text-white" : "text-[var(--color-ink)]"}`}>
                          {plan.promoPrice}
                        </span>
                        {plan.period && (
                          <span className={`text-sm ${plan.popular ? "text-white/70" : "text-[var(--color-ink-light)]"}`}>
                            {" "}
                            {plan.period}
                          </span>
                        )}
                        <div className="text-xs text-amber-200 mt-1 font-semibold">
                          🔥 -50% promo rentrée
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className={`text-3xl font-extrabold font-display ${plan.popular ? "text-white" : "text-[var(--color-ink)]"}`}>
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className={`text-sm ${plan.popular ? "text-white/70" : "text-[var(--color-ink-light)]"}`}>
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
                            plan.popular ? "text-white" : "text-brand-500"
                          }`}
                        />
                        <span className={plan.popular ? "text-white/90" : "text-[var(--color-ink-light)]"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <a href={APK_URL} download="campus-360.apk" className="block">
                    <Button
                      variant={plan.ctaVariant}
                      className={`w-full ${
                        plan.popular ? "bg-white text-brand-600 hover:bg-white/90" : ""
                      }`}
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

      <section className="py-16 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold font-display mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="p-5 bg-white rounded-xl border border-[var(--color-border)] group"
              >
                <summary className="cursor-pointer font-semibold text-[var(--color-ink)] flex items-center justify-between">
                  {item.q}
                  <span className="text-brand-500 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-[var(--color-ink-light)] leading-relaxed">
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