// Price of an application sent from the app (pay-per-action, 1 coin = 1 FCFA).
// A paid offer (job, or internship with a stated pay) costs more than an unpaid one.
// "Not stated" counts as unpaid: nothing is assumed about the pay.
// No imports: the mobile app keeps an identical copy of these rules in
// src/features/stages/stagePricing.ts (a test compares the two).

export const STAGE_APPLY_PRICE_PAID = 1000;
export const STAGE_APPLY_PRICE_UNPAID = 500;

// Placeholder once written by the n8n ingest route instead of a real value.
const PLACEHOLDER_STIPENDS = new Set(['indemnité de stage', 'indemnite de stage']);

// \b ignores accented letters ("rémunéré" would end on a non-word "é"), hence the
// explicit letter lookarounds.
const UNPAID_PATTERN =
  /(?<![a-zà-ÿ])(non[\s-]?r[ée]mun[ée]r[ée]e?|non[\s-]?pay[ée]e?|b[ée]n[ée]vol\w*|gratuit\w*|sans\s+(r[ée]mun[ée]ration|indemnit[ée]|gratification|salaire)|aucune?\s+(r[ée]mun[ée]ration|indemnit[ée]|gratification)|non\s+pr[ée]cis[ée]e?|[àa]\s+d[ée]finir|unpaid|volunteer)(?![a-zà-ÿ])/i;

export type StagePricingInput = { kind?: string | null; stipend?: string | null };

export const isPaidOffer = (job: StagePricingInput): boolean => {
  if (job.kind === 'emploi') return true;
  const stipend = (job.stipend ?? '').trim();
  if (!stipend || PLACEHOLDER_STIPENDS.has(stipend.toLowerCase())) return false;
  if (UNPAID_PATTERN.test(stipend)) return false;
  if (/^0+([.,]0+)?\s*(f|fcfa|xaf)?$/i.test(stipend)) return false;
  return true;
};

export const stageApplyPrice = (job: StagePricingInput, freeLaunch = false): number => {
  if (freeLaunch) return 0;
  return isPaidOffer(job) ? STAGE_APPLY_PRICE_PAID : STAGE_APPLY_PRICE_UNPAID;
};
