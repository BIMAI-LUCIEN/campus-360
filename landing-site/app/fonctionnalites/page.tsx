import type { Metadata } from "next";
import {
  BookOpen,
  Brain,
  Wallet,
  Smartphone,
  Search,
  Sparkles,
  FileText,
  Clock,
  Send,
  Bell,
  GraduationCap,
  PenLine,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { TiltCard } from "@/components/landing/tilt-card";
import { PageHero } from "@/components/landing/page-hero";

export const metadata: Metadata = {
  title: "Fonctionnalités — Stage IA, CV officiel RH & Coach de soutenance",
  description:
    "Découvre les fonctionnalités de Campus 360 : matching de stage par IA, CV officiel RH, lettre de motivation, suivi et relance à J+7, atelier d'écriture IA, coach de soutenance et wallet Mobile Money.",
  alternates: { canonical: "/fonctionnalites" },
  openGraph: {
    title: "Fonctionnalités Campus 360",
    description: "Stage IA, CV adapté à chaque offre, suivi J+7 et coach de soutenance. PDF gratuits, candidatures dès 300 FCFA.",
    url: "/fonctionnalites",
  },
};

const features = [
  {
    icon: Sparkles,
    title: "Matching de stage par IA",
    desc: "L'IA compare ton profil à la description de chaque offre. Tu vois ton score de correspondance, tes points forts et un conseil pour ta candidature.",
  },
  {
    icon: Search,
    title: "Offres filtrées par catégorie",
    desc: "Stage académique, stage professionnel ou premier emploi : filtre par type et par domaine, avec les offres les plus pertinentes pour ta filière en tête.",
  },
  {
    icon: FileText,
    title: "CV officiel RH",
    desc: "Un CV en deux colonnes, au format attendu par les recruteurs, généré à partir de ton profil. Tu le modifies avant envoi.",
  },
  {
    icon: PenLine,
    title: "Lettre de motivation IA",
    desc: "Une lettre adaptée à chaque offre, rédigée à partir de ton profil et de la description du poste. Tu la relis avant de l'envoyer.",
  },
  {
    icon: Send,
    title: "Envoi par WhatsApp, e-mail ou dans l'app",
    desc: "Envoie ta candidature avec ton CV et ta lettre au recruteur, par WhatsApp, par e-mail ou depuis l'application.",
  },
  {
    icon: Clock,
    title: "Suivi & relance à J+7",
    desc: "Chaque candidature est enregistrée dans ton historique. Campus 360 te signale quand une relance est utile, 7 jours après ton envoi.",
  },
  {
    icon: Brain,
    title: "Atelier d'écriture IA",
    desc: "Rédige ton rapport de stage, ton mémoire ou ton CV avec l'aide de l'IA. Tu gardes la main sur le contenu final.",
  },
  {
    icon: GraduationCap,
    title: "Coach IA de soutenance",
    desc: "À partir de ton rapport : slides, points à dire au jury, questions pièges et réponses modèles pour t'entraîner.",
  },
  {
    icon: BookOpen,
    title: "Ressources académiques",
    desc: "Annales d'examens et rapports de stage de référence, à consulter et à filtrer par université et matière.",
  },
  {
    icon: Wallet,
    title: "Wallet Mobile Money",
    desc: "1 000 coins offerts au lancement. Recharge dès 500 FCFA via Orange Money ou MTN MoMo, sans abonnement.",
  },
  {
    icon: Bell,
    title: "Alertes d'offres",
    desc: "Reçois une notification quand une nouvelle offre correspond à ta filière et à ton profil.",
  },
  {
    icon: Smartphone,
    title: "Application Android",
    desc: "Installe l'APK gratuit en quelques étapes. La version iOS n'est pas encore disponible.",
  },
];

export default function FonctionnalitesPage() {
  return (
    <SiteShell>
      <PageHero kicker="Tout ce que l'app fait pour toi" title="Trouver ton stage, rédiger ton dossier, réussir ta" accent="soutenance." subtitle="Postule, suis tes candidatures et prépare ton rapport au même endroit. 1 000 coins offerts pendant le lancement." />

      <section className="py-16 lg:py-24 bg-[var(--color-paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <TiltCard
                  key={f.title}
                  className="reveal p-7 rounded-2xl bg-[var(--color-paper-soft)] border border-[var(--color-ink-faint)] hover:border-[var(--color-sienna)]/40"
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
                </TiltCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[var(--color-paper-deep)] border-t border-[var(--color-ink-faint)] text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] mb-4 text-[var(--color-ink)]">
            Prêt à postuler ?
          </h2>
          <p className="text-[var(--color-ink-muted)] mb-8 max-w-md mx-auto">
            Téléchargement gratuit. 1 000 coins offerts à l&apos;inscription pendant le lancement.
          </p>
          <a
            href="https://campus360b.site/downloads/campus-360.apk"
            download="campus-360.apk"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[image:var(--gradient-brand)] hover:opacity-90 text-white font-bold rounded-[var(--radius-editorial)] transition-opacity shadow-lg"
          >
            <BookOpen className="w-5 h-5" />
            Télécharger Campus 360 (APK)
          </a>
        </div>
      </section>
    </SiteShell>
  );
}
