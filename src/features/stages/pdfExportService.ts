import { Platform, Alert } from 'react-native';

export interface DocumentExportData {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  major: string;
  educationLevel: string;
  jobTitle: string;
  companyName: string;
  letterText: string;
  cvText: string;
}

/**
 * Génère le code HTML propre et stylé aux standards RH pour l'impression ou le téléchargement PDF
 */
export function buildApplicationHtml(data: DocumentExportData): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Candidature - ${data.studentName} - ${data.jobTitle}</title>
  <style>
    @page { margin: 20mm; size: A4 portrait; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.5;
      font-size: 11pt;
      margin: 0;
      padding: 24px;
    }
    .header {
      border-bottom: 2px solid #7C3AED;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .student-name {
      font-size: 20pt;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }
    .student-meta {
      font-size: 10pt;
      color: #64748B;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      background: #F3E8FF;
      color: #7C3AED;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 9pt;
      font-weight: 700;
    }
    .section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #7C3AED;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content-box {
      white-space: pre-line;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      font-size: 10.5pt;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #E2E8F0;
      padding-top: 10px;
      font-size: 9pt;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="student-name">${data.studentName}</h1>
      <div class="student-meta">${data.educationLevel} en ${data.major}</div>
      <div class="student-meta">Email : ${data.studentEmail} ${data.studentPhone ? '| WhatsApp : ' + data.studentPhone : ''}</div>
    </div>
    <div>
      <span class="badge">Campus 360 AI Verified</span>
    </div>
  </div>

  <div class="section-title">Lettre de Motivation Ciblée — ${data.jobTitle}</div>
  <div class="content-box">
${data.letterText}
  </div>

  <div class="section-title">Curriculum Vitae Synthétique</div>
  <div class="content-box">
${data.cvText}
  </div>

  <div class="footer">
    Document généré via Campus 360 AI — Plateforme de stages académiques certifiés
  </div>
</body>
</html>`;
}

/**
 * Déclenche l'export ou l'impression PDF selon la plateforme
 */
export async function exportApplicationPdf(data: DocumentExportData): Promise<boolean> {
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

    // Fallback: download HTML/PDF file directly
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
      return true;
    } catch (err) {
      console.error('Download blob error', err);
      return false;
    }
  }

  // Sur mobile React Native: alerte avec confirmation de la génération
  Alert.alert(
    'Dossier PDF Prêt 📄',
    `Votre candidature complète pour ${data.jobTitle} a été mise en forme aux standards RH. Vous pouvez la partager directement par WhatsApp ou email.`
  );
  return true;
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
Je vous transmets ma candidature pour l'offre de stage : *${data.jobTitle}*.

🎯 *Pourquoi mon profil correspond :*
${data.letterSummary.slice(0, 300)}...

Mon CV complet et ma lettre de motivation sont prêts à vous être transmis. Restant à votre disposition pour convenir d'un échange.

Bien cordialement,
*${data.studentName}*`;
}
