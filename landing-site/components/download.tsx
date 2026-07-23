"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, Loader2, QrCode } from "lucide-react";
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
          width: 240,
          margin: 2,
          color: {
            dark: "#0F172A",
            light: "#F6F1E7",
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
    <section className="py-24 bg-[var(--color-paper-deep)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div className="space-y-6">
            <p className="kicker">Téléchargement</p>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] leading-[1.05]">
              Scan le QR code
              <br />
              pour installer.
            </h2>
            <p className="text-[var(--color-ink-muted)] max-w-sm leading-relaxed">
              Disponible sur Android. Ouvre le lien dans Expo Go ou ton navigateur mobile
              pour installer Campus 360.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href={APK_URL} download="campus-360.apk">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Smartphone className="w-5 h-5" />
                  Télécharger l&apos;APK
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-subtle)]">
              <div className="w-1.5 h-1.5 bg-[var(--color-emerald)] rounded-full" />
              <span>Gratuit · Sans pub · Sans engagement</span>
            </div>
          </div>

          {/* Right — QR */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-[var(--color-paper)] border border-[var(--color-ink)]/10 p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-[var(--color-ink-subtle)]">
                  <QrCode className="w-5 h-5" />
                  <span className="text-sm font-medium">Scanne pour télécharger</span>
                </div>

                <div className="w-[240px] h-[240px] flex items-center justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 text-[var(--color-ink-lighter)]">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Génération...</span>
                    </div>
                  ) : qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR code pour télécharger l'app"
                      width={240}
                      height={240}
                    />
                  ) : (
                    <span className="text-sm text-[var(--color-ink-lighter)]">
                      Impossible de générer le QR
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--color-ink-lighter)] text-center">
                  Ouvre le lien dans Expo Go ou ton navigateur mobile
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </section>
  );
}
