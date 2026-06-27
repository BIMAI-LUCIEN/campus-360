import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
};

export type StudentProfileUpdateInput = {
  name: string;
  phone: string;
  whatsappPhone: string;
  university: string;
  faculty: string;
  level?: string;
};

export type StudentAccount = {
  user: StudentProfile;
  wallet: { balanceCoins: number; iaCredits: number };
  subscription: { tier: 'free' | 'basic' | 'premium'; expiresAt: string | null };
  purchasedDocumentIds: string[];
  purchasedPackIds: string[];
  transactions: Array<{
    id: string;
    amount_coins: number;
    type: 'topup' | 'purchase' | 'withdrawal' | 'commission';
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

const getAuthBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const base = new URL(publicEnv.authWebUrl || publicEnv.authUrl);
      const current = window.location;
      // Only rewrite the host when the configured base is a loopback address.
      // Otherwise the URL might legitimately be production (e.g. campus-360.fr)
      // and we must NOT swap its host.
      if ((base.hostname === 'localhost' || base.hostname === '127.0.0.1') &&
          current.hostname !== 'localhost' && current.hostname !== '127.0.0.1') {
        base.hostname = current.hostname;
        base.protocol = current.protocol;
        if (current.port) base.port = current.port;
      }
      return base.toString().replace(/\/$/, '');
    } catch {
      // Fall through to the static env value.
    }
  }
  return (Platform.OS === 'web' ? publicEnv.authWebUrl : publicEnv.authUrl).replace(/\/$/, '');
};

export const authBaseUrl = getAuthBaseUrl();

const authStorage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    SecureStore.setItem(key, value);
  },
};

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    ...(Platform.OS === 'web'
      ? []
      : [
          expoClient({
            scheme: 'campus-360',
            storagePrefix: 'campus-360',
            storage: authStorage,
          }),
        ]),
  ],
});

const errorMessage = (error: { message?: string; code?: string } | null | undefined) =>
  error?.message || error?.code || 'Connexion impossible.';

const loadSession = async (): Promise<StudentSession | null> => {
  const result = await authClient.getSession();
  if (result.error || !result.data?.user) return null;
  return { user: result.data.user as StudentSession['user'] };
};

export const loadStudentSession = loadSession;

export const signInStudent = async (email: string, password: string) => {
  const result = await authClient.signIn.email({ email, password });
  if (result.error) throw new Error(errorMessage(result.error));
  const session = await loadSession();
  if (!session) throw new Error('Session indisponible apres la connexion.');
  return session;
};

export const signInWithGoogle = async () => {
  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL: 'campus-360://',
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
    callbackURL: 'campus-360://',
  } as any);
  if (result.error) throw new Error(errorMessage(result.error));
  return loadSession();
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

export const getAuthCapabilities = async (): Promise<AuthCapabilities> =>
  (await fetch(`${authBaseUrl}/api/mobile/auth-capabilities`)).json() as Promise<AuthCapabilities>;

export const clearStudentSession = async () => {
  const result = await authClient.signOut();
  if (result.error) throw new Error(errorMessage(result.error));
};

export const authFetch = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
  if (Platform.OS !== 'web') {
    const cookie = authClient.getCookie();
    if (cookie) headers.set('Cookie', cookie);
    headers.set('Expo-Origin', 'campus-360://');
  }

  const response = await fetch(`${authBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
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
