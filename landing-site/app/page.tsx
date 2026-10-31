import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Download as DownloadIcon,
  FileText,
  GraduationCap,
  Play,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Download } from "@/components/download";
import { Pricing } from "@/components/pricing";
import { Button } from "@/components/ui/button";
import { HeroPhone } from "@/components/landing/hero-phone";
import { DemoFilm } from "@/components/landing/demo-film";
import { ScrollStory } from "@/components/landing/scroll-story";
import { TiltCard } from "@/components/landing/tilt-card";
import { RevealRoot } from "@/components/landing/reveal-root";
import { OrbitRing } from "@/components/landing/orbit-ring";
import { Cube3D } from "@/components/landing/cube-3d";
import { Scroll3D } from "@/components/landing/scroll-3d";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const marquee = [
  "Tech & Dév",
  "Finance & Audit",
  "Marketing",
  "BTP & Génie",
  "Stage académique",
  "Stage professionnel",
  "Premier emploi",
  "CV officiel RH",
  "Relance J+7",
  "Coach de soutenance",
  "MTN MoMo",
  "Orange Money",
];

export default function HomePage() {
  return (
    <>
      <RevealRoot />
      <Navbar />
      <main className="bg-[var(--color-paper)] text-[var(--color-ink)]">
        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="aurora-stage border-b border-[var(--color-ink-faint)] pb-20 pt-28 lg:pb-28 lg:pt-36">
          <div className="grid-fade" />
          <Cube3D size={64} className="absolute left-[4%] top-28 hidden opacity-70 md:block" />
          <Cube3D size={40} delay="-6s" className="absolute bottom-16 left-[44%] hidden opacity-60 lg:block" />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rise-in">
              <div className="mb-7 flex flex-wrap items-center gap-3">
                <span className="inline-flex -rotate-3 items-center rounded-full bg-[var(--color-soleil)] px-4 py-1.5 font-display text-sm font-semibold text-[var(--color-ink)]">
                  Étudiants
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-muted)]">
                  <Sparkles className="h-4 w-4 text-[var(--color-sienna)]" />
                  L&apos;IA pour ton stage et ta soutenance
                </span>
              </div>

              <h1 className="mb-7 font-display text-[2.7rem] leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-[4.6rem] lg:leading-[1]">
                Ton <span className="text-gradient-brand">premier</span> stage commence ici.
              </h1>

              <p className="mb-9 max-w-lg text-base leading-relaxed text-[var(--color-ink-muted)] sm:text-lg">
                Des stages adaptés à ta filière, ton CV officiel RH et ta lettre en un clic, le suivi de tes
                candidatures et un coach IA pour réussir ta soutenance. Tout ton parcours, à 360°.
              </p>

              <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                <a href={APK_URL} download="campus-360.apk">
                  <Button size="lg" variant="primary" className="w-full gap-2 font-bold sm:w-auto">
                    <DownloadIcon className="h-4 w-4" />
                    Télécharger l&apos;APK gratuit
                  </Button>
                </a>
                <a href="#demo">
                  <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto">
                    <Play className="h-4 w-4" />
                    Voir la présentation · 1 min
                  </Button>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--color-ink-subtle)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-emerald)]" /> 1 000 coins offerts au lancement
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-emerald)]" /> Orange Money & MTN MoMo
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-emerald)]" /> Sans abonnement
                </span>
              </div>
            </div>

            <div className="rise-in relative py-6" style={{ animationDelay: "150ms" }}>
              <div className="absolute inset-0 origin-center scale-[0.62] sm:scale-90 lg:scale-100">
                <OrbitRing diameter={540} />
              </div>
              <div className="relative z-10">
                <HeroPhone />
              </div>
            </div>
          </div>
        </section>

        {/* ─── MARQUEE ──────────────────────────────────────────── */}
        <section aria-label="Domaines et fonctions couverts" className="marquee overflow-hidden border-b border-[var(--color-ink-faint)] bg-[var(--color-paper-deep)] py-5">
          <div className="marquee-3d">
          <div className="marquee-track gap-10 pr-10">
            {[...marquee, ...marquee].map((item, i) => (
              <span key={`${item}-${i}`} className="flex items-center gap-10 whitespace-nowrap font-display text-lg text-[var(--color-ink-muted)]">
                {item}
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sienna)]" />
              </span>
            ))}
          </div>
          </div>
        </section>

        {/* ─── DEMO FILM ────────────────────────────────────────── */}
        <section id="demo" className="scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
          <div className="reveal mx-auto mb-12 max-w-2xl text-center">
            <p className="kicker mb-4 flex justify-center">La présentation en 1 minute</p>
            <h2 className="font-display text-3xl tracking-[-0.03em] sm:text-5xl">
              Du premier stage au <span className="text-gradient-brand">mémoire</span>, une seule app.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[var(--color-ink-muted)]">
              Les vrais écrans de l&apos;app, avec le son. Choisis un chapitre pour aller droit à ce qui t&apos;intéresse.
            </p>
          </div>
          <Scroll3D>
            <DemoFilm />
          </Scroll3D>
        </section>

        {/* ─── SCROLL STORY ─────────────────────────────────────── */}
        <section className="border-t border-[var(--color-ink-faint)] bg-[var(--color-paper-deep)] px-4 py-24 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="reveal mb-8 max-w-2xl">
              <p className="kicker mb-4">Comment ça marche</p>
              <h2 className="font-display text-3xl tracking-[-0.03em] sm:text-5xl">Six étapes, une seule app.</h2>
            </div>
            <ScrollStory />
          </div>
        </section>

        {/* ─── BENTO FEATURES ───────────────────────────────────── */}
        <section className="px-4 py-24 sm:px-6 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="reveal mb-14 max-w-2xl">
              <p className="kicker mb-4">Ce que l&apos;app fait pour toi</p>
              <h2 className="font-display text-3xl tracking-[-0.03em] sm:text-5xl">
                Tout ton <span className="text-gradient-brand">parcours</span>, au même endroit.
              </h2>
            </div>

            <div className="stage-3d grid gap-5 md:grid-cols-3 md:grid-rows-[auto_auto]">
              {/* Coach: the signature feature */}
              <TiltCard style={{ "--delay": "0ms" } as CSSProperties} className="reveal reveal-3d rounded-3xl border border-[#DDD6FE] bg-[var(--color-sienna-bg)] p-8 md:col-span-2 md:row-span-2">
                <div className="flex h-full flex-col justify-between gap-10">
                  <div>
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-sienna)] text-white">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 font-display text-3xl">Coach IA de soutenance</h3>
                    <p className="max-w-md text-[var(--color-ink-muted)]">
                      À partir de ton rapport : des slides, ce que tu dois dire au jury, et des questions pièges avec une
                      réponse modèle pour t&apos;entraîner.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--color-ink-faint)] bg-white p-5 text-[var(--color-ink)]">
                      <p className="mb-3 font-display text-lg">Slide 3 · Résultats</p>
                      <div className="mb-2 h-2 rounded bg-[#E2E8F0]" />
                      <div className="mb-2 h-2 w-4/5 rounded bg-[#E2E8F0]" />
                      <div className="h-2 w-3/5 rounded bg-[#E2E8F0]" />
                    </div>
                    <div className="rotate-2 rounded-2xl border border-[var(--color-ink-faint)] bg-white p-5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-sienna)]">Question piège #1</p>
                      <p className="text-sm font-medium text-[var(--color-ink)]">Pourquoi avoir choisi cette méthodologie ?</p>
                    </div>
                  </div>
                </div>
              </TiltCard>

              <TiltCard style={{ "--delay": "90ms" } as CSSProperties} className="reveal reveal-3d rounded-3xl border border-[var(--color-ink-faint)] bg-[var(--color-paper-soft)] p-7">
                <Sparkles className="mb-4 h-6 w-6 text-[var(--color-sienna)]" strokeWidth={2} />
                <p className="mb-1 font-display text-5xl font-bold text-[var(--color-sienna)]">65%</p>
                <h3 className="mb-2 font-display text-xl">Matching de stage par IA</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">Un score de correspondance, tes points forts et un conseil pour chaque offre.</p>
              </TiltCard>

              <TiltCard style={{ "--delay": "180ms" } as CSSProperties} className="reveal reveal-3d rounded-3xl border border-[var(--color-ink-faint)] bg-[var(--color-paper-soft)] p-7">
                <Clock className="mb-4 h-6 w-6 text-[var(--color-sienna)]" strokeWidth={2} />
                <div className="mb-4 flex gap-1.5" aria-hidden>
                  {["J+1", "J+2", "J+3", "J+4", "J+5", "J+6", "J+7"].map((d) => (
                    <span key={d} className={`flex h-9 flex-1 items-center justify-center rounded-lg text-[10px] font-bold ${d === "J+7" ? "bg-[var(--color-corail)] text-[var(--color-ink)]" : "bg-[#F1F5F9] text-[var(--color-ink-muted)]"}`}>
                      {d}
                    </span>
                  ))}
                </div>
                <h3 className="mb-2 font-display text-xl">Suivi & relance à J+7</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">Toutes tes candidatures au même endroit, avec un rappel au bon moment.</p>
              </TiltCard>

              <TiltCard style={{ "--delay": "270ms" } as CSSProperties} className="reveal reveal-3d rounded-3xl border border-[var(--color-ink-faint)] bg-[var(--color-paper-soft)] p-7">
                <FileText className="mb-4 h-6 w-6 text-[var(--color-sienna)]" strokeWidth={2} />
                <h3 className="mb-2 font-display text-xl">CV officiel RH & lettre</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">Un CV deux colonnes au format recruteur et une lettre adaptée, modifiables avant envoi.</p>
              </TiltCard>

              <TiltCard style={{ "--delay": "360ms" } as CSSProperties} className="reveal reveal-3d rounded-3xl border border-[var(--color-ink-faint)] bg-[var(--color-paper-soft)] p-7">
                <Brain className="mb-4 h-6 w-6 text-[var(--color-sienna)]" strokeWidth={2} />
                <h3 className="mb-2 font-display text-xl">Atelier d&apos;écriture IA</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">Rapport de stage, mémoire ou CV rédigés avec l&apos;IA. Tu gardes la main sur le texte.</p>
              </TiltCard>

              <TiltCard style={{ "--delay": "450ms" } as CSSProperties} className="reveal reveal-3d rounded-3xl border border-[var(--color-ink-faint)] bg-[var(--color-paper-soft)] p-7">
                <Wallet className="mb-4 h-6 w-6 text-[var(--color-sienna)]" strokeWidth={2} />
                <h3 className="mb-2 font-display text-xl">Wallet Mobile Money</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">PDF gratuits, candidatures dès 300 FCFA, paiement à l'usage par Orange Money ou MTN MoMo.</p>
              </TiltCard>
            </div>

            <div className="reveal mt-10 text-center">
              <Link href="/fonctionnalites" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-sienna-tone)] hover:underline">
                Voir toutes les fonctionnalités <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── PRICING ──────────────────────────────────────────── */}
        <Pricing />

        {/* ─── FINAL CTA ────────────────────────────────────────── */}
        <section className="aurora-stage relative px-4 py-24 text-center sm:px-6 lg:py-32">
          <Cube3D size={80} className="absolute left-[8%] top-1/2 hidden -translate-y-1/2 opacity-70 md:block" />
          <Cube3D size={56} delay="-9s" className="absolute right-[9%] top-24 hidden opacity-70 md:block" />
          <div className="reveal relative mx-auto max-w-3xl">
            <h2 className="mb-5 font-display text-4xl tracking-[-0.03em] sm:text-6xl">
              Ton <span className="text-gradient-brand">parcours</span>, à 360°.
            </h2>
            <p className="mx-auto mb-10 max-w-lg text-[var(--color-ink-muted)]">
              Application Android gratuite, sans publicité. 1 000 coins offerts à l&apos;inscription pendant le lancement.
            </p>
            <a href={APK_URL} download="campus-360.apk">
              <Button size="lg" variant="primary" className="gap-2 px-8 font-bold">
                <DownloadIcon className="h-5 w-5" />
                Télécharger l&apos;APK gratuit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>

        <Download />
      </main>

      <Footer />
    </>
  );
}
