// The reminder sent to a recruiter. The text is fixed and written by the server (contexte.md
// §21): the client never provides it, so this route cannot be used to send anything else.

const oneLine = (value: string) => value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export type FollowupEmailInput = {
  studentName: string;
  jobTitle: string;
  companyName?: string | null;
  appliedAt: string;
};

export const buildFollowupEmail = (input: FollowupEmailInput) => {
  const name = oneLine(input.studentName) || 'Candidature Campus 360';
  const title = oneLine(input.jobTitle) || 'votre offre de stage';
  const company = oneLine(input.companyName || '');
  const date = new Date(input.appliedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Douala',
  });

  const subject = `Relance de candidature : ${title} (${name})`.slice(0, 200);
  const paragraphs = [
    'Bonjour,',
    `Je reviens vers vous au sujet de ma candidature du ${date} pour le poste « ${title} »${company ? ` chez ${company}` : ''}.`,
    'Avez-vous pu étudier mon dossier ? Je reste disponible pour en échanger.',
    `Bien cordialement,\n${name}`,
  ];
  const footer = `Message envoyé via Campus 360. Pour répondre à ${name}, utilisez simplement « Répondre ».`;

  return {
    subject,
    /** What the student sees before sending. */
    message: paragraphs.join('\n\n'),
    text: `${paragraphs.join('\n\n')}\n\n${footer}`,
    html:
      paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('') +
      `<p style="color:#64748B;font-size:12px">${escapeHtml(footer)}</p>`,
  };
};
