import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Campus 360 collecte, utilise et protège tes données personnelles.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Transparence totale sur tes données. On collecte le strict minimum, on ne vend rien."
    >
      <LegalSection title="Données qu'on collecte">
        <p><strong>Pour créer ton compte :</strong> email, prénom, nom.</p>
        <p><strong>Pour les achats :</strong> historique des transactions (jamais tes identifiants Mobile Money).</p>
        <p><strong>Pour améliorer l'app :</strong> données d&apos;usage anonymisées (pages vues, crash reports).</p>
      </LegalSection>
      <LegalSection title="Comment on les utilise">
        <p>Pour te fournir le service (catalogue, achats, recommandations). Pour t&apos;envoyer des emails de service (confirmation d&apos;achat, alertes de sécurité). Pour améliorer le produit.</p>
      </LegalSection>
      <LegalSection title="Ce qu'on ne fait PAS">
        <p>On ne vend pas tes données. On ne partage pas avec des annonceurs. On ne t&apos;envoie pas de spam.</p>
      </LegalSection>
      <LegalSection title="Tes droits">
        <p>Tu peux à tout moment : exporter tes données, supprimer ton compte, refuser les emails marketing. Un email à privacy@campus360b.site suffit.</p>
      </LegalSection>
      <LegalSection title="Combien de temps on garde tes données">
        <p>Tant que ton compte est actif. Suppression automatique 30 jours après suppression du compte (sauf obligations légales comptables : 10 ans pour les factures).</p>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>Données hébergées chez Supabase (Frankfurt, Allemagne) et Vercel (CDN mondial). Conforme RGPD.</p>
      </LegalSection>
    </LegalPage>
  );
}