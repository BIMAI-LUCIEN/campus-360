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
      updatedAt="octobre 2026"
    >
      <LegalSection title="Éditeur de la plateforme">
        <p><strong>Campus 360</strong> [à compléter : forme juridique]</p>
        <p>Siège social : [à compléter : adresse officielle du siège, Cameroun]</p>
        <p>Numéro d&apos;immatriculation : [à compléter : RCCM / NIU]</p>
        <p>Directeur de la publication : [à compléter : nom du responsable légal]</p>
        <p>Email de contact : <a href="mailto:contact@campus360b.site" className="text-[var(--color-primary)] underline">contact@campus360b.site</a></p>
      </LegalSection>

      <LegalSection title="Hébergement et infrastructures">
        <p><strong>Serveurs d&apos;application &amp; API :</strong> Serveur VPS dédié (IP : 164.68.109.206), infogéré par Campus 360 [à compléter : hébergeur Contabo/Hetzner/OVH].</p>
        <p><strong>Base de données :</strong> Supabase Inc., 970 Folsom St, San Francisco, CA 94107, USA (infrastructure hébergée en Europe).</p>
        <p><strong>Plateforme Web &amp; CDN :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.</p>
        <p><strong>Distribution des médias :</strong> Cloudinary Ltd., 111 W Evelyn Ave, Suite 206, Sunnyvale, CA 94086, USA.</p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>L&apos;ensemble de la plateforme Campus 360 (marque, logo, interface graphique, code source et algorithmes) est protégé par les lois relatives à la propriété intellectuelle. Toute reproduction non autorisée est strictement interdite.</p>
      </LegalSection>

      <LegalSection title="Contact et réclamations">
        <p>Pour toute question ou notification légale : <a href="mailto:legal@campus360b.site" className="text-[var(--color-primary)] underline">legal@campus360b.site</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
