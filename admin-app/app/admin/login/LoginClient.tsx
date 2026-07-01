'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  LayoutDashboard,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('Admin Campus-Bordes');
  const [email, setEmail] = useState('admin@campus360.local');
  const [password, setPassword] = useState('Admin123456!');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/mobile/auth-capabilities')
      .then((response) => response.json())
      .then((payload) => setGoogleEnabled(Boolean(payload.google)))
      .catch(() => undefined);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (result.error) throw new Error(result.error.message ?? 'Inscription impossible');

        await fetch('/api/bootstrap-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) throw new Error(result.error.message ?? 'Connexion impossible');
      }

      router.push('/admin/pdf');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur auth');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/admin/pdf',
      });
      if (result.error) throw new Error(result.error.message ?? 'Connexion Google impossible');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur Google');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg p-6 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-soft blur-3xl opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-info-soft blur-3xl opacity-40"
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-popover p-8"
      >
        <div className="flex justify-center mb-5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white shadow-popover">
            <LayoutDashboard size={22} strokeWidth={2.25} />
          </div>
        </div>

        <h1 className="font-display text-[22px] font-bold text-fg text-center leading-tight">
          Campus 360 Admin
        </h1>
        <p className="text-sm text-fg-subtle text-center mt-2 mb-6">
          Connecte-toi pour gérer tes PDF, packs et rapports.
        </p>

        {mode === 'sign-up' ? (
          <div className="mb-3">
            <label htmlFor="name" className="block text-[13px] font-semibold text-fg mb-1.5">
              Nom complet
            </label>
            <div className="relative">
              <input
                id="name"
                type="text"
                placeholder="Ex: Jean Dupont"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full h-11 pl-10 pr-3 bg-surface-2 border border-border rounded-md text-sm text-fg placeholder:text-fg-faint focus:bg-surface focus:border-primary focus:outline-none transition-colors"
              />
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
              />
            </div>
          </div>
        ) : null}

        <div className="mb-3">
          <label htmlFor="email" className="block text-[13px] font-semibold text-fg mb-1.5">
            Adresse email
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              placeholder="admin@campus360.local"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full h-11 pl-10 pr-3 bg-surface-2 border border-border rounded-md text-sm text-fg placeholder:text-fg-faint focus:bg-surface focus:border-primary focus:outline-none transition-colors"
            />
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="block text-[13px] font-semibold text-fg mb-1.5">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full h-11 pl-10 pr-3 bg-surface-2 border border-border rounded-md text-sm text-fg placeholder:text-fg-faint focus:bg-surface focus:border-primary focus:outline-none transition-colors"
            />
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
            />
          </div>
        </div>

        {message ? (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-md border border-danger-soft bg-danger-bg text-danger text-sm p-3"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full h-11 bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Connexion...</span>
            </>
          ) : mode === 'sign-in' ? (
            'Se connecter'
          ) : (
            'Créer le premier admin'
          )}
        </button>

        {googleEnabled ? (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-fg-subtle">OU</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full h-11 bg-surface border border-border text-fg font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-surface-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.84-2.46 2.77v2.3h3.99c2.33-2.15 3.52-5.32 3.52-8.92z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.89-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.3v3.13C3.28 20.25 7.42 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.26c-.25-.72-.39-1.49-.39-2.28s.14-1.56.39-2.28V6.57H1.3C.47 8.23 0 10.06 0 12s.47 3.77 1.3 5.43l3.97-3.17z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.42 0 3.28 3.75 1.3 7.82l3.97 3.17c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>
          </>
        ) : null}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
            className="text-sm text-fg-muted hover:text-fg transition-colors"
          >
            {mode === 'sign-in'
              ? 'Créer le premier administrateur'
              : 'Se connecter avec un compte existant'}
          </button>
        </div>
      </form>
    </div>
  );
}