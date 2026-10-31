"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Screens are real captures of the current app (scripts/landing-captures.cjs at the repo root).
const steps = [
  {
    n: "01",
    title: "Un accueil fait pour ta filière",
    desc: "Université, filière, compétences : Campus 360 classe les offres selon ton profil et te montre ton score de correspondance.",
    shot: "/images/screens/accueil.webp",
    alt: "Accueil de l'app avec les offres recommandées selon la filière",
  },
  {
    n: "02",
    title: "Des stages et emplois qui te correspondent",
    desc: "Stages académiques, professionnels et premiers emplois. Filtre par domaine, ouvre l'offre, postule en un clic.",
    shot: "/images/screens/stages.webp",
    alt: "Liste des stages et emplois avec filtres par domaine",
  },
  {
    n: "03",
    title: "Ton CV adapté et ta lettre, prêts à envoyer",
    desc: "Préparer, vérifier, envoyer. Tu choisis ton modèle de CV, l'IA l'adapte à l'offre avec la lettre. Dès 300 FCFA, rendu si l'envoi échoue.",
    shot: "/images/screens/candidature.webp",
    alt: "Dossier de candidature : choix du modèle de CV et étapes Préparer, Vérifier, Envoyer",
  },
  {
    n: "04",
    title: "Rapport, mémoire, CV : rédige avec l'IA",
    desc: "Le plan est gratuit. Rapport de stage 2 000 FCFA, mémoire 4 000 FCFA. Tu relis et modifies tout avant d'exporter.",
    shot: "/images/screens/creer.webp",
    alt: "Atelier de rédaction : CV, lettre, rapport de stage et mémoire",
  },
  {
    n: "05",
    title: "Révise avec les annales",
    desc: "Épreuves et cours PDF en lecture gratuite, rangés par université et matière. 3 actions IA offertes chaque jour.",
    shot: "/images/screens/ressources.webp",
    alt: "Ressources académiques : annales et PDF par matière",
  },
  {
    n: "06",
    title: "Un wallet, zéro abonnement",
    desc: "Recharge par MTN MoMo ou Orange Money dès 500 FCFA. 1 000 coins offerts à l'inscription pendant le lancement.",
    shot: "/images/screens/profil.webp",
    alt: "Profil avec le wallet Campus 360 Pay et les crédits de candidature",
  },
];

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[2.4rem] bg-[#0F172A] p-2 ring-1 ring-black/5 shadow-[0_40px_90px_-40px_rgba(124,58,237,0.45)] ${className}`}>
      <div className="absolute left-1/2 top-3.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#0F172A]" />
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2rem] bg-white">{children}</div>
    </div>
  );
}

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

  const goTo = (i: number) => {
    setActive(i);
    stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
      <ol className="space-y-6 lg:space-y-[22vh] lg:py-[16vh]">
        {steps.map((step, i) => (
          <li
            key={step.n}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-index={i}
            onClick={() => setActive(i)}
            className={`rounded-2xl border p-6 transition-colors duration-500 lg:cursor-pointer lg:p-8 ${
              active === i ? "border-[#C4B5FD] bg-white shadow-[0_20px_50px_-30px_rgba(124,58,237,0.35)]" : "border-[var(--color-ink-faint)] bg-white/60"
            }`}
          >
            <span className="font-mono text-xs font-bold tracking-[0.18em] text-[var(--color-sienna-tone)]">ÉTAPE {step.n}</span>
            <h3 className="mt-3 font-display text-2xl text-[var(--color-ink)] sm:text-3xl">{step.title}</h3>
            <p className="mt-3 text-[var(--color-ink-muted)]">{step.desc}</p>
            {/* Mobile: the real screen sits under its step, in a phone frame */}
            <PhoneFrame className="mx-auto mt-6 w-56 sm:w-64 lg:hidden">
              <Image src={step.shot} alt={step.alt} fill sizes="256px" className="object-cover object-top" loading="lazy" />
            </PhoneFrame>
          </li>
        ))}
      </ol>

      {/* Desktop: one sticky phone whose screen flips as you scroll */}
      <div className="sticky top-24 hidden lg:block">
        <div className="scene-3d mx-auto w-[310px]">
          <PhoneFrame>
            <div className="absolute inset-0 [transform-style:preserve-3d]">
              {steps.map((step, i) => (
                <div key={step.n} className="story-shot absolute inset-0" data-active={active === i}>
                  <Image src={step.shot} alt={step.alt} fill sizes="310px" className="object-cover object-top" loading={i === 0 ? "eager" : "lazy"} />
                </div>
              ))}
            </div>
          </PhoneFrame>
          <div className="mt-6 flex justify-center gap-2">
            {steps.map((step, i) => (
              <button
                key={step.n}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Étape ${step.n} : ${step.title}`}
                aria-current={active === i ? "step" : undefined}
                className="flex h-6 items-center"
              >
                <span
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: active === i ? 28 : 8, background: active === i ? "#7C3AED" : "#E2E8F0" }}
                />
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-[var(--color-ink-subtle)]">Captures réelles de l&apos;application</p>
        </div>
      </div>
    </div>
  );
}
