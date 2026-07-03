"use client";

import {
  BookOpen,
  Brain,
  CloudDownload,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Catalogue intelligent",
    desc: "Filtre par filière, matière ou niveau. Trouve le bon PDF en quelques secondes.",
    color: "bg-brand-50 text-brand-600",
  },
  {
    icon: BookOpen,
    title: "Prévisualisation gratuite",
    desc: "Lis un aperçu gratuit de chaque document avant d'acheter. Plus de surprises.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Wallet,
    title: "Wallet intégré",
    desc: "Recharge par Mobile Money, carte bancaire ou code promo. Tout est centralisé.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Brain,
    title: "Assistant IA",
    desc: "Génère des fiches de révision et des quiz à partir de n'importe quel PDF acheté.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: CloudDownload,
    title: "Lecture hors-ligne",
    desc: "Les PDFs téléchargent automatiquement en Wi-Fi. Lis partout, même sans connexion.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Achats sécurisés",
    desc: "Toutes les transactions sont signées et historisées. Tu es protégé à chaque achat.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: Sparkles,
    title: "Fiches de révisions",
    desc: "L'IA résume les chapitres clés en fiches concises prêtes à mémoriser.",
    color: "bg-pink-50 text-pink-600",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            Fonctionnalités
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Tout ce dont tu as besoin
          </h2>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Campus 360 a été conçu pour répondre aux vrais besoins des étudiants
            africains : accès facile, prix transparents, et outils de révision
            modernes.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-6 bg-white border border-[var(--color-border)] rounded-2xl hover:shadow-lg hover:shadow-brand-100/50 hover:border-brand-200 transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[var(--color-ink)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-ink-light)] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
