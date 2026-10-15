"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      subject: String(data.get("subject") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Envoi impossible. Réessaie ou écris-nous sur WhatsApp.");
        setStatus("error");
        return;
      }
      form.reset();
      setStatus("sent");
    } catch {
      setError("Connexion impossible. Réessaie ou écris-nous sur WhatsApp.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="p-6 rounded-2xl bg-[var(--color-paper-soft)] border border-[var(--color-emerald)]/30 flex gap-3 items-start">
        <CheckCircle2 className="w-6 h-6 text-[var(--color-emerald)] flex-shrink-0" />
        <div>
          <p className="font-bold mb-1">Message envoyé</p>
          <p className="text-sm text-[var(--color-ink-light)]">
            Merci. Nous te répondons par email, généralement sous 24h.
          </p>
        </div>
      </div>
    );
  }

  const sending = status === "sending";
  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-semibold mb-1.5">
            Ton prénom
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            placeholder="Aïcha"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-semibold mb-1.5">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder="ton.email@universite.com"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="block text-sm font-semibold mb-1.5">
          Sujet
        </label>
        <select id="contact-subject" name="subject" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choisis un sujet
          </option>
          <option>Question sur l&apos;app</option>
          <option>Problème de paiement</option>
          <option>Demande de partenariat</option>
          <option>Signaler un bug</option>
          <option>Autre</option>
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-semibold mb-1.5">
          Ton message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder="Dis-nous tout..."
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {status === "error" && error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      <Button type="submit" className="gap-2" disabled={sending}>
        {sending ? "Envoi en cours…" : "Envoyer"}
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
