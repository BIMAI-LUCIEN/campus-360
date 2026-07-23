"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/auth-client";

export default function InscriptionForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        // role is set server-side via additionalFields defaultValue
      });
      if (result.error) {
        setError(result.error.message || "Inscription impossible. Réessaie.");
        setLoading(false);
        return;
      }
      // Better Auth auto-signs in on register. Redirect to account.
      router.push("/compte");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/compte",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Google.");
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-start gap-2 text-sm text-rose-300"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold mb-1.5">
              Prénom
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-lighter)]" />
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                autoComplete="given-name"
                placeholder="Aïcha"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold mb-1.5">
              Nom
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              placeholder="Mbarga"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
            Email étudiant
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-lighter)]" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ton.email@universite.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold mb-1.5">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-lighter)]" />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <p className="text-xs text-[var(--color-ink-lighter)] mt-1">Au moins 8 caractères.</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="w-4 h-4 mt-0.5 rounded border-[var(--color-border)] text-[var(--color-sienna)] focus:ring-brand-500 cursor-pointer"
          />
          <label htmlFor="terms" className="text-[var(--color-ink-light)] cursor-pointer">
            J&apos;accepte les{" "}
            <Link href="/conditions" className="text-[var(--color-sienna)] hover:underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="text-[var(--color-sienna)] hover:underline">
              politique de confidentialité
            </Link>
            .
          </label>
        </div>
        <Button type="submit" disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Créer mon compte gratuit
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-ink-lighter)]">OU</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-paper)] transition-colors font-semibold cursor-pointer disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        S&apos;inscrire avec Google
      </button>

      <p className="text-center text-sm text-[var(--color-ink-light)] mt-6">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-[var(--color-sienna)] font-semibold hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}