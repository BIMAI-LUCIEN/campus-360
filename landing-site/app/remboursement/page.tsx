import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Politique de remboursement",
  description: "Conditions et procédure de remboursement des achats Campus 360.",
  alternates: { canonical: "/remboursement" },
};

export default function RemboursementPage() {
  return (
    <LegalPage
      title="Politique de remboursement"
      description="Satisfait ou remboursé pendant 14 jours, sans condition. Voici comment ça marche."
    >
      <LegalSection title="Garantie 14 jours">
        <p>Pour ton premier abonnement Premium, tu as 14 jours pour tester sans risque. Si ça te convient pas, on te rembourse intégralement.</p>
      </LegalSection>
      <LegalSection title="Achats unitaires de PDFs">
        <p>Le PDF n&apos;a pas été téléchargé ou ouvert ? On te rembourse sous 7 jours.</p>
        <p>Si le PDF a été téléchargé, le contenu est différent du descriptif ? On rembourse aussi, sur preuve.</p>
      </LegalSection>
      <LegalSection title="Procédure">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Envoie un email à support@campus360b.site avec ton numéro de commande</li>
          <li>On confirme le remboursement sous 24h ouvrées</li>
          <li>L&apos;argent est recrédité sur ton moyen de paiement initial sous 3-7 jours</li>
        </ol>
      </LegalSection>
      <LegalSection title="Cas particuliers">
        <p>Bug technique t&apos;empêchant d&apos;accéder au contenu ? Remboursement systématique avec excuses.</p>
        <p>Contenu offensant ou erroné signalé ? Remboursement + retrait immédiat.</p>
      </LegalSection>
    </LegalPage>
  );
}