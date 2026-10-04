import type { Metadata } from "next";
import {
  BookOpen,
  Brain,
  Wallet,
  Wifi,
  Smartphone,
  Search,
  Sparkles,
  FileText,
  Clock,
  Send,
  Building2,
  Bell,
  ShieldCheck,
  Languages,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Fonctionnalités — Matching Stage IA, CV Officiel & PDFs Académiques",
  description:
    "Découvre toutes les fonctionnalités de Campus 360 : Matching de stage par IA, Générateur de CV Officiel RH, Rappel de relance J+7, 3 500+ PDFs académiques et Wallet Mobile Money.",
  alternates: { canonical: "/fonctionnalites" },
  openGraph: {
    title: "Fonctionnalités Campus 360",
    description: "Stage IA + CV Officiel + Catalogue 3 500+ PDFs + Wallet Mobile Money. Conçu pour les étudiants.",
    url: "/fonctionnalites",
  },
};

const features = [
  {
    icon: Sparkles,
    title: "Matching de Stage IA & Score %",
    desc: "L'Agent IA analyse la description de chaque offre et compare avec ton niveau et ta filière. Il calcule ton score de correspondance (ex: 🔥 95%) avec tes 2 points forts et 1 conseil stratégique.",
  },
  {
    icon: FileText,
    title: "Template CV Officiel RH (2 Colonnes)",
    desc: "Génère automatiquement un CV respectant le format standard exigé par les recruteurs en Afrique (structure 2 colonnes avec compétences découpées en 3 blocs).",
  },
  {
    icon: Send,
    title: "Envoi 1-Clic via WhatsApp RH & Email",
    desc: "Envoie ta candidature directement sur le numéro WhatsApp du recruteur ou par e-mail avec un texte d'accroche pré-rédigé et ton CV PDF joint.",
  },
  {
    icon: Clock,
    title: "Suivi & Rappel de Relance à J+7",
    desc: "Conserve l'historique complet de tes candidatures et reçois une notification 7 jours plus tard avec un message de relance professionnel prêt à envoyer.",
  },
  {
    icon: BookOpen,
    title: "Catalogue de 3 500+ PDFs Académiques",
    desc: "Cours, TD, fiches et annales d'examens classés par université (Yaoundé, Douala, Dschang, UCAD, INPHB...), filière et niveau d'études.",
  },
  {
    icon: Brain,
    title: "Assistant IA & Fiches de Révision",
    desc: "Résume les chapitres denses de tes cours, génère des fiches de synthèse concises et crée des questionnaires d'auto-évaluation en quelques secondes.",
  },
  {
    icon: Wallet,
    title: "Wallet Mobile Money FCFA",
    desc: "Recharge ton solde en 10 secondes via Orange Money ou MTN MoMo. Paye à l'unité (500 FCFA les 5 candidatures) ou avec le Pass mensuel (2 000 FCFA).",
  },
  {
    icon: Wifi,
    title: "Lecture & Mode 100% Hors-ligne",
    desc: "Télécharge tes documents et tes fiches en Wi-Fi. Lis et révise librement dans les zones sans réseau ou pendant les coupures d'électricité.",
  },
  {
    icon: Search,
    title: "Moteur de Recherche Intelligente",
    desc: "Recherche un document ou une offre par mot-clé, nom d'entreprise, matière, code de cours ou nom d'enseignant.",
  },
  {
    icon: Building2,
    title: "Portail Recruteur & Offres Directes",
    desc: "Les entreprises partenaires publient directement leurs opportunités de stage et accèdent à la CVthèque d'étudiants qualifiés.",
  },
  {
    icon: Languages,
    title: "Interface Bilingue (Français / Anglais)",
    desc: "Adaptée aux universités francophones et anglophones. L'interface s'ajuste automatiquement selon la langue de ton téléphone.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité & Historique des Achats",
    desc: "Toutes les transactions Mobile Money sont chiffrées. Retrouve tes factures, tes téléchargements et tes rédactions en toute sécurité.",
  },
];

export default function FonctionnalitesPage() {
  return (
    <SiteShell>
      <section className="py-20 lg:py-28 border-b border-[var(--color-ink-faint)] bg-[var(--color-paper-deep)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker justify-center flex mb-4">12 fonctionnalités conçues pour ta réussite</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] mb-6 leading-[1.05] text-[var(--color-ink)]">
            Tout pour réviser et trouver son stage.
          </h1>
          <p className="text-lg text-[var(--color-ink-muted)] max-w-2xl mx-auto">
            Développé pour répondre aux réalités du parcours étudiant : connexion instable, Mobile Money local, exigences des recruteurs.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-[var(--color-paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-7 rounded-2xl bg-[var(--color-paper-soft)] border border-[var(--color-ink-faint)] hover:border-[var(--color-sienna)]/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-sienna-bg)] flex items-center justify-center text-[var(--color-sienna-tone)] mb-5">
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2.5 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[var(--color-paper-deep)] border-t border-[var(--color-ink-faint)] text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] mb-4 text-[var(--color-ink)]">
            Prêt à faire la différence ?
          </h2>
          <p className="text-[var(--color-ink-muted)] mb-8 max-w-md mx-auto">
            Téléchargement gratuit. 1ère candidature IA offerte. Sans publicité.
          </p>
          <a
            href="https://campus360b.site/downloads/campus-360.apk"
            download="campus-360.apk"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--gradient-brand)] hover:opacity-90 text-white font-bold rounded-[var(--radius-editorial)] transition-opacity shadow-lg"
          >
            <BookOpen className="w-5 h-5" />
            Télécharger Campus 360 (APK)
          </a>
        </div>
      </section>
    </SiteShell>
  );
}
