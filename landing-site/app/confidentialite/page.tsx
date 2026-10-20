import type { Metadata } from "next";
import Link from "next/link";
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
      description="Transparence totale sur tes données. Nous collectons le strict nécessaire pour ton parcours étudiant et nous ne vendons rien."
      updatedAt="octobre 2026"
    >
      <LegalSection title="1. Données que nous collectons">
        <p>Dans le cadre de l&apos;utilisation de l&apos;application Campus 360 et de ses services associés, nous collectons les informations suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Identité et compte :</strong> adresse email, prénom, nom.</li>
          <li><strong>Coordonnées :</strong> numéro de téléphone, numéro WhatsApp (utilisé exclusivement pour les alertes de candidatures et le support si configuré).</li>
          <li><strong>Parcours académique :</strong> établissement / université, faculté, filière, niveau d&apos;études.</li>
          <li><strong>Contenus académiques :</strong> rapports de stage, mémoires, sections rédigées, sources documentaires et images téléversées pour analyse.</li>
          <li><strong>Candidatures et insertion :</strong> offres de stage consultées, candidatures envoyées, historique des relances, CV et lettres de motivation.</li>
          <li><strong>Appareil et alertes :</strong> jeton de notification push Expo pour t&apos;avertir des réponses d&apos;entreprises et de l&apos;état de tes rédactions.</li>
          <li><strong>Historique financier :</strong> montants rechargés, date et références des transactions Mobile Money (nous ne recevons et ne stockons jamais tes identifiants secrets bancaires ou codes PIN Mobile Money).</li>
          <li><strong>Journaux techniques :</strong> adresses IP et journaux de sécurité pour prévenir les abus et protéger l&apos;accès à ton compte.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Finalités du traitement">
        <p>Tes données sont utilisées exclusivement pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fournir les services académiques (accès au catalogue, assistant de rédaction de rapports, suivi des candidatures).</li>
          <li>Gérer ton portefeuille de coins et exécuter les transactions demandées.</li>
          <li>T&apos;envoyer les alertes de service indispensables (relance de stage à J+7, confirmation d&apos;achat, réinitialisation de mot de passe).</li>
          <li>Garantir la sécurité de la plateforme et prévenir les abus ou fraudes.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Ce que nous ne faisons JAMAIS">
        <p>Nous ne vendons pas tes données personnelles. Nous ne les partageons avec aucun annonceur publicitaire et nous n&apos;effectuons aucun démarchage commercial intrusif.</p>
      </LegalSection>

      <LegalSection title="4. Durée de conservation et suppression">
        <p><strong>Données de compte :</strong> conservées tant que ton compte est actif. Tu peux supprimer ton compte à tout moment depuis l&apos;application mobile ou via notre <Link href="/suppression-compte" className="text-[var(--color-primary)] underline">page de suppression</Link>.</p>
        <p><strong>Suppression immédiate :</strong> dès confirmation de la suppression, tes informations de profil, tes documents, tes candidatures, tes fichiers téléversés et tes sessions WhatsApp sont effacés définitivement.</p>
        <p><strong>Obligations légales comptables :</strong> conformément aux obligations légales relatives aux transactions financières, l&apos;historique brut des opérations financières est conservé sous forme anonymisée (l&apos;identifiant utilisateur, le nom et l&apos;email sont définitivement effacés de ces écritures).</p>
      </LegalSection>

      <LegalSection title="5. Sous-traitants et prestataires">
        <p>Pour faire fonctionner le service, nous nous appuyons sur des prestataires techniques réputés :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase Inc. :</strong> base de données relationnelle et hébergement des données (Région Europe / eu-north-1).</li>
          <li><strong>OpenRouter :</strong> acheminement sécurisé des requêtes d&apos;intelligence artificielle (les données ne sont pas utilisées pour l&apos;entraînement public de modèles).</li>
          <li><strong>Notch Pay :</strong> traitement sécurisé des paiements Mobile Money (Orange Money, MTN Mobile Money).</li>
          <li><strong>Serveur VPS (164.68.109.206) :</strong> hébergement des API applicatives et stockage local chiffré des fichiers utilisateurs.</li>
          <li><strong>Cloudinary Ltd. :</strong> stockage et distribution sécurisée des prévisualisations de documents.</li>
          <li><strong>Expo (650 Industries) :</strong> acheminement des notifications push sur smartphones.</li>
          <li><strong>Resend :</strong> acheminement des emails de sécurité et de vérification.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Tes droits">
        <p>Conformément aux réglementations sur la protection des données personnelles, tu disposes d&apos;un droit d&apos;accès, de rectification, de portabilité et de suppression intégrale de tes données.</p>
        <p>Tu peux exercer ces droits à tout moment directement depuis ton application mobile ou par email à <a href="mailto:privacy@campus360b.site" className="text-[var(--color-primary)] underline">privacy@campus360b.site</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
