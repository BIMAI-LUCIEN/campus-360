// How an offer is applied to, for the Stages screen (task 25.17).
// A scraped offer often carries only the URL of the posting: the student applies there,
// so the app must not offer its one-click apply, which would have no recipient.
// The URL comes from an external source: only https is opened, never a custom scheme.
// No imports: loaded as-is by the Node tests.

export const APPLY_LINK_LABEL = 'Postuler sur le site';
export const APPLY_LINK_SHORT_LABEL = 'Sur le site';
export const APPLY_LINK_TRACK_LABEL = "J'ai postulé : ajouter à mon suivi";
export const APPLY_LINK_NOTICE =
  "Candidature sur le site de l'offre, sans frais Campus 360. Une fois faite, ajoute-la à ton suivi.";
export const APPLY_LINK_MISSING = "Le lien de cette offre n'est pas disponible.";

export const isLinkApply = (job: { applyMethod?: string } | null | undefined): boolean =>
  job?.applyMethod === 'LINK';

export const safeApplyUrl = (sourceUrl?: string | null): string | null => {
  const url = (sourceUrl || '').trim();
  return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
};
