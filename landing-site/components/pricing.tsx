"use client";

import { Check, Crown, FileText, GraduationCap, Zap } from "lucide-react";
import { Button } from "./ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const plans = [
  {
    name: "Découverte",
    icon: GraduationCap,
    price: "0 FCFA",
    description: "Pour explorer le catalogue et tester l'IA",
    period: "",
    features: [
      "Consultation du catalogue de 3 500+ PDFs",
      "1ère candidature IA 100% offerte",
      "Calcul du score de match sur les stages",
      "Lecteur PDF intégré avec mode nuit",
    ],
    cta: "Télécharger l'APK",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Pack 5 Candidatures",
    icon: Zap,
    price: "500 FCFA",
    description: "Achat ponctuel sans abonnement",
    period: "/ pack",
    features: [
      "5 candidatures IA sur-mesure",
      "Template CV Officiel RH (2 colonnes)",
      "Lettre de motivation personnalisée",
      "Export PDF propre sans filigrane",
      "Envoi 1-clic sur WhatsApp RH & Email",
    ],
    cta: "Tester le Pack",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Pass Étudiant",
    icon: FileText,
    price: "2 000 FCFA",
    description: "La formule complète pour réussir son semestre",
    period: "/ mois",
    features: [
      "Candidatures IA illimitées",
      "Accès illimité aux 3 500+ PDFs d'universités",
      "Assistant IA (résumés & fiches de révision)",
      "Notification & relance automatique à J+7",
      "Téléchargement & lecture 100% hors-ligne",
    ],
    cta: "Activer le Pass",
    ctaVariant: "primary" as const,
    popular: true,
  },
  {
    name: "Pass Pro & Soutenance",
    icon: Crown,
    price: "3 500 FCFA",
    description: "Pour valider son stage et préparer sa soutenance",
    period: "/ mois",
    features: [
      "Toutes les fonctionnalités du Pass Étudiant",
      "Générateur de plan de rapport & mémoire",
      "Coach IA d'entraînement à la soutenance",
      "Relances WhatsApp RH prioritaires",
      "Support technique dédié",
    ],
    cta: "Découvrir Pro",
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
            Des tarifs adaptés aux étudiants.
          </h2>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Sans engagement. Paye par Orange Money ou MTN MoMo en 10 secondes.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 lg:p-8 flex flex-col transition-all hover:-translate-y-1 ${
                  plan.popular
                    ? "bg-[var(--color-paper-soft)] border-2 border-[var(--color-sienna)] shadow-xl shadow-[var(--color-sienna)]/10"
                    : "bg-[var(--color-paper)] border border-[var(--color-ink-faint)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--gradient-brand)] text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
                    Le plus populaire
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.popular
                        ? "bg-[var(--gradient-brand)] text-white"
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
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-[var(--color-ink-muted)] ml-1">
                      {plan.period}
                    </span>
                  )}
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
