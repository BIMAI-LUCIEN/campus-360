import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Wifi,
  Brain,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PromoBanner } from "@/components/promo-banner";
import { Screenshots } from "@/components/screenshots";
import { Download } from "@/components/download";
import { Button } from "@/components/ui/button";
import HeroScene from "@/components/hero-scene";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const stats = [
  { value: "12 000", label: "Étudiants" },
  { value: "3 500+", label: "PDFs" },
  { value: "28", label: "Universités" },
];

const features = [
  {
    icon: BookOpen,
    title: "3 500+ PDFs",
    desc: "Cours, TD, annales et fiches classés par université, filière et niveau — du premier jour de Licence au mémoire de Master.",
    featured: true,
  },
  {
    icon: Brain,
    title: "Assistant IA",
    desc: "Génère un résumé ou un plan de révision à partir de n'importe quel PDF du catalogue.",
  },
  {
    icon: Wifi,
    title: "Hors-ligne",
    desc: "Télécharge en Wi-Fi, lis sans connexion — même dans les zones mal couvertes.",
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    desc: "Orange Money et MTN MoMo intégrés. Achète un document en moins de 10 secondes.",
  },
];

export default function HomePage() {
  return (
    <>
      <PromoBanner />
      <Navbar />
      <main>

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">

              {/* Left */}
              <div className="rise-in">
                <p className="kicker mb-5">Campus 360</p>
                <h1 className="font-display text-[1.85rem] sm:text-6xl lg:text-[4.5rem] font-black leading-[1.08] sm:leading-[0.98] tracking-[-0.03em] mb-7 [hyphens:auto] sm:[hyphens:none] [overflow-wrap:break-word]">
                  La bibliothèque
                  <br />
                  PDF pour réviser.
                </h1>

                <p className="text-lg text-[var(--color-ink-muted)] max-w-md leading-relaxed mb-9">
                  Des milliers de documents académiques, un assistant IA pour
                  aller plus vite, et un wallet Mobile Money pour payer sans
                  friction. Conçu par des étudiants, pour des étudiants.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-9">
                  <a href={APK_URL} download="campus-360.apk">
                    <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                      <BookOpen className="w-4 h-4" />
                      Télécharger l&apos;APK
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                  <Link href="/fonctionnalites">
                    <Button size="lg" variant="ghost" className="w-full sm:w-auto">
                      Voir les fonctionnalités
                    </Button>
                  </Link>
                </div>

                <p className="text-sm text-[var(--color-ink-subtle)]">
                  Paiement Mobile Money · Sans engagement
                </p>
              </div>

              {/* Right — phone mockup */}
              <div className="flex justify-center lg:justify-end rise-in" style={{ animationDelay: "120ms" }}>
                <HeroScene />
              </div>
            </div>
          </div>
        </section>

        {/* ─── MASTHEAD STRIP ───────────────────────────────────── */}
        <section className="border-y border-[var(--color-ink)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-3 divide-x divide-[var(--color-ink)]/15">
              {stats.map((s) => (
                <div key={s.label} className="py-8 sm:py-10 text-center">
                  <div className="font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] mb-1">
                    {s.value}
                  </div>
                  <div className="font-mono text-[0.6875rem] font-semibold tracking-[0.14em] uppercase text-[var(--color-ink-subtle)]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ───────────────────────────────────────────── */}
        <section className="py-24 lg:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-16">
              <p className="kicker mb-5">Ce qui change</p>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.02em]">
                Tout pour réviser, rien de superflu.
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-x-12 gap-y-14">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={f.featured ? "lg:col-span-2 lg:grid lg:grid-cols-[auto_1fr] lg:gap-8 lg:items-start pb-10 border-b border-[var(--color-ink)]/10" : "flex gap-5"}
                  >
                    <Icon
                      className={f.featured ? "w-9 h-9 text-[var(--color-sienna)] mb-4 lg:mb-0" : "w-6 h-6 text-[var(--color-sienna)] flex-shrink-0 mt-1"}
                      strokeWidth={1.5}
                    />
                    <div>
                      <h3 className={f.featured ? "font-display text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-3" : "font-display text-lg font-bold mb-1.5"}>
                        {f.title}
                      </h3>
                      <p className={f.featured ? "text-[var(--color-ink-muted)] leading-relaxed max-w-md text-base" : "text-sm text-[var(--color-ink-muted)] leading-relaxed"}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── SCREENSHOTS ───────────────────────────────────────── */}
        <Screenshots />

        {/* ─── DOWNLOAD CTA ──────────────────────────────────────── */}
        <section className="py-24 lg:py-32 bg-[var(--color-ink)] text-[var(--color-paper)]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-6 text-[var(--color-sienna-tone)]" strokeWidth={1.5} />
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] mb-4">
              Télécharge l&apos;app.
            </h2>
            <p className="text-[var(--color-paper)]/60 mb-10 max-w-md mx-auto">
              Disponible sur Android. APK gratuit, sans pub, sans engagement.
            </p>
            <a href={APK_URL} download="campus-360.apk">
              <Button size="lg" variant="secondary" className="gap-2">
                <BookOpen className="w-5 h-5" />
                Télécharger l&apos;APK gratuit
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </section>

        {/* ─── QR CODE SECTION ──────────────────────────────────── */}
        <Download />
      </main>

      <Footer />
    </>
  );
}
