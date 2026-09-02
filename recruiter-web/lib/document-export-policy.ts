import { getActiveSubscription } from './subscriptions';

export type EffectiveSubscriptionTier = 'free' | 'basic' | 'pro' | 'elite';

export type DocumentExportPolicy = {
  effectiveTier: EffectiveSubscriptionTier;
  canExportPdf: boolean;
  pdfRequiresWatermark: boolean;
  canExportDocx: boolean;
};

export const resolveDocumentExportPolicy = (
  effectiveTier: EffectiveSubscriptionTier,
): DocumentExportPolicy => ({
  effectiveTier,
  canExportPdf: effectiveTier !== 'free',
  pdfRequiresWatermark: effectiveTier === 'basic',
  canExportDocx: effectiveTier === 'elite',
});

export const getDocumentExportPolicy = async (userId: string): Promise<DocumentExportPolicy> => {
  const subscription = await getActiveSubscription(userId);
  const effectiveTier: EffectiveSubscriptionTier =
    subscription && subscription.status !== 'payment_failed' ? subscription.tier : 'free';

  return resolveDocumentExportPolicy(effectiveTier);
};
