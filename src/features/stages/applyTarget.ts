// How an offer is applied to, for the Stages screen (task 25.17 & module 35).
// A scraped 'LINK' offer has no WhatsApp or e-mail recipient: the student can either
// prepare a full application kit (CV + cover letter + 4 ready answers + 5 form questions)
// or open the external website directly for free.
// The URL comes from an external source: only https is opened, never a custom scheme.
// No imports: loaded as-is by the Node tests.

export const APPLY_LINK_LABEL = 'Postuler directement sur le site';
export const APPLY_LINK_SHORT_LABEL = 'Sur le site';
export const APPLY_LINK_KIT_PREFIX = 'Préparer mon dossier';
export const APPLY_LINK_TRACK_LABEL = "J'ai postulé : ajouter à mon suivi";
export const APPLY_LINK_NOTICE =
  "Candidature sur le site de l'offre, sans frais Campus 360. Une fois faite, ajoute-la à ton suivi.";
export const APPLY_LINK_NO_REFUND_NOTICE =
  "Dossier livré immédiatement (CV, lettre, réponses) : pas de remboursement si le site de l'offre ferme après l'achat.";
export const APPLY_LINK_MISSING = "Le lien de cette offre n'est pas disponible.";

export const isLinkApply = (job: { applyMethod?: string } | null | undefined): boolean =>
  job?.applyMethod === 'LINK';

export const isOfferExpired = (
  job: { expiresAt?: string | null; status?: string | null } | null | undefined,
  nowMs = Date.now(),
): boolean => {
  if (!job) return false;
  if (job.status === 'expired') return true;
  if (!job.expiresAt) return false;
  const parsed = Date.parse(job.expiresAt);
  return Number.isFinite(parsed) && parsed <= nowMs;
};

export const formatKitButtonLabel = (priceFcfa: number): string =>
  `${APPLY_LINK_KIT_PREFIX} · ${priceFcfa} FCFA`;

export const safeApplyUrl = (sourceUrl?: string | null): string | null => {
  const url = (sourceUrl || '').trim();
  return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
};
