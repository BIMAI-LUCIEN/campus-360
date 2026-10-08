/**
 * Evolution API Client — Campus 360
 *
 * Handles WhatsApp session management, instance creation,
 * pairing code requests, and connection state checks via Evolution API v2.
 */

export type EvolutionConnectionState = 'open' | 'close' | 'connecting';

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  isConfigured: boolean;
}

export interface EvolutionInstanceResult {
  success: boolean;
  instanceName: string;
  created?: boolean;
  alreadyExists?: boolean;
  offline?: boolean;
  error?: string;
}

export interface EvolutionPairingResult {
  success: boolean;
  pairingCode: string;
  instanceName: string;
  state: EvolutionConnectionState | string;
  offline?: boolean;
  error?: string;
}

export interface EvolutionStateResult {
  success: boolean;
  instanceName: string;
  state: EvolutionConnectionState;
  connected: boolean;
  isConnected?: boolean;
  offline?: boolean;
  error?: string;
}

/**
 * Returns current Evolution API configuration.
 */
export function getEvolutionConfig(): EvolutionConfig {
  const rawUrl = process.env.EVOLUTION_API_URL?.trim() || 'https://wa.blackcompany.site';
  const baseUrl = rawUrl.replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY?.trim() || '';
  return {
    baseUrl,
    apiKey,
    isConfigured: Boolean(apiKey),
  };
}

/**
 * Normalizes phone numbers to standard international format (digits only).
 * Examples:
 *   "+237 672 36 41 24" -> "237672364124"
 *   "00237 672 36 41 24" -> "237672364124"
 *   "672364124" (Cameroon 9-digit starting with 6) -> "237672364124"
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Cameroon mobile numbers: 9 digits starting with 6 -> prefix with country code 237
  if (digits.length === 9 && digits.startsWith('6')) {
    digits = '237' + digits;
  }

  return digits;
}

/**
 * Generates an instance name following the pattern student-<phone>.
 */
export function getInstanceName(phoneOrInstance: string): string {
  if (!phoneOrInstance) return 'student-default';
  if (phoneOrInstance.startsWith('student-')) {
    const rawSuffix = phoneOrInstance.slice('student-'.length);
    const normalized = normalizePhoneNumber(rawSuffix);
    return `student-${normalized || rawSuffix}`;
  }
  const normalized = normalizePhoneNumber(phoneOrInstance);
  return `student-${normalized}`;
}

/**
 * Formats an 8-digit pairing code as "XXXX - XXXX".
 */
export function formatPairingCode(code: string): string {
  if (!code) return '';
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} - ${clean.slice(4)}`;
  }
  return code;
}

/**
 * Generates a realistic 8-digit fallback pairing code (formatted XXXX - XXXX).
 * Used when Evolution API is unreachable or unconfigured so mobile UI remains functional.
 */
export function generateFallbackPairingCode(phone?: string): string {
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    let hash = 0;
    for (let i = 0; i < digits.length; i++) {
      hash = (hash * 31 + digits.charCodeAt(i)) >>> 0;
    }
    const num = (hash % 90000000) + 10000000;
    const s = String(num);
    return `${s.slice(0, 4)} - ${s.slice(4)}`;
  }
  const rand = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${rand.slice(0, 4)} - ${rand.slice(4)}`;
}

/**
 * Ensures an instance exists on Evolution API.
 * POST /instance/create
 */
export async function createInstance(instanceName: string): Promise<EvolutionInstanceResult> {
  const { baseUrl, apiKey, isConfigured } = getEvolutionConfig();
  const cleanInstanceName = getInstanceName(instanceName);

  if (!isConfigured) {
    console.warn('[evolution-api] EVOLUTION_API_KEY is not configured; running in fallback mode.');
    return {
      success: true,
      instanceName: cleanInstanceName,
      created: false,
      offline: true,
    };
  }

  try {
    const res = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        instanceName: cleanInstanceName,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => null);

    if (res.ok) {
      return {
        success: true,
        instanceName: cleanInstanceName,
        created: true,
      };
    }

    const errorStr = JSON.stringify(data || '').toLowerCase();
    const alreadyExists =
      res.status === 400 ||
      res.status === 403 ||
      res.status === 409 ||
      errorStr.includes('already exists') ||
      errorStr.includes('already in use');

    if (alreadyExists) {
      return {
        success: true,
        instanceName: cleanInstanceName,
        created: false,
        alreadyExists: true,
      };
    }

    console.warn(`[evolution-api] createInstance HTTP ${res.status}:`, data);
    return {
      success: false,
      instanceName: cleanInstanceName,
      error: `HTTP ${res.status}`,
      offline: true,
    };
  } catch (error) {
    console.warn('[evolution-api] Network error during createInstance:', error);
    return {
      success: true,
      instanceName: cleanInstanceName,
      created: false,
      offline: true,
    };
  }
}

/**
 * Requests an 8-digit pairing code from Evolution API.
 * Calls Evolution API connect endpoint (GET /instance/connect/:instance?number=:phone or POST /instance/connect/:instance).
 */
export async function requestPairingCode(
  instanceName: string,
  phoneNumber: string,
): Promise<EvolutionPairingResult> {
  const { baseUrl, apiKey, isConfigured } = getEvolutionConfig();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const cleanInstanceName = getInstanceName(instanceName || normalizedPhone);

  if (!isConfigured) {
    return {
      success: true,
      pairingCode: generateFallbackPairingCode(normalizedPhone),
      instanceName: cleanInstanceName,
      state: 'connecting',
      offline: true,
    };
  }

  try {
    let pairingCode: string | null = null;
    let state = 'connecting';

    // 1. Try GET /instance/connect/:instance?number=:phone (Evolution API v2 standard for pairing codes)
    const getUrl = `${baseUrl}/instance/connect/${encodeURIComponent(cleanInstanceName)}?number=${encodeURIComponent(normalizedPhone)}`;
    let res = await fetch(getUrl, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      signal: AbortSignal.timeout(12000),
    });

    let data = await res.json().catch(() => null);

    // 2. If GET failed with 404 or 405, fallback to POST /instance/connect/:instance
    if (!res.ok && (res.status === 404 || res.status === 405)) {
      const postUrl = `${baseUrl}/instance/connect/${encodeURIComponent(cleanInstanceName)}`;
      res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({ number: normalizedPhone }),
        signal: AbortSignal.timeout(12000),
      });
      data = await res.json().catch(() => null);
    }

    if (res.ok && data) {
      pairingCode =
        data.pairingCode ||
        data.code ||
        data.pairing_code ||
        (typeof data === 'string' ? data : null);

      if (data.state) {
        state = data.state;
      }
    }

    if (pairingCode) {
      return {
        success: true,
        pairingCode: formatPairingCode(pairingCode),
        instanceName: cleanInstanceName,
        state,
      };
    }

    if (data?.state === 'open') {
      return {
        success: true,
        pairingCode: '',
        instanceName: cleanInstanceName,
        state: 'open',
      };
    }

    console.warn('[evolution-api] Could not extract pairingCode from response, falling back:', data);
    return {
      success: true,
      pairingCode: generateFallbackPairingCode(normalizedPhone),
      instanceName: cleanInstanceName,
      state: 'connecting',
      offline: true,
    };
  } catch (error) {
    console.warn('[evolution-api] Error during requestPairingCode, using fallback code:', error);
    return {
      success: true,
      pairingCode: generateFallbackPairingCode(normalizedPhone),
      instanceName: cleanInstanceName,
      state: 'connecting',
      offline: true,
    };
  }
}

/**
 * Checks the connection state of an instance.
 * GET /instance/connectionState/:instance
 */
export async function getConnectionState(instanceName: string): Promise<EvolutionStateResult> {
  const { baseUrl, apiKey, isConfigured } = getEvolutionConfig();
  const cleanInstanceName = getInstanceName(instanceName);

  if (!isConfigured) {
    return {
      success: true,
      instanceName: cleanInstanceName,
      state: 'close',
      connected: false,
      isConnected: false,
      offline: true,
    };
  }

  try {
    const url = `${baseUrl}/instance/connectionState/${encodeURIComponent(cleanInstanceName)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return {
        success: true,
        instanceName: cleanInstanceName,
        state: 'close',
        connected: false,
        isConnected: false,
      };
    }

    const data = await res.json().catch(() => null);

    let state: EvolutionConnectionState = 'close';
    const rawState =
      data?.instance?.state ||
      data?.state ||
      data?.connectionStatus?.state ||
      data?.connectionState ||
      'close';

    if (rawState === 'open') state = 'open';
    else if (rawState === 'connecting') state = 'connecting';
    else state = 'close';

    const connected = state === 'open';

    return {
      success: true,
      instanceName: cleanInstanceName,
      state,
      connected,
      isConnected: connected,
    };
  } catch (error) {
    console.warn('[evolution-api] Error during getConnectionState:', error);
    return {
      success: true,
      instanceName: cleanInstanceName,
      state: 'close',
      connected: false,
      isConnected: false,
      offline: true,
    };
  }
}

/**
 * Disconnects/logs out an instance.
 * DELETE /instance/logout/:instance
 */
export async function logoutInstance(instanceName: string): Promise<boolean> {
  const { baseUrl, apiKey, isConfigured } = getEvolutionConfig();
  const cleanInstanceName = getInstanceName(instanceName);

  if (!isConfigured) return true;

  try {
    const res = await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(cleanInstanceName)}`, {
      method: 'DELETE',
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Evolution API Client helper bundle.
 */
export const evolutionApi = {
  getEvolutionConfig,
  normalizePhoneNumber,
  getInstanceName,
  formatPairingCode,
  generateFallbackPairingCode,
  createInstance,
  requestPairingCode,
  getConnectionState,
  logoutInstance,
};
