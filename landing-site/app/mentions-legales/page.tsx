import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales sur l'éditeur et l'hébergement de Campus 360.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Informations légales obligatoires sur l'éditeur de la plateforme et de l'application."
      updatedAt="6 novembre 2026"
    >
      <LegalSection title="Éditeur de la plateforme">
        <p><strong>Campus 360</strong> [à compléter : forme juridique]</p>
        <p>Siège social : [à compléter : adresse officielle du siège, Cameroun]</p>
        <p>Numéro d&apos;immatriculation : [à compléter : RCCM / NIU]</p>
        <p>Directeur de la publication : [à compléter : nom du responsable légal]</p>
        <p>Email de contact : <a href="mailto:contact@campus360b.site" className="text-[var(--color-sienna)] underline">contact@campus360b.site</a></p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p><strong>Site, API et fichiers :</strong> Contabo GmbH, Aschauer Straße 32a, 81549 Munich, Allemagne.</p>
        <p><strong>Base de données et catalogue PDF :</strong> Supabase Inc. (supabase.com), serveurs en Europe.</p>
        <p><strong>Images des documents :</strong> Cloudinary Ltd. (cloudinary.com), États-Unis.</p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>Voir la <a href="/confidentialite" className="text-[var(--color-sienna)] underline">politique de confidentialité</a> et la <a href="/cookies" className="text-[var(--color-sienna)] underline">page cookies</a>. Contact : <a href="mailto:privacy@campus360b.site" className="text-[var(--color-sienna)] underline">privacy@campus360b.site</a>.</p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>L&apos;ensemble de la plateforme Campus 360 (marque, logo, interface graphique, code source et algorithmes) est protégé par les lois relatives à la propriété intellectuelle. Toute reproduction non autorisée est strictement interdite.</p>
      </LegalSection>

      <LegalSection title="Contact et réclamations">
        <p>Pour toute question ou notification légale : <a href="mailto:legal@campus360b.site" className="text-[var(--color-sienna)] underline">legal@campus360b.site</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
