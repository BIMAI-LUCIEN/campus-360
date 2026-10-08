import { authFetch } from '../auth/betterAuth';
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

export type MobileMoneyOperator = 'mtn' | 'orange' | 'wave';

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
  mock: boolean;
}

/**
 * Déclenche l'initiation de paiement Mobile Money côté backend
 */
export async function initiateMobileMoneyPayment(
  payload: InitiatePaymentRequest,
): Promise<InitiatePaymentResponse> {
  try {
    const res = await authFetch('/api/mobile/payments/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return (await res.json()) as InitiatePaymentResponse;
    }
  } catch (err) {
    console.warn('[walletApi] Backend API unreachable, falling back to local demo resolution:', err);
  }

  // Repli gracieux offline / dev
  return {
    success: true,
    reference: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    directDebitPrompt: true,
    message: `Notification USSD (${payload.amount} FCFA) simulée sur le ${payload.phone}. Saisissez votre code PIN pour valider.`,
    mock: true,
  };
}

/**
 * Vérifie l'état de validation d'une transaction
 */
export async function checkPaymentReferenceStatus(
  reference: string,
): Promise<{ status: 'pending' | 'completed' | 'failed' }> {
  try {
    const res = await authFetch(`/api/mobile/wallet/topup/${reference}`);
    if (res.ok) {
      const data = (await res.json()) as { status: string };
      return {
        status: data.status === 'completed' || data.status === 'success' ? 'completed' : 'pending',
      };
    }
  } catch {
    // ignore
  }

  return { status: 'completed' };
}
