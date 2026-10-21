"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { Bell, FileText, GraduationCap, Sparkles } from "lucide-react";

const chips = [
  { icon: Sparkles, label: "65% Match", sub: "Score calculé pour chaque offre", style: "-left-16 top-24 -rotate-3", z: "120px", tone: "text-[var(--color-sienna)]", float: "float-y" },
  { icon: FileText, label: "CV officiel RH prêt", sub: "Format deux colonnes", style: "-right-20 top-56", z: "90px", tone: "text-[var(--color-sienna)]", float: "float-y-slow" },
  { icon: Bell, label: "Relance à J+7", sub: "Candidature envoyée", style: "-left-12 bottom-40", z: "140px", tone: "text-[var(--color-sienna)]", float: "float-y-slow" },
  { icon: GraduationCap, label: "Coach soutenance", sub: "Question piège #1", style: "-right-14 bottom-16 rotate-3", z: "70px", tone: "text-[var(--color-sienna)]", float: "float-y" },
];

export function HeroPhone() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const phone = phoneRef.current;
    if (!scene || !phone) return;
    // Pointer tilt only on devices with a fine pointer and motion allowed.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = scene.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        phone.style.setProperty("--ry", `${-16 + x * 22}deg`);
        phone.style.setProperty("--rx", `${6 - y * 14}deg`);
      });
    };
    const onLeave = () => {
      phone.style.setProperty("--ry", "-16deg");
      phone.style.setProperty("--rx", "6deg");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    scene.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={sceneRef} className="scene-3d relative mx-auto w-[260px] sm:w-[300px] lg:w-[320px]">
      <div ref={phoneRef} className="phone-3d relative">
        <div className="relative rounded-[2.6rem] bg-[#0F172A] p-2.5 ring-1 ring-black/5 shadow-[0_50px_100px_-40px_rgba(124,58,237,0.45)]">
          <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0F172A]" />
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.1rem] bg-white">
            <Image
              src="/images/screens/accueil.png"
              alt="Écran d'accueil de l'application Campus 360"
              fill
              priority
              sizes="(max-width: 640px) 260px, 320px"
              className="object-cover object-top"
            />
          </div>
        </div>

        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <div
              key={chip.label}
              className={`depth absolute hidden sm:block ${chip.style}`}
              style={{ "--z": chip.z } as CSSProperties}
            >
              <div className={`${chip.float} flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]`}>
                <Icon className={`h-5 w-5 ${chip.tone}`} />
                <div className="leading-tight">
                  <p className="font-display text-sm font-semibold text-[var(--color-ink)]">{chip.label}</p>
                  <p className="text-[11px] text-[var(--color-ink-muted)]">{chip.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
