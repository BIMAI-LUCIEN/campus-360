import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/landing/page-hero";
import { SearchableFAQ } from "@/components/searchable-faq";

export const metadata: Metadata = {
  title: "Centre d'aide Campus 360 — FAQ, contact, WhatsApp",
  description:
    "Réponses à tes questions sur Campus 360 : installation, candidatures, wallet Mobile Money, coach de soutenance.",
  alternates: { canonical: "/aide" },
  openGraph: {
    title: "Centre d'aide Campus 360",
    description: "FAQ, contact, WhatsApp — réponse rapide.",
    url: "/aide",
  },
};

const categories = [
  {
    name: "Démarrage",
    icon: "🚀",
    faqs: [
      {
        q: "Comment installer Campus 360 sur mon téléphone ?",
        a: "Télécharge l'APK depuis la page Télécharger, autorise l'installation depuis ton navigateur, puis ouvre le fichier. L'application est disponible sur Android pour le moment.",
      },
      {
        q: "L'app est gratuite ?",
        a: "Oui. Pendant le lancement, toutes les fonctions sont gratuites : candidatures, CV, lettres, rapports, mémoires, coach et PDF. Ensuite, le paiement se fera à l'usage avec ton wallet.",
      },
      {
        q: "Y a-t-il une version iPhone ?",
        a: "Pas encore. La version iOS n'est pas disponible pour le moment.",
      },
    ],
  },
  {
    name: "Stages & candidatures",
    icon: "💼",
    faqs: [
      {
        q: "Comment fonctionne le score de correspondance ?",
        a: "L'IA compare ton profil à la description de chaque offre et affiche un pourcentage, tes points forts et un conseil pour ta candidature.",
      },
      {
        q: "Comment envoyer ma candidature ?",
        a: "Ouvre une offre, génère ton CV officiel RH et ta lettre, puis choisis le canal : dans l'app, par WhatsApp RH ou par e-mail RH.",
      },
      {
        q: "Comment fonctionne la relance à J+7 ?",
        a: "Chaque candidature est enregistrée dans ton suivi. Sept jours après l'envoi, Campus 360 te signale qu'une relance est utile.",
      },
    ],
  },
  {
    name: "Wallet & paiement",
    icon: "💳",
    faqs: [
      {
        q: "Quels moyens de paiement acceptez-vous ?",
        a: "MTN MoMo et Orange Money. Le paiement se fait depuis ton téléphone, sans carte bancaire.",
      },
      {
        q: "Comment recharger mon wallet ?",
        a: "Dans l'app : Profil → Recharger → choisis le montant (500 FCFA minimum) et ton moyen de paiement, puis valide.",
      },
      {
        q: "Combien coûte chaque action ?",
        a: "Rien pendant le lancement : tout est gratuit. Ensuite : candidature 500 FCFA, rapport de stage IA 2 000 FCFA, mémoire IA 5 000 FCFA, document PDF 250 FCFA.",
      },
    ],
  },
  {
    name: "Coach & rédaction",
    icon: "🎓",
    faqs: [
      {
        q: "Comment fonctionne le coach de soutenance ?",
        a: "Dans l'app, à partir de ton rapport, l'IA prépare des slides, ce que tu dois dire au jury et des questions pièges avec une réponse modèle.",
      },
      {
        q: "Puis-je modifier le texte généré par l'IA ?",
        a: "Oui. Le CV, la lettre et les rapports sont modifiables dans l'éditeur avant envoi ou export.",
      },
    ],
  },
];

export default function AidePage() {
  return (
    <SiteShell>
      <PageHero kicker="Centre d'aide" title="Comment on peut" accent="t'aider ?" subtitle="Tape ta question, ou contacte-nous directement sur WhatsApp au +237 690 27 35 00." />

      <section className="py-12 bg-[var(--color-paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchableFAQ categories={categories} />
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold font-display mb-8 text-center">
            Pas trouvé ? Contacte-nous directement
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/contact"
              className="reveal p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
            >
              <MessageCircle className="w-8 h-8 text-[var(--color-sienna)] mx-auto mb-3" />
              <h3 className="font-bold font-display mb-1">Formulaire</h3>
              <p className="text-xs text-[var(--color-ink-light)]">Réponse sous 24h</p>
            </Link>
            <a
              href="https://wa.me/237690273500"
              className="reveal p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
            >
              <Phone className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold font-display mb-1">WhatsApp</h3>
              <p className="text-xs text-[var(--color-ink-light)]">+237 690 27 35 00</p>
            </a>
            <a
              href="mailto:support@campus360b.site"
              className="reveal p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
            >
              <Mail className="w-8 h-8 text-[var(--color-sienna)] mx-auto mb-3" />
              <h3 className="font-bold font-display mb-1">Email</h3>
              <p className="text-xs text-[var(--color-ink-light)]">support@campus360b.site</p>
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
