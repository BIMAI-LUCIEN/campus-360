import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Wallet,
  Wifi,
  Brain,
  ShieldCheck,
  Users,
  Quote,
  GraduationCap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PromoBanner } from "@/components/promo-banner";
import { Button } from "@/components/ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const universities = [
  "Université de Douala",
  "Université de Yaoundé I",
  "Université de Buea",
  "Université de Dschang",
  "Université de Bamenda",
  "UCAC",
];

const stats = [
  { value: "12 000+", label: "Étudiants actifs" },
  { value: "3 500+", label: "PDFs académiques" },
  { value: "4.7/5", label: "Note moyenne" },
  { value: "28", label: "Universités couvertes" },
];

const testimonials = [
  {
    name: "Aïcha M.",
    role: "Licence 2 — Informatique, UY1",
    quote:
      "J'ai validé Partiels grâce aux fiches générées par l'IA. Le wallet Mobile Money c'est vraiment game changer pour nous.",
  },
  {
    name: "Christian K.",
    role: "Master 1 — Génie Civil, UD",
    quote:
      "Le mode offline m'a sauvé pendant les coupures ENEO. Je télécharge mes PDFs en Wi-Fi le matin, je révise dans le bus.",
  },
  {
    name: "Florence T.",
    role: "Médecine L3, UB",
    quote:
      "Le catalogue couvre vraiment les programmes camerounais. On retrouve nos cours et des annales bien classés.",
  },
];

export default function HomePage() {
  return (
    <>
      <PromoBanner />
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100 pt-28 pb-16">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-300/30 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-6">
                  <Sparkles className="w-4 h-4" />
                  Nouveau : Assistant IA intégré
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.05] mb-6">
                  La bibliothèque PDF qui pense{" "}
                  <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                    comme toi
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-[var(--color-ink-light)] mb-8 max-w-xl mx-auto lg:mx-0">
                  Accède à des milliers de PDFs académiques, génère des fiches
                  de révision avec l&apos;IA et révise hors-ligne. Conçu par
                  des étudiants, pour des étudiants africains.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                  <a href={APK_URL} download="campus-360.apk">
                    <Button
                      size="lg"
                      className="gap-2 bg-amber-cta hover:bg-amber-cta-hover w-full sm:w-auto"
                    >
                      <BookOpen className="w-5 h-5" />
                      Télécharger l&apos;APK gratuit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                  <Link href="/fonctionnalites">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      Voir les fonctionnalités
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 text-sm text-[var(--color-ink-light)] justify-center lg:justify-start">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-500" />
                    <span>Paiement Mobile Money</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-brand-500" />
                    <span>Mode hors-ligne</span>
                  </div>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-200 to-brand-400 rounded-[3rem] blur-3xl opacity-30" />
                <div className="relative w-72 h-[34rem] bg-[var(--color-ink)] rounded-[3rem] p-3 shadow-2xl">
                  <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 rounded-[2.4rem] flex flex-col items-center justify-center text-white p-6">
                    <BookOpen className="w-16 h-16 mb-4 opacity-90" />
                    <h3 className="text-2xl font-bold font-display mb-2">Campus 360</h3>
                    <p className="text-white/80 text-sm text-center">
                      Catalogue de PDFs + IA + Wallet
                      <br />+ Mode hors-ligne
                    </p>
                    <div className="mt-8 flex gap-2 text-xs">
                      <div className="px-3 py-1.5 bg-white/15 backdrop-blur rounded-full">
                        Licence
                      </div>
                      <div className="px-3 py-1.5 bg-white/15 backdrop-blur rounded-full">
                        Master
                      </div>
                      <div className="px-3 py-1.5 bg-white/15 backdrop-blur rounded-full">
                        Médecine
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="py-12 bg-white border-y border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-extrabold font-display text-brand-600">
                    {s.value}
                  </div>
                  <div className="text-sm text-[var(--color-ink-light)] mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VALUE PROP BENTO */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full mb-4">
                💎 Pourquoi Campus 360
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-3">
                Tout ce qu&apos;il te faut pour réviser
              </h2>
              <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
                Conçu pour les réalités africaines : connexion instable,
                budget serré, programmes locaux.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="md:col-span-2 p-6 lg:p-8 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-3xl">
                <BookOpen className="w-10 h-10 mb-4" />
                <h3 className="text-2xl font-bold font-display mb-2">
                  Catalogue de 3 500+ PDFs académiques
                </h3>
                <p className="text-white/80 mb-4 max-w-md">
                  Cours, TD, annales et fiches par matière, par niveau et par
                  université camerounaise.
                </p>
                <Link
                  href="/fonctionnalites"
                  className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  Explorer le catalogue <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-6 lg:p-8 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl">
                <Brain className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-bold font-display mb-2">
                  Assistant IA
                </h3>
                <p className="text-white/80 text-sm">
                  Génère des fiches de révision à partir de tes PDFs en 1 clic.
                </p>
              </div>

              <div className="p-6 lg:p-8 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-3xl">
                <Wallet className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-bold font-display mb-2">
                  Wallet Mobile Money
                </h3>
                <p className="text-white/80 text-sm">
                  Orange Money, MTN MoMo. Achète tes PDFs en quelques secondes.
                </p>
              </div>

              <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-3xl">
                <Wifi className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-bold font-display mb-2">
                  Mode hors-ligne
                </h3>
                <p className="text-white/80 text-sm">
                  Télécharge en Wi-Fi, lis partout — même sans connexion.
                </p>
              </div>

              <div className="p-6 lg:p-8 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-3xl">
                <Users className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-bold font-display mb-2">
                  Communauté
                </h3>
                <p className="text-white/80 text-sm">
                  Discord + WhatsApp étudiants pour s&apos;entraider.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* UNIVERSITIES */}
        <section className="py-16 bg-[var(--color-paper)] border-y border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-semibold text-[var(--color-ink-light)] mb-8 uppercase tracking-wide">
              Conçu pour les programmes de
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
              {universities.map((u) => (
                <span
                  key={u}
                  className="font-display font-bold text-[var(--color-ink-light)] opacity-70 text-sm sm:text-base"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-3">
                Ils révisent avec Campus 360
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] flex flex-col"
                >
                  <Quote className="w-8 h-8 text-brand-400 mb-3" />
                  <p className="text-[var(--color-ink-light)] text-sm leading-relaxed flex-1">
                    {t.quote}
                  </p>
                  <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
                    <div className="font-semibold text-sm font-display">{t.name}</div>
                    <div className="text-xs text-[var(--color-ink-lighter)]">
                      {t.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROMO / OFFER */}
        <section className="py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-amber-200 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-800 text-sm font-bold rounded-full mb-4">
                <Sparkles className="w-4 h-4" />
                Offre Rentrée 2026
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display mb-4">
                <span className="line-through text-[var(--color-ink-lighter)] text-2xl sm:text-3xl mr-2">
                  9 900 FCFA
                </span>
                <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
                  4 950 FCFA / mois
                </span>
              </h2>
              <p className="text-lg text-[var(--color-ink-light)] mb-6 max-w-2xl mx-auto">
                Premium à -50% pour la rentrée. PDFs illimités, IA illimitée,
                mode hors-ligne prioritaire.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/tarifs">
                  <Button
                    size="lg"
                    className="bg-amber-cta hover:bg-amber-cta-hover gap-2 w-full sm:w-auto"
                  >
                    <GraduationCap className="w-5 h-5" />
                    Voir l&apos;offre Premium
                  </Button>
                </Link>
                <a href={APK_URL} download="campus-360.apk">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    D&apos;abord essayer l&apos;app
                  </Button>
                </a>
              </div>
              <p className="text-xs text-[var(--color-ink-lighter)] mt-4">
                Sans engagement · Annulation en 1 clic · Garantie 14 jours
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 bg-[var(--color-ink)] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display mb-4">
              Prêt à mieux réviser ?
            </h2>
            <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
              Rejoins 12 000+ étudiants qui révisent plus efficacement avec
              Campus 360.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={APK_URL} download="campus-360.apk">
                <Button
                  size="lg"
                  className="bg-amber-cta hover:bg-amber-cta-hover gap-2 w-full sm:w-auto"
                >
                  <BookOpen className="w-5 h-5" />
                  Télécharger l&apos;app Android
                </Button>
              </a>
              <Link href="/inscription">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  Créer un compte gratuit
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}