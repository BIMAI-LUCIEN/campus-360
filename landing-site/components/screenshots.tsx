"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const screenshots = [
  { src: "/images/app-home.png", alt: "Écran d'accueil de Campus 360", label: "Accueil" },
  { src: "/images/app-explore.png", alt: "Catalogue de PDF Campus 360", label: "Catalogue" },
  { src: "/images/app-premium.png", alt: "Offres Premium Campus 360", label: "Premium" },
];

export function Screenshots() {
  const [current, setCurrent] = useState(0);

  const prev = () =>
    setCurrent((c) => (c === 0 ? screenshots.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === screenshots.length - 1 ? 0 : c + 1));

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="kicker justify-center flex mb-4">Aperçu</p>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.02em]">
            L&apos;app en <span className="text-gradient-brand">images</span>.
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative max-w-xs mx-auto">
          {/* Phone frame */}
          <div className="relative bg-[var(--color-paper-deep)] border border-[var(--color-ink-faint)] rounded-[2rem] p-1.5">
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-[var(--color-paper)] rounded-full z-20" />

            {/* Image */}
            <div className="relative rounded-[1.6rem] overflow-hidden bg-[var(--color-paper)] aspect-[9/19.5]">
              {screenshots.map((screenshot, i) => (
                <div
                  key={screenshot.src}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    i === current ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    className="object-cover object-top"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Label */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-white text-xs font-mono font-semibold tracking-wide px-3 py-1.5 rounded-full shadow-lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            {screenshots[current].label}
          </div>

          {/* Arrows */}
          <button
            onClick={prev}
            className="absolute left-[-1.2rem] top-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--color-paper-deep)] border border-[var(--color-ink-faint)] rounded-full flex items-center justify-center z-20 hover:border-[var(--color-sienna)] hover:text-[var(--color-sienna)] transition-colors cursor-pointer"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-[-1.2rem] top-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--color-paper-deep)] border border-[var(--color-ink-faint)] rounded-full flex items-center justify-center z-20 hover:border-[var(--color-sienna)] hover:text-[var(--color-sienna)] transition-colors cursor-pointer"
            aria-label="Suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {screenshots.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === current
                  ? "w-6"
                  : "w-1.5 bg-[var(--color-ink-faint)]"
              }`}
              style={i === current ? { background: "var(--gradient-brand)" } : undefined}
              aria-label={`Screenshot ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
