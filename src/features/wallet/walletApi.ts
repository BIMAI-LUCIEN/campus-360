import { authFetch, authFetchRaw } from '../auth/betterAuth';
import { mapServerPaymentStatus, type PaymentStatus } from './paymentStatus';
import {
  PRICE_STAGE_APPLY,
  PRICE_REPORT,
  PRICE_THESIS,
  PRICE_PDF,
  MIN_WALLET_RECHARGE,
} from '../../types';

export { PRICE_STAGE_APPLY, PRICE_REPORT, PRICE_THESIS, PRICE_PDF, MIN_WALLET_RECHARGE };

export type WalletRechargePackId = 'recharge_500' | 'recharge_1000' | 'recharge_2000' | 'recharge_5000';

export type PaymentPack = {
  id: WalletRechargePackId;
  title: string;
  badge: string;
  priceFcfa: number;
  tokensReward: number; // Montant crédité en FCFA
  description: string;
  highlight?: boolean;
};

export const PAYMENT_PACKS: PaymentPack[] = [
  {
    id: 'recharge_500',
    title: 'Recharge 500 FCFA',
    badge: '1 Candidature ou 2 PDF',
    priceFcfa: 500,
    tokensReward: 500,
    description: 'Postulez à 1 offre en 1 clic RH avec CV officiel, ou téléchargez 2 documents.',
  },
  {
    id: 'recharge_1000',
    title: 'Recharge 1 000 FCFA',
    badge: '2 Candidatures RH',
    priceFcfa: 1000,
    tokensReward: 1000,
    description: 'Crédit flexible pour postuler à vos stages cibles et débloquer des documents.',
  },
  {
    id: 'recharge_2000',
    title: 'Recharge 2 000 FCFA',
    badge: 'Rapport de stage IA',
    priceFcfa: 2000,
    tokensReward: 2000,
    description: 'Idéal pour générer 1 rapport de stage complet (25-45 pages) ou 4 candidatures RH.',
    highlight: true,
  },
  {
    id: 'recharge_5000',
    title: 'Recharge 5 000 FCFA',
    badge: 'Mémoire IA Complet',
    priceFcfa: 5000,
    tokensReward: 5000,
    description: 'Génération intégrale d’un mémoire académique (50-100 pages) ou pack candidatures.',
  },
];

export type MobileMoneyOperator = 'mtn' | 'orange';

export interface InitiatePaymentRequest {
  packType: WalletRechargePackId | string;
  amount: number;
  operator: MobileMoneyOperator;
  phone: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  reference: string;
  paymentUrl?: string;
  directDebitPrompt: boolean;
  message: string;
  /** Session created with a SasPay test key: only then may the sandbox simulation be offered. */
  testMode?: boolean;
}

/**
 * Starts a Mobile Money payment on the server. Any failure is an error: there is
 * no local fallback and no fake success.
 */
export async function initiateMobileMoneyPayment(
  payload: InitiatePaymentRequest,
): Promise<InitiatePaymentResponse> {
  let res: Response;
  try {
    res = await authFetchRaw('/api/mobile/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Paiement impossible pour le moment. Vérifie ta connexion et réessaie.');
  }
  const data = (await res.json().catch(() => ({}))) as Partial<InitiatePaymentResponse> & { error?: string };
  if (!res.ok || !data.reference) {
    throw new Error(data.error || 'Paiement impossible pour le moment. Réessaie.');
  }
  return data as InitiatePaymentResponse;
}

/**
 * Status of a payment as stored by the server. Network trouble or a 5xx keeps it
 * "pending"; an unknown reference is an error. Never "success" by default.
 */
export async function pollPaymentStatus(reference: string): Promise<{ status: PaymentStatus; balanceCoins?: number; failureMessage?: string }> {
  let res: Response;
  try {
    res = await authFetchRaw(`/api/mobile/wallet/topup/${encodeURIComponent(reference)}`);
  } catch {
    return { status: 'pending' };
  }
  if (res.status === 404) throw new Error('Paiement introuvable.');
  if (!res.ok) return { status: 'pending' };
  const data = (await res.json().catch(() => ({}))) as { status?: unknown; balanceCoins?: number; failureMessage?: string };
  return { status: mapServerPaymentStatus(data.status), balanceCoins: data.balanceCoins, failureMessage: data.failureMessage };
}
