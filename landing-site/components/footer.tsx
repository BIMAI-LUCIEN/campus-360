import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-ink)] text-white pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-6">

        {/* Top: brand + nav in one row */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">

          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[var(--color-ink)]" />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Campus 360
              </span>
            </Link>
            <p className="text-sm text-white/50 leading-relaxed">
              La bibliothèque PDF académique pensée par et pour les étudiants africains.
            </p>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-3 gap-10">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                Produit
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/fonctionnalites" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="/tarifs" className="hover:text-white transition-colors">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/telecharger" className="hover:text-white transition-colors">
                    Télécharger
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                Aide
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/aide" className="hover:text-white transition-colors">
                    Centre d&apos;aide
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                Légal
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/conditions" className="hover:text-white transition-colors">
                    Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/confidentialite" className="hover:text-white transition-colors">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/mentions-legales" className="hover:text-white transition-colors">
                    Mentions légales
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© {year} Campus 360</p>
          <p>Conçu pour les étudiants</p>
        </div>
      </div>
    </footer>
  );
}
