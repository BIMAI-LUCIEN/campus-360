"use client";

import { Check, FileText, GraduationCap, Send, Zap } from "lucide-react";
import { Button } from "./ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

// Model v2 (contexte.md §19): prices apply from day one, the launch only raises
// the signup bonus. Aligned with mobile-api/lib/pricing.ts and stage-pricing.ts.
const plans = [
  {
    name: "Découverte",
    icon: GraduationCap,
    price: "0 FCFA",
    description: "Lecture de tous les PDF et 3 actions IA par jour",
    period: "Toujours gratuit",
    features: [
      "1 000 coins offerts à l'inscription pendant le lancement (300 ensuite)",
      "Tous les PDF et annales en lecture libre",
      "Plan de rapport et de mémoire gratuits",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Candidature",
    icon: Send,
    price: "300 FCFA",
    description: "CV adapté à l'offre et lettre compris",
    period: "500 FCFA pour une offre rémunérée",
    features: [
      "Pack Starter : 5 candidatures pour 1 000 FCFA",
      "Pack Recherche active : 12 candidatures + 1 jour de Pass Révision pour 2 000 FCFA",
      "Crédits valables 30 jours, rendus si l'envoi échoue",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "primary" as const,
    popular: true,
  },
  {
    name: "Rédaction",
    icon: FileText,
    price: "2 000 FCFA",
    description: "Rapport de stage complet, après un plan gratuit",
    period: "Mémoire : 4 000 FCFA ou 1 000 FCFA par chapitre",
    features: [
      "Plan proposé gratuitement avant de payer",
      "Mémoire rédigé chapitre par chapitre",
      "Coins rendus si l'IA échoue",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Pass Révision",
    icon: Zap,
    price: "200 FCFA",
    description: "IA illimitée sur tous les PDF pendant 24 h",
    period: "1 000 FCFA les 7 jours",
    features: [
      "Résumés, fiches, quiz et questions sur chaque PDF",
      "Payé une fois, sans renouvellement automatique",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "secondary" as const,
    popular: false,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-20 lg:py-32 bg-[var(--color-paper-deep)] border-y border-[var(--color-ink-faint)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-sienna-bg)] text-[var(--color-sienna-tone)] text-sm font-semibold rounded-full mb-4">
            💰 Tarifs transparents en FCFA
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Tu paies seulement ce que tu utilises.
          </h2>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Lecture des PDF gratuite, 1 000 coins offerts au lancement, puis paiement à l'usage par Orange Money ou MTN MoMo dès 500 FCFA. Aucun abonnement.
          </p>
        </div>

        {/* Plans grid */}
        <div className="stage-3d grid md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`reveal reveal-3d relative rounded-2xl p-6 lg:p-8 flex flex-col transition-all hover:-translate-y-1 ${
                  plan.popular
                    ? "bg-[var(--color-paper-soft)] border-2 border-[var(--color-sienna)] shadow-xl shadow-[var(--color-sienna)]/10"
                    : "bg-[var(--color-paper)] border border-[var(--color-ink-faint)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[image:var(--gradient-brand)] text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
                    Le plus populaire
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.popular
                        ? "bg-[image:var(--gradient-brand)] text-white"
                        : "bg-[var(--color-sienna-bg)] text-[var(--color-sienna-tone)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">
                      {plan.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-ink-muted)] mb-6 min-h-[36px]">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="font-display text-3xl lg:text-4xl font-extrabold text-[var(--color-ink)]">
                    {plan.price === "0 FCFA" ? "Gratuit" : plan.price}
                  </span>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{plan.period}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-snug">
                      <Check className="w-4 h-4 text-[var(--color-emerald)] flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <a href={APK_URL} download="campus-360.apk" className="w-full">
                  <Button
                    variant={plan.ctaVariant}
                    size="lg"
                    className="w-full justify-center"
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
  );
}
