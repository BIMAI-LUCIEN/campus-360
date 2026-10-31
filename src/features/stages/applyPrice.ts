import type { StageJob } from '../../types';
import { isPaidOffer, stageApplyCredits, stageApplyPrice } from './stagePricing';

// The server sends the price with each offer; the local rules (same file as the
// server) are only used for an offer cached before the price existed.
export const jobApplyPrice = (job: StageJob): number =>
  typeof job.applyPriceCoins === 'number' ? job.applyPriceCoins : stageApplyPrice(job);

export const jobApplyCredits = (job: StageJob): number =>
  typeof job.applyCredits === 'number' ? job.applyCredits : stageApplyCredits(job);

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
  const credits = jobApplyCredits(job);
  return `Candidature : ${formatFcfa(price)} ou ${credits} crédit${credits > 1 ? 's' : ''} (${jobIsPaid(job) ? 'offre rémunérée' : 'offre non rémunérée'})`;
};
