import { isFreeLaunch } from '../../config/launch';
import type { StageJob } from '../../types';
import { isPaidOffer, stageApplyPrice } from './stagePricing';

// The server sends the price with each offer; the local rules (same file as the
// server) are only used for an offer cached before the price existed.
export const jobApplyPrice = (job: StageJob): number =>
  typeof job.applyPriceCoins === 'number' ? job.applyPriceCoins : stageApplyPrice(job, isFreeLaunch());

export const jobIsPaid = (job: StageJob): boolean =>
  typeof job.isPaid === 'boolean' ? job.isPaid : isPaidOffer(job);

export const formatFcfa = (amount: number): string =>
  `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

export const applyPriceLabel = (job: StageJob): string => {
  const price = jobApplyPrice(job);
  return price === 0 ? 'Gratuit' : formatFcfa(price);
};

// One line shown on the offer card and on the detail screen.
export const applyPriceLine = (job: StageJob, linkApply: boolean): string => {
  if (linkApply) return "Candidature sur le site de l'offre : gratuite";
  const price = jobApplyPrice(job);
  if (price === 0) return 'Candidature : gratuite';
  return `Candidature : ${formatFcfa(price)} (${jobIsPaid(job) ? 'offre rémunérée' : 'offre non rémunérée'})`;
};
