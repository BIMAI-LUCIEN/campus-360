import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Wifi,
  Brain,
  Smartphone,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PromoBanner } from "@/components/promo-banner";
import { Screenshots } from "@/components/screenshots";
import { Download } from "@/components/download";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const stats = [
  { value: "12 000", label: "étudiants" },
  { value: "3 500+", label: "PDFs" },
  { value: "28", label: "universités" },
];

const features = [
  {
    icon: BookOpen,
    title: "3 500+ PDFs",
    desc: "Cours, TD, annales et fiches par université et niveau.",
  },
  {
    icon: Brain,
    title: "Assistant IA",
    desc: "Génère des fiches de révision à partir de tes PDFs.",
  },
  {
    icon: Wifi,
    title: "Hors-ligne",
    desc: "Télécharge en Wi-Fi, lis partout, même sans connexion.",
  },
  {
    icon: Smartphone,
    title: "Wallet Mobile Money",
    desc: "Orange Money, MTN MoMo. Achète en quelques secondes.",
  },
];

export default function HomePage() {
  return (
    <>
      <PromoBanner />
      <Navbar />
      <main>

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
          {/* Subtle background gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, #f4f4f5 0%, #ffffff 70%)",
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Left */}
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-medium tracking-wide text-[var(--color-ink-lighter)] uppercase mb-4">
                    Campus 360
                  </p>
                  <h1
                    className="text-5xl sm:text-7xl font-extrabold leading-[0.95] tracking-tight"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    La bibliothèque
                    <br />
                    <span className="text-[var(--color-brand-500)]">PDF</span> pour
                    <br />
                    réviser.
                  </h1>
                </div>

                <p className="text-lg text-[var(--color-ink-light)] max-w-md leading-relaxed">
                  Accède à des milliers de PDFs académiques, génère des fiches avec
                  l&apos;IA et lis hors-ligne. Conçu par des étudiants, pour des
                  étudiants.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={APK_URL}
                    download="campus-360.apk"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-amber-cta)] text-white font-semibold rounded-full hover:bg-[var(--color-amber-cta-hover)] transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Télécharger l&apos;APK
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <Link
                    href="/fonctionnalites"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[var(--color-ink-light)] font-medium rounded-full hover:text-[var(--color-ink)] transition-colors"
                  >
                    Voir les fonctionnalités
                  </Link>
                </div>

                {/* Trust */}
                <div className="flex gap-6 text-sm text-[var(--color-ink-lighter)]">
                  <span>Paiement Mobile Money</span>
                  <span>·</span>
                  <span>Sans engagement</span>
                </div>
              </div>

              {/* Right — phone mockup */}
              <div className="flex justify-center">
                <div className="relative w-64 h-[36rem]">
                  <div
                    className="absolute inset-0 rounded-[3rem]"
                    style={{
                      background:
                        "linear-gradient(160deg, #bae6fd 0%, #7dd3fc 100%)",
                      transform: "perspective(1000px) rotateY(-8deg) rotateX(4deg)",
                    }}
                  />
                  <div className="relative w-full h-full bg-[var(--color-ink)] rounded-[3rem] p-2 shadow-2xl">
                    <div
                      className="w-full h-full rounded-[2.4rem] flex flex-col items-center justify-center text-white p-8"
                      style={{
                        background:
                          "linear-gradient(160deg, #0ea5e9 0%, #0369a1 100%)",
                      }}
                    >
                      <BookOpen className="w-14 h-14 mb-4 opacity-90" />
                      <h3
                        className="text-2xl font-bold mb-2"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        Campus 360
                      </h3>
                      <p className="text-white/60 text-sm text-center mb-8">
                        PDFs · IA · Wallet
                        <br />
                        Mode hors-ligne
                      </p>
                      <div className="flex gap-2 text-xs">
                        <span className="px-3 py-1.5 bg-white/10 rounded-full">
                          Licence
                        </span>
                        <span className="px-3 py-1.5 bg-white/10 rounded-full">
                          Master
                        </span>
                        <span className="px-3 py-1.5 bg-white/10 rounded-full">
                          Médecine
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS ────────────────────────────────────────────── */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-8 text-center">
              {stats.map((s) => (
                <div key={s.label}>
                  <div
                    className="text-5xl sm:text-6xl font-extrabold tracking-tight text-[var(--color-brand-500)]"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-sm text-[var(--color-ink-lighter)] mt-1 uppercase tracking-wide">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ───────────────────────────────────────────── */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2
                className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Tout pour réviser.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="space-y-4">
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[var(--color-ink)]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3
                        className="font-semibold text-base mb-1"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        {f.title}
                      </h3>
                      <p className="text-sm text-[var(--color-ink-light)] leading-relaxed">
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
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2
              className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Télécharge l&apos;app.
            </h2>
            <p className="text-[var(--color-ink-light)] mb-10 max-w-md mx-auto">
              Disponible sur Android. APK gratuit, sans pub, sans engagement.
            </p>
            <a
              href={APK_URL}
              download="campus-360.apk"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--color-amber-cta)] text-white font-semibold rounded-full hover:bg-[var(--color-amber-cta-hover)] transition-colors text-base"
            >
              <BookOpen className="w-5 h-5" />
              Télécharger l&apos;APK gratuit
              <ArrowRight className="w-4 h-4" />
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
