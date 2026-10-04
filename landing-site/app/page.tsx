import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Clock,
  Briefcase,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Screenshots } from "@/components/screenshots";
import { Download } from "@/components/download";
import { Pricing } from "@/components/pricing";
import { HowItWorks } from "@/components/how-it-works";
import { Button } from "@/components/ui/button";
import HeroScene from "@/components/hero-scene";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const stats = [
  { value: "12 000+", label: "Étudiants inscrits" },
  { value: "95%", label: "Précision du matching IA" },
  { value: "3 500+", label: "Cours & Annales PDF" },
  { value: "< 30s", label: "Temps pour postuler" },
];

const pillars = [
  {
    icon: Sparkles,
    badge: "IA & Recrutement",
    title: "Matching de Stage IA & Score %",
    desc: "L'intelligence artificielle analyse ton profil étudiant, filtre les opportunités adaptées à ta filière et calcule ton taux de compatibilité (ex: 🔥 95% Match) avec 2 points forts et 1 conseil stratégique.",
    featured: true,
  },
  {
    icon: FileText,
    badge: "Candidature 1-Clic",
    title: "Template CV Officiel RH & Lettre sur-mesure",
    desc: "Fini les candidatures rejetées. Génère en un clic un CV structuré à 2 colonnes selon le format officiel RH africain et une lettre de motivation rédigée avec la méthode VOUS-MOI-NOUS.",
  },
  {
    icon: Clock,
    badge: "Suivi Intelligents",
    title: "Rappel & Message de Relance à J+7",
    desc: "Ne laisse aucune candidature sans réponse. L'application conserve ton historique et t'envoie une notification 7 jours plus tard avec un message de relance WhatsApp prêt à être transmis.",
  },
  {
    icon: BookOpen,
    badge: "Succès Académique",
    title: "Bibliothèque de 3 500+ PDFs & Mode Hors-ligne",
    desc: "Cours, TD, annales et sujets d'examens d'universités (Yaoundé, Douala, Dschang, UCAD, INPHB...). Télécharge en Wi-Fi et révise partout, même sans connexion Internet.",
  },
  {
    icon: Brain,
    badge: "Assistant IA",
    title: "Fiches de Révision & Coach de Soutenance",
    desc: "L'assistant IA résume n'importe quel PDF académique, génère des fiches de synthèse, structure des plans de mémoire et t'entraîne aux questions de ton jury de soutenance.",
  },
  {
    icon: Wallet,
    badge: "Paiement Local",
    title: "Wallet Orange Money & MTN MoMo",
    desc: "Recharge ton solde en 10 secondes sans carte bancaire. Paye à la demande (500 FCFA les 5 candidatures) ou opte pour le Pass mensuel illimité à 2 000 FCFA.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--color-paper)] text-[var(--color-ink)]">

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden border-b border-[var(--color-ink-faint)]">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">

              {/* Left */}
              <div className="rise-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-sienna-bg)] border border-[var(--color-sienna)]/30 rounded-full mb-6">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-sienna-tone)]" />
                  <span className="font-mono text-xs font-semibold tracking-wide text-[var(--color-sienna-tone)]">
                    L&apos;IA Étudiante & Carrière n°1
                  </span>
                </div>

                <h1 className="font-display text-[2.2rem] sm:text-6xl lg:text-[4.2rem] font-black leading-[1.08] sm:leading-[0.98] tracking-[-0.03em] mb-7">
                  Trouve ton stage
                  <br />
                  & révise tes cours.
                </h1>

                <p className="text-base sm:text-lg text-[var(--color-ink-muted)] max-w-lg leading-relaxed mb-9">
                  Campus 360 analyse ton profil, trouve les stages adaptés à ta filière, génère ton CV officiel RH en 30 secondes et t&apos;ouvre l&apos;accès à 3 500+ cours d&apos;universités.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <a href={APK_URL} download="campus-360.apk">
                    <Button size="lg" variant="primary" className="gap-2 w-full sm:w-auto font-bold">
                      <BookOpen className="w-4 h-4" />
                      Télécharger l&apos;APK Gratuit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                  <Link href="/fonctionnalites">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Découvrir les fonctionnalités
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-6 text-xs text-[var(--color-ink-subtle)]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald)]" />
                    <span>1ère candidature offerte</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald)]" />
                    <span>Orange Money & MTN MoMo</span>
                  </div>
                </div>
              </div>

              {/* Right — phone mockup */}
              <div className="flex justify-center lg:justify-end rise-in" style={{ animationDelay: "120ms" }}>
                <HeroScene />
              </div>
            </div>
          </div>
        </section>

        {/* ─── MASTHEAD STRIP ───────────────────────────────────── */}
        <section className="border-b border-[var(--color-ink-faint)] bg-[var(--color-paper-deep)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--color-ink-faint)]">
              {stats.map((s) => (
                <div key={s.label} className="py-8 text-center px-4">
                  <div className="font-display text-2xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-1 text-gradient-brand">
                    {s.value}
                  </div>
                  <div className="font-mono text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-[var(--color-ink-subtle)]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PILLARS & FEATURES ─────────────────────────────────── */}
        <section className="py-24 lg:py-32 border-b border-[var(--color-ink-faint)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-16">
              <p className="kicker mb-4">L&apos;écosystème complet</p>
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-[var(--color-ink)] mb-4">
                Une seule application pour tes études et ton premier stage.
              </h2>
              <p className="text-[var(--color-ink-muted)] text-lg">
                Conçu sur-mesure pour les étudiants d&apos;Afrique francophone : connexion instable, Mobile Money local, exigences RH officielles.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className={`p-7 rounded-2xl bg-[var(--color-paper-soft)] border transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between ${
                      p.featured
                        ? "border-[var(--color-sienna)] shadow-lg shadow-[var(--color-sienna)]/10"
                        : "border-[var(--color-ink-faint)] hover:border-[var(--color-sienna)]/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-sienna-bg)] flex items-center justify-center text-[var(--color-sienna-tone)]">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="font-mono text-[0.65rem] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[var(--color-paper-deep)] text-[var(--color-sienna-tone)] border border-[var(--color-sienna)]/20">
                          {p.badge}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-bold mb-3 text-[var(--color-ink)] leading-snug">
                        {p.title}
                      </h3>
                      <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
        <HowItWorks />

        {/* ─── PRICING ──────────────────────────────────────────── */}
        <Pricing />

        {/* ─── SCREENSHOTS ───────────────────────────────────────── */}
        <Screenshots />

        {/* ─── DOWNLOAD CTA ──────────────────────────────────────── */}
        <section className="relative py-24 lg:py-32 bg-[var(--color-paper-deep)] overflow-hidden border-t border-[var(--color-ink-faint)]">
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "var(--gradient-brand)" }}
          />
          <div className="max-w-4xl mx-auto px-6 text-center relative">
            <Sparkles className="w-10 h-10 mx-auto mb-6 text-[var(--color-sienna-tone)]" strokeWidth={1.5} />
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] mb-4 text-[var(--color-ink)]">
              Prêt à booster tes études et décrocher ton stage ?
            </h2>
            <p className="text-[var(--color-ink-muted)] mb-10 max-w-lg mx-auto text-base">
              Télécharge l&apos;application Campus 360 sur ton smartphone Android. Gratuit, 1ère candidature offerte, sans pub.
            </p>
            <a href={APK_URL} download="campus-360.apk">
              <Button size="lg" variant="primary" className="gap-2 font-bold px-8 py-4">
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
