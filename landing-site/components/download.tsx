"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, Loader2, QrCode, Smartphone } from "lucide-react";
import { Button } from "./ui/button";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

export function Download() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function generateQR() {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = APK_URL;

        const dataUrl = await QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          color: {
            dark: "#0ea5e9",
            light: "#ffffff",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR generation failed:", err);
      } finally {
        setLoading(false);
      }
    }
    generateQR();
  }, []);

  return (
    <section className="py-20 lg:py-32 bg-[var(--color-ink)] text-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-brand-300 text-sm font-semibold rounded-full mb-6">
              <Smartphone className="w-4 h-4" />
              Disponible maintenant
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
              Télécharge l&apos;app et{" "}
              <span className="text-brand-400">commence maintenant</span>
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Disponible sur iOS et Android. Scan le QR code ou clique sur le
              bouton pour accéder directement à l&apos;app.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-white/10 text-white/60 cursor-not-allowed gap-2"
                disabled
                aria-disabled="true"
                title="Bientôt disponible sur iOS"
              >
                <Apple className="w-5 h-5" />
                App Store (bientôt)
              </Button>
              <a href={APK_URL} download="campus-360.apk">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 gap-2"
                >
                  <Smartphone className="w-5 h-5" />
                  Télécharger APK Android
                </Button>
              </a>
            </div>

            <div className="mt-10 flex items-center gap-4 text-sm text-white/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Gratuit à télécharger</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Sans engagement</span>
              </div>
            </div>
          </div>

          {/* Right — QR code */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-[var(--color-ink)]">
                  Scanne pour télécharger
                </h3>

                <div className="relative w-[280px] h-[280px] bg-white rounded-2xl flex items-center justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 text-[var(--color-ink-light)]">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Génération du QR...</span>
                    </div>
                  ) : qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR code pour télécharger l'app"
                      width={280}
                      height={280}
                      className="rounded-xl"
                    />
                  ) : (
                    <span className="text-sm text-red-500">
                      Impossible de générer le QR
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--color-ink-light)] text-center">
                  Scanne avec ton téléphone pour télécharger l&apos;APK directement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden canvas for QR generation */}
      <canvas ref={canvasRef} className="hidden" />
    </section>
  );
}
