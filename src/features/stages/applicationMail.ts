import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { buildApplicationHtml, buildCoverLetterHtml, generateOfficialCvHtml, type DocumentExportData } from './cvHtml';

// Candidature envoyée depuis la messagerie de l'étudiant (Gmail, Outlook...) :
// le mail part de sa propre adresse, avec le CV et la lettre en PDF joints.
// Aucun accès à son compte n'est demandé, c'est lui qui appuie sur Envoyer.

export type ApplicationMailResult = 'sent' | 'cancelled' | 'unavailable';

const fileSafe = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Candidat';

// expo-print names the file with a random id: copy it under a readable name for the recruiter.
const printPdf = async (html: string, fileName: string): Promise<string> => {
  const { uri } = await Print.printToFileAsync({ html });
  const target = `${FileSystem.cacheDirectory}${fileName}.pdf`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
};

// Loaded on demand: APKs built before expo-mail-composer was added have no native
// module, and a top-level import would crash them when they receive an OTA update.
type MailComposerModule = typeof import('expo-mail-composer');
let mailComposer: MailComposerModule | null | undefined;
const loadMailComposer = (): MailComposerModule | null => {
  if (mailComposer === undefined) {
    try {
      mailComposer = require('expo-mail-composer') as MailComposerModule;
    } catch {
      mailComposer = null;
    }
  }
  return mailComposer;
};

/** Composer natif disponible (app mobile avec un compte mail configuré). Faux sur le web. */
export async function canComposeApplicationMail(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const composer = loadMailComposer();
  if (!composer) return false;
  return composer.isAvailableAsync().catch(() => false);
}

/**
 * Ouvre la messagerie de l'étudiant pré-remplie, CV + lettre en pièces jointes.
 * 'unavailable' : pas de composer natif, l'appelant bascule sur mailto.
 */
export async function composeApplicationMail(params: {
  to: string;
  subject: string;
  body: string;
  data: DocumentExportData;
}): Promise<ApplicationMailResult> {
  if (!(await canComposeApplicationMail())) return 'unavailable';

  const name = fileSafe(params.data.studentName);
  const cvHtml = params.data.officialCv
    ? generateOfficialCvHtml(params.data.officialCv)
    : buildApplicationHtml(params.data);
  const attachments = [await printPdf(cvHtml, `CV_${name}`)];
  if (params.data.letterText.trim()) {
    attachments.push(await printPdf(buildCoverLetterHtml(params.data), `Lettre_motivation_${name}`));
  }

  const { status } = await loadMailComposer()!.composeAsync({
    recipients: [params.to],
    subject: params.subject,
    body: params.body,
    attachments,
  });
  // Android ne dit pas si le mail est parti ('undetermined') : on le compte comme envoyé.
  return status === loadMailComposer()!.MailComposerStatus.CANCELLED ? 'cancelled' : 'sent';
}
