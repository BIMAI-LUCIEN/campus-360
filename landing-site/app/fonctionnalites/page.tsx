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
    color: "from-brand-500 to-brand-700",
  },
  {
    icon: Brain,
    title: "Assistant IA intégré",
    desc: "Génère fiches, résumés et QCM à partir de tes PDFs en quelques secondes.",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: Wallet,
    title: "Wallet Mobile Money",
    desc: "Orange Money, MTN MoMo, cartes bancaires. Recharge en 30 secondes.",
    color: "from-emerald-400 to-emerald-600",
  },
  {
    icon: Wifi,
    title: "Mode hors-ligne",
    desc: "Télécharge tes PDFs en Wi-Fi. Lis partout — bus, campus, coupures ENEO.",
    color: "from-slate-700 to-slate-900",
  },
  {
    icon: Search,
    title: "Recherche intelligente",
    desc: "Trouve un PDF en cherchant par mots-clés, matière ou code de cours.",
    color: "from-violet-500 to-purple-700",
  },
  {
    icon: FileText,
    title: "Prévisualisation gratuite",
    desc: "Feuillète les 5 premières pages avant d'acheter. Pas d'achat à l'aveugle.",
    color: "from-rose-400 to-rose-600",
  },
  {
    icon: CloudDownload,
    title: "Sync multi-appareils",
    desc: "Achète sur l'app, retrouve tes PDFs sur le web et vice-versa.",
    color: "from-cyan-500 to-cyan-700",
  },
  {
    icon: Languages,
    title: "Français + Anglais",
    desc: "Bilingue. L'UI passe en EN automatiquement selon la langue du système.",
    color: "from-indigo-500 to-indigo-700",
  },
  {
    icon: Smartphone,
    title: "Lecteur intégré",
    desc: "Zoom, surlignage, signets, mode nuit. Confortable pour les longs PDFs.",
    color: "from-teal-500 to-teal-700",
  },
  {
    icon: ShieldCheck,
    title: "Achat sécurisé",
    desc: "Transactions chiffrées, historique clair, factures téléchargeables.",
    color: "from-pink-500 to-rose-700",
  },
  {
    icon: MessageSquare,
    title: "Notes & annotations",
    desc: "Surligne, annote, partage tes passages préférés avec ta promo.",
    color: "from-orange-400 to-amber-600",
  },
  {
    icon: Sparkles,
    title: "Recommandations IA",
    desc: "Plus tu lis, mieux on te suggère les PDFs qui t'aideront.",
    color: "from-fuchsia-500 to-pink-600",
  },
];

export default function FonctionnalitesPage() {
  return (
    <SiteShell>
      <section className="py-16 lg:py-24 bg-gradient-to-br from-brand-50 via-white to-brand-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            12 fonctionnalités pensées pour toi
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            Tout pour réviser,{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              dans ta poche
            </span>
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Conçu pour les étudiants camerounais et africains : connexion
            instable, Mobile Money, programmes locaux.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group p-6 lg:p-7 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-2">{f.title}</h3>
                  <p className="text-sm text-[var(--color-ink-light)] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold font-display mb-4">
            Prêt à essayer ?
          </h2>
          <p className="text-[var(--color-ink-light)] mb-6">
            Téléchargement gratuit, sans pub, sans engagement.
          </p>
          <a
            href="https://campus360b.site/downloads/campus-360.apk"
            download="campus-360.apk"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-cta hover:bg-amber-cta-hover text-white font-semibold rounded-xl transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Télécharger Campus 360
          </a>
        </div>
      </section>
    </SiteShell>
  );
}