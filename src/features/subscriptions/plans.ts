export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'elite';
export type PaidSubscriptionTier = Exclude<SubscriptionTier, 'free'>;

export const SUBSCRIPTION_PLANS = [
  { key: 'free' as const, name: 'Gratuit', price: 0, summary: 'Rédige et prévisualise avec un filigrane.', benefits: ['Aperçu filigrané', 'Catalogue à la carte', 'Aucun export'] },
  { key: 'basic' as const, name: 'Basique', price: 2_000, summary: 'Les essentiels pour candidater et rédiger.', benefits: ['5 candidatures IA', '3 rédactions ou corrections', 'PDF avec filigrane'] },
  { key: 'pro' as const, name: 'Pro', price: 3_500, summary: 'Des volumes renforcés et des PDF propres.', benefits: ['10 candidatures IA', '5 rédactions ou corrections', 'PDF sans filigrane'] },
  { key: 'elite' as const, name: 'Elite', price: 5_000, summary: 'Le niveau complet avec Word modifiable.', benefits: ['20 candidatures IA', '10 rédactions ou corrections', 'PDF et Word sans filigrane'] },
] as const;

export const getSubscriptionPlan = (tier: SubscriptionTier) =>
  SUBSCRIPTION_PLANS.find((plan) => plan.key === tier) ?? SUBSCRIPTION_PLANS[0];

export const hasActiveSubscription = (tier: SubscriptionTier) => tier !== 'free';
export const canExportDocx = (tier: SubscriptionTier) => tier === 'elite';
export const previewRequiresWatermark = (tier: SubscriptionTier) => tier === 'free' || tier === 'basic';
