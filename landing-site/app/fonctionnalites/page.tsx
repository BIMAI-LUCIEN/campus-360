import type { Metadata } from "next";
import {
  BookOpen,
  Brain,
  Wallet,
  Wifi,
  Smartphone,
  Search,
  Languages,
  CloudDownload,
  FileText,
  ShieldCheck,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Fonctionnalités — Catalogue, IA, Wallet Mobile Money",
  description:
    "Toutes les fonctionnalités de Campus 360 : catalogue de 3 500+ PDFs, assistant IA pour fiches de révision, wallet Mobile Money, mode hors-ligne, multi-appareils.",
  alternates: { canonical: "/fonctionnalites" },
  openGraph: {
    title: "Fonctionnalités Campus 360",
    description: "Catalogue + IA + Wallet + Hors-ligne. Conçu pour les étudiants africains.",
    url: "/fonctionnalites",
  },
};

const features = [
  {
    icon: BookOpen,
    title: "Catalogue de 3 500+ PDFs",
    desc: "Cours, TD, annales, fiches. Classés par université, faculté, niveau et matière.",
  },
  {
    icon: Brain,
    title: "Assistant IA intégré",
    desc: "Génère fiches, résumés et QCM à partir de tes PDFs en quelques secondes.",
  },
  {
    icon: Wallet,
    title: "Wallet Mobile Money",
    desc: "Orange Money, MTN MoMo, cartes bancaires. Recharge en 30 secondes.",
  },
  {
    icon: Wifi,
    title: "Mode hors-ligne",
    desc: "Télécharge tes PDFs en Wi-Fi. Lis partout — bus, campus, coupures ENEO.",
  },
  {
    icon: Search,
    title: "Recherche intelligente",
    desc: "Trouve un PDF en cherchant par mots-clés, matière ou code de cours.",
  },
  {
    icon: FileText,
    title: "Prévisualisation gratuite",
    desc: "Feuillète les 5 premières pages avant d'acheter. Pas d'achat à l'aveugle.",
  },
  {
    icon: CloudDownload,
    title: "Sync multi-appareils",
    desc: "Achète sur l'app, retrouve tes PDFs sur le web et vice-versa.",
  },
  {
    icon: Languages,
    title: "Français + Anglais",
    desc: "Bilingue. L'UI passe en EN automatiquement selon la langue du système.",
  },
  {
    icon: Smartphone,
    title: "Lecteur intégré",
    desc: "Zoom, surlignage, signets, mode nuit. Confortable pour les longs PDFs.",
  },
  {
    icon: ShieldCheck,
    title: "Achat sécurisé",
    desc: "Transactions chiffrées, historique clair, factures téléchargeables.",
  },
  {
    icon: MessageSquare,
    title: "Notes & annotations",
    desc: "Surligne, annote, partage tes passages préférés avec ta promo.",
  },
  {
    icon: Sparkles,
    title: "Recommandations IA",
    desc: "Plus tu lis, mieux on te suggère les PDFs qui t'aideront.",
  },
];

export default function FonctionnalitesPage() {
  return (
    <SiteShell>
      <section className="py-20 lg:py-28 border-b border-[var(--color-ink)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker justify-center flex mb-6">12 fonctionnalités pensées pour toi</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] mb-6 leading-[1.05]">
            Tout pour réviser, dans ta poche.
          </h1>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Conçu pour les étudiants camerounais et africains : connexion
            instable, Mobile Money, programmes locaux.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-x-12">
            {features.map((f, i) => {
              const Icon = f.icon;
              const isLast = i >= features.length - (features.length % 2 === 0 ? 2 : 1);
              return (
                <div
                  key={f.title}
                  className={`flex gap-5 py-7 ${!isLast ? "border-b border-[var(--color-ink)]/10" : ""}`}
                >
                  <Icon className="w-6 h-6 text-[var(--color-sienna)] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h3 className="font-display text-lg font-bold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[var(--color-ink)] text-[var(--color-paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] mb-4">
            Prêt à essayer ?
          </h2>
          <p className="text-[var(--color-paper)]/60 mb-8">
            Téléchargement gratuit, sans pub, sans engagement.
          </p>
          <a
            href="https://campus360b.site/downloads/campus-360.apk"
            download="campus-360.apk"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[var(--color-sienna)] hover:bg-[var(--color-sienna-deep)] text-white font-semibold rounded-[var(--radius-editorial)] transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Télécharger Campus 360
          </a>
        </div>
      </section>
    </SiteShell>
  );
}
