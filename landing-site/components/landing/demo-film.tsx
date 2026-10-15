"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

// Muted demo film: plays only while on screen. On data-saver / 2G connections
// or with reduced motion, nothing downloads until the visitor taps play.
export function DemoFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    const slowNetwork = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (slowNetwork || reducedMotion) {
      setManual(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setStarted(true)).catch(() => setManual(true));
        } else {
          video.pause();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const playNow = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(() => {
      setStarted(true);
      setManual(false);
    }).catch(() => undefined);
  };

  return (
    <div className="film-frame relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-[#0c0a14]">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster="/motion/demo-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        aria-label="Démo Campus 360 : trouver un stage, voir son score de correspondance, générer son CV officiel RH et sa lettre, postuler et préparer sa soutenance."
      >
        <source src="/motion/demo.webm" type="video/webm" />
        <source src="/motion/demo.mp4" type="video/mp4" />
      </video>
      {manual && !started && (
        <button
          type="button"
          onClick={playNow}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
          aria-label="Lire la démo (900 Ko)"
        >
          <span className="flex items-center gap-3 rounded-full bg-white px-6 py-3 font-bold text-[#0f172a] shadow-xl">
            <Play className="h-5 w-5 fill-current" /> Voir la démo · 19 s
          </span>
        </button>
      )}
    </div>
  );
}
