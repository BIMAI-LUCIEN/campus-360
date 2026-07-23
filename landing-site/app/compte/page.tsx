import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getServerSession } from "@/lib/session";
import { signOutAction } from "@/lib/actions";
import { User, Mail, Calendar, ShieldCheck, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Mon compte Campus 360",
  description: "Ton espace personnel Campus 360 : achats, progression, paramètres.",
  alternates: { canonical: "/compte" },
  robots: { index: false, follow: true },
};

const formatDate = (iso?: string | Date | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

export default async function ComptePage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/connexion?next=/compte");
  }
  const { user } = session;
  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <SiteShell hidePromo>
      <section className="py-16 lg:py-20 bg-[var(--color-paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile card */}
          <div className="flex items-start gap-5 mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold font-display shadow-lg flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display mb-1">
                {user?.name || "Bienvenue"}
              </h1>
              <p className="text-[var(--color-ink-light)] flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Étudiant
                </span>
                <span className="text-xs text-[var(--color-ink-lighter)]">
                  Membre depuis le {formatDate(user?.createdAt as string | Date | undefined)}
                </span>
              </div>
            </div>
            <form action={signOutAction}>
              <Button variant="outline" type="submit">
                Se déconnecter
              </Button>
            </form>
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <Link
              href="/telecharger"
              className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Download className="w-8 h-8 text-[var(--color-sienna)] mb-3" />
              <h3 className="font-bold font-display mb-1">Télécharger l&apos;app</h3>
              <p className="text-sm text-[var(--color-ink-light)]">
                Installe Campus 360 sur ton téléphone pour retrouver tes achats.
              </p>
            </Link>
            <Link
              href="/tarifs"
              className="p-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-8 h-8 mb-3" />
              <h3 className="font-bold font-display mb-1">Passer Premium</h3>
              <p className="text-sm text-white/80">
                PDFs illimités, IA illimitée, mode hors-ligne.
              </p>
            </Link>
          </div>

          {/* Account info */}
          <div className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)]">
            <h2 className="text-xl font-bold font-display mb-4">Mes informations</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-light)]">Email</dt>
                <dd className="font-medium">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-light)]">Nom</dt>
                <dd className="font-medium">{user?.name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-light)]">ID utilisateur</dt>
                <dd className="font-mono text-xs">{user?.id}</dd>
              </div>
            </dl>
          </div>

          <p className="text-center text-xs text-[var(--color-ink-lighter)] mt-8">
            Besoin d&apos;aide ? <Link href="/aide" className="text-[var(--color-sienna)] hover:underline">Centre d&apos;aide</Link> · <Link href="/contact" className="text-[var(--color-sienna)] hover:underline">Contact</Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3l1.9 5.7L19 11l-5.7 1.9L11 19l-1.9-5.7L3 11l5.7-1.9L11 3z" />
    </svg>
  );
}