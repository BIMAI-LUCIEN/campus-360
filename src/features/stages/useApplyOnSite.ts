import { useCallback, useEffect, useRef } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { AppAlert } from '../../ui/AppAlert';
import type { StageJob } from '../../types';
import { APPLY_LINK_MISSING, safeApplyUrl } from './applyTarget';
import { peekStudentApplications, recordOnSiteApplication } from './stagesApi';

/**
 * 'LINK' offers (scraped, no contact) are applied to on their own website. The app cannot
 * see what happens there: when the student comes back, it asks and adds the offer to the
 * follow-up on their word. Free, nothing is sent.
 */
export function useApplyOnSite() {
  const pendingJob = useRef<StageJob | null>(null);

  const trackOnSite = useCallback(async (job: StageJob) => {
    const result = await recordOnSiteApplication(job);
    if (result.success) {
      AppAlert.alert('Ajoutée à ton suivi', `Retrouve « ${job.title} » dans tes candidatures.`);
    } else {
      AppAlert.alert('Suivi indisponible', result.error);
    }
  }, []);

  useEffect(() => {
    const askIfApplied = () => {
      const job = pendingJob.current;
      if (!job) return;
      pendingJob.current = null;
      const followed = peekStudentApplications()?.some((a) => a.jobId === job.id && a.status !== 'WITHDRAWN');
      if (followed) return;
      AppAlert.alert('Tu as postulé ?', `Si ta candidature à « ${job.title} » est partie, ajoute-la à ton suivi. C'est gratuit.`, [
        { text: 'Pas encore', style: 'cancel' },
        { text: 'Oui, ajouter', onPress: () => void trackOnSite(job) },
      ]);
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') askIfApplied();
    });
    // On the web a new window does not always hide the page: its focus coming back counts too.
    const onWeb = Platform.OS === 'web' && typeof window !== 'undefined';
    if (onWeb) window.addEventListener('focus', askIfApplied);
    return () => {
      subscription.remove();
      if (onWeb) window.removeEventListener('focus', askIfApplied);
    };
  }, [trackOnSite]);

  const openOnSite = useCallback((job: StageJob) => {
    const url = safeApplyUrl(job.sourceUrl);
    if (!url) {
      AppAlert.alert('Lien indisponible', APPLY_LINK_MISSING);
      return;
    }
    // Set before opening: the app can leave the foreground before the promise settles.
    pendingJob.current = job;
    Linking.openURL(url).catch(() => {
      pendingJob.current = null;
      AppAlert.alert('Lien indisponible', "Impossible d'ouvrir le site de l'offre.");
    });
  }, []);

  return { openOnSite, trackOnSite };
}
