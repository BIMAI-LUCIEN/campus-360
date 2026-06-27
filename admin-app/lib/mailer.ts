import nodemailer from 'nodemailer';

export const sendPasswordResetEmail = async ({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) => {
  console.log("DEBUG: sendPasswordResetEmail called for:", email, "URL:", url);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!user || !password) {
    console.log("=========================================");
    console.log("WARNING: SMTP is not configured (SMTP_USER/SMTP_PASSWORD).");
    console.log("Password Reset Email for:", name, `(${email})`);
    console.log("Reset URL:", url);
    console.log("=========================================");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `Campus 360 <${user}>`,
    to: email,
    subject: 'Reinitialise ton mot de passe Campus 360',
    text: `Bonjour ${name},\n\nOuvre ce lien pour choisir un nouveau mot de passe:\n${url}\n\nCe lien est personnel.`,
    html: `<p>Bonjour ${name},</p><p>Ouvre le bouton ci-dessous pour choisir un nouveau mot de passe.</p><p><a href="${url}">Reinitialiser mon mot de passe</a></p><p>Ce lien est personnel.</p>`,
  });
};

export const sendVerificationEmail = async ({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) => {
  console.log("DEBUG: sendVerificationEmail called for:", email, "URL:", url);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!user || !password) {
    console.log("=========================================");
    console.log("WARNING: SMTP is not configured (SMTP_USER/SMTP_PASSWORD).");
    console.log("Verification Email for:", name, `(${email})`);
    console.log("Verification URL:", url);
    console.log("=========================================");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: { user, pass: password },
    });

    console.log("DEBUG: Attempting to send email via SMTP to:", email);
    const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `Campus 360 <${user}>`,
    to: email,
    subject: 'Confirme ton adresse email - Campus 360',
      text: `Bonjour ${name},\n\nMerci de confirmer ton adresse email en ouvrant ce lien:\n${url}\n\nCe lien est valide pendant 1 heure.`,
      html: `<p>Bonjour ${name},</p><p>Merci de confirmer ton adresse email en cliquant sur le bouton ci-dessous.</p><p><a href="${url}">Confirmer mon email</a></p><p>Ce lien est valide pendant 1 heure.</p>`,
    });
    console.log("DEBUG: Email sent successfully! MessageID:", info.messageId);
  } catch (error) {
    console.error("ERROR: sendVerificationEmail failed to send email:", error);
  }
};

