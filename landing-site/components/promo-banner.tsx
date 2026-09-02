"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

interface PromoBannerProps {
  endDate?: string;
  title?: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
}

export function PromoBanner({
  endDate = "2026-09-30T23:59:59Z",
  title = "Découvre les offres Campus 360",
  ctaLabel = "Profiter",
  ctaHref = "/tarifs",
  dismissible = true,
}: PromoBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(endDate).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (dismissed) return null;

  return (
    <div className="relative" style={{ background: "var(--gradient-brand)" }}>
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center gap-3 text-sm text-white">
        <span className="font-medium hidden sm:inline">{title}</span>
        <span className="font-medium sm:hidden">Promo Rentrée</span>
        <span className="font-mono tabular-nums text-white/70">
          {String(timeLeft.d).padStart(2, "0")}j{" "}
          {String(timeLeft.h).padStart(2, "0")}:
          {String(timeLeft.m).padStart(2, "0")}:
          {String(timeLeft.s).padStart(2, "0")}
        </span>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1 font-medium hover:text-white/80 transition-colors"
        >
          {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {dismissible && (
        <button
          aria-label="Fermer"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:text-white/60 transition-colors cursor-pointer"
          onClick={() => setDismissed(true)}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
