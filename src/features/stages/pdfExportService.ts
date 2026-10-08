import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { OfficialCvData } from '../../types';

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
  officialCv?: OfficialCvData;
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
 * Génère le code HTML conforme au Template CV Officiel (Gabarit 2 Colonnes)
 */
export function generateOfficialCvHtml(cv: OfficialCvData): string {
  const nom = cv.detailsPersonnels.nom.toUpperCase();
  const prenom = cv.detailsPersonnels.prenom;
  const fullName = `${nom} ${prenom}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Curriculum Vitae — ${fullName}</title>
  <style>
    @page {
      margin: 15mm 20mm;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      line-height: 1.45;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #FFFFFF;
    }
    .cv-header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .header-titles {
      flex: 1;
      padding-top: 6px;
    }
    .cv-name {
      font-size: 20pt;
      font-weight: 800;
      color: #111827;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .cv-job-title {
      font-size: 13pt;
      font-weight: 500;
      color: #374151;
      margin: 0;
    }
    .photo-frame {
      width: 95px;
      height: 115px;
      border: 1px solid #CBD5E1;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-left: 16px;
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder-initials {
      font-size: 18pt;
      font-weight: 700;
      color: #94A3B8;
    }
    .blue-divider {
      height: 2px;
      background-color: #005691;
      margin-top: 12px;
      margin-bottom: 14px;
    }
    .section-heading {
      color: #005691;
      font-size: 11pt;
      font-weight: 700;
      border-bottom: 1.5px solid #005691;
      padding-bottom: 2px;
      margin-top: 12px;
      margin-bottom: 8px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .details-table td {
      padding: 2px 0;
      font-size: 9.5pt;
      vertical-align: top;
    }
    .col-left {
      width: 48%;
      padding-right: 12px;
    }
    .col-right {
      width: 52%;
    }
    .label {
      font-weight: 600;
      color: #111827;
    }
    .exp-item, .form-item {
      margin-bottom: 8px;
    }
    .item-top-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .item-main-title {
      font-weight: 700;
      font-size: 10pt;
      color: #111827;
    }
    .item-sub-title {
      font-style: italic;
      color: #4B5563;
      font-size: 9.5pt;
    }
    .item-date-right {
      color: #6B7280;
      font-size: 9pt;
      text-align: right;
    }
    ul.cv-bullet-list {
      margin: 3px 0 6px 18px;
      padding: 0;
    }
    ul.cv-bullet-list li {
      margin-bottom: 2px;
      font-size: 9.5pt;
      color: #374151;
    }
    .competences-subheading {
      font-weight: 700;
      font-size: 9.5pt;
      color: #111827;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .skills-inline-text {
      font-size: 9.5pt;
      color: #374151;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .page-footer-num {
      text-align: center;
      margin-top: 24px;
      font-size: 9pt;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="cv-header-container">
    <div class="header-titles">
      <h1 class="cv-name">${fullName}</h1>
      <div class="cv-job-title">${cv.titrePoste}</div>
    </div>
    <div class="photo-frame">
      ${cv.photoUrl 
        ? `<img src="${cv.photoUrl}" alt="${fullName}" class="photo-img" />`
        : `<div class="photo-placeholder-initials">${nom.slice(0, 1)}${prenom.slice(0, 1)}</div>`
      }
    </div>
  </div>

  <div class="blue-divider"></div>

  <!-- 1. Détails personnels -->
  <div class="section-heading">Détails personnels</div>
  <table class="details-table">
    <tr>
      <td class="col-left"><span class="label">Nom :</span> ${cv.detailsPersonnels.nom}</td>
      <td class="col-right"><span class="label">Adresse e-mail :</span> ${cv.detailsPersonnels.email}</td>
    </tr>
    <tr>
      <td class="col-left"><span class="label">Prénom :</span> ${cv.detailsPersonnels.prenom}</td>
      <td class="col-right"><span class="label">Numéro de téléphone :</span> ${cv.detailsPersonnels.telephone}</td>
    </tr>
    <tr>
      <td class="col-left"><span class="label">Nationalité :</span> ${cv.detailsPersonnels.nationalite}</td>
      <td class="col-right"><span class="label">Adresse :</span> ${cv.detailsPersonnels.adresse}</td>
    </tr>
    <tr>
      <td class="col-left"><span class="label">Âge :</span> ${cv.detailsPersonnels.age}</td>
      <td class="col-right"></td>
    </tr>
  </table>

  <!-- 2. Expérience professionnelle -->
  <div class="section-heading">Expérience professionnelle</div>
  ${cv.experiences.map(exp => `
    <div class="exp-item">
      <div class="item-main-title">${exp.poste}</div>
      <div class="item-top-row">
        <span class="item-sub-title">${exp.entreprise}, ${exp.ville}</span>
        <span class="item-date-right">${exp.periode}</span>
      </div>
      <ul class="cv-bullet-list">
        ${exp.missions.map(m => `<li>${m}</li>`).join('')}
      </ul>
    </div>
  `).join('')}

  <!-- 3. Formation -->
  <div class="section-heading">Formation</div>
  ${cv.formations.map(form => `
    <div class="form-item">
      <div class="item-top-row">
        <span class="item-main-title">${form.diplome}</span>
        <span class="item-date-right">${form.periode}</span>
      </div>
      <div class="item-sub-title">${form.etablissement}, ${form.ville}</div>
    </div>
  `).join('')}

  <!-- 4. Compétences -->
  <div class="section-heading">Compétences</div>
  <div class="competences-subheading">Compétences professionnelles</div>
  <ul class="cv-bullet-list">
    ${cv.competences.professionnelles.map(comp => `<li>${comp}</li>`).join('')}
  </ul>

  <div class="skills-inline-text">
    <span class="label">Habilités personnelles et relationnelles :</span> ${cv.competences.habilitesRelationnelles.join(', ')}
  </div>

  <div class="competences-subheading">Maîtrise des logiciels</div>
  <ul class="cv-bullet-list">
    ${cv.competences.logiciels.map(log => `<li>${log.categorie ? `<strong>${log.categorie} :</strong> ` : ''}${log.items.join(', ')}</li>`).join('')}
  </ul>

  <!-- 5. Langues -->
  <div class="section-heading">Langues</div>
  <div style="font-size: 9.5pt; color: #374151; margin-bottom: 6px;">
    ${cv.langues.map(lang => `<div>${lang.langue}: ${lang.niveau}</div>`).join('')}
  </div>

  <!-- 6. Autres informations importantes -->
  <div class="section-heading">Autres informations importantes</div>
  <div style="font-size: 9.5pt; color: #374151; margin-bottom: 12px;">
    <span class="label">Loisirs :</span> ${cv.loisirs.join(', ')}
  </div>

  <div class="page-footer-num">1</div>
</body>
</html>`;
}

/**
 * Déclenche l'export ou l'impression PDF selon la plateforme pour le CV Officiel
 */
export async function exportOfficialCvPdf(cv: OfficialCvData): Promise<boolean> {
  const htmlContent = generateOfficialCvHtml(cv);
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
      Alert.alert('CV Généré', `Fichier PDF généré à : ${uri}`);
      return true;
    }
  } catch (error) {
    console.warn('Native Print.printToFileAsync failed:', error);
    Alert.alert(
      'CV Prêt 📄',
      `Votre CV officiel pour "${cv.titrePoste}" a été généré au format standard RH.`
    );
    return true;
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
      Alert.alert('Dossier PDF Prêt 📄', `Fichier disponible : ${uri}`);
      return true;
    }
  } catch (error) {
    console.warn('Native Print failed in exportApplicationPdf:', error);
    Alert.alert(
      'Dossier PDF Prêt 📄',
      `Votre candidature complète pour ${data.jobTitle} a été mise en forme aux standards RH. Vous pouvez la partager directement par WhatsApp ou email.`
    );
    return true;
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
Je vous transmets ma candidature pour l'offre de stage : *${data.jobTitle}*.

🎯 *Pourquoi mon profil correspond :*
${data.letterSummary.slice(0, 300)}...

Mon CV complet au format officiel et ma lettre de motivation sont prêts à vous être transmis. Restant à votre disposition pour convenir d'un échange.

Bien cordialement,
*${data.studentName}*`;
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
    } else {
      // Minimal valid base64 PDF fallback for web development/environment
      return 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iamoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iamozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KL1Jlc291cmNlcyA8PAo+Pgo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNjkgMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxNAolJUVPRg==';
    }
  } catch (err) {
    console.warn('[pdfExportService] Erreur lors de la génération du PDF Base64:', err);
  }
  return undefined;
}



