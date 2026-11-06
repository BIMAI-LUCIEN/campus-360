"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Informational notice only: the site sets strictly necessary cookies (session,
// OAuth state), which need no consent. If a non-essential cookie is ever added,
// this must become a real accept/refuse banner that blocks it until accepted.
const STORAGE_KEY = "campus360.cookie-notice";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "seen") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const close = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "seen");
    } catch {
      // Storage blocked: the notice simply comes back next visit.
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Information sur les cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-lg text-sm text-[var(--color-ink-light)]"
    >
      <p>
        Nous n&apos;utilisons que des cookies de connexion et de sécurité. Pas de publicité, pas de pistage.{" "}
        <Link href="/cookies" className="text-[var(--color-sienna)] underline">
          En savoir plus
        </Link>
      </p>
      <button
        type="button"
        onClick={close}
        className="mt-3 w-full rounded-lg bg-[var(--color-sienna)] px-4 py-2 font-medium text-white hover:opacity-90"
      >
        Compris
      </button>
    </div>
  );
}
