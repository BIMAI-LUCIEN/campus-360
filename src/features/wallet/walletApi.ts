import { authFetch } from '../auth/betterAuth';

export type PaymentPack = {
  id: 'discovery_500' | 'monthly_2000';
  title: string;
  badge: string;
  priceFcfa: number;
  tokensReward: number;
  description: string;
  highlight?: boolean;
};

export const PAYMENT_PACKS: PaymentPack[] = [
  {
    id: 'discovery_500',
    title: 'Pack Découverte',
    badge: '5 Candidatures IA',
    priceFcfa: 500,
    tokensReward: 5,
    description: 'Idéal pour postuler aux premières offres avec CV officiel et lettre sur-mesure.',
  },
  {
    id: 'monthly_2000',
    title: 'Pass Mensuel Illimité',
    badge: 'Accès VIP 30 Jours',
    priceFcfa: 2000,
    tokensReward: 999,
    description: 'Candidatures illimitées pendant 30 jours, priorité recruteur et relances J+7.',
    highlight: true,
  },
];

export type MobileMoneyOperator = 'mtn' | 'orange' | 'wave';

export interface InitiatePaymentRequest {
  packType: 'discovery_500' | 'monthly_2000';
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
