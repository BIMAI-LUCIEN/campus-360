"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    n: "01",
    title: "Ton profil en 30 secondes",
    desc: "Université, filière, compétences. Campus 360 s'en sert pour te proposer les bonnes offres.",
    shot: "/images/screens/accueil.png",
    alt: "Accueil personnalisé selon l'université et la filière",
  },
  {
    n: "02",
    title: "Des offres qui te correspondent",
    desc: "Chaque offre affiche un score de correspondance, tes points forts et un conseil.",
    shot: "/images/screens/stages.png",
    alt: "Liste des stages avec score de correspondance",
  },
  {
    n: "03",
    title: "CV officiel RH et lettre en un clic",
    desc: "Un CV deux colonnes au format attendu par les recruteurs, et une lettre adaptée à l'offre.",
    shot: "/images/screens/cv-officiel.png",
    alt: "Atelier de rédaction avec le CV officiel RH",
  },
  {
    n: "04",
    title: "Un coach IA pour ta soutenance",
    desc: "Slides, ce que tu dois dire au jury, questions pièges et réponses modèles, à partir de ton rapport.",
    shot: "/images/screens/coach.png",
    alt: "Coach IA de soutenance avec les slides et les notes pour le jury",
  },
  {
    n: "05",
    title: "1 000 coins offerts au lancement",
    desc: "PDF gratuits, candidatures dès 300 FCFA avec CV adapté, paiement à l'usage par MTN MoMo ou Orange Money.",
    shot: "/images/screens/wallet.png",
    alt: "Recharge du wallet par Mobile Money",
  },
];

export function ScrollStory() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
      <ol className="space-y-6 lg:space-y-[28vh] lg:py-[18vh]">
        {steps.map((step, i) => (
          <li
            key={step.n}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-index={i}
            className={`rounded-2xl border p-6 transition-colors duration-500 lg:p-8 ${
              active === i ? "border-[#C4B5FD] bg-white shadow-[0_20px_50px_-30px_rgba(124,58,237,0.35)]" : "border-[var(--color-ink-faint)] bg-white/60"
            }`}
          >
            <span className="font-mono text-xs font-bold tracking-[0.18em] text-[var(--color-sienna-tone)]">ÉTAPE {step.n}</span>
            <h3 className="mt-3 font-display text-2xl text-[var(--color-ink)] sm:text-3xl">{step.title}</h3>
            <p className="mt-3 text-[var(--color-ink-muted)]">{step.desc}</p>
            {/* Mobile: the screen sits under its step */}
            <div className="relative mx-auto mt-6 aspect-[9/19.5] w-48 overflow-hidden rounded-[1.6rem] ring-1 ring-black/5 lg:hidden">
              <Image src={step.shot} alt={step.alt} fill sizes="192px" className="object-cover object-top" loading="lazy" />
            </div>
          </li>
        ))}
      </ol>

      {/* Desktop: one sticky phone whose screen flips as you scroll */}
      <div className="sticky top-24 hidden lg:block">
        <div className="scene-3d mx-auto w-[300px]">
          <div className="relative rounded-[2.6rem] bg-[#0F172A] p-2.5 ring-1 ring-black/5 shadow-[0_40px_90px_-40px_rgba(124,58,237,0.45)]">
            <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0F172A]" />
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.1rem] bg-white [transform-style:preserve-3d]">
              {steps.map((step, i) => (
                <div key={step.n} className="story-shot absolute inset-0" data-active={active === i}>
                  <Image src={step.shot} alt={step.alt} fill sizes="300px" className="object-cover object-top" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-2" aria-hidden>
            {steps.map((step, i) => (
              <span
                key={step.n}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: active === i ? 28 : 8, background: active === i ? "#7C3AED" : "#E2E8F0" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
