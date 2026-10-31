'use client';

import { useState } from 'react';
import { CircleAlert, ExternalLink, UploadCloud } from 'lucide-react';

import {
  MAX_FILE_BYTES,
  MAX_FILES,
  publishIntake,
  uploadIntakeFile,
  type IntakeSheet,
  type IntakeStatus,
  type IntakeUpload,
} from './intakeApi';

const STATUS_LABEL: Record<IntakeStatus, string> = {
  analyzing: 'En analyse',
  duplicate: 'Doublon',
  probable_duplicate: 'Doublon probable',
  ready: 'Prêt',
  pending_review: 'À valider',
  published: 'Publié',
  rejected: 'Refusé',
};

const STATUS_CLASS: Record<IntakeStatus, string> = {
  analyzing: 'bg-blue-50 text-blue-700 border-blue-200',
  duplicate: 'bg-stitch-error-light text-stitch-error border-stitch-error/20',
  probable_duplicate: 'bg-amber-50 text-amber-700 border-amber-200',
  ready: 'bg-stitch-primary-fixed text-stitch-primary border-stitch-primary/20',
  pending_review: 'bg-stitch-primary-fixed text-stitch-primary border-stitch-primary/20',
  published: 'bg-stitch-success-light text-stitch-success-dark border-stitch-success/20',
  rejected: 'bg-slate-50 text-slate-700 border-slate-200',
};

export const IntakeBadge = ({ status }: { status: IntakeStatus }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

const inputClass =
  'w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2 text-sm focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15';

const KINDS: [string, string][] = [
  ['ancien_sujet', 'Ancien sujet'],
  ['corrige', 'Corrigé'],
  ['cours', 'Cours'],
  ['rapport', 'Rapport'],
  ['memoire', 'Mémoire'],
  ['autre', 'Autre'],
];

export const SheetEditor = ({ sheet, onChange }: { sheet: IntakeSheet; onChange: (sheet: IntakeSheet) => void }) => {
  const field = (key: keyof IntakeSheet, label: string) => (
    <label className="space-y-1">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">{label}</span>
      <input
        className={inputClass}
        value={(sheet[key] as string | undefined) ?? ''}
        onChange={(e) => onChange({ ...sheet, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field('title', 'Titre')}
      {field('subject', 'Matière')}
      {field('school', 'École ou concours')}
      {field('year', 'Année')}
      {field('level', 'Niveau')}
      <label className="space-y-1">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">Type</span>
        <select className={inputClass} value={sheet.kind ?? 'autre'} onChange={(e) => onChange({ ...sheet, kind: e.target.value })}>
          {KINDS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">Résumé</span>
        <textarea
          className={`${inputClass} min-h-20`}
          value={sheet.summary ?? ''}
          onChange={(e) => onChange({ ...sheet, summary: e.target.value })}
        />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
          Mots-clés (séparés par des virgules)
        </span>
        <input
          className={inputClass}
          value={(sheet.keywords ?? []).join(', ')}
          onChange={(e) => onChange({ ...sheet, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })}
        />
      </label>
    </div>
  );
};

type Row = {
  key: string;
  file: File;
  progress: number;
  upload: IntakeUpload | null;
  sheet: IntakeSheet;
  error: string | null;
  busy: boolean;
};

const PARALLEL = 2;

export function BatchImport({ onPublished }: { onPublished: () => Promise<void> | void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);

  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const start = async (files: File[]) => {
    setMessage(null);
    if (files.length === 0) return;
    if (files.length > MAX_FILES) {
      setMessage(`${MAX_FILES} PDF au maximum par lot.`);
      return;
    }
    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) {
      setMessage(`Fichier trop volumineux (maximum 20 Mo) : ${tooBig.map((f) => f.name).join(', ')}.`);
      return;
    }
    const batchId = crypto.randomUUID();
    const fresh: Row[] = files.map((file, i) => ({
      key: `${batchId}-${i}`,
      file,
      progress: 0,
      upload: null,
      sheet: {},
      error: null,
      busy: true,
    }));
    setRows(fresh);
    setSending(true);
    // Files of a batch are compared with each other, so the same file twice in a
    // batch is caught even when two uploads run at the same time.
    let next = 0;
    const worker = async () => {
      while (next < fresh.length) {
        const row = fresh[next++];
        try {
          const upload = await uploadIntakeFile(row.file, batchId, (progress) => patchRow(row.key, { progress }));
          patchRow(row.key, { upload, sheet: upload.sheet ?? {}, progress: 1, busy: false });
        } catch (error) {
          patchRow(row.key, { error: error instanceof Error ? error.message : 'Échec de l’envoi.', busy: false });
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setSending(false);
  };

  const publish = async (row: Row) => {
    if (!row.upload) return false;
    patchRow(row.key, { busy: true, error: null });
    try {
      const upload = await publishIntake(row.upload.id, row.sheet);
      patchRow(row.key, { upload, busy: false });
      return true;
    } catch (error) {
      patchRow(row.key, { busy: false, error: error instanceof Error ? error.message : 'Publication impossible.' });
      return false;
    }
  };

  const readyRows = rows.filter((row) => row.upload?.status === 'ready' && !row.busy);

  const publishAll = async () => {
    let published = 0;
    for (const row of readyRows) if (await publish(row)) published += 1;
    setMessage(`${published} PDF publié${published > 1 ? 's' : ''}.`);
    await onPublished();
  };

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void start(Array.from(e.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-stitch-primary bg-stitch-primary-fixed' : 'border-stitch-outline-variant bg-white'
        }`}
      >
        <UploadCloud size={32} className="text-stitch-primary" />
        <span className="font-semibold text-stitch-on-surface">Glissez jusqu’à 10 PDF ici, ou cliquez pour choisir</span>
        <span className="text-sm text-stitch-on-surface-variant">
          20 Mo au maximum par fichier. Chaque PDF est analysé et comparé au catalogue avant publication.
        </span>
        <input
          type="file"
          accept="application/pdf"
          multiple
          disabled={sending}
          className="sr-only"
          onChange={(e) => {
            void start(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </label>

      {message && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-stitch-surface-container px-3 py-2 text-sm text-stitch-on-surface">
          <CircleAlert size={16} /> {message}
        </p>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stitch-on-surface-variant">
            {rows.filter((r) => r.upload || r.error).length} / {rows.length} analysé{rows.length > 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={publishAll}
            disabled={readyRows.length === 0 || sending}
            className="rounded-lg bg-stitch-primary px-5 py-2 text-sm font-semibold text-stitch-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Publier tout ce qui est prêt ({readyRows.length})
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="rounded-xl border border-stitch-outline-variant bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 truncate font-semibold text-stitch-on-surface">{row.file.name}</span>
              {row.upload ? (
                <IntakeBadge status={row.upload.status} />
              ) : row.error ? (
                <span className="text-xs font-semibold text-stitch-error">Échec</span>
              ) : (
                <span className="text-xs text-stitch-on-surface-variant">
                  {row.progress < 1 ? `Envoi ${Math.round(row.progress * 100)} %` : 'Analyse…'}
                </span>
              )}
            </div>
            {!row.upload && !row.error && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stitch-surface-container">
                <div className="h-full bg-stitch-primary transition-all" style={{ width: `${Math.round(row.progress * 100)}%` }} />
              </div>
            )}
            {row.error && <p className="mt-2 text-sm text-stitch-error">{row.error}</p>}
            {row.upload?.rejectReason && <p className="mt-2 text-sm text-stitch-on-surface-variant">{row.upload.rejectReason}</p>}
            {row.upload?.duplicateOf && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stitch-on-surface-variant">
                {row.upload.status === 'duplicate' ? 'Déjà présent :' : 'Ressemble à :'}
                <strong className="text-stitch-on-surface">{row.upload.duplicateOf.title || row.upload.duplicateOf.id}</strong>
                {row.upload.duplicateUrl && (
                  <a href={row.upload.duplicateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stitch-primary underline">
                    Voir l’existant <ExternalLink size={14} />
                  </a>
                )}
              </p>
            )}
            {row.upload?.status === 'analyzing' && (
              <p className="mt-2 text-sm text-stitch-on-surface-variant">
                L’IA n’a pas répondu. Relancez l’analyse depuis l’onglet « Contributions étudiantes » (filtre « En analyse »).
              </p>
            )}
            {row.upload && ['ready', 'pending_review', 'probable_duplicate'].includes(row.upload.status) && (
              <div className="mt-4 space-y-3">
                <SheetEditor sheet={row.sheet} onChange={(sheet) => patchRow(row.key, { sheet })} />
                {row.upload.status === 'ready' && (
                  <button
                    type="button"
                    disabled={row.busy}
                    onClick={async () => {
                      if (await publish(row)) await onPublished();
                    }}
                    className="rounded-lg border border-stitch-outline-variant px-4 py-2 text-sm font-semibold text-stitch-on-surface hover:bg-stitch-surface-container disabled:opacity-40"
                  >
                    Publier
                  </button>
                )}
                {row.upload.status !== 'ready' && (
                  <p className="text-sm text-amber-700">À trancher dans l’onglet « Contributions étudiantes ».</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
