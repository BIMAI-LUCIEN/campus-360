"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Github, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export default function ConnexionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.email({
        email,
        password,
        rememberMe: remember,
      });
      if (result.error) {
        setError(result.error.message || "Identifiants incorrects.");
        setLoading(false);
        return;
      }
      router.push("/compte");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion.");
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
          className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-sm text-rose-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
            Adresse email
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
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-semibold">
              Mot de passe
            </label>
            <Link href="/mot-de-passe-oublie" className="text-xs text-brand-600 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-lighter)]" />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
          />
          <label htmlFor="remember" className="text-[var(--color-ink-light)] cursor-pointer">
            Rester connecté
          </label>
        </div>
        <Button type="submit" disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Se connecter
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
        <Github className="w-5 h-5" />
        Continuer avec Google
      </button>

      <p className="text-center text-sm text-[var(--color-ink-light)] mt-6">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-brand-600 font-semibold hover:underline">
          S&apos;inscrire gratuitement
        </Link>
      </p>
    </>
  );
}