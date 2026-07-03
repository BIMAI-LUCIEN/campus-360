"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight } from "lucide-react";

interface PromoBannerProps {
  endDate?: string; // ISO date
  title?: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
}

export function PromoBanner({
  endDate = "2026-09-30T23:59:59Z",
  title = "Rentrée 2026 : -50% sur Premium",
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
    <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold hidden sm:inline">{title}</span>
        <span className="font-semibold sm:hidden">Promo Rentrée</span>
        <span className="font-mono tabular-nums bg-white/20 px-2 py-0.5 rounded">
          {String(timeLeft.d).padStart(2, "0")}j{" "}
          {String(timeLeft.h).padStart(2, "0")}:
          {String(timeLeft.m).padStart(2, "0")}:
          {String(timeLeft.s).padStart(2, "0")}
        </span>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1 font-semibold hover:underline"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {dismissible && (
        <button
          aria-label="Fermer la bannière"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/15 rounded transition-colors cursor-pointer"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}