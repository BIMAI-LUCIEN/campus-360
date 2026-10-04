import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Target, Users, Sparkles, ArrowRight, Mail } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "À propos — Notre mission pour les étudiants africains",
  description:
    "Campus 360 est né d'un constat : les étudiants africains paient leurs PDFs jusqu'à 5x plus cher que les autres. Notre mission : égaliser l'accès au savoir.",
  alternates: { canonical: "/a-propos" },
  openGraph: {
    title: "À propos de Campus 360",
    description: "Notre histoire, notre mission, notre équipe.",
    url: "/a-propos",
  },
};

const values = [
  {
    icon: Target,
    title: "Mission",
    desc: "Permettre à chaque étudiant de trouver un stage adapté et d'accéder aux meilleures ressources académiques en quelques clics.",
  },
  {
    icon: Heart,
    title: "Valeurs",
    desc: "Transparence des tarifs, soutien actif aux étudiants, efficacité maximale avec l'IA et zéro perte de temps.",
  },
  {
    icon: Users,
    title: "Équipe",
    desc: "Une équipe d'ingénieurs et d'anciens étudiants passionnés qui construisent les outils qu'ils auraient voulu avoir sur les bancs de l'université.",
  },
  {
    icon: Sparkles,
    title: "Vision",
    desc: "L'écosystème de référence pour l'insertion professionnelle et la réussite académique de la jeunesse étudiante en Afrique.",
  },
];

const timeline = [
  { year: "2023", title: "L'idée", desc: "Trois amis à l'UD partagent leurs PDFs sur WhatsApp. Ils réalisent que d'autres galèrent aussi." },
  { year: "2024", title: "Premier MVP", desc: "Une app Expo + Supabase. 50 PDFs uploadés, 12 premiers étudiants payants." },
  { year: "2025", title: "Lancement public", desc: "Catalogue de 1 500 PDFs, IA intégrée, paiement Mobile Money. 3 000 étudiants." },
  { year: "2026", title: "Aujourd'hui", desc: "12 000+ étudiants, 28 universités couvertes, équipe de 7 personnes." },
];

export default function AProposPage() {
  return (
    <SiteShell>
      <section className="py-16 lg:py-24 border-b border-[var(--color-ink)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-6">
            <Heart className="w-4 h-4" />
            Notre histoire
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            On a galéré,{" "}
            <span className="text-[var(--color-sienna)]">
              on a construit la solution
            </span>
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Campus 360 est né en 2023 d&apos;un constat simple : un étudiant
            camerounais paie ses PDFs jusqu&apos;à 5 fois plus cher qu&apos;un
            étudiant européen, pour un contenu souvent moins bien classé.
          </p>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)]">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-[var(--color-sienna)] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-2">{v.title}</h3>
                  <p className="text-sm text-[var(--color-ink-light)] leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-10 text-center">
            Notre parcours
          </h2>
          <div className="relative">
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-brand-200" />
            <div className="space-y-8">
              {timeline.map((t, idx) => (
                <div
                  key={t.year}
                  className={`relative flex flex-col sm:flex-row gap-4 sm:gap-8 items-start ${
                    idx % 2 === 0 ? "" : "sm:flex-row-reverse"
                  }`}
                >
                  <div className="absolute left-6 sm:left-1/2 w-3 h-3 -ml-1.5 bg-[var(--color-sienna)] rounded-full ring-4 ring-[var(--color-paper)]" />
                  <div className="ml-14 sm:ml-0 sm:w-1/2">
                    <div className="p-5 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)]">
                      <div className="text-sm font-bold text-[var(--color-sienna)] mb-1">{t.year}</div>
                      <h3 className="text-lg font-bold font-display mb-1">{t.title}</h3>
                      <p className="text-sm text-[var(--color-ink-light)] leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[var(--color-paper-deep)] border-t border-[var(--color-ink-faint)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-4">
            Rejoins l&apos;aventure
          </h2>
          <p className="text-lg text-[var(--color-ink-muted)] mb-8">
            Que tu sois étudiant, université ou investisseur, on a besoin de
            toi pour aller plus loin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="primary" className="gap-2 w-full sm:w-auto">
                <Mail className="w-5 h-5" />
                Nous contacter
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                Lire le blog
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}