import type { Metadata } from "next";
import { Gift, Users, Sparkles, Share2, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Parrainage — Offre 1 mois Premium à tes amis",
  description: "Parraine tes amis sur Campus 360 : 1 mois Premium offert pour chaque filleul Premium, jusqu'à 3 par an.",
  alternates: { canonical: "/parrainage" },
};

export default function ParrainagePage() {
  return (
    <SiteShell>
      <section className="py-16 lg:py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-bold rounded-full mb-6">
            <Gift className="w-4 h-4" />
            Programme de parrainage
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            Invite tes amis,{" "}
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
              on vous offre du Premium
            </span>
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Pour chaque ami qui passe Premium, vous recevez tous les deux 1
            mois offert. Jusqu&apos;à 3 filleuls par an.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Invite", desc: "Partage ton lien unique de parrainage à tes amis.", icon: Share2 },
              { step: "2", title: "Ils s'inscrivent", desc: "Tes amis créent un compte via ton lien.", icon: Users },
              { step: "3", title: "Vous gagnez", desc: "Quand ils passent Premium, vous recevez tous les deux 1 mois offert.", icon: Sparkles },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="text-center p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)]">
                  <div className="w-12 h-12 mx-auto rounded-full bg-brand-500 text-white flex items-center justify-center font-bold font-display text-xl mb-4">
                    {s.step}
                  </div>
                  <Icon className="w-8 h-8 text-brand-500 mx-auto mb-3" />
                  <h3 className="font-bold font-display mb-2">{s.title}</h3>
                  <p className="text-sm text-[var(--color-ink-light)]">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold font-display mb-6">Questions fréquentes</h2>
          <div className="space-y-3">
            {[
              { q: "Combien de filleuls je peux parrainer ?", a: "Jusqu'à 3 par an. Au-delà, c'est cool aussi mais t'auras pas de mois offert supplémentaire." },
              { q: "Comment je partage mon lien ?", a: "Depuis l'app : Profil → Parrainage → Copier le lien. Partage sur WhatsApp, Telegram, où tu veux." },
              { q: "Quand est-ce que je reçois mon mois offert ?", a: "Dès que ton filleul active Premium. Tu reçois un email + une notification dans l'app." },
              { q: "Et mon filleul, il reçoit quoi ?", a: "Son premier mois Premium est offert. Au-delà, il paye normalement." },
            ].map((f) => (
              <details key={f.q} className="p-5 bg-white rounded-xl border border-[var(--color-border)] group">
                <summary className="cursor-pointer font-semibold flex items-center justify-between">
                  {f.q}
                  <span className="text-brand-500 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-[var(--color-ink-light)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-amber-400 to-rose-500 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-4">
            Prêt à parrainer ?
          </h2>
          <p className="text-lg text-white/80 mb-6">
            Connecte-toi pour récupérer ton lien de parrainage.
          </p>
          <Link href="/connexion">
            <Button size="lg" className="bg-white text-amber-600 hover:bg-white/90 gap-2">
              Récupérer mon lien
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}