import type { Metadata } from "next";
import { Mail, MessageCircle, Phone, Clock } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/landing/page-hero";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact — Notre équipe Campus 360 est à ton écoute",
  description:
    "Contacte l'équipe Campus 360 par email, WhatsApp, ou via notre formulaire. Réponse sous 24h.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Campus 360",
    description: "Email, WhatsApp, formulaire — réponse sous 24h.",
    url: "/contact",
  },
};

const channels = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    detail: "+237 690 27 35 00",
    sub: "Le moyen le plus rapide",
    cta: "Envoyer un message",
    href: "https://wa.me/237690273500",
    color: "text-emerald-500",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Phone,
    title: "Téléphone",
    detail: "+237 690 27 35 00",
    sub: "Appel classique",
    cta: "Appeler",
    href: "tel:+237690273500",
    color: "text-amber-500",
    bg: "bg-amber-400/10",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "support@campus360b.site",
    sub: "Réponse sous 24h ouvrées",
    cta: "Envoyer un email",
    href: "mailto:support@campus360b.site",
    color: "text-[var(--color-sienna)]",
    bg: "bg-brand-50",
  },
];

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHero kicker="On est à ton écoute" title="Comment nous" accent="contacter ?" subtitle="Une question, un bug, une suggestion ? Écris-nous sur WhatsApp, par email ou avec le formulaire." />

      <section className="py-12 bg-[var(--color-paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {channels.map((c) => {
              const Icon = c.icon;
              return (
                <a
                  key={c.title}
                  href={c.href}
                  className="reveal group p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
                >
                  <div className={`inline-flex w-12 h-12 ${c.bg} rounded-xl items-center justify-center mb-3`}>
                    <Icon className={`w-6 h-6 ${c.color}`} />
                  </div>
                  <h3 className="font-bold font-display mb-1">{c.title}</h3>
                  <p className="text-sm text-[var(--color-ink)] font-semibold mb-1">{c.detail}</p>
                  <p className="text-xs text-[var(--color-ink-lighter)] mb-3">{c.sub}</p>
                  <span className="text-xs font-semibold text-[var(--color-sienna)] group-hover:underline">
                    {c.cta} →
                  </span>
                </a>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl font-extrabold font-display mb-4">
                Envoie-nous un message
              </h2>
              <p className="text-[var(--color-ink-light)] mb-6">
                Remplis le formulaire, on revient vers toi sous 24h ouvrées.
              </p>
              <ContactForm />
            </div>

            <aside className="reveal p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)]">
              <div className="flex items-start gap-3 mb-6">
                <Clock className="w-5 h-5 text-[var(--color-sienna)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold font-display mb-1">Pour une réponse rapide</h3>
                  <p className="text-sm text-[var(--color-ink-light)]">
                    Écris-nous sur WhatsApp au +237 690 27 35 00 ou utilise le formulaire.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-brand-50 rounded-xl">
                <h4 className="font-bold text-sm mb-1">💡 Avant de nous écrire</h4>
                <p className="text-xs text-[var(--color-ink-light)]">
                  Beaucoup de réponses sont déjà dans notre{" "}
                  <a href="/aide" className="text-[var(--color-sienna)] hover:underline">centre d&apos;aide</a>.
                  Gain de temps garanti.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}