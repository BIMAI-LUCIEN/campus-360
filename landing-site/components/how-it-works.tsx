"use client";

import { BookMarked, CreditCard, Eye, Search } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Search,
    title: "Cherche",
    desc: "Filtre par filière, matière ou niveau. Trouve le PDF qui correspond à ton programme.",
  },
  {
    n: "02",
    icon: CreditCard,
    title: "Achète",
    desc: "Recharge ton wallet en quelques secondes et achète le PDF que tu veux au prix affiché.",
  },
  {
    n: "03",
    icon: BookMarked,
    title: "Lis & révise",
    desc: "Lis hors-ligne, génère des fiches avec l'IA et révise efficacement pour tes examens.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-32 bg-gradient-to-b from-brand-50 to-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
            <Eye className="w-4 h-4" />
            Simple & rapide
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Trois étapes pour accéder à tous tes cours. Pas de complication,
            pas de frais cachés.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="relative text-center">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[55%] right-0 h-0.5 bg-brand-200" />
                )}

                {/* Step number circle */}
                <div className="relative z-10 w-20 h-20 mx-auto bg-brand-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-500/30">
                  <Icon className="w-8 h-8 text-white" />
                </div>

                <span className="inline-block text-xs font-bold text-brand-600 bg-brand-100 px-3 py-1 rounded-full mb-3">
                  {step.n}
                </span>

                <h3 className="text-xl font-bold text-[var(--color-ink)] mb-3">
                  {step.title}
                </h3>
                <p className="text-[var(--color-ink-light)] text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
