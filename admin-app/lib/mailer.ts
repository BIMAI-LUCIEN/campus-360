import { Resend } from 'resend';

// Lazy-initialize the Resend client so importing this module never crashes when
// the API key is missing (e.g. during local dev or a build that doesn't send
// mail). The first call to `sendXxxEmail` will surface a clear configuration
// error if RESEND_API_KEY is absent.
let resendClient: Resend | null = null;
const getClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === '__ROTATE_ME__') return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

// Default sender. Resend requires a verified domain or the special
// `onboarding@resend.dev` test address — until you verify your own domain in
// the Resend dashboard, every email will go to the address you signed up with.
// Override via MAIL_FROM in env once your domain is verified.
const defaultFrom = process.env.MAIL_FROM ?? 'Campus-Bordes <onboarding@resend.dev>';

type SendArgs = {
  email: string;
  name: string;
  url: string;
};

const logMailDisabled = (label: string, { email, name, url }: SendArgs) => {
  // eslint-disable-next-line no-console
  console.log('=========================================');
  // eslint-disable-next-line no-console
  console.log(`WARNING: Resend is not configured (RESEND_API_KEY). ${label} not sent.`);
  // eslint-disable-next-line no-console
  console.log(`To: ${name} <${email}>`);
  // eslint-disable-next-line no-console
  console.log(`URL: ${url}`);
  // eslint-disable-next-line no-console
  console.log('=========================================');
};

export const sendPasswordResetEmail = async ({ email, name, url }: SendArgs) => {
  const resend = getClient();
  if (!resend) {
    logMailDisabled('Password reset email', { email, name, url });
    return;
  }

  const { error } = await resend.emails.send({
    from: defaultFrom,
    to: email,
    subject: 'Reinitialise ton mot de passe Campus-Bordes',
    text:
      `Bonjour ${name},\n\n` +
      `Ouvre ce lien pour choisir un nouveau mot de passe:\n${url}\n\n` +
      `Ce lien est personnel.`,
    html:
      `<p>Bonjour ${name},</p>` +
      `<p>Ouvre le bouton ci-dessous pour choisir un nouveau mot de passe.</p>` +
      `<p><a href="${url}">Reinitialiser mon mot de passe</a></p>` +
      `<p>Ce lien est personnel.</p>`,
  });

  if (error) {
    // Don't throw — auth.ts treats these handlers as best-effort, and a failed
    // reset email shouldn't crash the request. Log loudly so ops sees it.
    // eslint-disable-next-line no-console
    console.error('[mailer] sendPasswordResetEmail failed:', error);
  }
};

export const sendVerificationEmail = async ({ email, name, url }: SendArgs) => {
  const resend = getClient();
  if (!resend) {
    logMailDisabled('Verification email', { email, name, url });
    return;
  }

  const { error } = await resend.emails.send({
    from: defaultFrom,
    to: email,
    subject: 'Confirme ton adresse email - Campus-Bordes',
    text:
      `Bonjour ${name},\n\n` +
      `Merci de confirmer ton adresse email en ouvrant ce lien:\n${url}\n\n` +
      `Ce lien est valide pendant 1 heure.`,
    html:
      `<p>Bonjour ${name},</p>` +
      `<p>Merci de confirmer ton adresse email en cliquant sur le bouton ci-dessous.</p>` +
      `<p><a href="${url}">Confirmer mon email</a></p>` +
      `<p>Ce lien est valide pendant 1 heure.</p>`,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[mailer] sendVerificationEmail failed:', error);
  }
};
