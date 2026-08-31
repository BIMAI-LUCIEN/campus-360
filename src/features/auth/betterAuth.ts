import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

import { publicEnv } from '../../config/env';

export type StudentSession = {
  user: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
  };
};

export type StudentProfile = {
  id: string;
  email?: string;
  name: string;
  role: string;
  phone?: string;
  whatsappPhone?: string;
  university?: string;
  faculty?: string;
  level?: string;
  skills?: string[];
};

export type StudentProfileUpdateInput = {
  name: string;
  phone: string;
  whatsappPhone: string;
  university: string;
  faculty: string;
  level?: string;
  skills?: string[];
};

export type StudentAccount = {
  user: StudentProfile;
  wallet: { balanceCoins: number; iaCredits: number; reportCredits: number };
  subscription: { tier: 'free' | 'basic' | 'premium'; expiresAt: string | null };
  purchasedDocumentIds: string[];
  purchasedPackIds: string[];
  transactions: Array<{
    id: string;
    amount_coins: number;
    type: 'topup' | 'purchase' | 'withdrawal' | 'commission' | 'report';
    status: 'success' | 'pending' | 'failed';
    reference_id?: string | null;
    reference_title?: string | null;
    reference_kind?: 'document' | 'pack' | null;
    created_at: string;
  }>;
};

export type AuthCapabilities = {
  passwordReset: boolean;
  google: boolean;
};

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

// Builds the dev backend URL for a given host. Plain LAN IPv4 hosts talk
// directly to admin-app on port 3001. Anything else (a tunnel hostname like
// `xxxx.exp.direct`, used when the phone can't reach the dev machine's LAN
// IP directly — e.g. mobile-hotspot client isolation) has no reachable
// :3001 port from the client's perspective, so we instead reuse the SAME
// origin: Metro's dev server (metro.config.js) proxies /api and /auth
// through to localhost:3001 for us, so a single tunneled port covers both
// the JS bundle and the backend.
const resolveDevBackendUrl = (host: string) => {
  if (!host) return null;
  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (IPV4_RE.test(host)) return `http://${host}:3001`;
  return `https://${host}`;
};

const getDevBackendUrl = () => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGoLaunchQueryParams?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      const resolved = resolveDevBackendUrl(host);
      if (resolved) return resolved;
    }
  } catch (e) {
    console.warn('[auth] Failed to detect dev backend URL via Constants:', e);
  }

  try {
    const url = Linking.createURL('/');
    if (url) {
      const parsed = Linking.parse(url);
      const resolved = resolveDevBackendUrl(parsed.hostname ?? '');
      if (resolved) return resolved;
    }
  } catch (e) {
    console.warn('[auth] Failed to detect dev backend URL via Linking:', e);
  }

  return null;
};

const getAuthBaseUrl = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && Platform.OS !== 'web') {
    const devUrl = getDevBackendUrl();
    if (devUrl) {
      console.log('[auth] Detected local dev backend URL:', devUrl);
      return devUrl;
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const current = window.location;
      // If we are running the frontend locally, we should default to the local backend on port 3001
      const isLocalhost = current.hostname === 'localhost' || current.hostname === '127.0.0.1';
      const isLocalLan = current.hostname.startsWith('192.168.') || 
                         current.hostname.startsWith('10.') || 
                         current.hostname.startsWith('172.');
      
      const baseUrlString = (isLocalhost || isLocalLan)
        ? `http://${current.hostname}:3001`
        : (publicEnv.authWebUrl || publicEnv.authUrl);

      const base = new URL(baseUrlString);

      // Only rewrite the host when the configured base is a loopback address.
      // Otherwise the URL might legitimately be production (e.g. campus-360.fr)
      // and we must NOT swap its host.
      if ((base.hostname === 'localhost' || base.hostname === '127.0.0.1') &&
          current.hostname !== 'localhost' && current.hostname !== '127.0.0.1') {
        base.hostname = current.hostname;
        base.protocol = current.protocol;
        if (current.port) {
          base.port = current.port === '8081' ? '3001' : current.port;
        }
      }
      return base.toString().replace(/\/$/, '');
    } catch {
      // Fall through to the static env value.
    }
  }
  return (Platform.OS === 'web' ? publicEnv.authWebUrl : publicEnv.authUrl).replace(/\/$/, '');
};

export const authBaseUrl = getAuthBaseUrl();

// Base URL that actually serves the static web assets bundled with admin-app
// (notably `pdf-viewer.html`, the PDF.js shell used by the in-app reader).
// On native production builds `authBaseUrl` resolves to mobile-api
// (api.campus360b.site) which does NOT host these files — using it there makes
// the reader WebView 404 and stay blank. This always resolves to the admin-app
// origin (authWebUrl) so the viewer works on real devices.
const getAuthWebBaseUrl = () => {
  // In dev on a physical device, the detected dev backend (port 3001) IS
  // admin-app, which serves pdf-viewer.html — reuse it.
  if (typeof __DEV__ !== 'undefined' && __DEV__ && Platform.OS !== 'web') {
    const devUrl = getDevBackendUrl();
    if (devUrl) {
      return devUrl;
    }
  }

  // On web, the existing base-url logic already resolves to the admin-app
  // origin (authWebUrl / localhost:3001), so reuse it verbatim.
  if (Platform.OS === 'web') {
    return authBaseUrl;
  }

  // Native production: always point at the admin-app web origin.
  return (publicEnv.authWebUrl || publicEnv.authUrl).replace(/\/$/, '');
};

export const authWebBaseUrl = getAuthWebBaseUrl();

const memoryStore: Record<string, string> = {};

// Pre-hydrate memory store from SecureStore asynchronously
const hydratePromise = (async () => {
  if (Platform.OS === 'web') return;
  try {
    const [token, user, cookie] = await Promise.all([
      SecureStore.getItemAsync('campus-bordes_session_token').catch(() => null),
      SecureStore.getItemAsync('campus-bordes_user').catch(() => null),
      SecureStore.getItemAsync('campus-bordes_better-auth.session_token').catch(() => null),
    ]);
    if (token) memoryStore['campus-bordes_session_token'] = token;
    if (user) memoryStore['campus-bordes_user'] = user;
    if (cookie) memoryStore['campus-bordes_better-auth.session_token'] = cookie;
  } catch (err) {
    console.warn('[auth] storage hydration warning:', err);
  }
})();

export const authStorage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return memoryStore[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore[key] = value;
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    SecureStore.setItemAsync(key, value).catch(() => {});
  },
  getItemAsync: async (key: string): Promise<string | null> => {
    if (memoryStore[key]) return memoryStore[key];
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    const val = await SecureStore.getItemAsync(key).catch(() => null);
    if (val) memoryStore[key] = val;
    return val;
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value).catch(() => {});
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    delete memoryStore[key];
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    ...(Platform.OS === 'web'
      ? []
      : [
          expoClient({
            scheme: 'campus-bordes',
            storagePrefix: 'campus-bordes',
            storage: authStorage,
          }),
        ]),
  ],
});

const errorMessage = (error: { message?: string; code?: string } | null | undefined) =>
  error?.message || error?.code || 'Connexion impossible.';

const loadSession = async (): Promise<StudentSession | null> => {
  await hydratePromise.catch(() => {});
  try {
    const result = await authClient.getSession();
    if (!result.error && result.data?.user) {
      const sessionData = result.data as any;
      if (sessionData.session?.token) {
        await authStorage.setItemAsync('campus-bordes_session_token', sessionData.session.token);
      }
      await authStorage.setItemAsync('campus-bordes_user', JSON.stringify(result.data.user));
      return { user: result.data.user as StudentSession['user'] };
    }
  } catch (err) {
    console.warn('[auth] getSession fetch failed, checking local storage cache:', err);
  }

  // Fallback to persisted session in storage
  const storedUser = (await authStorage.getItemAsync('campus-bordes_user')) || authStorage.getItem('campus-bordes_user');
  const storedToken = (await authStorage.getItemAsync('campus-bordes_session_token')) || authStorage.getItem('campus-bordes_session_token');
  if (storedUser && storedToken) {
    try {
      const user = JSON.parse(storedUser);
      return { user: user as StudentSession['user'] };
    } catch {}
  }
  return null;
};

export const loadStudentSession = loadSession;

export const signInStudent = async (email: string, password: string) => {
  const result = await authClient.signIn.email({ email, password });
  if (result.error) throw new Error(errorMessage(result.error));
  if (result.data?.user) {
    const payload = result.data as any;
    if (payload.token) {
      await authStorage.setItemAsync('campus-bordes_session_token', payload.token);
    } else if (payload.session?.token) {
      await authStorage.setItemAsync('campus-bordes_session_token', payload.session.token);
    }
    await authStorage.setItemAsync('campus-bordes_user', JSON.stringify(result.data.user));
    return { user: result.data.user as StudentSession['user'] };
  }
  const session = await loadSession();
  if (!session) throw new Error('Session indisponible apres la connexion.');
  return session;
};

export const signInWithGoogle = async () => {
  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL: 'campus-bordes://',
  });
  if (result?.error) throw new Error(errorMessage(result.error));
  return loadSession();
};

export const signUpStudent = async (
  email: string,
  password: string,
  name: string,
  extra?: {
    phone?: string;
    whatsappPhone?: string;
    university?: string;
    faculty?: string;
    level?: string;
  }
) => {
  const result = await authClient.signUp.email({
    email,
    password,
    name,
    ...extra,
    callbackURL: 'campus-bordes://',
  } as any);
  if (result.error) throw new Error(errorMessage(result.error));
  if (result.data?.user) {
    const payload = result.data as any;
    if (payload.token) {
      await authStorage.setItemAsync('campus-bordes_session_token', payload.token);
    } else if (payload.session?.token) {
      await authStorage.setItemAsync('campus-bordes_session_token', payload.session.token);
    }
    await authStorage.setItemAsync('campus-bordes_user', JSON.stringify(result.data.user));
    return { user: result.data.user as StudentSession['user'] };
  }
  const session = await loadSession();
  if (!session) throw new Error('Session indisponible apres la connexion.');
  return session;
};

export const requestStudentPasswordReset = async (email: string) => {
  const capabilities = await fetch(`${authBaseUrl}/api/mobile/auth-capabilities`).then((response) => response.json()) as {
    passwordReset?: boolean;
  };
  if (!capabilities.passwordReset) {
    throw new Error('La recuperation par email sera active apres la configuration Gmail.');
  }
  const result = await authClient.requestPasswordReset({
    email,
    redirectTo: `${authBaseUrl}/api/mobile/reset-password-redirect`,
  });
  if (result.error) throw new Error(errorMessage(result.error));
};

export const resetStudentPassword = async (token: string, newPassword: string) => {
  const result = await authClient.resetPassword({ token, newPassword });
  if (result.error) throw new Error(errorMessage(result.error));
};

export const changeStudentPassword = async (currentPassword: string, newPassword: string) => {
  const result = await authClient.changePassword({
    newPassword,
    currentPassword,
    revokeOtherSessions: false,
  });
  if (result.error) throw new Error(errorMessage(result.error));
};

export const getAuthCapabilities = async (): Promise<AuthCapabilities> =>
  (await fetch(`${authBaseUrl}/api/mobile/auth-capabilities`)).json() as Promise<AuthCapabilities>;

export const clearStudentSession = async () => {
  await authStorage.deleteItemAsync('campus-bordes_session_token');
  await authStorage.deleteItemAsync('campus-bordes_user');
  await authStorage.deleteItemAsync('campus-bordes_better-auth.session_token');
  const result = await authClient.signOut().catch(() => null);
  if (result?.error) throw new Error(errorMessage(result.error));
};

// Raw variant that never throws on a non-2xx response — callers that need to
// branch on the actual status code (e.g. 403 CREDITS_EXHAUSTED vs a generic
// failure) should use this instead of `authFetch`, which always throws.
export const authFetchRaw = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');

  let token = authStorage.getItem('campus-bordes_session_token');
  if (!token && Platform.OS !== 'web') {
    token = (await authStorage.getItemAsync('campus-bordes_session_token')) || (await authStorage.getItemAsync('campus-bordes_better-auth.session_token'));
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (Platform.OS !== 'web') {
    const cookie = authClient.getCookie();
    if (cookie) {
      headers.set('Cookie', cookie);
    } else if (token) {
      headers.set('Cookie', `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`);
    }
    headers.set('Expo-Origin', 'campus-bordes://');
  } else if (token) {
    headers.set('Cookie', `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`);
  }

  return fetch(`${authBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
};

export const authFetch = async (path: string, init: RequestInit = {}) => {
  const response = await authFetchRaw(path, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Erreur serveur (${response.status}).`);
  }
  return response;
};

export const getStudentAccount = async (): Promise<StudentAccount> =>
  (await authFetch('/api/mobile/account')).json() as Promise<StudentAccount>;

export const updateStudentProfile = async (input: StudentProfileUpdateInput): Promise<StudentProfile> =>
  (await authFetch('/api/mobile/account', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })).json() as Promise<StudentProfile>;

export const topUpStudentWallet = async (amountCoins: number, providerName: string, phoneNumber?: string) =>
  (await authFetch('/api/mobile/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amountCoins, providerName, phoneNumber }),
  })).json() as Promise<{ reference: string; status: string; mock?: boolean }>;

export const checkTopUpStatus = async (reference: string) =>
  (await authFetch(`/api/mobile/wallet/topup/${reference}`, {
    method: 'GET',
  })).json() as Promise<{ status: string; balanceCoins?: number }>;

export const purchaseSubscription = async (tier: 'basic' | 'premium') =>
  (await authFetch('/api/mobile/subscription/purchase', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  })).json() as Promise<{ ok: boolean; tier: string; expiresAt: string }>;

export const purchaseIaPack = async (packId: 'micro' | 'standard' | 'boost') =>
  (await authFetch('/api/mobile/ia-packs/purchase', {
    method: 'POST',
    body: JSON.stringify({ packId }),
  })).json() as Promise<{ ok: boolean; balanceCoins: number; iaCredits: number }>;

export const registerPushToken = async (
  pushToken: string,
  deviceName?: string,
  deviceType?: 'ios' | 'android' | 'web'
) =>
  (await authFetch('/api/mobile/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ pushToken, deviceName, deviceType }),
  })).json() as Promise<{ ok: boolean }>;
