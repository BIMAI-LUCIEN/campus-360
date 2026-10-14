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

/** Escapes user/DB-provided text before it is interpolated into an HTML email. */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Generic best-effort email (receipts, welcome, admin alerts). `html` must already be escaped
 * by the caller. Never throws: a failed email must not break the business action.
 */
export const sendTransactionalEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> => {
  const resend = getClient();
  if (!resend) {
    // eslint-disable-next-line no-console
    console.warn(`[mailer] Resend is not configured (RESEND_API_KEY). Email "${subject}" not sent.`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: defaultFrom, to, subject, text, html });
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`[mailer] sendTransactionalEmail "${subject}" failed:`, error);
      return false;
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[mailer] sendTransactionalEmail "${subject}" threw:`, error);
    return false;
  }
};

/** True when a real email provider is configured (OTP delivery is possible). */
export const isEmailDeliveryConfigured = (): boolean => getClient() !== null;

export type OtpPurpose = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

const OTP_SUBJECTS: Record<OtpPurpose, string> = {
  'email-verification': 'Ton code de confirmation Campus 360',
  'forget-password': 'Ton code pour réinitialiser ton mot de passe Campus 360',
  'sign-in': 'Ton code de connexion Campus 360',
  'change-email': 'Ton code de changement d’email Campus 360',
};

const OTP_INTROS: Record<OtpPurpose, string> = {
  'email-verification': 'Voici ton code pour confirmer ton adresse email :',
  'forget-password': 'Voici ton code pour choisir un nouveau mot de passe :',
  'sign-in': 'Voici ton code de connexion :',
  'change-email': 'Voici ton code pour confirmer ta nouvelle adresse email :',
};

export const sendOtpEmail = async ({ email, otp, type }: { email: string; otp: string; type: OtpPurpose }) => {
  // Only digits are ever interpolated into the HTML (Better Auth generates numeric OTPs).
  const safeOtp = otp.replace(/[^0-9]/g, '');
  const resend = getClient();
  if (!resend) {
    // Never log the code itself.
    // eslint-disable-next-line no-console
    console.warn(`[mailer] Resend is not configured (RESEND_API_KEY). OTP email (${type}) not sent.`);
    return;
  }

  const { error } = await resend.emails.send({
    from: defaultFrom,
    to: email,
    subject: OTP_SUBJECTS[type],
    text:
      `Bonjour,\n\n${OTP_INTROS[type]}\n\n${safeOtp}\n\n` +
      `Ce code expire dans 10 minutes. Ne le partage avec personne.\n` +
      `Si tu n'es pas à l'origine de cette demande, ignore cet email.`,
    html:
      `<p>Bonjour,</p>` +
      `<p>${OTP_INTROS[type]}</p>` +
      `<p style="font-size:30px;font-weight:800;letter-spacing:8px;color:#7C3AED;margin:20px 0">${safeOtp}</p>` +
      `<p>Ce code expire dans 10 minutes. Ne le partage avec personne.</p>` +
      `<p style="color:#64748B;font-size:12px">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[mailer] sendOtpEmail (${type}) failed:`, error);
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
