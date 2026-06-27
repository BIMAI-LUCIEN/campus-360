'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('Admin Campus 3602');
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
    <form onSubmit={submit} className="auth-card">
      <div className="auth-brand-logo">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      </div>

      <h1>Campus 3602 Admin</h1>
      <p className="muted">Connexion dashboard PDF.</p>

      {mode === 'sign-up' ? (
        <div className="input-group">
          <label htmlFor="name">Nom complet</label>
          <div className="input-wrapper">
            <input
              id="name"
              placeholder="Ex: Jean Dupont"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <div className="input-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </div>
      ) : null}

      <div className="input-group">
        <label htmlFor="email">Adresse email</label>
        <div className="input-wrapper">
          <input
            id="email"
            type="email"
            placeholder="admin@campus360.local"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <div className="input-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="password">Mot de passe</label>
        <div className="input-wrapper">
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div className="input-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
      </div>

      {message ? (
        <div className="auth-alert">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{message}</span>
        </div>
      ) : null}

      <button className="auth-btn-primary" type="submit" disabled={loading}>
        {loading ? (
          <>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
            <span>Patientez...</span>
          </>
        ) : mode === 'sign-in' ? (
          'Se connecter'
        ) : (
          'Créer le premier admin'
        )}
      </button>

      {googleEnabled ? (
        <>
          <div className="auth-divider">ou</div>
          <button className="auth-btn-google" type="button" onClick={signInWithGoogle} disabled={loading}>
            <svg viewBox="0 0 24 24" width="18" height="18">
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

      <button
        className="auth-toggle-link"
        type="button"
        onClick={() => setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
      >
        {mode === 'sign-in' ? 'Créer le premier administrateur' : 'Se connecter avec un compte existant'}
      </button>
    </form>
  );
}
