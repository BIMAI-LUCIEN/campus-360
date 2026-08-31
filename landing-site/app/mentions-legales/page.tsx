import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales sur l'éditeur Campus 360.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Informations légales obligatoires sur l'éditeur du site."
    >
      <LegalSection title="Éditeur du site">
        <p><strong>Campus 360 SAS</strong></p>
        <p>Capital social : 1 000 000 FCFA</p>
        <p>Siège social : Akwa, Douala, Cameroun</p>
        <p>Email : contact@campus360b.site</p>
        <p>Directeur de la publication : Équipe Campus 360</p>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
        <p>Supabase Inc. — fondation pour les données</p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>L&apos;ensemble du contenu (textes, images, code source, design) est la propriété exclusive de Campus 360 SAS. Toute reproduction sans autorisation est interdite.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Pour toute réclamation : legal@campus360b.site</p>
      </LegalSection>
    </LegalPage>
  );
}