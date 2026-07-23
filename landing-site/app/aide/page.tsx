import type { Metadata } from "next";
import Link from "next/link";
import { Search, MessageCircle, Mail, Phone } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SearchableFAQ } from "@/components/searchable-faq";

export const metadata: Metadata = {
  title: "Centre d'aide Campus 360 — FAQ, contact, WhatsApp",
  description:
    "Trouve des réponses à tes questions sur Campus 360. Installation, paiement, catalogue, abonnement Premium.",
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
        a: "Télécharge l'APK depuis la page /telecharger, autorise les sources inconnues pour ton navigateur, puis ouvre le fichier. Instructions détaillées avec captures sur la page Télécharger.",
      },
      {
        q: "L'app est gratuite ?",
        a: "Oui. L'inscription est gratuite, le catalogue est consultable gratuitement, et tu as 3 PDFs offerts par mois. Pour aller plus loin, l'abonnement Premium est à 9 900 FCFA/mois (ou 4 950 avec le code RENTREE2026).",
      },
      {
        q: "Puis-je essayer sans créer de compte ?",
        a: "Tu peux parcourir le catalogue et prévisualiser les PDFs sans compte. Pour acheter ou télécharger, l'inscription est nécessaire (2 minutes, email ou Google).",
      },
    ],
  },
  {
    name: "Achat & paiement",
    icon: "💳",
    faqs: [
      {
        q: "Quels moyens de paiement acceptez-vous ?",
        a: "Orange Money, MTN Mobile Money, cartes Visa/Mastercard, paiement cash chez nos partenaires (200+ points au Cameroun).",
      },
      {
        q: "Comment recharger mon wallet ?",
        a: "Dans l'app : Wallet → Recharger → choisis le montant (500 FCFA minimum) → choisis ton mode de paiement → valide. Le wallet est crédité en 30 secondes.",
      },
      {
        q: "Puis-je être remboursé ?",
        a: "Oui. Garantie 14 jours satisfait ou remboursé, sans condition. Contacte le support avec ton numéro de commande.",
      },
      {
        q: "Le solde de mon wallet expire ?",
        a: "Non. Une fois crédité, ton solde est à toi pour toujours.",
      },
    ],
  },
  {
    name: "Catalogue & PDFs",
    icon: "📚",
    faqs: [
      {
        q: "Combien y a-t-il de PDFs dans le catalogue ?",
        a: "Plus de 3 500 PDFs couvrant Licence, Master, Médecine, Pharmacie, Ingénierie, Droit, etc. pour 28 universités camerounaises.",
      },
      {
        q: "Je ne trouve pas mon cours ?",
        a: "Cherche par matière, code de cours ou université. Si rien ne correspond, demande dans la communauté Discord ou contacte-nous : on ajoute les PDFs manquants en priorité.",
      },
      {
        q: "Puis-je vendre mes propres PDFs sur Campus 360 ?",
        a: "Programme créateurs disponible. Contacte creators@campus360b.site avec une preuve que tu es l'auteur du contenu.",
      },
    ],
  },
  {
    name: "Abonnement Premium",
    icon: "⭐",
    faqs: [
      {
        q: "Que comprend Premium ?",
        a: "PDFs illimités, IA illimitée, mode hors-ligne prioritaire, support prioritaire, accès anticipé aux nouveaux contenus.",
      },
      {
        q: "Comment annuler ?",
        a: "Dans l'app : Profil → Abonnement → Annuler. Sans engagement, remboursement au prorata des jours non utilisés.",
      },
      {
        q: "Puis-je partager mon compte ?",
        a: "Non, le compte est personnel. Mais notre programme de parrainage te permet d'offrir 1 mois Premium à 3 amis chaque année.",
      },
    ],
  },
];

export default function AidePage() {
  return (
    <SiteShell>
      <section className="py-16 lg:py-24 border-b border-[var(--color-ink-faint)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            Comment on peut{" "}
            <span className="text-[var(--color-sienna)]">
              t&apos;aider
            </span>{" "}
            ?
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] mb-8">
            Tape ta question, ou contacte-nous directement.
          </p>
        </div>
      </section>

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
              className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
            >
              <MessageCircle className="w-8 h-8 text-[var(--color-sienna)] mx-auto mb-3" />
              <h3 className="font-bold font-display mb-1">Formulaire</h3>
              <p className="text-xs text-[var(--color-ink-light)]">Réponse sous 24h</p>
            </Link>
            <a
              href="mailto:support@campus360b.site"
              className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
            >
              <Mail className="w-8 h-8 text-[var(--color-sienna)] mx-auto mb-3" />
              <h3 className="font-bold font-display mb-1">Email</h3>
              <p className="text-xs text-[var(--color-ink-light)]">support@campus360b.site</p>
            </a>
            <a
              href="https://wa.me/campus360"
              className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
            >
              <Phone className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold font-display mb-1">WhatsApp</h3>
              <p className="text-xs text-[var(--color-ink-light)]">Lun-Ven 8h-20h</p>
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}