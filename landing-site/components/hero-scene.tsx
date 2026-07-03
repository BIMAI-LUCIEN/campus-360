"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

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
      {/* Glow behind phone */}
      <div className="absolute inset-0 bg-brand-400/30 blur-3xl rounded-full scale-75" />

      {/* Phone frame */}
      <div
        ref={containerRef}
        className="relative transition-transform duration-300 ease-out"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Phone body */}
        <div className="relative w-[280px] sm:w-[300px] rounded-[3rem] bg-[var(--color-ink)] p-2 shadow-2xl shadow-brand-500/30">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-[var(--color-ink)] rounded-full z-10" />

          {/* Screen */}
          <div className="relative rounded-[2.4rem] overflow-hidden bg-white aspect-[9/19]">
            <Image
              src="/images/screenshot-hero.jpg"
              alt="Campus 360 app screenshot"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Floating badges */}
        <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 text-xs font-semibold">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-[10px]">✨</span>
          </div>
          <span className="text-[var(--color-ink)]">IA activée</span>
        </div>

        <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 text-xs font-semibold">
          <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-[10px]">✓</span>
          </div>
          <span className="text-[var(--color-ink)]">Wallet chargé</span>
        </div>
      </div>
    </div>
  );
}
