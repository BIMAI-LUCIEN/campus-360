"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { Bell, FileText, GraduationCap, Sparkles } from "lucide-react";

const chips = [
  { icon: Sparkles, label: "65% Match", sub: "Score calculé pour chaque offre", style: "-left-16 top-24", z: "120px", tone: "text-emerald-300", float: "float-y" },
  { icon: FileText, label: "CV officiel RH prêt", sub: "Format deux colonnes", style: "-right-20 top-56", z: "90px", tone: "text-violet-300", float: "float-y-slow" },
  { icon: Bell, label: "Relance à J+7", sub: "Candidature envoyée", style: "-left-12 bottom-40", z: "140px", tone: "text-amber-300", float: "float-y-slow" },
  { icon: GraduationCap, label: "Coach soutenance", sub: "Question piège #1", style: "-right-14 bottom-16", z: "70px", tone: "text-pink-300", float: "float-y" },
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
        <div className="relative rounded-[2.6rem] bg-[#15121f] p-2.5 ring-1 ring-white/15 shadow-[0_60px_120px_-30px_rgba(124,77,255,0.65)]">
          <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#15121f]" />
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
              <div className={`${chip.float} flex items-center gap-3 rounded-2xl border border-white/10 bg-[#161222]/90 px-4 py-3 shadow-2xl backdrop-blur`}>
                <Icon className={`h-5 w-5 ${chip.tone}`} />
                <div className="leading-tight">
                  <p className="text-sm font-bold text-white">{chip.label}</p>
                  <p className="text-[11px] text-white/55">{chip.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
