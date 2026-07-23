import type { Metadata } from "next";
import { Mail, MessageCircle, MapPin, Clock, Send } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

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
    detail: "+237 6 XX XX XX XX",
    sub: "Lun-Ven 8h-20h",
    cta: "Envoyer un message",
    href: "https://wa.me/campus360",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "support@campus360b.site",
    sub: "Réponse sous 24h",
    cta: "Envoyer un email",
    href: "mailto:support@campus360b.site",
    color: "text-[var(--color-sienna)]",
    bg: "bg-brand-50",
  },
  {
    icon: MapPin,
    title: "Bureau",
    detail: "Douala, Cameroun",
    sub: "Akwa — sur rendez-vous",
    cta: "Voir sur la carte",
    href: "https://maps.google.com/?q=Douala",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

export default function ContactPage() {
  return (
    <SiteShell>
      <section className="py-16 lg:py-24 border-b border-[var(--color-ink-faint)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-6">
            <MessageCircle className="w-4 h-4" />
            On est à ton écoute
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            Comment nous{" "}
            <span className="text-[var(--color-sienna)]">
              contacter
            </span>{" "}
            ?
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Une question, un bug, une suggestion ? Notre équipe répond en
            moins de 24h.
          </p>
        </div>
      </section>

      <section className="py-12 bg-[var(--color-paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {channels.map((c) => {
              const Icon = c.icon;
              return (
                <a
                  key={c.title}
                  href={c.href}
                  className="group p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all text-center"
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
              <form className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-semibold mb-1.5">
                      Ton prénom
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      placeholder="Aïcha"
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-semibold mb-1.5">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder="ton.email@universite.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-semibold mb-1.5">
                    Sujet
                  </label>
                  <select
                    id="contact-subject"
                    name="subject"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Choisis un sujet</option>
                    <option>Question sur l&apos;app</option>
                    <option>Problème de paiement</option>
                    <option>Demande de partenariat</option>
                    <option>Signaler un bug</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-semibold mb-1.5">
                    Ton message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={6}
                    placeholder="Dis-nous tout..."
                    className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <Button type="submit" className="gap-2">
                  Envoyer
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>

            <aside className="p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)]">
              <div className="flex items-start gap-3 mb-6">
                <Clock className="w-5 h-5 text-[var(--color-sienna)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold font-display mb-1">Nos horaires</h3>
                  <ul className="text-sm text-[var(--color-ink-light)] space-y-1">
                    <li>Lundi - Vendredi : 8h - 20h</li>
                    <li>Samedi : 9h - 17h</li>
                    <li>Dimanche : fermé (mais on lit quand même)</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-brand-50 rounded-xl">
                <h4 className="font-bold text-sm mb-1">💡 Avant de nous écrire</h4>
                <p className="text-xs text-[var(--color-ink-light)]">
                  90% des questions ont déjà une réponse dans notre{" "}
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