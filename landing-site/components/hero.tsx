"use client";

import dynamic from "next/dynamic";
import { ArrowRight, BookOpen, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100 pt-16">
      {/* Background blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              Nouveau : Assistant IA intégré
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--color-ink)] leading-tight mb-6">
              La bibliothèque PDF qui pense{" "}
              <span className="text-brand-600">comme toi</span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--color-ink-light)] mb-8 max-w-lg mx-auto lg:mx-0">
              Accède à des milliers de PDFs académiques, génère des fiches de
              révisions avec l&apos;IA et révise hors-ligne. Conçu par des
              étudiants, pour des étudiants.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href={APK_URL} download="campus-360.apk">
                <Button size="lg" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  Télécharger l&apos;app
                </Button>
              </a>
              <Button
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <QrCode className="w-5 h-5" />
                Scanner le QR code
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start text-sm text-[var(--color-ink-light)]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span>Gratuit pour démarrer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-brand-500" />
                <span>+PDFs ajoutés chaque jour</span>
              </div>
            </div>
          </div>

          {/* Right — Phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <HeroScene />
          </div>
        </div>
      </div>
    </section>
  );
}
