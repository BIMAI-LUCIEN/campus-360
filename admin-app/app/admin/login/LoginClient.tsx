'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <form onSubmit={submit} className="auth-card">
      <h1>Campus-Bordes Admin</h1>
      <p className="muted">Connexion dashboard PDF.</p>

      {mode === 'sign-up' ? (
        <>
          <label htmlFor="name">Nom</label>
          <input id="name" value={name} onChange={(event) => setName(event.target.value)} />
        </>
      ) : null}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />

      <label htmlFor="password">Mot de passe</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {message ? <div className="alert">{message}</div> : null}

      <div className="actions" style={{ marginTop: 14 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Patiente...' : mode === 'sign-in' ? 'Se connecter' : 'Creer admin'}
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
        >
          {mode === 'sign-in' ? 'Creer le premier admin' : "J'ai deja un compte"}
        </button>
      </div>

      {googleEnabled ? (
        <button className="btn secondary google-btn" type="button" onClick={signInWithGoogle} disabled={loading}>
          Continuer avec Google
        </button>
      ) : null}
    </form>
  );
}
