'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import type { AdminStageJob } from '@/lib/admin-platform-service';
import { Drawer, Field, Notice, Toggle, inputClass } from '../_components/admin-kit';

type ApplyMethod = 'WHATSAPP' | 'EMAIL' | 'LINK' | 'PHYSICAL';

type FormState = {
  title: string;
  kind: 'stage' | 'emploi';
  companyName: string;
  companyIndustry: string;
  description: string;
  requirements: string;
  location: string;
  duration: string;
  stipend: string;
  applyMethod: ApplyMethod;
  contactEmail: string;
  contactWhatsapp: string;
  applyUrl: string;
  flyerUrl: string;
  isSponsored: boolean;
  expiresAt: string;
};

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  title: '', kind: 'stage', companyName: '', companyIndustry: '', description: '', requirements: '',
  location: '', duration: '', stipend: '', applyMethod: 'EMAIL', contactEmail: '', contactWhatsapp: '',
  applyUrl: '', flyerUrl: '', isSponsored: false, expiresAt: inDays(30),
});

const fromJob = (job: AdminStageJob): FormState => ({
  title: job.title,
  kind: job.kind ?? 'stage',
  companyName: job.companyName,
  companyIndustry: job.companyIndustry ?? '',
  description: job.description ?? '',
  requirements: job.requirements.join(', '),
  location: job.location ?? '',
  duration: job.duration ?? '',
  stipend: job.stipend ?? '',
  applyMethod: job.applyMethod,
  contactEmail: job.contactEmail ?? '',
  contactWhatsapp: job.contactWhatsapp ?? '',
  applyUrl: job.sourceUrl ?? '',
  flyerUrl: job.flyerUrl ?? '',
  isSponsored: job.isSponsored,
  expiresAt: job.expiresAt.slice(0, 10),
});

const METHODS: Array<[ApplyMethod, string]> = [
  ['EMAIL', 'Par e-mail'],
  ['WHATSAPP', 'Par WhatsApp'],
  ['LINK', 'Sur un site'],
  ['PHYSICAL', 'Dépôt sur place'],
];

export function JobFormDrawer({ open, job, onClose, onSaved }: {
  open: boolean;
  job: AdminStageJob | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(job ? fromJob(job) : emptyForm());
      setError(null);
    }
  }, [open, job]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      requirements: form.requirements.split(',').map((r) => r.trim()).filter(Boolean),
      expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
    };
    try {
      const res = await fetch('/api/admin/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job ? { action: 'update', jobId: job.id, job: payload } : { action: 'create', job: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fieldErrors = data.details?.fieldErrors ?? {};
        const first = Object.values(fieldErrors).flat()[0];
        throw new Error((first as string) || data.error || 'Enregistrement impossible');
      }
      onSaved(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const tags = form.requirements.split(',').map((r) => r.trim()).filter(Boolean);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-4xl"
      title={job ? "Modifier l'offre" : 'Nouvelle offre'}
      subtitle="Publiée tout de suite dans le feed de l'app, sans passer par la validation."
    >
      <form onSubmit={submit} className="grid gap-0 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 p-6">
          {error ? <Notice tone="error">{error}</Notice> : null}

          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {(['stage', 'emploi'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set('kind', k)}
                className={['flex-1 rounded-md py-2 text-sm font-semibold', form.kind === k ? 'bg-surface text-primary shadow-card' : 'text-fg-subtle'].join(' ')}
              >
                {k === 'stage' ? 'Stage' : 'Emploi'}
              </button>
            ))}
          </div>

          <Field label="Intitulé du poste">
            <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} required minLength={3} placeholder="Développeur web junior" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entreprise" hint="Créée automatiquement si elle n'existe pas">
              <input className={inputClass} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required minLength={2} />
            </Field>
            <Field label="Secteur">
              <input className={inputClass} value={form.companyIndustry} onChange={(e) => set('companyIndustry', e.target.value)} placeholder="Télécoms, banque…" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ville"><input className={inputClass} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Douala" /></Field>
            <Field label={form.kind === 'stage' ? 'Durée' : 'Contrat'}><input className={inputClass} value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder={form.kind === 'stage' ? '3 mois' : 'CDI'} /></Field>
            <Field label={form.kind === 'stage' ? 'Gratification' : 'Salaire'}><input className={inputClass} value={form.stipend} onChange={(e) => set('stipend', e.target.value)} placeholder="50 000 FCFA / mois" /></Field>
          </div>
          <Field label="Description" hint="Missions, profil recherché, pièces à fournir">
            <textarea className={`${inputClass} min-h-[160px]`} value={form.description} onChange={(e) => set('description', e.target.value)} required minLength={20} maxLength={20000} />
          </Field>
          <Field label="Compétences" hint="Séparées par des virgules">
            <input className={inputClass} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder="React, SQL, anglais" />
          </Field>

          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 text-[12.5px] font-semibold text-fg-muted">Comment postuler</legend>
            <div className="mb-3 flex flex-wrap gap-2">
              {METHODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('applyMethod', value)}
                  className={['rounded-full border px-3 py-1.5 text-[13px] font-medium', form.applyMethod === value ? 'border-primary bg-primary-tint text-primary' : 'border-border text-fg-muted hover:bg-surface-2'].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.applyMethod === 'EMAIL' ? (
              <Field label="E-mail de candidature"><input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} required /></Field>
            ) : null}
            {form.applyMethod === 'WHATSAPP' ? (
              <Field label="Numéro WhatsApp"><input className={inputClass} value={form.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value)} placeholder="+237 6…" required /></Field>
            ) : null}
            {form.applyMethod === 'LINK' ? (
              <Field label="Lien de candidature"><input type="url" className={inputClass} value={form.applyUrl} onChange={(e) => set('applyUrl', e.target.value)} placeholder="https://" required /></Field>
            ) : null}
            {form.applyMethod === 'PHYSICAL' ? (
              <p className="text-[12.5px] text-fg-subtle">Indiquez l'adresse et les horaires de dépôt dans la description.</p>
            ) : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date limite"><input type="date" className={inputClass} value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} required /></Field>
            <Field label="Affiche (lien image, facultatif)"><input type="url" className={inputClass} value={form.flyerUrl} onChange={(e) => set('flyerUrl', e.target.value)} placeholder="https://" /></Field>
          </div>
          <Toggle checked={form.isSponsored} onChange={(v) => set('isSponsored', v)} label="Mettre en avant" description="L'offre remonte en tête du feed avec un badge." />
        </div>

        <div className="border-t border-border bg-surface-soft p-6 lg:border-l lg:border-t-0">
          <div className="sticky top-0 space-y-4">
            <div className="text-[12px] font-medium text-fg-subtle">Aperçu de la carte dans l'app</div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-primary-tint px-2 py-0.5 text-[11px] font-semibold text-primary">{form.kind === 'stage' ? 'Stage' : 'Emploi'}</span>
                {form.isSponsored ? <span className="rounded-md bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">À la une</span> : null}
              </div>
              <div className="font-display text-[16px] font-bold leading-snug text-fg">{form.title || 'Intitulé du poste'}</div>
              <div className="mt-0.5 text-[13px] text-fg-muted">{form.companyName || 'Entreprise'}</div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-fg-subtle">
                {form.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} />{form.location}</span> : null}
                {form.duration ? <span>{form.duration}</span> : null}
                {form.stipend ? <span className="font-medium text-money">{form.stipend}</span> : null}
              </div>
              {tags.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.slice(0, 5).map((t) => <span key={t} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">{t}</span>)}
                </div>
              ) : null}
              <div className="mt-4 rounded-lg bg-primary py-2 text-center text-[13px] font-semibold text-on-primary">Postuler</div>
            </div>
            <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {job ? 'Enregistrer les modifications' : "Publier l'offre"}
            </button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
