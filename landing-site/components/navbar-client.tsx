"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";

const navLinks = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/a-propos", label: "À propos" },
  { href: "/aide", label: "Aide" },
];

export function NavbarClient({ user }: { user?: { name?: string | null; email?: string | null } | null }) {
  const [open, setOpen] = useState(false);

  const initial = user
    ? (user.name || user.email || "").trim().charAt(0).toUpperCase()
    : "";

  return (
    <>
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-paper)]/95 backdrop-blur-sm border-b border-[var(--color-ink)]/[0.08]">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[var(--color-ink)] rounded-[4px] flex items-center justify-center">
              <span className="font-display text-[var(--color-paper)] text-lg font-black leading-none">C</span>
            </div>
            <span className="font-display text-[1.05rem] font-bold text-[var(--color-ink)]">
              Campus 360
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/compte"
                  className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Mon compte
                </Link>
                <div className="w-8 h-8 rounded-[4px] bg-[var(--color-sienna)] flex items-center justify-center text-white text-xs font-bold">
                  {initial}
                </div>
              </>
            ) : (
              <>
                <Link href="/connexion">
                  <Button variant="ghost" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link href="/inscription">
                  <Button variant="secondary" size="sm">
                    S&apos;inscrire
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-[4px] hover:bg-[var(--color-ink)]/[0.06] transition-colors cursor-pointer"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? (
              <X className="w-5 h-5 text-[var(--color-ink)]" />
            ) : (
              <Menu className="w-5 h-5 text-[var(--color-ink)]" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed top-16 left-0 right-0 z-40 bg-[var(--color-paper)] border-b border-[var(--color-ink)]/10 md:hidden">
            <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors border-b border-[var(--color-ink)]/[0.08]"
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link
                      href="/compte"
                      onClick={() => setOpen(false)}
                      className="py-3 text-base text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors border-b border-[var(--color-ink)]/[0.08]"
                    >
                      Mon compte
                    </Link>
                    <a
                      href="https://campus360b.site/downloads/campus-360.apk"
                      download="campus-360.apk"
                      onClick={() => setOpen(false)}
                    >
                      <Button variant="secondary" className="w-full">
                        Télécharger l&apos;APK
                      </Button>
                    </a>
                  </>
                ) : (
                  <>
                    <Link href="/connexion" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Connexion
                      </Button>
                    </Link>
                    <Link href="/inscription" onClick={() => setOpen(false)}>
                      <Button variant="secondary" className="w-full">
                        S&apos;inscrire
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
