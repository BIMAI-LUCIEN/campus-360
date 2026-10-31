'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';

import { IntakeBadge, SheetEditor } from './BatchImport';
import { listIntake, publishIntake, reanalyzeIntake, rejectIntake, type IntakeSheet, type IntakeUpload } from './intakeApi';

const FILTERS = [
  ['review', 'À valider'],
  ['analyzing', 'En analyse'],
  ['published', 'Publiés'],
  ['rejected', 'Refusés'],
] as const;
type Filter = (typeof FILTERS)[number][0];

const load = async (filter: Filter) => {
  if (filter !== 'review') return listIntake({ status: filter });
  const [pending, probable] = await Promise.all([listIntake({ status: 'pending_review' }), listIntake({ status: 'probable_duplicate' })]);
  return [...probable, ...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export function ContributionsReview({ onPublished }: { onPublished: () => Promise<void> | void }) {
  const [filter, setFilter] = useState<Filter>('review');
  const [uploads, setUploads] = useState<IntakeUpload[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setUploads(null);
    try {
      setUploads(await load(filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    }
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              filter === value ? 'bg-stitch-primary text-stitch-on-primary' : 'bg-stitch-surface-container text-stitch-on-surface hover:bg-stitch-surface-container-high'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Actualiser"
          className="ml-auto rounded-lg border border-stitch-outline-variant p-2 text-stitch-on-surface hover:bg-stitch-surface-container"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stitch-error/20 bg-stitch-error-light p-4 text-sm text-stitch-error">
          {error}
          <button type="button" onClick={() => void refresh()} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {!error && uploads === null && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stitch-surface-container" />
          ))}
        </div>
      )}

      {uploads?.length === 0 && (
        <p className="rounded-xl border border-stitch-outline-variant bg-white p-8 text-center text-sm text-stitch-on-surface-variant">
          {filter === 'review' ? 'Aucune contribution en attente.' : 'Aucun envoi dans cette liste.'}
        </p>
      )}

      <ul className="space-y-3">
        {uploads?.map((upload) => (
          <ReviewCard
            key={upload.id}
            upload={upload}
            onDone={async (published) => {
              await refresh();
              if (published) await onPublished();
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({ upload, onDone }: { upload: IntakeUpload; onDone: (published: boolean) => Promise<void> }) {
  const [sheet, setSheet] = useState<IntakeSheet>(upload.sheet ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const needsConfirmation = upload.status === 'probable_duplicate' || upload.copyrightFlag || upload.personalDataFlag;
  const reviewable = ['pending_review', 'probable_duplicate', 'ready'].includes(upload.status);

  const run = async (action: () => Promise<unknown>, published = false) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onDone(published);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
      setBusy(false);
    }
  };

  const publish = () => {
    if (
      needsConfirmation &&
      !window.confirm('Ce PDF demande une vérification (doublon probable, droits d’auteur ou données personnelles). Publier quand même ?')
    ) {
      return;
    }
    void run(() => publishIntake(upload.id, sheet, needsConfirmation), true);
  };

  return (
    <li className="rounded-xl border border-stitch-outline-variant bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-stitch-on-surface">{upload.sheet?.title || upload.originalName}</p>
          <p className="text-xs text-stitch-on-surface-variant">
            {upload.source === 'student' ? `Étudiant · ${upload.uploaderEmail ?? ''}` : 'Import admin'} ·{' '}
            {new Date(upload.createdAt).toLocaleString('fr-FR')}
          </p>
        </div>
        <IntakeBadge status={upload.status} />
      </div>

      {(upload.copyrightFlag || upload.personalDataFlag) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {upload.copyrightFlag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <ShieldAlert size={14} /> Droits d’auteur à vérifier
            </span>
          )}
          {upload.personalDataFlag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <ShieldAlert size={14} /> Données personnelles
            </span>
          )}
        </div>
      )}

      {upload.duplicateOf && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-stitch-outline-variant p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-stitch-on-surface-variant">Envoyé</p>
            <p className="font-semibold text-stitch-on-surface">{upload.sheet?.title || upload.originalName}</p>
            {upload.storageUrl && (
              <a href={upload.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stitch-primary underline">
                Ouvrir <ExternalLink size={14} />
              </a>
            )}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-amber-700">
              Existant{upload.similarity !== null ? ` · ressemblance ${Math.round(upload.similarity * 100)} %` : ''}
            </p>
            <p className="font-semibold text-stitch-on-surface">{upload.duplicateOf.title || upload.duplicateOf.id}</p>
            {upload.duplicateUrl && (
              <a href={upload.duplicateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stitch-primary underline">
                Ouvrir <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}

      {upload.rejectReason && <p className="mt-3 text-sm text-stitch-on-surface-variant">Motif : {upload.rejectReason}</p>}

      {reviewable && (
        <div className="mt-4 space-y-3">
          <SheetEditor sheet={sheet} onChange={setSheet} />
          {rejecting && (
            <textarea
              className="w-full rounded-xl border border-stitch-outline-variant px-3 py-2 text-sm"
              placeholder="Raison du refus (visible par l’étudiant)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={publish}
              className="rounded-lg bg-stitch-primary px-4 py-2 text-sm font-semibold text-stitch-on-primary hover:opacity-90 disabled:opacity-40"
            >
              {upload.source === 'student' ? 'Publier (+10 coins)' : 'Publier'}
            </button>
            <button
              type="button"
              disabled={busy || (rejecting && reason.trim().length < 3)}
              onClick={() => (rejecting ? void run(() => rejectIntake(upload.id, reason)) : setRejecting(true))}
              className="rounded-lg border border-stitch-outline-variant px-4 py-2 text-sm font-semibold text-stitch-on-surface hover:bg-stitch-surface-container disabled:opacity-40"
            >
              {rejecting ? 'Confirmer le refus' : 'Refuser'}
            </button>
          </div>
        </div>
      )}

      {upload.status === 'analyzing' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => reanalyzeIntake(upload.id))}
          className="mt-3 rounded-lg border border-stitch-outline-variant px-4 py-2 text-sm font-semibold text-stitch-on-surface hover:bg-stitch-surface-container disabled:opacity-40"
        >
          Relancer l’analyse
        </button>
      )}

      {error && <p className="mt-3 text-sm text-stitch-error">{error}</p>}
    </li>
  );
}
