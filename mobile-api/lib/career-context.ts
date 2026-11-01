// What the CV and letter conversation knows before the first question: the
// background saved on the account (or just imported from an old CV) and the
// offer the student aims at. Both are the student's own material: the models
// may use them, never add to them.

import { z } from 'zod';

import { cvBackgroundSchema, cvBackgroundToText, type CvBackground } from './cv-background';

const field = (max: number) => z.string().trim().max(max).default('');

/** Offer as the app sends it back (read earlier by /documents/offer-read). */
export const careerOfferSchema = z.object({
  kind: z.enum(['stage', 'emploi']).default('stage'),
  title: field(200),
  company: field(200),
  location: field(120),
  duration: field(80),
  description: field(6000),
  requirements: z.array(z.string().trim().max(200)).max(20).default([]),
  deadline: field(80),
});

export type CareerOffer = z.infer<typeof careerOfferSchema>;

export const careerContextSchema = z.object({
  offer: careerOfferSchema.nullish(),
  background: cvBackgroundSchema.nullish(),
});

export const careerOfferToText = (offer: CareerOffer | null | undefined): string => {
  if (!offer || !offer.title) return '';
  return [
    `Poste : ${offer.title} (${offer.kind === 'emploi' ? 'emploi' : 'stage'})`,
    offer.company ? `Entreprise : ${offer.company}` : '',
    offer.location ? `Lieu : ${offer.location}` : '',
    offer.duration ? `Durée : ${offer.duration}` : '',
    offer.description ? `Description :\n${offer.description}` : '',
    offer.requirements.length ? `Exigences : ${offer.requirements.join(' ; ')}` : '',
    offer.deadline ? `Date limite : ${offer.deadline}` : '',
  ].filter(Boolean).join('\n');
};

/** Background and offer, as prompt lines; empty string when neither is known. */
export const careerContextText = (background: CvBackground | null | undefined, offer: CareerOffer | null | undefined): string => {
  const parts: string[] = [];
  const backgroundText = cvBackgroundToText(background);
  if (backgroundText) parts.push(`PARCOURS DE L'ÉTUDIANT (son ancien CV ou « Mon parcours ») :\n${backgroundText}`);
  const offerText = careerOfferToText(offer);
  if (offerText) parts.push(`OFFRE VISÉE :\n${offerText}`);
  return parts.join('\n\n');
};
