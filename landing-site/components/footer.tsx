import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-ink)] text-[var(--color-paper)] pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-6">

        {/* Top: brand + nav in one row */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">

          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[var(--color-paper)] rounded-[4px] flex items-center justify-center">
                <span className="font-display text-[var(--color-ink)] text-lg font-black leading-none">C</span>
              </div>
              <span className="font-display text-lg font-bold">
                Campus 360
              </span>
            </Link>
            <p className="text-sm text-[var(--color-paper)]/55 leading-relaxed">
              La bibliothèque PDF académique pensée par et pour les étudiants africains.
            </p>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-3 gap-10">
            <div>
              <h4 className="kicker mb-4">Produit</h4>
              <ul className="space-y-3 text-sm text-[var(--color-paper)]/70">
                <li>
                  <Link href="/fonctionnalites" className="hover:text-[var(--color-paper)] transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="/tarifs" className="hover:text-[var(--color-paper)] transition-colors">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/telecharger" className="hover:text-[var(--color-paper)] transition-colors">
                    Télécharger
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="kicker mb-4">Aide</h4>
              <ul className="space-y-3 text-sm text-[var(--color-paper)]/70">
                <li>
                  <Link href="/aide" className="hover:text-[var(--color-paper)] transition-colors">
                    Centre d&apos;aide
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[var(--color-paper)] transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-[var(--color-paper)] transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="kicker mb-4">Légal</h4>
              <ul className="space-y-3 text-sm text-[var(--color-paper)]/70">
                <li>
                  <Link href="/conditions" className="hover:text-[var(--color-paper)] transition-colors">
                    Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/confidentialite" className="hover:text-[var(--color-paper)] transition-colors">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/mentions-legales" className="hover:text-[var(--color-paper)] transition-colors">
                    Mentions légales
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[var(--color-paper)]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-paper)]/40">
          <p>© {year} Campus 360</p>
          <p className="font-mono text-xs tracking-wide">Conçu pour les étudiants</p>
        </div>
      </div>
    </footer>
  );
}
