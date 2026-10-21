"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

// Muted demo film that starts on its own as soon as the page loads, loops, and
// pauses only while scrolled out of view (battery). If the browser refuses
// autoplay (e.g. iPhone low-power mode), a play button appears instead.
export function DemoFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let inView = false;
    const tryPlay = () => {
      if (document.visibilityState !== "visible") return;
      video.play().then(() => setStarted(true)).catch(() => setManual(true));
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) tryPlay();
        else video.pause();
      },
      { threshold: 0.1 },
    );
    observer.observe(video);

    // Browsers pause muted videos while the tab is hidden; resume on return.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && inView) tryPlay();
    };
    // Some browsers only allow playback once enough data is buffered.
    const onCanPlay = () => {
      if (inView && video.paused) tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    video.addEventListener("canplay", onCanPlay);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("canplay", onCanPlay);
    };
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
    <div className="film-frame relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-[#F5F3FF]">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster="/motion/demo-poster.jpg"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-label="Démo Campus 360 : trouver un stage, voir son score de correspondance, générer son CV officiel RH et sa lettre, postuler et préparer sa soutenance."
      >
        <source src="/motion/demo.webm" type="video/webm" />
        <source src="/motion/demo.mp4" type="video/mp4" />
      </video>
      {manual && !started && (
        <button
          type="button"
          onClick={playNow}
          className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/20 transition-colors hover:bg-[#0F172A]/10"
          aria-label="Lire la démo (900 Ko)"
        >
          <span className="flex items-center gap-3 rounded-full bg-[#7C3AED] px-6 py-3 font-semibold text-white shadow-xl">
            <Play className="h-5 w-5 fill-current" /> Voir la démo · 19 s
          </span>
        </button>
      )}
    </div>
  );
}
