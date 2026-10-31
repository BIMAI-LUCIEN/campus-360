import { authFetch } from '../auth/betterAuth';

// Packs (application credits) and Revision Passes, bought once from the wallet
// (contexte.md §19). The catalogue and prices come from the server.

export type OfferCode = 'STARTER' | 'RECHERCHE_ACTIVE' | 'PASS_24H' | 'PASS_7J';

export type Offer = {
  code: OfferCode;
  kind: 'pack' | 'pass';
  label: string;
  priceCoins: number;
  credits: number;
  passHours: number;
  description: string;
};

export type OffersState = {
  offers: Offer[];
  credits: number;
  creditsExpireAt: string | null;
  passUntil: string | null;
};

const readError = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  return payload?.error || payload?.message || fallback;
};

export class InsufficientBalanceError extends Error {}

export const fetchOffers = async (): Promise<OffersState> => {
  const response = await authFetch('/api/mobile/offers');
  if (!response.ok) throw new Error(await readError(response, 'Impossible de charger les offres.'));
  return (await response.json()) as OffersState;
};

const newPurchaseId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

/** Buys an offer; throws InsufficientBalanceError (409) so the caller can open the top-up. */
export const purchaseOffer = async (code: OfferCode): Promise<OffersState & { balance: number }> => {
  const response = await authFetch('/api/mobile/offers/purchase', {
    method: 'POST',
    body: JSON.stringify({ code, purchaseId: newPurchaseId() }),
  });
  if (response.status === 409) throw new InsufficientBalanceError(await readError(response, 'Solde insuffisant.'));
  if (!response.ok) throw new Error(await readError(response, "L'achat n'a pas abouti."));
  const payload = (await response.json()) as {
    balance: number;
    state: { credits: number; creditsExpireAt: string | null; passUntil: string | null };
  };
  const offers = (await fetchOffers().catch(() => null))?.offers ?? [];
  return { offers, balance: payload.balance, ...payload.state };
};

export const formatOfferDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};
