import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  ShieldCheck,
  Smartphone,
  Wifi,
  CheckCircle2,
  Apple,
  AlertTriangle,
  History,
  Bug,
  Sparkles,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

export const metadata: Metadata = {
  title: "Télécharger Campus 360 APK — Gratuit pour Android",
  description:
    "Télécharge l'app Campus 360 pour Android. Installation en 3 étapes, fonctionne hors-ligne, paiement Mobile Money. APK gratuit, sans pub.",
  alternates: { canonical: "/telecharger" },
  openGraph: {
    title: "Télécharger Campus 360 APK pour Android",
    description:
      "APK gratuit, sans publicité. Installation rapide, mode hors-ligne, Mobile Money.",
    url: "/telecharger",
  },
};

const changelog = [
  { version: "1.1.0", date: "23 juillet 2026", changes: ["Correction de la connexion et de la synchronisation du compte", "Éditeur de rédaction (CV, lettres, rapports) fiabilisé", "Assistant IA sur PDF : affichage correct des crédits restants", "Corrections de sécurité sur le portefeuille et les paiements", "Nouveau design épuré sur tout le parcours"] },
  { version: "1.0.1", date: "2 juillet 2026", changes: ["Renommage en Campus 360", "Corrections de bugs mineurs"] },
  { version: "1.0.0", date: "1 juillet 2026", changes: ["Version initiale", "Catalogue de 3 500+ PDFs", "Assistant IA", "Wallet Mobile Money"] },
];

const requirements = [
  { label: "Android", value: "8.0 (Oreo) ou plus récent" },
  { label: "Stockage", value: "150 Mo libres" },
  { label: "RAM", value: "2 Go minimum" },
  { label: "Connexion", value: "Wi-Fi recommandé pour les téléchargements" },
];

export default function TelechargerPage() {
  return (
    <SiteShell>
      <section className="py-20 lg:py-28 border-b border-[var(--color-ink)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker justify-center flex mb-6">Téléchargement direct APK</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] mb-6">
            Télécharge Campus 360
            <span className="block text-[var(--color-sienna)]">gratuit pour Android</span>
          </h1>
          <p className="text-lg text-[var(--color-ink-muted)] mb-8 max-w-2xl mx-auto">
            APK signé, sans publicité, sans tracking. Fonctionne hors-ligne
            après le premier téléchargement des PDFs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href={APK_URL} download="campus-360.apk">
              <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                <Download className="w-5 h-5" />
                campus-360.apk (69 Mo)
              </Button>
            </a>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Problème d&apos;installation ?
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-ink-muted)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--color-emerald)]" />
              <span>APK vérifié</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--color-sienna)]" />
              <span>v1.1.0</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-[var(--color-paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] mb-3">
            Installation en 3 étapes
          </h2>
          <p className="text-[var(--color-ink-muted)] mb-10">
            Campus 360 n&apos;est pas encore sur le Play Store, donc tu dois
            autoriser les sources inconnues pour Android.
          </p>
          <div className="space-y-0">
            {[
              {
                step: "1",
                title: "Télécharge l'APK",
                desc: "Clique sur le bouton ci-dessus. Le fichier (69 Mo) s'enregistre dans ton dossier Téléchargements.",
              },
              {
                step: "2",
                title: "Autorise cette source",
                desc: "À l'ouverture, Android peut afficher un avertissement. Va dans Paramètres → Apps → Accès spécial → Installer des apps inconnues, et autorise ton navigateur (Chrome, Firefox…).",
              },
              {
                step: "3",
                title: "Installe et lance",
                desc: "Ouvre le fichier .apk → « Installer » → « Ouvrir ». L'app Campus 360 apparaît dans ton menu d'apps.",
              },
            ].map((s, i, arr) => (
              <div key={s.step} className={`flex gap-5 py-6 ${i < arr.length - 1 ? "border-b border-[var(--color-ink)]/10" : ""}`}>
                <div className="w-11 h-11 flex-shrink-0 rounded-[4px] bg-[var(--color-ink)] text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-lg">
                  {s.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg mb-1">{s.title}</h3>
                  <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-5 bg-[var(--color-sienna-bg)] border border-[var(--color-sienna)]/25 rounded-[var(--radius-editorial)] flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--color-sienna-deep)] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-sienna-deep)]">
              <strong>Pourquoi pas le Play Store ?</strong> Frais d&apos;inscription
              + processus de revue trop long pour nos mises à jour fréquentes.
              On y travaille. En attendant, l&apos;APK est sécurisé par notre
              certificat.
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)] border-y border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="kicker mb-5">Prérequis</p>
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] mb-8">
            Configuration requise
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {requirements.map((r) => (
              <div key={r.label} className="p-5 bg-[var(--color-paper-soft)] border border-[var(--color-ink)]/10 rounded-[var(--radius-editorial)] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-emerald)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-[var(--color-ink-subtle)]">{r.label}</div>
                  <div className="font-semibold text-[var(--color-ink)]">{r.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 mb-6">
            <History className="w-5 h-5 text-[var(--color-sienna)]" />
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em]">Historique des versions</h2>
          </div>
          <div className="space-y-0">
            {changelog.map((v, i) => (
              <div key={v.version} className={`py-6 ${i < changelog.length - 1 ? "border-b border-[var(--color-ink)]/10" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display font-bold text-lg">v{v.version}</div>
                  <div className="font-mono text-xs text-[var(--color-ink-subtle)]">{v.date}</div>
                </div>
                <ul className="space-y-1.5">
                  {v.changes.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-[var(--color-ink-muted)]">
                      <Bug className="w-4 h-4 mt-0.5 text-[var(--color-sienna-tone)] flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-ink)] text-[var(--color-paper)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Apple className="w-10 h-10 text-[var(--color-paper)]/50 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] mb-3">
            iOS arrive bientôt
          </h2>
          <p className="text-[var(--color-paper)]/60 mb-6">
            On prépare la version iPhone / iPad. Inscris-toi pour être prévenu.
          </p>
          <Link href="/inscription">
            <Button variant="secondary">Être notifié à la sortie iOS</Button>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}