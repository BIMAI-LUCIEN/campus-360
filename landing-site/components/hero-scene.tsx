"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Sparkles, Wallet } from "lucide-react";

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      container.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 5}deg)`;
    };

    const handleMouseLeave = () => {
      container.style.transform =
        "perspective(1000px) rotateY(0deg) rotateX(0deg)";
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative">
      {/* Ambient gradient glow behind the phone */}
      <div
        className="absolute -inset-10 rounded-full blur-3xl opacity-40 -z-10"
        style={{ background: "var(--gradient-brand)" }}
      />

      {/* Phone frame */}
      <div
        ref={containerRef}
        className="relative transition-transform duration-300 ease-out"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Phone body */}
        <div className="relative w-[280px] sm:w-[300px] rounded-[2rem] bg-[var(--color-paper-deep)] border border-[var(--color-ink-faint)] p-2">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-[var(--color-paper)] rounded-full z-10" />

          {/* Screen — real app screenshot */}
          <div className="relative rounded-[1.6rem] overflow-hidden bg-[var(--color-paper)] aspect-[9/19.5]">
            <Image
              src="/images/app-home.png"
              alt="Écran d'accueil de l'app Campus 360"
              fill
              className="object-cover object-top"
              priority
            />
          </div>
        </div>

        {/* Floating badges — dark chips with gradient icon */}
        <div className="absolute -top-4 -right-4 bg-[var(--color-paper-deep)] border border-[var(--color-ink-faint)] rounded-[10px] px-3 py-2 flex items-center gap-2 text-xs font-semibold shadow-xl">
          <div
            className="w-5 h-5 rounded-[6px] flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[var(--color-ink)]">IA activée</span>
        </div>

        <div className="absolute -bottom-4 -left-4 bg-[var(--color-paper-deep)] border border-[var(--color-ink-faint)] rounded-[10px] px-3 py-2 flex items-center gap-2 text-xs font-semibold shadow-xl">
          <div className="w-5 h-5 rounded-[6px] bg-[var(--color-emerald)]/20 flex items-center justify-center">
            <Wallet className="w-3 h-3 text-[var(--color-emerald)]" strokeWidth={2.5} />
          </div>
          <span className="text-[var(--color-ink)]">Wallet chargé</span>
        </div>
      </div>
    </div>
  );
}
