import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import ConnexionForm from "@/components/connexion-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Connexion à ton compte Campus 360",
  description: "Connecte-toi à ton compte Campus 360 pour retrouver tes achats, favoris et progression.",
  alternates: { canonical: "/connexion" },
  robots: { index: false, follow: true },
};

export default function ConnexionPage() {
  return (
    <SiteShell hidePromo>
      <section className="min-h-[calc(100vh-4rem)] flex items-center py-12 border-b border-[var(--color-ink-faint)]">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-[var(--color-paper)] rounded-3xl  border border-[var(--color-border)] p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold font-display mb-2">Bon retour 👋</h1>
              <p className="text-sm text-[var(--color-ink-light)]">
                Connecte-toi pour retrouver tes achats et ta progression.
              </p>
            </div>
            <ConnexionForm />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}