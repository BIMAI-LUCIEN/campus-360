import Link from "next/link";
import { BookOpen, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { getServerSession } from "@/lib/session";
import { NavbarUserMenu } from "./navbar-user-menu";

const APK_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
  "https://campus360b.site/downloads/campus-360.apk";

const navLinks = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/blog", label: "Blog" },
  { href: "/a-propos", label: "À propos" },
  { href: "/aide", label: "Aide" },
];

export async function Navbar() {
  const session = await getServerSession();
  const user = session?.user;
  const initial = (user?.name || user?.email || "").trim().charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-[var(--color-border)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold font-display text-[var(--color-ink)]">
            Campus 360
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--color-ink-light)] hover:text-brand-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link href="/compte" className="hidden lg:inline text-sm font-medium text-[var(--color-ink-light)] hover:text-brand-600 transition-colors">
                Mon compte
              </Link>
              <NavbarUserMenu
                initial={initial}
                name={user.name || user.email || "Utilisateur"}
                email={user.email}
              />
              <a href={APK_URL} download="campus-360.apk">
                <Button size="sm" className="bg-amber-cta hover:bg-amber-cta-hover">
                  Télécharger
                </Button>
              </a>
            </>
          ) : (
            <>
              <Link href="/connexion">
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
              </Link>
              <Link href="/inscription">
                <Button variant="outline" size="sm">
                  S&apos;inscrire
                </Button>
              </Link>
              <a href={APK_URL} download="campus-360.apk">
                <Button size="sm" className="bg-amber-cta hover:bg-amber-cta-hover">
                  Télécharger
                </Button>
              </a>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <Link
          href={user ? "/compte" : "/connexion"}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={user ? "Mon compte" : "Connexion"}
        >
          {user ? (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {initial || <User className="w-4 h-4" />}
            </div>
          ) : (
            <Menu className="w-5 h-5 text-[var(--color-ink)]" />
          )}
        </Link>
      </nav>
    </header>
  );
}

function User(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}