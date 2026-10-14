import { NextResponse } from "next/server";

// Public contact form → email via Resend. Needs RESEND_API_KEY and CONTACT_FROM
// (a sender address on a Resend-verified domain). Without them, the endpoint
// answers 503 so the form can tell the visitor to use WhatsApp instead.

const SUBJECTS = [
  "Question sur l'app",
  "Problème de paiement",
  "Demande de partenariat",
  "Signaler un bug",
  "Autre",
] as const;

const MAX_BODY_BYTES = 8_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type ContactPayload = {
  name: string;
  email: string;
  subject: (typeof SUBJECTS)[number];
  message: string;
};

function parsePayload(raw: unknown): ContactPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const { name, email, subject, message } = raw as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 80) return null;
  if (typeof email !== "string" || email.length > 200 || !EMAIL_RE.test(email.trim())) return null;
  if (typeof subject !== "string" || !(SUBJECTS as readonly string[]).includes(subject)) return null;
  if (typeof message !== "string" || message.trim().length < 10 || message.length > 3000) return null;
  return {
    name: name.trim(),
    email: email.trim(),
    subject: subject as ContactPayload["subject"],
    message: message.trim(),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message trop long." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const payload = parsePayload(json);
  if (!payload) {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO ?? "support@campus360b.site";
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Envoi indisponible pour le moment. Écris-nous sur WhatsApp." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: payload.email,
        subject: `[Contact] ${payload.subject} — ${payload.name}`,
        html: `<p><strong>De :</strong> ${escapeHtml(payload.name)} (${escapeHtml(payload.email)})</p>
<p><strong>Sujet :</strong> ${escapeHtml(payload.subject)}</p>
<p style="white-space:pre-wrap">${escapeHtml(payload.message)}</p>`,
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Envoi impossible. Réessaie ou écris-nous sur WhatsApp." },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Envoi impossible. Réessaie ou écris-nous sur WhatsApp." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
