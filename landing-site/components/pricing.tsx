"use client";

import { Check, Crown, FileText, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const plans = [
  {
    name: "Gratuit",
    icon: GraduationCap,
    price: "Gratuit",
    description: "Pour découvrir Campus 360",
    features: [
      "Rédaction et aperçu filigrané",
      "Catalogue et achats à la carte",
      "Aucun export de document",
    ],
    cta: "Télécharger l'app",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Basique",
    icon: FileText,
    price: "2 000 FCFA",
    description: "Pour démarrer chaque mois",
    period: "/mois",
    features: [
      "5 candidatures IA",
      "3 rédactions ou corrections",
      "500 messages IA",
      "PDF avec filigrane",
    ],
    cta: "Choisir Basique",
    ctaVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Pro",
    icon: GraduationCap,
    price: "3 500 FCFA",
    description: "Pour produire sans filigrane",
    features: [
      "10 candidatures IA",
      "5 rédactions ou corrections",
      "1 000 messages IA",
      "PDF propre et mode hors ligne",
    ],
    cta: "Choisir Pro",
    ctaVariant: "primary" as const,
    popular: true,
  },
  {
    name: "Elite",
    icon: Crown,
    price: "5 000 FCFA",
    description: "Pour disposer de tous les formats",
    period: "/mois",
    features: ["20 candidatures IA", "10 rédactions ou corrections", "2 000 messages IA", "PDF et Word sans filigrane"],
    cta: "Choisir Elite",
    ctaVariant: "secondary" as const,
    popular: false,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-20 lg:py-32 bg-gradient-to-b from-white to-brand-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full mb-4">
            💰 Tarifs transparents
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Choisis ton plan
          </h2>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Pas d'engagement. Pas de frais cachés. Tu paies uniquement pour ce
            dont tu as besoin.
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
                      plan.popular
                        ? "bg-white/20 text-white"
                        : "bg-brand-50 text-brand-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-bold text-lg ${
                        plan.popular ? "text-white" : "text-[var(--color-ink)]"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-sm ${
                        plan.popular
                          ? "text-white/80"
                          : "text-[var(--color-ink-light)]"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <span
                    className={`text-3xl font-extrabold ${
                      plan.popular ? "text-white" : "text-[var(--color-ink)]"
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm ${
                        plan.popular
                          ? "text-white/70"
                          : "text-[var(--color-ink-light)]"
                      }`}
                    >
                      {" "}
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2.5 text-sm ${
                        plan.popular
                          ? "text-white/90"
                          : "text-[var(--color-ink-light)]"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          plan.popular ? "text-white" : "text-brand-500"
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={APK_URL}
                  download="campus-360.apk"
                  className="block"
                >
                  <Button
                    variant={plan.ctaVariant}
                    className={`w-full ${
                      plan.popular
                        ? "bg-white text-brand-600 hover:bg-white/90"
                        : ""
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </a>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-[var(--color-ink-light)] mt-10">
          Les achats à la carte restent disponibles sans abonnement depuis l’application.
        </p>
      </div>
    </section>
  );
}
