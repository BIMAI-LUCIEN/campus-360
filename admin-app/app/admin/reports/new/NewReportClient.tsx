'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Loader2,
  ArrowLeft,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../_components/ui';

type Template = 'stage' | 'memoire' | 'blank';

type TemplateMeta = {
  key: Template;
  label: string;
  desc: string;
  icon: React.ElementType;
};

const TEMPLATES: TemplateMeta[] = [
  {
    key: 'stage',
    label: 'Rapport de stage',
    desc: 'Structure académique classique avec page de garde, sommaire, remerciements, introduction, conclusion.',
    icon: FileText,
  },
  {
    key: 'memoire',
    label: 'Mémoire',
    desc: 'Recherche académique longue, problématique, hypothèses, bibliographie.',
    icon: BookOpen,
  },
  {
    key: 'blank',
    label: 'Vierge',
    desc: 'Document personnalisé sans sections pré-remplies.',
    icon: Sparkles,
  },
];

const inputClass =
  'w-full h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft';

const textareaClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft';

const labelClass = 'mb-1.5 block text-xs font-semibold text-fg-muted';

export default function NewReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<Template>('stage');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/mobile/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          templateType: template,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      const newId = data.report?.id;
      if (!newId) throw new Error('Aucun identifiant de rapport reçu.');
      router.push(`/reports/${newId}`);
    } catch (err: any) {
      setError(err.message || 'Impossible de créer le rapport.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/reports')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={15} />
        Retour à la liste des rapports
      </button>

      {/* Main card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Plus size={20} />
          </span>
          <div>
            <h1 className="font-display text-[22px] font-bold leading-tight text-fg">
              Nouveau rapport
            </h1>
            <p className="mt-0.5 text-sm text-fg-subtle">
              Choisissez un modèle, donnez un titre, et l&apos;éditeur s&apos;ouvrira
              automatiquement avec les sections pré-remplies.
            </p>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-md border border-danger-soft bg-danger-bg p-3 text-sm text-danger"
          >
            <span className="font-medium">{error}</span>
          </div>
        ) : null}

        <form onSubmit={submit} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className={labelClass}>
              Titre du document <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Ex: Rapport de stage — Miguel Melago"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description (facultatif)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Stage de fin d'études chez NextGen Tech..."
              rows={3}
              className={`${textareaClass} min-h-24 resize-y`}
            />
          </div>

          {/* Template chooser */}
          <div>
            <label className={labelClass}>Modèle de structure</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TEMPLATES.map(({ key, label, desc, icon: Icon }) => {
                const selected = template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplate(key)}
                    className={[
                      'relative flex flex-col gap-2 rounded-xl p-4 text-left transition-colors',
                      selected
                        ? 'border-2 border-primary bg-primary-softer'
                        : 'border-2 border-border bg-surface hover:border-border-strong',
                    ].join(' ')}
                  >
                    {selected ? (
                      <CheckCircle2
                        size={18}
                        className="absolute right-3 top-3 text-primary"
                      />
                    ) : null}
                    <div className="flex items-center gap-2.5">
                      <span
                        className={[
                          'inline-flex h-8 w-8 items-center justify-center rounded-lg',
                          selected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-2 text-fg-muted',
                        ].join(' ')}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="font-display text-[14px] font-bold text-fg">
                        {label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-fg-subtle">
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 border-t border-border-light pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/reports')}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={submitting ? undefined : Plus}
              loading={submitting}
              disabled={submitting}
            >
              Créer et ouvrir l&apos;éditeur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}