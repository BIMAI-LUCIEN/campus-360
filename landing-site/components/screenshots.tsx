"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const screenshots = [
  { src: "/images/screenshot-hero.jpg", alt: "Écran d'accueil", label: "Accueil" },
  { src: "/images/screenshot-catalog.jpg", alt: "Catalogue PDFs", label: "Catalogue" },
  { src: "/images/screenshot-packs.jpg", alt: "Packs Campus 360", label: "Packs" },
  { src: "/images/screenshot-wallet.jpg", alt: "Wallet Mobile Money", label: "Wallet" },
  { src: "/images/screenshot-1.png", alt: "Campus 360", label: "App" },
  { src: "/images/screenshot-2.png", alt: "Navigation", label: "Navigation" },
  { src: "/images/screenshot-3.png", alt: "Catalogue", label: "Catalogue" },
  { src: "/images/screenshot-4.png", alt: "Recherche", label: "Recherche" },
  { src: "/images/screenshot-5.png", alt: "Détail document", label: "Document" },
  { src: "/images/screenshot-6.png", alt: "Achat", label: "Achat" },
  { src: "/images/screenshot-7.png", alt: "Assistant IA", label: "Assistant IA" },
  { src: "/images/screenshot-8.jpg", alt: "Aperçu", label: "Aperçu" },
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
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-lighter)] mb-4">
            Aperçu
          </p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            L&apos;app en images.
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative max-w-xs mx-auto">
          {/* Phone frame — minimal, no border */}
          <div className="relative bg-[var(--color-ink)] rounded-[3rem] p-1.5 shadow-2xl">
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-[var(--color-ink)] rounded-full z-20" />

            {/* Image */}
            <div className="relative rounded-[2.4rem] overflow-hidden bg-zinc-800 aspect-[9/19]">
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
                    className="object-cover"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Label */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white text-xs font-medium px-3 py-1 rounded-full">
            {screenshots[current].label}
          </div>

          {/* Arrows */}
          <button
            onClick={prev}
            className="absolute left-[-1.2rem] top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg z-20 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-ink)]" />
          </button>
          <button
            onClick={next}
            className="absolute right-[-1.2rem] top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg z-20 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Suivant"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-ink)]" />
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
                  ? "w-6 bg-[var(--color-ink)]"
                  : "w-1.5 bg-[var(--color-brand-300)]"
              }`}
              aria-label={`Screenshot ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
