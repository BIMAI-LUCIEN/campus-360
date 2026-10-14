"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Campus 360 est gratuit ?",
    a: "L'inscription et ta première candidature IA sont offertes. Ensuite, tu recharges ton wallet dès 500 FCFA et tu paies uniquement ce que tu utilises.",
  },
  {
    q: "Comment fonctionne le wallet ?",
    a: "Tu recharges par MTN MoMo ou Orange Money (minimum 500 FCFA). Chaque action est débitée de ton solde, et chaque transaction reste visible dans ton historique.",
  },
  {
    q: "Combien coûte chaque action ?",
    a: "Candidature : 500 FCFA (la première est offerte). Rapport de stage généré par l'IA : 2 000 FCFA. Mémoire : 5 000 FCFA. Document PDF : 250 FCFA.",
  },
  {
    q: "Comment fonctionne le coach de soutenance ?",
    a: "À partir de ton rapport, l'IA prépare des slides, ce que tu dois dire au jury, et des questions pièges avec une réponse modèle pour chacune.",
  },
  {
    q: "Comment envoyer ma candidature ?",
    a: "Tu choisis le canal : dans l'app, par WhatsApp RH ou par e-mail RH. Ton CV et ta lettre sont joints, et la relance à J+7 est programmée automatiquement.",
  },
  {
    q: "Sur quels appareils fonctionne Campus 360 ?",
    a: "Pour l'instant, l'application est disponible sur Android via l'APK gratuit. La version iOS n'est pas encore disponible.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 lg:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full mb-4">
            ❓ FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-[var(--color-ink-light)]">
            Tout ce que tu dois savoir avant de commencer.
          </p>
        </div>

        {/* FAQ list */}
        <div className="flex flex-col divide-y divide-[var(--color-border)]">
          {faqs.map((faq, i) => (
            <div key={faq.q} className="py-5">
              <button
                className="w-full flex items-center justify-between text-left gap-4"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span className="font-semibold text-[var(--color-ink)] text-base">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-ink-light)] flex-shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <p className="mt-3 text-[var(--color-ink-light)] text-sm leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center p-8 bg-brand-50 rounded-2xl">
          <p className="text-[var(--color-ink)] font-semibold mb-2">
            Tu as encore des questions ?
          </p>
          <p className="text-sm text-[var(--color-ink-light)]">
            Contacte-nous sur WhatsApp ou par email, on te répond sous 24h.
          </p>
        </div>
      </div>
    </section>
  );
}
