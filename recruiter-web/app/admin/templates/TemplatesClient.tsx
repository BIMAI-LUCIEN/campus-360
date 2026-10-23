'use client';

import { FileUp, LayoutTemplate, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button, Card, EmptyState, FilterChip, FilterSelect, PageHeader, Pill, Skeleton } from '../_components/ui';
import { KIND_LABELS, readError, STATUS_LABELS, type TemplateStatus, type TemplateSummary } from './types';

const STATUS_TONE = { draft: 'amber', published: 'green', archived: 'neutral' } as const;

// Report templates (Module 24): list, new template, import of a report.
export function TemplatesClient() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [status, setStatus] = useState<TemplateStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [importName, setImportName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'create' | 'import' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const query = status === 'all' ? '' : `?status=${status}`;
    const response = await fetch(`/api/admin/templates${query}`, { cache: 'no-store' });
    if (!response.ok) {
      setError(await readError(response));
      setTemplates([]);
      return;
    }
    const body = (await response.json()) as { templates: TemplateSummary[] };
    setTemplates(body.templates);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setBusy('create');
    setError(null);
    const response = await fetch('/api/admin/templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), kind: 'both', documentStyle: { preset: 'classique' }, outline: [{ title: 'Introduction générale' }, { title: 'Chapitre 1' }, { title: 'Conclusion générale' }] }),
    });
    setBusy(null);
    if (!response.ok) return setError(await readError(response));
    const body = (await response.json()) as { template: { id: string } };
    router.push(`/admin/templates/${body.template.id}`);
  };

  const importReport = async () => {
    if (!file || !importName.trim()) return;
    setBusy('import');
    setError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('name', importName.trim());
    const response = await fetch('/api/admin/templates/import', { method: 'POST', body: form });
    setBusy(null);
    if (!response.ok) return setError(await readError(response));
    const body = (await response.json()) as { template: { id: string } };
    router.push(`/admin/templates/${body.template.id}?import=1`);
  };

  return (
    <div>
      <PageHeader
        title="Modèles de rapport"
        subtitle="Recopier la mise en page d’un établissement, la retoucher, puis la proposer aux étudiants."
        breadcrumb={{ parent: 'Dashboard', current: 'Modèles de rapport' }}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-semibold text-fg">Importer un rapport</p>
          <p className="mb-3 text-[13px] text-fg-subtle">Word (.docx, copie la plus fidèle) ou PDF (brouillon approché). Seule la mise en page est reprise ; le fichier n’est pas conservé.</p>
          <div className="flex flex-col gap-2">
            <input className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg" placeholder="Nom du modèle (ex. IUT de Douala — Rapport de stage)" value={importName} maxLength={120} onChange={(e) => setImportName(e.target.value)} />
            <input type="file" accept=".docx,.pdf" className="text-sm text-fg-muted" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button icon={FileUp} loading={busy === 'import'} disabled={!file || !importName.trim()} onClick={importReport}>
              {busy === 'import' ? 'Analyse du document…' : 'Importer'}
            </Button>
          </div>
        </Card>
        <Card>
          <p className="mb-3 font-semibold text-fg">Nouveau modèle vide</p>
          <p className="mb-3 text-[13px] text-fg-subtle">Part du style classique ; tout se règle dans l’atelier.</p>
          <div className="flex flex-col gap-2">
            <input className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg" placeholder="Nom du modèle" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            <Button icon={Plus} variant="secondary" loading={busy === 'create'} disabled={!name.trim()} onClick={create}>
              Créer
            </Button>
          </div>
        </Card>
      </div>

      {error ? <p className="mb-4 rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p> : null}

      <div className="mb-4">
        <FilterChip label="Statut">
          <FilterSelect
            ariaLabel="Statut"
            value={status}
            onChange={(e) => setStatus(e.target.value as TemplateStatus | 'all')}
            options={[{ value: 'all', label: 'Tous' }, ...(['draft', 'published', 'archived'] as const).map((value) => ({ value, label: STATUS_LABELS[value] }))]}
          />
        </FilterChip>
      </div>

      {templates === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState icon={LayoutTemplate} title="Aucun modèle" description="Importez le rapport d’un établissement pour créer le premier modèle." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <button key={t.id} type="button" onClick={() => router.push(`/admin/templates/${t.id}`)} className="cursor-pointer text-left">
              <Card padded={false} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="flex h-56 items-center justify-center bg-surface-2">
                  {t.previewDataUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.previewDataUri} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[13px] text-fg-subtle">Pas encore d’aperçu</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-fg">{t.name}</p>
                    <Pill tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Pill>
                  </div>
                  <p className="text-[13px] text-fg-subtle">
                    {[t.establishment, t.degree, KIND_LABELS[t.kind]].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
