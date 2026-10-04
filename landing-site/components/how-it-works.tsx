"use client";

import { Eye, Sparkles, UserCheck, Send, BookOpen } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: UserCheck,
    title: "Crée ton profil en 30 secondes",
    desc: "Renseigne ton université, ta filière et tes compétences clés. L'application enregistre tes préférences sans aucun formulaire interminable.",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "Décroche ton stage & révise tes cours",
    desc: "L'Agent IA sélectionne les offres de stage correspondant à ton profil avec un score de match %, génère ton CV officiel RH et t'ouvre l'accès à 3 500+ PDFs académiques.",
  },
  {
    n: "03",
    icon: Send,
    title: "Postule en 1 clic & relance à J+7",
    desc: "Transmets ton dossier directement au recruteur sur WhatsApp ou par e-mail. Reçois une notification automatique 7 jours plus tard pour faire ta relance.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-32 bg-[var(--color-paper)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-sienna-bg)] text-[var(--color-sienna-tone)] text-sm font-semibold rounded-full mb-4">
            <Eye className="w-4 h-4" />
            Parcours simple & rapide
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Comment fonctionne Campus 360 ?
          </h2>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Trois étapes directes pour valider son année et décrocher son premier stage professionnel.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="relative text-center group">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[55%] right-0 h-0.5 bg-[var(--color-ink-faint)]" />
                )}

                {/* Step number circle */}
                <div className="relative z-10 w-20 h-20 mx-auto bg-[var(--color-paper-soft)] border border-[var(--color-sienna)]/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:border-[var(--color-sienna)] transition-colors">
                  <Icon className="w-8 h-8 text-[var(--color-sienna-tone)]" />
                </div>

                <span className="inline-block text-xs font-bold font-mono text-[var(--color-sienna-tone)] bg-[var(--color-sienna-bg)] px-3 py-1 rounded-full mb-3">
                  ÉTAPE {step.n}
                </span>

                <h3 className="font-display text-xl font-bold text-[var(--color-ink)] mb-3">
                  {step.title}
                </h3>
                <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed max-w-sm mx-auto">
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
