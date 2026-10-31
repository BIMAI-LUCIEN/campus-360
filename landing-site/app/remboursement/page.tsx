import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Politique de remboursement",
  description: "Conditions et procédure de remboursement des recharges et achats sur Campus 360.",
  alternates: { canonical: "/remboursement" },
};

export default function RemboursementPage() {
  return (
    <LegalPage
      title="Politique de remboursement"
      description="Transparence sur les règles de remboursement des recharges et achats de documents."
      updatedAt="octobre 2026"
    >
      <LegalSection title="1. Absence d'abonnement récurrent">
        <p>Campus 360 fonctionne exclusivement au crédit de wallet et à l&apos;acte. Aucun abonnement récurrent n&apos;est facturé, éliminant tout risque de prélèvement imprévu.</p>
      </LegalSection>

      <LegalSection title="2. Recharges de wallet Mobile Money">
        <p>Si tu as effectué une recharge de portefeuille par erreur et qu&apos;aucun coin n&apos;a encore été dépensé, tu peux demander un remboursement sous 7 jours calendaires suivant le paiement.</p>
        <p>La demande doit être formulée avec la référence de transaction Notch Pay et le numéro de téléphone émetteur.</p>
      </LegalSection>

      <LegalSection title="3. Candidatures, rédaction, packs et Pass">
        <p>Une candidature qui n&apos;a pas pu être envoyée rend automatiquement ses coins ou ses crédits. Une rédaction IA échouée (rapport, chapitre de mémoire, CV) est recréditée immédiatement. Les packs et les Pass Révision, achetés une seule fois, ne sont pas remboursables une fois activés ; un défaut technique signalé au support donne lieu à un recrédit en coins.</p>
        <p>Rappel : la lecture des PDF est gratuite et ne fait l&apos;objet d&apos;aucune transaction payante. Une candidature non envoyée ou une rédaction IA échouée est recréditée automatiquement.</p>
      </LegalSection>

      <LegalSection title="4. Procédure de réclamation">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Contacte notre équipe via notre <Link href="/contact" className="text-[var(--color-primary)] underline">formulaire de contact</Link> ou par email à <a href="mailto:support@campus360b.site" className="text-[var(--color-primary)] underline">support@campus360b.site</a>.</li>
          <li>Transmets ton adresse email de compte et la référence de paiement concernée.</li>
          <li>Notre équipe examine la réclamation et te répond sous 48 heures ouvrées.</li>
        </ol>
      </LegalSection>
    </LegalPage>
  );
}
