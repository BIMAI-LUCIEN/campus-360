import { databasePool } from './database';
import { MobileApiError } from './mobile-access';
import { findOffer, OFFERS } from './pricing';
import { OfferFundsError, offerStateOn, purchaseOfferOn, type OfferState } from './offers-core';

export const offerReference = (purchaseId: string) => `offer:${purchaseId}`;

export const listOffers = () => OFFERS;

export const getOfferState = async (userId: string): Promise<OfferState> => {
  const client = await databasePool.connect();
  try {
    return await offerStateOn(client, userId);
  } finally {
    client.release();
  }
};

/** Buys a pack or a pass from the wallet; the same purchaseId is only bought once. */
export const purchaseOffer = async (userId: string, code: string, purchaseId: string) => {
  const offer = findOffer(code);
  if (!offer) throw new MobileApiError('Offre inconnue.', 404);
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const result = await purchaseOfferOn(client, userId, offer, offerReference(purchaseId));
    await client.query('commit');
    return { ...result, offer, state: await offerStateOn(client, userId) };
  } catch (error) {
    await client.query('rollback');
    if (error instanceof OfferFundsError) throw new MobileApiError(error.message, 409);
    throw error;
  } finally {
    client.release();
  }
};
