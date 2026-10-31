// Price list of the v2 economic model (contexte.md §19), 1 coin = 1 FCFA.
// Application prices and credit costs live in stage-pricing.ts (the app keeps an
// identical copy of that file). No imports: tests load this file on its own.

export const CREDIT_VALIDITY_DAYS = 30;
export const DAY_MS = 24 * 60 * 60 * 1000;

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

export const OFFERS: readonly Offer[] = [
  {
    code: 'STARTER',
    kind: 'pack',
    label: 'Starter',
    priceCoins: 1000,
    credits: 5,
    passHours: 0,
    description: '5 crédits de candidature, valables 30 jours.',
  },
  {
    code: 'RECHERCHE_ACTIVE',
    kind: 'pack',
    label: 'Recherche active',
    priceCoins: 2000,
    credits: 12,
    passHours: 24,
    description: '12 crédits de candidature + 1 jour de Pass Révision, valables 30 jours.',
  },
  {
    code: 'PASS_24H',
    kind: 'pass',
    label: 'Pass Révision 24 h',
    priceCoins: 200,
    credits: 0,
    passHours: 24,
    description: 'IA illimitée sur tous les PDF pendant 24 h.',
  },
  {
    code: 'PASS_7J',
    kind: 'pass',
    label: 'Pass Révision 7 jours',
    priceCoins: 1000,
    credits: 0,
    passHours: 7 * 24,
    description: 'IA illimitée sur tous les PDF pendant 7 jours.',
  },
];

export const findOffer = (code: string): Offer | undefined => OFFERS.find((offer) => offer.code === code);

// Writing workshop: the plan is free, then the full document is paid.
export const REPORT_PRICE = 2000;
export const THESIS_FLAT_PRICE = 4000;
export const THESIS_CHAPTER_PRICE = 1000;
// CV tailored to an offer found outside the app (inside the app it comes with the application).
export const EXTERNAL_CV_PRICE = 300;

// AI on PDFs: reading is free; 3 free actions a day, a conversation counts
// 1 action every 5 questions. An active Revision Pass lifts the limit.
export const FREE_AI_ACTIONS_PER_DAY = 3;
export const QUESTIONS_PER_ACTION = 5;

// Free coins.
export const LAUNCH_SIGNUP_BONUS = 1000;
export const SIGNUP_BONUS = 300;
export const CONTRIBUTION_REWARD = 50;
