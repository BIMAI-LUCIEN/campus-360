import Link from "next/link";
import { BookOpen, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { getServerSession } from "@/lib/session";
import { NavbarUserMenu } from "./navbar-user-menu";

const navLinks = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/a-propos", label: "À propos" },
  { href: "/aide", label: "Aide" },
];

export async function Navbar() {
  const session = await getServerSession();
  const user = session?.user;
  const initial = (user?.name || user?.email || "").trim().charAt(0).toUpperCase();

  return (
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
              <NavbarUserMenu
                initial={initial}
                name={user.name || user.email || "Utilisateur"}
                email={user.email}
              />
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
                  className="bg-[var(--color-ink)] hover:bg-[var(--color-brand-700)] rounded-full px-5"
                >
                  S&apos;inscrire
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <Link
          href={user ? "/compte" : "/connexion"}
          className="md:hidden p-2 rounded-lg hover:bg-zinc-100 transition-colors"
          aria-label={user ? "Mon compte" : "Connexion"}
        >
          {user ? (
            <div className="w-7 h-7 rounded-full bg-[var(--color-ink)] flex items-center justify-center text-white text-xs font-bold">
              {initial || <Menu className="w-4 h-4" />}
            </div>
          ) : (
            <Menu className="w-5 h-5 text-[var(--color-ink)]" />
          )}
        </Link>
      </nav>
    </header>
  );
}
