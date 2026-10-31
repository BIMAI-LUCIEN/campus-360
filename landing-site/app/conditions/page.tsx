import type { Metadata } from "next";
import Link from "next/link";
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
      description="Les règles claires et transparentes régissant l'utilisation de la plateforme Campus 360."
      updatedAt="octobre 2026"
    >
      <LegalSection title="1. Éditeur et objet du service">
        <p>La plateforme Campus 360 est éditée par [à compléter : raison sociale et forme juridique], immatriculée au Cameroun sous le numéro [à compléter : RCCM / NIU]. Pour toute question légale : <a href="mailto:legal@campus360b.site" className="text-[var(--color-primary)] underline">legal@campus360b.site</a>.</p>
        <p>Campus 360 propose aux étudiants des outils d&apos;aide à la réussite académique et à l&apos;insertion professionnelle : consultation de cours et anciens examens, assistance méthodologique à la rédaction de rapports de stage, et mise en relation avec des offres de stage.</p>
      </LegalSection>

      <LegalSection title="2. Modèle économique, coins et gratuité">
        <p><strong>Aucun abonnement récurrent :</strong> Campus 360 ne propose aucun abonnement payant récurrent et ne prélève aucun montant automatique.</p>
        <p><strong>Portefeuille de coins :</strong> le service fonctionne avec un wallet en coins (1 coin = 1 FCFA), rechargeable par Mobile Money (Orange Money, MTN Mobile Money).</p>
        <p><strong>Bonus de bienvenue :</strong> 1 000 coins sont offerts une seule fois à tout nouvel étudiant inscrit pendant la période de lancement, 300 coins ensuite.</p>
        <p><strong>Lecture gratuite :</strong> tous les documents PDF du catalogue se lisent gratuitement. L&apos;assistance IA sur un PDF est gratuite dans la limite de 3 actions par jour ; au-delà, un Pass Révision (24 heures ou 7 jours) est proposé.</p>
        <p><strong>Packs et Pass :</strong> les packs de candidatures (crédits valables 30 jours) et les Pass Révision sont payés une seule fois depuis le wallet, sans renouvellement automatique. Les crédits non utilisés à l&apos;échéance sont perdus. Une candidature qui n&apos;a pas pu être envoyée est recréditée.</p>
      </LegalSection>

      <LegalSection title="3. Utilisation acceptable">
        <p>En utilisant Campus 360, tu t&apos;engages à :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Utiliser le service à des fins strictement personnelles et universitaires.</li>
          <li>Ne pas revendre, redistribuer ou copier massivement les documents issus du catalogue.</li>
          <li>Ne procéder à aucun scraping automatisé ou extraction abusive des données de la plateforme.</li>
          <li>Respecter l&apos;intégrité académique : les outils d&apos;assistance à la rédaction constituent une aide méthodologique et ne se substituent pas à ton travail personnel d&apos;analyse.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Disponibilité et quotas d'utilisation">
        <p>Afin de préserver la qualité de service pour l&apos;ensemble de la communauté étudiante, des quotas journaliers équitables s&apos;appliquent sur les appels d&apos;assistance IA. En cas de dépassement, le compteur se réinitialise automatiquement le lendemain.</p>
      </LegalSection>

      <LegalSection title="5. Clôture de compte">
        <p>Tu peux fermer et supprimer définitivement ton compte à tout moment depuis l&apos;application (Profil &gt; Supprimer mon compte) ou via notre <Link href="/suppression-compte" className="text-[var(--color-primary)] underline">page dédiée</Link>.</p>
        <p>Campus 360 se réserve le droit de restreindre ou suspendre l&apos;accès à un compte en cas d&apos;attaque avérée, de tentative de fraude aux paiements ou de non-respect caractérisé des présentes conditions.</p>
      </LegalSection>

      <LegalSection title="6. Droit applicable">
        <p>Les présentes conditions sont régies par le droit en vigueur au Cameroun. Tout litige non résolu à l&apos;amiable sera soumis aux juridictions compétentes.</p>
      </LegalSection>
    </LegalPage>
  );
}
