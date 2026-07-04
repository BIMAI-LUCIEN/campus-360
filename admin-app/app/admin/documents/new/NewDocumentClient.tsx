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
} from 'lucide-react';
import { Card, Button } from '../../_components/ui';

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
    label: 'Document de stage',
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

export default function NewDocumentPage() {
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
      const res = await fetch('/api/mobile/documents', {
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
      const newId = data.document?.id;
      if (!newId) throw new Error('Aucun identifiant de document reçu.');
      router.push(`/documents/${newId}`);
    } catch (err: any) {
      setError(err.message || 'Impossible de créer le document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full px-4 sm:px-0">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/documents')}
        className="flex items-center gap-2 text-xs font-semibold text-stitch-on-surface-variant hover:text-stitch-primary transition-colors self-start cursor-pointer"
      >
        <ArrowLeft size={14} />
        Retour à la liste des documents
      </button>

      {/* Header card */}
      <Card padded className="border-stitch-outline-variant bg-white">
        <div className="flex items-center gap-4 mb-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stitch-primary-fixed text-stitch-primary">
            <Plus size={20} />
          </span>
          <div>
            <h1 className="font-stitch-headline text-lg sm:text-xl font-bold text-stitch-on-surface leading-tight">
              Nouveau document
            </h1>
            <p className="mt-1 text-xs text-stitch-on-surface-variant leading-relaxed">
              Choisissez un modèle, donnez un titre, et l&apos;éditeur s&apos;ouvrira
              automatiquement avec les sections pré-remplies.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-stitch-error-light border border-stitch-error/20 p-3 text-xs text-stitch-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stitch-on-surface-variant uppercase tracking-wider">
              Titre du document <span className="text-stitch-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Ex: Document de stage — Miguel Melago"
              className="w-full rounded-lg border border-stitch-outline-variant bg-stitch-surface p-2.5 text-sm text-stitch-on-surface placeholder:text-stitch-outline/60 focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/10 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stitch-on-surface-variant uppercase tracking-wider">Description (facultatif)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Stage de fin d'études chez NextGen Tech..."
              rows={3}
              className="w-full rounded-lg border border-stitch-outline-variant bg-stitch-surface p-2.5 text-sm text-stitch-on-surface placeholder:text-stitch-outline/60 focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/10 transition-colors"
              style={{ resize: 'vertical', minHeight: 88 }}
            />
          </div>

          {/* Template chooser */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-stitch-on-surface-variant uppercase tracking-wider">Modèle de structure</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map(({ key, label, desc, icon: Icon }) => {
                const selected = template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplate(key)}
                    className={[
                      'flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer',
                      selected
                        ? 'border-2 border-stitch-primary bg-stitch-surface-container-low shadow-sm'
                        : 'border-stitch-outline-variant bg-stitch-surface hover:border-stitch-outline',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span
                        className={[
                          'flex items-center justify-center rounded-lg h-8 w-8',
                          selected ? 'bg-stitch-primary text-white' : 'bg-stitch-surface-container-high text-stitch-on-surface-variant',
                        ].join(' ')}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="text-sm font-bold text-stitch-on-surface">
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-stitch-on-surface-variant leading-relaxed">
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stitch-outline-variant">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/documents')}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              icon={Plus}
            >
              Créer et ouvrir l&apos;éditeur
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}