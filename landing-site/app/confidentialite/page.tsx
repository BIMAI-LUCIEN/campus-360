import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Campus 360 collecte, utilise, partage et protège tes données personnelles.",
  alternates: { canonical: "/confidentialite" },
};

const link = "text-[var(--color-sienna)] underline";

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Ce que nous collectons, pourquoi, avec qui nous le partageons et comment tu gardes la main sur tes données."
      updatedAt="6 novembre 2026"
    >
      <LegalSection title="1. Qui est responsable de tes données">
        <p>
          Le responsable du traitement est l&apos;éditeur de Campus 360, dont l&apos;identité complète figure dans les{" "}
          <Link href="/mentions-legales" className={link}>mentions légales</Link>. Pour toute question sur tes données :{" "}
          <a href="mailto:privacy@campus360b.site" className={link}>privacy@campus360b.site</a>.
        </p>
        <p>
          Cette politique s&apos;applique à l&apos;application mobile Campus 360, au site campus360b.site, à l&apos;API
          api.campus360b.site et au portail admin.campus360b.site. Elle respecte la loi camerounaise n° 2024/017 du
          23 décembre 2024 relative à la protection des données à caractère personnel, la loi n° 2010/012 du
          21 décembre 2010 relative à la cybersécurité et à la cybercriminalité, et, pour les utilisateurs situés dans
          l&apos;Union européenne, le Règlement général sur la protection des données (RGPD).
        </p>
      </LegalSection>

      <LegalSection title="2. Données que nous collectons">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Compte :</strong> nom, prénom, adresse e-mail, mot de passe (stocké uniquement sous forme chiffrée irréversible), photo de profil si tu te connectes avec Google.</li>
          <li><strong>Coordonnées :</strong> numéro de téléphone et numéro WhatsApp, si tu les renseignes.</li>
          <li><strong>Parcours :</strong> établissement, faculté, filière, niveau d&apos;études, compétences, expériences et toutes les informations que tu mets dans ton CV.</li>
          <li><strong>Contenus :</strong> rapports, mémoires, CV, lettres de motivation, PDF et images que tu téléverses ou que tu rédiges avec l&apos;assistant.</li>
          <li><strong>Candidatures :</strong> offres consultées ou suivies, candidatures envoyées, entreprises destinataires, relances et réponses.</li>
          <li><strong>Paiements :</strong> montant, date, opérateur (MTN MoMo ou Orange Money), numéro utilisé et référence de la transaction. Nous ne voyons ni ne stockons jamais ton code PIN.</li>
          <li><strong>Appareil :</strong> jeton de notification push, modèle et version du système quand l&apos;application signale une erreur.</li>
          <li><strong>Journaux techniques :</strong> adresse IP, date et heure de connexion, requêtes envoyées à l&apos;API, pour la sécurité et la lutte contre les abus.</li>
          <li><strong>Messages :</strong> ce que tu nous écris via le formulaire de contact, par e-mail ou sur WhatsApp.</li>
        </ul>
        <p>Nous ne collectons aucune donnée sensible au sens de la loi (santé, religion, opinions politiques, origine ethnique). Ne les mets pas dans tes documents si ce n&apos;est pas nécessaire.</p>
      </LegalSection>

      <LegalSection title="3. Pourquoi nous les utilisons, et sur quelle base">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Fournir le service</strong> (compte, catalogue PDF, rédaction assistée, CV, candidatures, wallet) : exécution du contrat que tu acceptes en t&apos;inscrivant.</li>
          <li><strong>Envoyer tes candidatures</strong> aux entreprises que tu choisis : exécution du contrat, à ta demande explicite pour chaque envoi.</li>
          <li><strong>Encaisser et tracer les paiements</strong> : exécution du contrat et obligations comptables légales.</li>
          <li><strong>Notifications et e-mails de service</strong> (vérification d&apos;e-mail, mot de passe, réponse d&apos;une entreprise, relance) : exécution du contrat.</li>
          <li><strong>Sécurité, prévention de la fraude et quotas anti-abus</strong> : intérêt légitime et obligations de la loi sur la cybersécurité.</li>
          <li><strong>Jumelage WhatsApp et notifications push</strong> : ton consentement, que tu peux retirer à tout moment dans l&apos;application ou les réglages du téléphone.</li>
        </ul>
        <p>Nous ne faisons pas de publicité ciblée, nous ne vendons pas tes données et nous ne les louons à personne.</p>
      </LegalSection>

      <LegalSection title="4. Intelligence artificielle">
        <p>
          Quand tu utilises l&apos;assistant (rédaction, CV, lettre, questions sur un PDF), le texte concerné est envoyé à
          un fournisseur de modèles d&apos;IA pour produire la réponse. Nous n&apos;envoyons que le contenu nécessaire à ta
          demande. Les fournisseurs utilisés ne sont pas autorisés à réutiliser ces contenus pour entraîner leurs modèles
          publics.
        </p>
        <p>
          L&apos;IA peut se tromper. Aucune décision ayant un effet juridique sur toi n&apos;est prise de façon
          automatique : c&apos;est toi qui relis et qui décides d&apos;envoyer une candidature ou de rendre un document.
        </p>
      </LegalSection>

      <LegalSection title="5. Qui reçoit tes données">
        <p><strong>Les entreprises que tu choisis.</strong> Quand tu postules, ton CV, ta lettre et tes coordonnées sont transmis à l&apos;entreprise de l&apos;offre (par e-mail ou WhatsApp). Elle devient alors responsable de l&apos;usage qu&apos;elle en fait.</p>
        <p><strong>Nos prestataires techniques</strong>, qui agissent uniquement sur nos instructions et sous contrat :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> : base de données et stockage du catalogue PDF (serveurs en Europe).</li>
          <li><strong>Contabo</strong> : serveur qui héberge l&apos;API, le site, les fichiers téléversés et l&apos;envoi WhatsApp (Europe).</li>
          <li><strong>OpenRouter</strong> et <strong>Google (Gemini)</strong> : traitement des requêtes d&apos;IA et lecture de texte dans les images.</li>
          <li><strong>SasPay</strong> : paiements Mobile Money MTN et Orange.</li>
          <li><strong>Cloudinary</strong> : aperçus et images des documents.</li>
          <li><strong>Resend</strong> : envoi des e-mails de service.</li>
          <li><strong>Expo (650 Industries)</strong> : acheminement des notifications push.</li>
          <li><strong>Google</strong> : connexion avec un compte Google, si tu choisis cette option.</li>
        </ul>
        <p><strong>Les autorités</strong>, uniquement sur réquisition légale.</p>
      </LegalSection>

      <LegalSection title="6. Transferts hors du Cameroun">
        <p>
          Plusieurs prestataires sont situés hors du Cameroun (Union européenne et États-Unis). Nous ne choisissons que
          des prestataires qui offrent des garanties de protection et de sécurité reconnues (chiffrement, engagements
          contractuels de confidentialité). En utilisant Campus 360, tu es informé de ces transferts, qui sont
          nécessaires pour faire fonctionner le service.
        </p>
      </LegalSection>

      <LegalSection title="7. Durée de conservation">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Compte, profil, documents, candidatures :</strong> tant que ton compte existe.</li>
          <li><strong>Transactions :</strong> 10 ans pour les obligations comptables, sous forme anonymisée après suppression du compte (ton nom, ton e-mail et ton identifiant en sont retirés).</li>
          <li><strong>Journaux techniques :</strong> 12 mois au plus.</li>
          <li><strong>Messages de contact :</strong> 3 ans après le dernier échange.</li>
        </ul>
        <p>
          À la suppression du compte, ton profil, tes documents, tes candidatures, tes fichiers et ta session WhatsApp
          sont effacés. Les copies de sauvegarde techniques disparaissent ensuite au fil de leur rotation automatique.
        </p>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <p>
          Connexions chiffrées (HTTPS), mots de passe hachés, cookies de session protégés, accès aux fichiers par liens
          signés et temporaires, accès administrateur limité à l&apos;équipe. En cas de violation de données susceptible
          de te porter préjudice, nous prévenons l&apos;autorité de protection des données et les personnes concernées
          dans les délais prévus par la loi.
        </p>
      </LegalSection>

      <LegalSection title="9. Tes droits">
        <p>Tu as le droit :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>d&apos;être informé et d&apos;<strong>accéder</strong> à tes données ;</li>
          <li>de les <strong>rectifier</strong> (directement dans ton profil) ;</li>
          <li>de les <strong>effacer</strong>, en supprimant ton compte depuis l&apos;application ou la <Link href="/suppression-compte" className={link}>page de suppression</Link> ;</li>
          <li>de t&apos;<strong>opposer</strong> à un traitement ou d&apos;en demander la <strong>limitation</strong> ;</li>
          <li>de <strong>retirer ton consentement</strong> (WhatsApp, notifications) à tout moment ;</li>
          <li>de récupérer tes données dans un format lisible (<strong>portabilité</strong>) ;</li>
          <li>de donner des directives sur le sort de tes données après ton décès.</li>
        </ul>
        <p>
          Écris à <a href="mailto:privacy@campus360b.site" className={link}>privacy@campus360b.site</a> depuis l&apos;adresse
          de ton compte. Nous répondons sous 30 jours au plus. Si la réponse ne te satisfait pas, tu peux saisir
          l&apos;autorité camerounaise de protection des données personnelles (ou, dans l&apos;Union européenne,
          l&apos;autorité de ton pays).
        </p>
      </LegalSection>

      <LegalSection title="10. Mineurs">
        <p>
          Campus 360 s&apos;adresse aux étudiants. Si tu as moins de 18 ans, tu dois avoir l&apos;accord d&apos;un parent
          ou tuteur pour créer un compte et payer. Un parent peut nous demander la suppression du compte d&apos;un mineur
          à l&apos;adresse ci-dessus.
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies">
        <p>
          Le site et l&apos;application n&apos;utilisent que des cookies indispensables (connexion et sécurité), sans
          publicité ni mesure d&apos;audience. Le détail est sur la <Link href="/cookies" className={link}>page cookies</Link>.
        </p>
      </LegalSection>

      <LegalSection title="12. Modifications">
        <p>
          Si cette politique change de façon importante, nous te prévenons dans l&apos;application ou par e-mail avant
          l&apos;entrée en vigueur. La date de mise à jour figure en bas de page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
