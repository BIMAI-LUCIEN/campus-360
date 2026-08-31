"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Campus 360 est gratuit ?",
    a: "L'inscription et la prévisualisation des PDF sont 100% gratuites. Tu ne paies que les PDF que tu souhaites acheter, via ton wallet rechargeable.",
  },
  {
    q: "Comment fonctionne le wallet ?",
    a: "Tu recharges ton wallet par Mobile Money, carte bancaire ou code promo. Chaque achat est débité automatiquement de ton solde. Toutes les transactions sont signées et historisées.",
  },
  {
    q: "Puis-je lire mes PDF hors-ligne ?",
    a: "Oui. Les PDF achetés se téléchargent automatiquement quand tu es en Wi-Fi, et restent accessibles hors-ligne. Tes achats sont liés à ton compte et restaurables sur tout appareil.",
  },
  {
    q: "Comment l'assistant IA fonctionne-t-il ?",
    a: "L'assistant IA analyse les PDF que tu achètes et génère des fiches de révision, des quiz et des résumés. Plus tu révises avec, plus il s'améliore pour t'aider.",
  },
  {
    q: "Mes achats sont-ils remboursables ?",
    a: "Les achats de PDF sont définitifs. Cependant, si tu rencontres un problème avec un document (fichier corrompu, mauvaise qualité), contacte le support et on trouvera une solution.",
  },
  {
    q: "Sur quels appareils fonctionne Campus 360 ?",
    a: "Campus 360 fonctionne sur iOS (iPhone, iPad) et Android. Ton compte et tous tes achats sont synchronisés sur tous tes appareils.",
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
