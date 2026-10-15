"use client";

import { Check, FileText, GraduationCap, Send, Zap } from "lucide-react";
import { Button } from "./ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

// V1 launch: everything is free (FREE_LAUNCH_MODE). Prices below apply after the launch,
// aligned with the constants of the app (src/types.ts).
const plans = [
  {
    name: "Découverte",
    icon: GraduationCap,
    price: "0 FCFA",
    description: "Pour créer ton profil et tester l'app",
    period: "",
    features: [
      "Compte gratuit",
      "Matching de stage avec score de correspondance",
      "Coach IA de soutenance",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Candidature",
    icon: Send,
    price: "500 FCFA",
    description: "Par candidature envoyée",
    period: "/ candidature",
    features: [
      "CV officiel RH et lettre de motivation",
      "Envoi par WhatsApp RH, e-mail RH ou dans l'app",
      "Relance à J+7 dans ton suivi",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "primary" as const,
    popular: true,
  },
  {
    name: "Rapport de stage",
    icon: FileText,
    price: "2 000 FCFA",
    description: "Rédaction IA d'un rapport de stage",
    period: "/ rapport",
    features: [
      "Structure académique complète",
      "Texte modifiable dans l'éditeur",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Mémoire",
    icon: Zap,
    price: "5 000 FCFA",
    description: "Rédaction IA d'un mémoire de fin d'études",
    period: "/ mémoire",
    features: [
      "Problématique, revue de littérature, méthodologie",
      "Texte modifiable dans l'éditeur",
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
            Tout est gratuit pendant le lancement.
          </h2>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Pendant la V1, candidatures, CV, lettres, rapports, mémoires, coach de soutenance et PDF sont gratuits. Ensuite : paiement à l'usage par Orange Money ou MTN MoMo, sans abonnement.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`reveal relative rounded-2xl p-6 lg:p-8 flex flex-col transition-all hover:-translate-y-1 ${
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
                    Gratuit
                  </span>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {plan.price === "0 FCFA" ? "Toujours gratuit" : `Pendant le lancement, puis ${plan.price} ${plan.period}`}
                  </p>
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
