import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { OfficialCvData } from '../../types';
import { buildApplicationHtml, generateOfficialCvHtml, type CvTemplateId, type DocumentExportData } from './cvHtml';
import { AppAlert } from '../../ui/AppAlert';
import { documentDownloadName } from '../documents/documentFileName';

export type { DocumentExportData } from './cvHtml';

// expo-print donne au PDF un nom aléatoire : on le copie sous le vrai nom avant de le partager.
const copyPdfUnderName = async (printedUri: string, fileName: string): Promise<string> => {
  const target = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from: printedUri, to: target });
  return target;
};

// A popup opened after an await (AI generation, upload...) is blocked by the
// browser; a hidden iframe is not, it prints from the page itself. The HTML
// file is downloaded only when even that fails.
const printHtmlOnWeb = (htmlContent: string, downloadName: string): boolean => {
  try {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const frameWindow = frame.contentWindow;
    if (!frameWindow) throw new Error('No iframe window');
    frameWindow.document.open();
    frameWindow.document.write(htmlContent);
    frameWindow.document.close();
    frameWindow.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 1000));
    // Fonts and the photo need a moment before the print dialog captures the page.
    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
    }, 500);
    return true;
  } catch (e) {
    console.warn('Web print iframe failed, downloading HTML fallback:', e);
  }

  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    AppAlert.alert('Impression bloquée', "Ton navigateur a bloqué l'impression : un fichier HTML a été téléchargé, ouvre-le puis choisis Imprimer > Enregistrer en PDF.");
    return true;
  } catch (err) {
    console.error('Download blob error', err);
    return false;
  }
};

/**
 * Déclenche l'export ou l'impression PDF selon la plateforme pour le CV Officiel
 */
export async function exportOfficialCvPdf(cv: OfficialCvData, template: CvTemplateId = 'classic'): Promise<boolean> {
  const htmlContent = generateOfficialCvHtml(cv, template);
  const fullName = `${cv.detailsPersonnels.nom}_${cv.detailsPersonnels.prenom}`.replace(/\s+/g, '_');
  const filename = documentDownloadName(`CV ${cv.detailsPersonnels.nom} ${cv.detailsPersonnels.prenom}`, 'pdf', 'CV');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return printHtmlOnWeb(htmlContent, `CV_${fullName}.html`);
  }

  // Native mobile iOS / Android via expo-print + expo-sharing
  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    const namedUri = await copyPdfUnderName(uri, filename);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(namedUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Partager le CV de ${cv.detailsPersonnels.prenom} ${cv.detailsPersonnels.nom}`,
      });
      return true;
    } else {
      AppAlert.alert('CV exporté', `Fichier PDF enregistré : ${namedUri}`);
      return true;
    }
  } catch (error) {
    console.warn('Native Print.printToFileAsync failed:', error);
    AppAlert.alert('Export impossible', "Le PDF n'a pas pu être créé. Réessaie.");
    return false;
  }
}

/**
 * Déclenche l'export ou l'impression PDF selon la plateforme (avec support du Template Officiel)
 */
export async function exportApplicationPdf(data: DocumentExportData): Promise<boolean> {
  if (data.officialCv) {
    return exportOfficialCvPdf(data.officialCv, data.cvTemplate);
  }

  const htmlContent = buildApplicationHtml(data);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return printHtmlOnWeb(htmlContent, `Candidature_${data.studentName.replace(/\s+/g, '_')}_${data.jobTitle.replace(/\s+/g, '_')}.html`);
  }

  // Native mobile iOS / Android via expo-print + expo-sharing
  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    const namedUri = await copyPdfUnderName(uri, documentDownloadName(`Candidature ${data.studentName} ${data.jobTitle}`, 'pdf', 'Candidature'));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(namedUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Partager la candidature pour ${data.jobTitle}`,
      });
      return true;
    } else {
      AppAlert.alert('PDF exporté', `Fichier disponible : ${namedUri}`);
      return true;
    }
  } catch (error) {
    console.warn('Native Print failed in exportApplicationPdf:', error);
    AppAlert.alert('Export impossible', "Le PDF n'a pas pu être créé. Réessaie.");
    return false;
  }
}

/**
 * Prépare le message WhatsApp d'accroche direct prêt à l'emploi
 */
export function buildWhatsAppPitch(data: {
  studentName: string;
  major: string;
  jobTitle: string;
  companyName: string;
  letterSummary: string;
}): string {
  return `Bonjour ${data.companyName},

Je suis ${data.studentName}, étudiant en ${data.major}.
Je vous transmets ma candidature via Campus 360 pour l'offre de stage : *${data.jobTitle}*.

🎯 *Pourquoi mon profil correspond :*
${data.letterSummary.slice(0, 300)}...

Mon CV complet au format officiel et ma lettre de motivation sont prêts à vous être transmis. Restant à votre disposition pour convenir d'un échange.

Bien cordialement,
*${data.studentName}* (Candidat Campus 360)`;
}

/**
 * Alias export for backward compatibility
 */
export const exportOfficialCvToPdf = exportOfficialCvPdf;

/**
 * Génère le fichier PDF en chaîne Base64 pour l'upload Supabase et le dispatch N8N
 */
export async function generateCvPdfBase64(
  data: DocumentExportData | OfficialCvData
): Promise<string | undefined> {
  try {
    let htmlContent = '';
    if ('detailsPersonnels' in data) {
      htmlContent = generateOfficialCvHtml(data as OfficialCvData);
    } else {
      const docData = data as DocumentExportData;
      htmlContent = docData.officialCv
        ? generateOfficialCvHtml(docData.officialCv, docData.cvTemplate)
        : buildApplicationHtml(docData);
    }

    if (Platform.OS !== 'web') {
      const result = await Print.printToFileAsync({ html: htmlContent, base64: true });
      if (result?.base64) {
        return result.base64;
      }
    }
    // On the web there is no PDF engine: the CV is not attached (never an empty placeholder PDF).
  } catch (err) {
    console.warn('[pdfExportService] Erreur lors de la génération du PDF Base64:', err);
  }
  return undefined;
}



