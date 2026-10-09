import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authFetchRaw } from '../auth/betterAuth';

export interface PairingCodeResponse {
  success: boolean;
  pairingCode: string;
  instanceName?: string;
  state?: string;
  connected?: boolean;
  offline?: boolean;
  error?: string;
}

export interface ConnectionStatusResponse {
  success: boolean;
  connected: boolean;
  state: 'open' | 'close' | 'connecting';
  instanceName?: string;
  offline?: boolean;
  error?: string;
}

export interface StoredWhatsAppStatus {
  phone: string;
  connected: boolean;
  instanceName?: string;
  linkedAt?: string | null;
}

const STORAGE_KEY = 'campus360_whatsapp_status';

/**
 * Normalizes phone numbers to standard format (e.g. 237690123456).
 */
export function cleanPhoneNumber(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  // Cameroon mobile number without country code (9 digits starting with 6)
  if (digits.length === 9 && digits.startsWith('6')) {
    return `237${digits}`;
  }
  return digits;
}

/**
 * Formats 8-digit pairing code with a clean separator (e.g. "7842 - 9012").
 */
export function formatPairingCode(code: string): string {
  const clean = (code || '').replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} - ${clean.slice(4)}`;
  }
  return code;
}

/**
 * Generates a deterministic 8-digit pairing code for testing or offline dev resilience.
 */
export function generateDeterministicPairingCode(phone: string): string {
  const digits = cleanPhoneNumber(phone);
  let hash = 0;
  for (let i = 0; i < digits.length; i++) {
    hash = (hash * 31 + digits.charCodeAt(i)) >>> 0;
  }
  const codeNum = (hash % 90000000) + 10000000;
  return String(codeNum);
}

/**
 * Cross-platform clipboard helper (web navigator.clipboard & native RN Clipboard).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      }
    }

    // React Native Native Clipboard
    const RN = require('react-native');
    if (RN.Clipboard && typeof RN.Clipboard.setString === 'function') {
      RN.Clipboard.setString(text);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[whatsappService] Error copying text to clipboard:', err);
    return false;
  }
}

/**
 * Reads persisted WhatsApp status from SecureStore (native) or localStorage (web).
 */
export async function getStoredWhatsAppStatus(): Promise<StoredWhatsAppStatus> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        phone: parsed.phone || '',
        connected: Boolean(parsed.connected),
        instanceName: parsed.instanceName || undefined,
        linkedAt: parsed.linkedAt || null,
      };
    }
  } catch (err) {
    console.warn('[whatsappService] Error reading stored WhatsApp status:', err);
  }

  return {
    phone: '',
    connected: false,
    instanceName: undefined,
    linkedAt: null,
  };
}

/**
 * Persists WhatsApp pairing status in SecureStore or localStorage.
 */
export async function saveWhatsAppStatus(
  phone: string,
  connected: boolean,
  extra?: { instanceName?: string; linkedAt?: string | null }
): Promise<void> {
  try {
    const existing = await getStoredWhatsAppStatus();
    const payload: StoredWhatsAppStatus = {
      phone: phone || existing.phone,
      connected,
      instanceName: extra?.instanceName || existing.instanceName,
      linkedAt: connected
        ? (extra?.linkedAt || existing.linkedAt || new Date().toISOString())
        : null,
    };

    const value = JSON.stringify(payload);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
      }
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, value).catch(() => {});
    }
  } catch (err) {
    console.warn('[whatsappService] Error saving WhatsApp status:', err);
  }
}

/**
 * Disconnects WhatsApp and clears stored credentials.
 */
export async function clearWhatsAppStatus(phone?: string): Promise<void> {
  try {
    const cleanPhone = cleanPhoneNumber(phone || '');
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
    }

    // Call server to terminate instance on Evolution API and Supabase
    await authFetchRaw(`/api/mobile/whatsapp/instance${cleanPhone ? `?phone=${encodeURIComponent(cleanPhone)}` : ''}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (err) {
    console.warn('[whatsappService] Error clearing WhatsApp status:', err);
  }
}

/**
 * Requests an 8-digit pairing code from Evolution API backend proxy (with N8N fallback).
 */
export async function requestPairingCode(
  phone: string,
  options?: { forceNew?: boolean },
): Promise<PairingCodeResponse> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 8) {
    return {
      success: false,
      pairingCode: '',
      error: 'Veuillez saisir un numéro de téléphone valide (ex: +237 690 12 34 56).',
    };
  }

  // 1. Primary route: backend mobile-api proxy
  try {
    const res = await authFetchRaw('/api/mobile/whatsapp/instance', {
      method: 'POST',
      body: JSON.stringify({
        phone: cleanPhone,
        action: options?.forceNew ? 'reconnect' : 'connect',
        force: options?.forceNew,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data) {
      if (data.state === 'open' || data.connected) {
        await saveWhatsAppStatus(cleanPhone, true, { instanceName: data.instanceName });
        return {
          success: true,
          pairingCode: '',
          instanceName: data.instanceName,
          state: 'open',
        };
      }

      if (data.pairingCode && !data.offline) {
        await saveWhatsAppStatus(cleanPhone, false, { instanceName: data.instanceName });
        return {
          success: true,
          pairingCode: String(data.pairingCode),
          instanceName: data.instanceName,
          state: data.state || 'connecting',
        };
      }
    }

    if (data?.error) {
      return {
        success: false,
        pairingCode: '',
        error: data.error,
      };
    }
  } catch (networkErr) {
    console.warn('[whatsappService] Backend proxy error, trying direct N8N session fallback:', networkErr);
  }

  // 2. High-resilience fallback: N8N Session Webhook directly to Evolution API
  try {
    const n8nRes = await fetch('https://n8n.blackcompany.site/webhook/campus360-whatsapp-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, action: 'pair' }),
    });

    const n8nData = await n8nRes.json().catch(() => null);
    if (n8nRes.ok && n8nData?.pairingCode) {
      await saveWhatsAppStatus(cleanPhone, false, { instanceName: n8nData.instanceName });
      return {
        success: true,
        pairingCode: String(n8nData.pairingCode),
        instanceName: n8nData.instanceName,
        state: n8nData.state || 'connecting',
      };
    }
  } catch (n8nErr) {
    console.warn('[whatsappService] N8N session fallback error:', n8nErr);
  }

  return {
    success: false,
    pairingCode: '',
    error: 'Impossible d’obtenir le code de jumelage WhatsApp en direct. Veuillez vérifier votre connexion ou réessayer.',
  };
}

/**
 * Checks connection state of WhatsApp instance (open, close, connecting).
 */
export async function checkConnectionStatus(phone: string): Promise<ConnectionStatusResponse> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) {
    return {
      success: false,
      connected: false,
      state: 'close',
      error: 'Numéro de téléphone requis.',
    };
  }

  try {
    const res = await authFetchRaw(`/api/mobile/whatsapp/instance?phone=${encodeURIComponent(cleanPhone)}`, {
      method: 'GET',
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      const isConnected = Boolean(data.connected || data.isConnected || data.state === 'open');
      if (isConnected) {
        await saveWhatsAppStatus(cleanPhone, true, { instanceName: data.instanceName });
      }
      return {
        success: true,
        connected: isConnected,
        state: (data.state as 'open' | 'close' | 'connecting') || (isConnected ? 'open' : 'connecting'),
        instanceName: data.instanceName,
        offline: Boolean(data.offline),
      };
    }
  } catch (networkErr) {
    console.warn('[whatsappService] Network error during checkConnectionStatus:', networkErr);
  }

  // Check stored status as fallback
  const stored = await getStoredWhatsAppStatus();
  if (stored.phone === cleanPhone && stored.connected) {
    return {
      success: true,
      connected: true,
      state: 'open',
      instanceName: stored.instanceName,
      offline: true,
    };
  }

  return {
    success: true,
    connected: false,
    state: 'close',
  };
}
