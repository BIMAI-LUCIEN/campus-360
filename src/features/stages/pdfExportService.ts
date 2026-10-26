import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { OfficialCvData } from '../../types';
import { buildApplicationHtml, generateOfficialCvHtml, type CvTemplateId, type DocumentExportData } from './cvHtml';
import { AppAlert } from '../../ui/AppAlert';

export type { DocumentExportData } from './cvHtml';

/**
 * Déclenche l'export ou l'impression PDF selon la plateforme pour le CV Officiel
 */
export async function exportOfficialCvPdf(cv: OfficialCvData, template: CvTemplateId = 'classic'): Promise<boolean> {
  const htmlContent = generateOfficialCvHtml(cv, template);
  const fullName = `${cv.detailsPersonnels.nom}_${cv.detailsPersonnels.prenom}`.replace(/\s+/g, '_');
  const filename = `CV_${fullName}.pdf`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        return true;
      }
    } catch (e) {
      console.warn('Web print window failed, downloading HTML blob fallback:', e);
    }

    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${fullName}.html`;
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
  }

  // Native mobile iOS / Android via expo-print + expo-sharing
  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Partager le CV de ${cv.detailsPersonnels.prenom} ${cv.detailsPersonnels.nom}`,
      });
      return true;
    } else {
      AppAlert.alert('CV exporté', `Fichier PDF enregistré : ${uri}`);
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
    return exportOfficialCvPdf(data.officialCv);
  }

  const htmlContent = buildApplicationHtml(data);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        return true;
      }
    } catch (e) {
      console.warn('Print window failed, downloading HTML fallback', e);
    }

    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Candidature_${data.studentName.replace(/\s+/g, '_')}_${data.jobTitle.replace(/\s+/g, '_')}.html`;
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
  }

  // Native mobile iOS / Android via expo-print + expo-sharing
  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Partager la candidature pour ${data.jobTitle}`,
      });
      return true;
    } else {
      AppAlert.alert('PDF exporté', `Fichier disponible : ${uri}`);
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
        ? generateOfficialCvHtml(docData.officialCv)
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



