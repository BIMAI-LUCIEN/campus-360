import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import InscriptionForm from "@/components/inscription-form";
import { Check, Gift } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Inscription gratuite — 3 PDFs offerts à l'inscription",
  description:
    "Inscris-toi gratuitement à Campus 360 et reçois immédiatement 3 PDFs offerts, le catalogue complet en accès libre, et 5 requêtes IA par jour.",
  alternates: { canonical: "/inscription" },
  openGraph: {
    title: "Inscription gratuite Campus 360",
    description: "3 PDFs offerts à l'inscription. Catalogue complet en accès libre.",
    url: "/inscription",
  },
};

export default function InscriptionPage() {
  return (
    <SiteShell hidePromo>
      <section className="min-h-[calc(100vh-4rem)] py-12 border-b border-[var(--color-ink)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3">
              <div className="bg-[var(--color-paper)] rounded-3xl  border border-[var(--color-border)] p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-extrabold font-display mb-2">
                    Crée ton compte gratuit
                  </h1>
                  <p className="text-sm text-[var(--color-ink-light)]">
                    2 minutes. 3 PDFs offerts. Aucun engagement.
                  </p>
                </div>
                <InscriptionForm />
              </div>
            </div>

            <aside className="lg:col-span-2">
              <div className="sticky top-24 p-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl text-white ">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur rounded-xl mb-4">
                  <Gift className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold font-display mb-3">
                  Ce que tu reçois tout de suite
                </h2>
                <ul className="space-y-3 text-sm">
                  {[
                    "3 PDFs offerts à choisir dans le catalogue",
                    "Accès au catalogue complet (3 500+ PDFs)",
                    "5 requêtes IA par jour (fiches, résumés)",
                    "Wallet rechargeable dès 500 FCFA",
                    "Sync multi-appareils",
                    "Mode hors-ligne après 1er téléchargement",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-6 border-t border-white/20 text-xs text-white/80">
                  Aucun engagement. Annulation en 1 clic. Garantie satisfait ou remboursé 14 jours.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}