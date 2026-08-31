import type { Metadata } from "next";
import { Sparkles, Clock, ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Promo Rentrée 2026 — Premium à -50%",
  description: "Profite de la promo rentrée : Premium à 4 950 FCFA/mois au lieu de 9 900. Offre limitée jusqu'au 30 septembre 2026.",
  alternates: { canonical: "/promo/rentree-2026" },
};

export default function PromoRentreePage() {
  return (
    <SiteShell hidePromo>
      <section className="py-16 lg:py-24 border-b border-[var(--color-ink-faint)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-sienna-bg)] text-[var(--color-sienna-deep)] text-sm font-bold rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Offre limitée
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold font-display mb-6">
            <span className="text-[var(--color-sienna)]">
              -50%
            </span>{" "}
            sur Premium
          </h1>
          <p className="text-2xl sm:text-3xl font-bold font-display mb-2">
            Pour la rentrée 2026
          </p>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto mb-8">
            <span className="line-through text-[var(--color-ink-subtle)]">9 900 FCFA/mois</span>{" "}
            <span className="font-bold text-[var(--color-sienna)]">4 950 FCFA/mois</span> — sans engagement, garanti 14 jours.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8 text-sm text-[var(--color-sienna-tone)]">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">Offre valable jusqu&apos;au 30 septembre 2026</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://campus360b.site/downloads/campus-360.apk"
              download="campus-360.apk"
            >
              <Button size="lg" variant="primary" className="gap-2 w-full sm:w-auto">
                <BookOpen className="w-5 h-5" />
                Télécharger et activer l&apos;offre
              </Button>
            </a>
            <Link href="/tarifs">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Voir les détails
              </Button>
            </Link>
          </div>
          <p className="text-xs text-[var(--color-ink-subtle)] mt-4">
            Code <span className="font-mono font-bold bg-[var(--color-sienna-bg)] text-[var(--color-sienna)] px-2 py-0.5 rounded">RENTREE2026</span> appliqué automatiquement
          </p>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold font-display mb-6 text-center">
            Ce qui est inclus dans Premium
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "PDFs illimités dans tout le catalogue",
              "Assistant IA sans limite",
              "Fiches de révision générées",
              "Mode hors-ligne prioritaire",
              "Support client prioritaire",
              "Accès anticipé aux nouveaux contenus",
              "Annulation en 1 clic",
              "Garantie 14 jours satisfait ou remboursé",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 p-3 bg-[var(--color-paper)] rounded-lg border border-[var(--color-border)]">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">✓</span>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-[var(--color-paper)] border-t border-[var(--color-border)] text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <GraduationCap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold font-display mb-3">
            La meilleure façon de commencer l&apos;année
          </h2>
          <p className="text-[var(--color-ink-light)] mb-6">
            Rejoins les milliers d&apos;étudiants qui ont déjà validé leurs exams avec Campus 360.
          </p>
          <a
            href="https://campus360b.site/downloads/campus-360.apk"
            download="campus-360.apk"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-cta hover:bg-amber-cta-hover text-white font-semibold rounded-xl transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            C&apos;est parti
          </a>
        </div>
      </section>
    </SiteShell>
  );
}