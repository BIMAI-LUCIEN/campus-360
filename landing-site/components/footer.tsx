import Link from "next/link";
import { BookOpen, Github, Mail, MessageCircle, Heart } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-ink)] text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter banner */}
        <div className="mb-12 p-6 sm:p-8 bg-gradient-to-r from-brand-500 to-brand-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-bold font-display mb-1">
              Reçois 1 PDF gratuit par semaine 📚
            </h3>
            <p className="text-white/80 text-sm">
              Conseils de révision, PDFs offerts, promos étudiants. Désabonnement en 1 clic.
            </p>
          </div>
          <form className="flex gap-2 w-full sm:w-auto">
            <input
              type="email"
              required
              placeholder="ton.email@universite.com"
              aria-label="Adresse email"
              className="px-4 py-2.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 placeholder-white/60 text-white flex-1 sm:w-72 focus:outline-none focus:ring-2 focus:ring-white/60"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-white text-brand-700 font-semibold rounded-lg hover:bg-white/90 transition-colors cursor-pointer"
            >
              S&apos;abonner
            </button>
          </form>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold font-display">Campus 360</span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed mb-4 max-w-sm">
              La bibliothèque PDF académique pensée par et pour les étudiants
              africains. Accès, révision, réussite.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/campus360"
                aria-label="WhatsApp"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="mailto:support@campus360b.site"
                aria-label="Email"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/BIMAI-LUCIEN/campus-360"
                aria-label="GitHub"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h4 className="font-semibold mb-4 text-sm font-display">Produit</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-white/60">
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
                  Télécharger APK
                </Link>
              </li>
              <li>
                <Link href="/promo/rentree-2026" className="hover:text-white transition-colors">
                  Offres spéciales
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <h4 className="font-semibold mb-4 text-sm font-display">Ressources</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-white/60">
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
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
                <Link href="/parrainage" className="hover:text-white transition-colors">
                  Parrainage
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-semibold mb-4 text-sm font-display">Légal</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-white/60">
              <li>
                <Link href="/conditions" className="hover:text-white transition-colors">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-white transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/remboursement" className="hover:text-white transition-colors">
                  Politique de remboursement
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

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© {year} Campus 360. Tous droits réservés.</p>
          <p className="flex items-center gap-1.5">
            Fait avec <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> pour les étudiants.
          </p>
        </div>
      </div>
    </footer>
  );
}