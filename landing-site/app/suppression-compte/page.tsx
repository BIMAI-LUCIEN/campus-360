import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Suppression de compte et de données",
  description: "Procédure complète pour supprimer ton compte Campus 360 et l'ensemble de tes données personnelles.",
  alternates: { canonical: "/suppression-compte" },
};

export default function SuppressionComptePage() {
  return (
    <LegalPage
      title="Suppression de compte"
      description="Comment supprimer ton compte et l'intégralité de tes données personnelles, directement depuis l'application ou par demande écrite."
      updatedAt="octobre 2026"
    >
      <LegalSection title="1. Suppression directe depuis l'application mobile">
        <p>Tu peux supprimer ton compte instantanément et en toute autonomie depuis ton smartphone :</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Ouvre l&apos;application <strong>Campus 360</strong>.</li>
          <li>Rends-toi dans l&apos;onglet <strong>Mon Profil</strong>.</li>
          <li>Fais défiler jusqu&apos;à la section <strong>Compte &amp; Assistance</strong>.</li>
          <li>Clique sur le bouton rouge <strong>Supprimer mon compte</strong>.</li>
          <li>Prends connaissance du récapitulatif des données qui seront détruites, puis tape le mot <code>SUPPRIMER</code> en majuscules pour confirmer.</li>
        </ol>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">La suppression est immédiate : ta session est invalidée et tes données sont purgées.</p>
      </LegalSection>

      <LegalSection title="2. Demande de suppression sans l'application">
        <p>Si tu n&apos;as plus accès à ton téléphone ou si tu as désinstallé l&apos;application, tu peux demander la suppression par email :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Envoie un email à <a href="mailto:privacy@campus360b.site" className="text-[var(--color-primary)] underline">privacy@campus360b.site</a> ou utilise notre <Link href="/contact" className="text-[var(--color-primary)] underline">formulaire de contact</Link>.</li>
          <li>Précise l&apos;adresse email exacte associée à ton compte Campus 360 avec pour objet <em>« Demande de suppression de compte »</em>.</li>
          <li>Après vérification de ton identité, ton compte sera intégralement supprimé sous <strong>48 heures ouvrées</strong>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Données supprimées définitivement">
        <p>Lors de la suppression de ton compte, les éléments suivants sont immédiatement et irréversiblement effacés :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ton profil étudiant (nom, email, téléphone, filière, niveau d&apos;études).</li>
          <li>Tous tes rapports de stage, mémoires et rédactions créés sur la plateforme.</li>
          <li>L&apos;ensemble de tes documents, sources et images téléversés sur nos serveurs.</li>
          <li>Tes candidatures de stage, relances et documents de candidature associés (CV, lettres).</li>
          <li>Tes droits d&apos;accès au catalogue de documents.</li>
          <li>Ta liaison WhatsApp et tes sessions d&apos;authentification.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Données conservées de façon anonymisée">
        <p>Conformément aux obligations légales et comptables régissant les opérations financières, l&apos;historique brut des paiements et recharges Mobile Money est conservé dans notre base sans ton identifiant utilisateur, sans ton nom et sans ton adresse email (données financières strictement anonymisées).</p>
      </LegalSection>
    </LegalPage>
  );
}
