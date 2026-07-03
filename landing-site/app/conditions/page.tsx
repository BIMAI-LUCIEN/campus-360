import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation de Campus 360.",
  alternates: { canonical: "/conditions" },
};

export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      description="Les règles du jeu quand tu utilises Campus 360. En langage simple, pas en jargon d'avocat."
    >
      <LegalSection title="1. Qui on est">
        <p>Campus 360 est édité par Campus 360 SAS, immatriculée au Cameroun. Siège social : Douala, Akwa.</p>
      </LegalSection>
      <LegalSection title="2. Ce que tu peux faire">
        <p>Tu peux utiliser Campus 360 pour réviser, acheter des PDFs, générer des fiches avec l&apos;IA. Pour ton usage personnel uniquement.</p>
      </LegalSection>
      <LegalSection title="3. Ce que tu ne peux pas faire">
        <p>Pas de revente des PDFs que t&apos;achètes. Pas de redistribution. Pas de scraping massif de notre catalogue. Pas d&apos;utilisation pour former d&apos;autres modèles d&apos;IA.</p>
      </LegalSection>
      <LegalSection title="4. Tes achats">
        <p>Une fois un PDF acheté (ou inclus dans ton Premium), il est à toi pour toujours. Tu peux le lire sur tous tes appareils connectés à ton compte.</p>
      </LegalSection>
      <LegalSection title="5. Annulation et remboursement">
        <p>Premium sans engagement. Annulation à tout moment depuis l&apos;app. Garantie satisfait ou remboursé 14 jours pour le premier abonnement.</p>
      </LegalSection>
      <LegalSection title="6. On peut fermer ton compte si...">
        <p>Tu fais du tort à d&apos;autres étudiants (arnaque, spam, partage massif de PDFs piratés). Dans ce cas, on te prévient d&apos;abord.</p>
      </LegalSection>
      <LegalSection title="7. Modification des conditions">
        <p>Si on change ces conditions de manière importante, on t&apos;envoie un email 30 jours avant.</p>
      </LegalSection>
      <LegalSection title="8. Contact">
        <p>Pour toute question : legal@campus360b.site</p>
      </LegalSection>
    </LegalPage>
  );
}