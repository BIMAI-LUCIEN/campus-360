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
    <div className="flup-page" style={{ maxWidth: 880, width: '100%', margin: '0 auto' }}>
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/documents')}
        className="flup-btn flup-btn--ghost flup-btn--sm"
        style={{ alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={15} />
        Retour à la liste des documents
      </button>

      {/* Header card */}
      <div className="flup-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span className="kpi-icon teal">
            <Plus size={20} />
          </span>
          <div>
            <h1 className="flup-page-title" style={{ fontSize: 22 }}>
              Nouveau document
            </h1>
            <p className="flup-page-subtitle">
              Choisissez un modèle, donnez un titre, et l&apos;éditeur s&apos;ouvrira
              automatiquement avec les sections pré-remplies.
            </p>
          </div>
        </div>

        {error ? (
          <div className="flup-alert flup-alert--danger" style={{ marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title */}
          <div>
            <label className="flup-label">
              Titre du document <span style={{ color: 'var(--color-flup-accent-orange)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Ex: Document de stage — Miguel Melago"
              className="flup-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flup-label">Description (facultatif)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Stage de fin d'études chez NextGen Tech..."
              rows={3}
              className="flup-input"
              style={{ resize: 'vertical', minHeight: 88 }}
            />
          </div>

          {/* Template chooser */}
          <div>
            <label className="flup-label">Modèle de structure</label>
            <div className="flup-grid-3">
              {TEMPLATES.map(({ key, label, desc, icon: Icon }) => {
                const selected = template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplate(key)}
                    className="flup-card flup-card--hover"
                    style={{
                      textAlign: 'left',
                      padding: 16,
                      cursor: 'pointer',
                      borderColor: selected
                        ? 'var(--color-flup-brand)'
                        : 'var(--color-flup-border)',
                      borderWidth: selected ? 2 : 1,
                      background: selected
                        ? 'var(--color-flup-brand-light)'
                        : 'var(--color-flup-surface)',
                      boxShadow: selected
                        ? '0 0 0 4px rgba(8, 145, 178, 0.10)'
                        : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span
                        className={selected ? 'kpi-icon teal' : 'kpi-icon slate'}
                        style={{ width: 32, height: 32 }}
                      >
                        <Icon size={16} />
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--color-flup-text-main)',
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--color-flup-text-muted)',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 16,
              borderTop: '1px solid var(--color-flup-border-soft)',
            }}
          >
            <button
              type="button"
              onClick={() => router.push('/admin/documents')}
              disabled={submitting}
              className="flup-btn flup-btn--secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flup-btn flup-btn--primary"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin-anim" />
                  Création...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Créer et ouvrir l&apos;éditeur
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}