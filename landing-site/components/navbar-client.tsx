"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Menu, X } from "lucide-react";
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-ink)] rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span
              className="text-base font-bold"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Campus 360
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--color-ink-light)] hover:text-[var(--color-ink)] transition-colors"
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
                  className="text-sm text-[var(--color-ink-light)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Mon compte
                </Link>
                <div className="w-8 h-8 rounded-full bg-[var(--color-brand-500)] flex items-center justify-center text-white text-xs font-bold">
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
                  <Button
                    size="sm"
                    className="bg-[var(--color-amber-cta)] hover:bg-[var(--color-amber-cta-hover)] rounded-full px-5"
                  >
                    S&apos;inscrire
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
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
          <div className="fixed top-16 left-0 right-0 z-40 bg-white shadow-lg md:hidden">
            <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base text-[var(--color-ink-light)] hover:text-[var(--color-ink)] transition-colors border-b border-zinc-100"
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
                      className="py-3 text-base text-[var(--color-ink-light)] hover:text-[var(--color-ink)] transition-colors border-b border-zinc-100"
                    >
                      Mon compte
                    </Link>
                    <a
                      href="https://campus360b.site/downloads/campus-360.apk"
                      download="campus-360.apk"
                      onClick={() => setOpen(false)}
                    >
                      <Button className="w-full bg-[var(--color-amber-cta)] hover:bg-[var(--color-amber-cta-hover)] rounded-full">
                        Télécharger l&apos;APK
                      </Button>
                    </a>
                  </>
                ) : (
                  <>
                    <Link href="/connexion" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full rounded-full">
                        Connexion
                      </Button>
                    </Link>
                    <Link href="/inscription" onClick={() => setOpen(false)}>
                      <Button className="w-full bg-[var(--color-amber-cta)] hover:bg-[var(--color-amber-cta-hover)] rounded-full">
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
