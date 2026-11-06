import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Les cookies utilisés par Campus 360 : uniquement des cookies de connexion et de sécurité.",
  alternates: { canonical: "/cookies" },
};

const cookies = [
  {
    name: "campus-landing.session_token",
    where: "campus360b.site",
    role: "Garde ta connexion sur le site.",
    duration: "7 jours, renouvelés quand tu reviens",
  },
  {
    name: "campus-landing.session_data",
    where: "campus360b.site",
    role: "Copie courte de ta session pour éviter d'interroger la base à chaque page.",
    duration: "5 minutes",
  },
  {
    name: "better-auth.session_token",
    where: "api.campus360b.site, admin.campus360b.site",
    role: "Garde ta connexion à l'application et au portail.",
    duration: "7 jours, renouvelés quand tu reviens",
  },
  {
    name: "better-auth.session_data",
    where: "api.campus360b.site, admin.campus360b.site",
    role: "Copie courte de ta session (performance).",
    duration: "5 minutes",
  },
  {
    name: "*.state, *.pk_code_verifier",
    where: "Tous nos domaines",
    role: "Protège la connexion avec Google contre les détournements.",
    duration: "Quelques minutes, le temps de la connexion",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      description="Pas de publicité, pas de pistage. Seulement ce qu'il faut pour te garder connecté en sécurité."
      updatedAt="6 novembre 2026"
    >
      <LegalSection title="1. Ce que nous utilisons">
        <p>
          Campus 360 n&apos;utilise que des cookies <strong>strictement nécessaires</strong> : sans eux, tu ne pourrais
          pas rester connecté. Ils ne servent ni à la publicité, ni à la mesure d&apos;audience, ni au suivi d&apos;un
          site à l&apos;autre, et ils ne sont partagés avec aucun tiers. Les noms commencent par <code>__Secure-</code>{" "}
          en HTTPS.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[var(--color-ink)]">
                <th className="py-2 pr-3 border-b border-[var(--color-border)]">Cookie</th>
                <th className="py-2 pr-3 border-b border-[var(--color-border)]">Rôle</th>
                <th className="py-2 border-b border-[var(--color-border)]">Durée</th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((c) => (
                <tr key={c.name} className="align-top">
                  <td className="py-2 pr-3 border-b border-[var(--color-border)]">
                    <code className="break-all">{c.name}</code>
                    <div className="text-xs text-[var(--color-ink-lighter)]">{c.where}</div>
                  </td>
                  <td className="py-2 pr-3 border-b border-[var(--color-border)]">{c.role}</td>
                  <td className="py-2 border-b border-[var(--color-border)]">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="2. Stockage local">
        <p>
          Le site retient dans ton navigateur (stockage local, pas un cookie) que tu as fermé le bandeau d&apos;information
          sur les cookies, pour ne pas te le remontrer. L&apos;application mobile garde ta session dans le stockage
          sécurisé du téléphone.
        </p>
      </LegalSection>

      <LegalSection title="3. Pourquoi nous ne demandons pas ton accord">
        <p>
          Les cookies indispensables au service que tu demandes sont exemptés de consentement. Nous t&apos;informons
          simplement de leur présence. Si nous ajoutons un jour un outil de mesure d&apos;audience ou un cookie non
          indispensable, il ne sera déposé qu&apos;après ton accord explicite, que tu pourras retirer.
        </p>
      </LegalSection>

      <LegalSection title="4. Les supprimer">
        <p>
          Tu peux effacer ces cookies à tout moment dans les réglages de ton navigateur, ou en te déconnectant. Tu
          seras alors simplement déconnecté. Pour le reste de tes données, voir la{" "}
          <Link href="/confidentialite" className="text-[var(--color-sienna)] underline">politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
