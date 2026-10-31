"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

// Chapters of the presentation film (seconds), kept in sync with film/presentation.html.
const chapters = [
  { label: "Accueil", at: 11.5 },
  { label: "Stages", at: 17 },
  { label: "Candidature", at: 23.5 },
  { label: "Révisions", at: 32 },
  { label: "Rédaction", at: 36 },
  { label: "Wallet", at: 40 },
];

// One-minute presentation film. It starts muted on its own while in view (browsers forbid
// sound without a gesture), loops, and pauses out of view. "Écouter avec le son" restarts it
// from the top with the soundtrack; chapters jump straight to a feature.
export function DemoFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(60);
  const [blocked, setBlocked] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let inView = false;
    const tryPlay = () => {
      if (document.visibilityState !== "visible" || userPaused.current) return;
      video.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) tryPlay();
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    const onVisibility = () => {
      if (document.visibilityState === "visible" && inView) tryPlay();
    };
    const onCanPlay = () => {
      if (inView && video.paused) tryPlay();
    };
    const onTime = () => setProgress(video.currentTime);
    const onMeta = () => setDuration(video.duration || 60);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // autoPlay may already have started the video before these listeners exist.
    setPlaying(!video.paused);
    if (video.duration) setDuration(video.duration);
    document.addEventListener("visibilitychange", onVisibility);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const playFrom = (at: number, withSound: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    userPaused.current = false;
    video.currentTime = at;
    if (withSound) {
      video.muted = false;
      setMuted(false);
    }
    video.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    if (muted) playFrom(0, true);
    else {
      video.muted = true;
      setMuted(true);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) playFrom(video.currentTime, false);
    else {
      userPaused.current = true;
      video.pause();
    }
  };

  const current = chapters.reduce((acc, c, i) => (progress >= c.at ? i : acc), -1);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="film-frame group relative aspect-video w-full overflow-hidden rounded-2xl bg-[#F5F3FF]">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster="/motion/presentation-poster.jpg"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          onClick={togglePlay}
          aria-label="Présentation de Campus 360 en une minute : accueil, stages et score de correspondance, candidature avec CV adapté et lettre, révisions avec les annales, rédaction avec l'IA et wallet Mobile Money."
        >
          <source src="/motion/presentation.mp4" type="video/mp4" />
        </video>

        {(blocked || (!playing && progress === 0)) && (
          <button
            type="button"
            onClick={() => playFrom(0, true)}
            className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/25 transition-colors hover:bg-[#0F172A]/15"
            aria-label="Lire la présentation avec le son"
          >
            <span className="flex items-center gap-3 rounded-full bg-[#7C3AED] px-6 py-3 font-semibold text-white shadow-xl">
              <Play className="h-5 w-5 fill-current" /> Voir la présentation · 1 min
            </span>
          </button>
        )}

        {muted && playing && (
          <button
            type="button"
            onClick={toggleSound}
            className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-lg ring-1 ring-black/5 transition hover:bg-white sm:left-5 sm:top-5 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C3AED] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7C3AED]" />
            </span>
            <Volume2 className="h-4 w-4 text-[var(--color-sienna)]" />
            Écouter avec le son
          </button>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-gradient-to-t from-[#0F172A]/55 to-transparent px-4 pb-3 pt-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[sound=on]:opacity-100" data-sound={muted ? "off" : "on"}>
          <button type="button" onClick={togglePlay} className="rounded-full p-1.5 text-white hover:bg-white/15" aria-label={playing ? "Mettre en pause" : "Lire"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => playFrom(0, !muted)} className="rounded-full p-1.5 text-white hover:bg-white/15" aria-label="Revoir depuis le début">
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (progress / duration) * 100)}%` }} />
          </div>
          <button type="button" onClick={toggleSound} className="rounded-full p-1.5 text-white hover:bg-white/15" aria-label={muted ? "Activer le son" : "Couper le son"}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Chapters: jump to the feature you care about */}
      <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Chapitres de la présentation">
        {chapters.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => playFrom(c.at, !muted)}
            aria-current={current === i ? "true" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              current === i
                ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                : "border-[var(--color-ink-faint)] bg-white text-[var(--color-ink-muted)] hover:border-[#C4B5FD] hover:text-[var(--color-ink)]"
            }`}
          >
            <span className="mr-1.5 font-mono text-xs opacity-70">0{i + 1}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
