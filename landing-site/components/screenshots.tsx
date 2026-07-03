"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const screenshots = [
  {
    src: "/images/screenshot-hero.jpg",
    alt: "Écran d'accueil Campus 360",
    label: "Accueil",
  },
  {
    src: "/images/screenshot-catalog.jpg",
    alt: "Catalogue Campus 360 — exploration des PDFs",
    label: "Catalogue",
  },
  {
    src: "/images/screenshot-packs.jpg",
    alt: "Packs Campus 360 — bundles de documents",
    label: "Packs",
  },
  {
    src: "/images/screenshot-wallet.jpg",
    alt: "Wallet Campus 360 — gestion du solde",
    label: "Wallet",
  },
  {
    src: "/images/screenshot-1.png",
    alt: "Campus 360 — écran principal",
    label: "App",
  },
  {
    src: "/images/screenshot-2.png",
    alt: "Campus 360 — navigation",
    label: "Navigation",
  },
  {
    src: "/images/screenshot-3.png",
    alt: "Campus 360 — catalogue",
    label: "Catalogue",
  },
  {
    src: "/images/screenshot-4.png",
    alt: "Campus 360 — recherche",
    label: "Recherche",
  },
  {
    src: "/images/screenshot-5.png",
    alt: "Campus 360 — détail document",
    label: "Document",
  },
  {
    src: "/images/screenshot-6.png",
    alt: "Campus 360 — achat",
    label: "Achat",
  },
  {
    src: "/images/screenshot-7.png",
    alt: "Campus 360 — assistant IA",
    label: "Assistant IA",
  },
  {
    src: "/images/screenshot-8.jpg",
    alt: "Campus 360 — aperçu",
    label: "Aperçu",
  },
];

export function Screenshots() {
  const [current, setCurrent] = useState(0);

  const prev = () =>
    setCurrent((c) => (c === 0 ? screenshots.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === screenshots.length - 1 ? 0 : c + 1));

  return (
    <section className="py-20 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full mb-4">
            📱 Aperçu de l&apos;app
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] mb-4">
            Découvre l&apos;app
          </h2>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Une interface pensée pour les étudiants. Simple, rapide, efficace.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative max-w-sm mx-auto">
          {/* Phone frame */}
          <div className="relative rounded-[3rem] bg-[var(--color-ink)] p-2 shadow-2xl shadow-brand-500/20">
            {/* Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-[var(--color-ink)] rounded-full z-20" />

            {/* Image */}
            <div className="relative rounded-[2.4rem] overflow-hidden bg-gray-100 aspect-[9/19]">
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
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            {screenshots[current].label}
          </div>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-[-1.5rem] top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-[var(--color-border)] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow z-20"
            aria-label="Screenshot précédent"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-ink)]" />
          </button>
          <button
            onClick={next}
            className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-[var(--color-border)] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow z-20"
            aria-label="Screenshot suivant"
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
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? "bg-brand-500 w-6"
                  : "bg-brand-200 hover:bg-brand-300"
              }`}
              aria-label={`Aller au screenshot ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
