'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Field, Notice, PageTitle, Toggle, dateTime, inputClass } from '../_components/admin-kit';

type Entry = { key: string; value: Record<string, any>; updatedAt: string | null; updatedBy: string | null };

const FEATURES: Array<[string, string, string]> = [
  ['ai', 'Assistant IA', 'Génération de rapports, CV, chat PDF. Coupé : le serveur refuse les requêtes IA.'],
  ['payments', 'Recharges Mobile Money', 'Coupé : les nouvelles recharges Notch Pay sont refusées.'],
  ['stages', 'Candidatures aux stages', "Coupé : les étudiants voient les offres mais ne peuvent plus postuler."],
  ['pdf', 'Catalogue PDF', "Affichage des annales et cours dans l'app."],
  ['documents', 'Rédaction de documents', "Création de rapports et mémoires dans l'app."],
];

export function MobileControlClient() {
  const [entries, setEntries] = useState<Record<string, Entry> | null>(null);
  const [migrated, setMigrated] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/app-config')
      .then((r) => r.json())
      .then((data) => {
        setMigrated(Boolean(data.migrated));
        setEntries(Object.fromEntries((data.entries as Entry[]).map((e) => [e.key, e])));
      })
      .catch(() => setNotice({ tone: 'error', text: 'Réglages illisibles : vérifiez la connexion à la base.' }));
  }, []);

  const patch = (key: string, value: Record<string, any>) =>
    setEntries((prev) => (prev ? { ...prev, [key]: { ...prev[key], value: { ...prev[key].value, ...value } } } : prev));

  const save = async (key: string, confirmText?: string) => {
    if (!entries || (confirmText && !window.confirm(confirmText))) return;
    setSaving(key);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: entries[key].value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enregistrement impossible');
      setNotice({ tone: 'success', text: data.message });
      setEntries((prev) => (prev ? { ...prev, [key]: { ...prev[key], updatedAt: new Date().toISOString(), updatedBy: 'vous' } } : prev));
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur réseau' });
    } finally {
      setSaving(null);
    }
  };

  if (!entries) {
    return <div className="flex justify-center py-24 text-fg-subtle"><Loader2 className="animate-spin" /></div>;
  }

  const maintenance = entries.maintenance.value;
  const minVersion = entries.min_version.value;
  const features = entries.features.value;
  const announcement = entries.announcement.value;

  return (
    <div>
      <PageTitle
        title="App mobile"
        lead="Ce que vous changez ici s'applique à l'app des étudiants en moins d'une minute, sans nouvelle version. L'écran de maintenance et la mise à jour forcée demandent une app à jour (OTA)."
      />

      {!migrated ? (
        <Notice tone="error">La table des réglages n'existe pas encore. Appliquez la migration 0021 (cd mobile-api && npm run migrate) puis rechargez la page.</Notice>
      ) : null}
      {notice ? <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel
            title="Maintenance"
            entry={entries.maintenance}
            tone={maintenance.enabled ? 'warning' : undefined}
            footer={
              <SaveButton
                busy={saving === 'maintenance'}
                onClick={() => save('maintenance', maintenance.enabled ? "Activer la maintenance bloque l'app pour tous les étudiants. Continuer ?" : undefined)}
              />
            }
          >
            <Toggle
              checked={Boolean(maintenance.enabled)}
              onChange={(enabled) => patch('maintenance', { enabled })}
              label="Mettre l'app en maintenance"
              description="Les étudiants voient un écran d'attente à la place de l'app."
            />
            <Field label="Message affiché">
              <textarea className={`${inputClass} min-h-[72px]`} maxLength={300} value={maintenance.message} onChange={(e) => patch('maintenance', { message: e.target.value })} />
            </Field>
          </Panel>

          <Panel title="Fonctionnalités" entry={entries.features} footer={<SaveButton busy={saving === 'features'} onClick={() => save('features')} />}>
            <div className="divide-y divide-border-light">
              {FEATURES.map(([key, label, description]) => (
                <Toggle key={key} checked={features[key] !== false} onChange={(on) => patch('features', { [key]: on })} label={label} description={description} />
              ))}
            </div>
          </Panel>

          <Panel title="Version minimale" entry={entries.min_version} footer={<SaveButton busy={saving === 'min_version'} onClick={() => save('min_version', 'Les versions plus anciennes devront se mettre à jour pour continuer. Continuer ?')} />}>
            <p className="mb-4 text-[12.5px] text-fg-subtle">Version actuelle de l'app : 1.2.0. Une app plus ancienne que le minimum affiche « Mise à jour nécessaire ». Laissez 0.0.0 pour ne rien forcer.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Android minimum"><input className={`${inputClass} font-mono`} value={minVersion.android} onChange={(e) => patch('min_version', { android: e.target.value })} /></Field>
              <Field label="iOS minimum"><input className={`${inputClass} font-mono`} value={minVersion.ios} onChange={(e) => patch('min_version', { ios: e.target.value })} /></Field>
              <Field label="Recommandée"><input className={`${inputClass} font-mono`} value={minVersion.recommended} onChange={(e) => patch('min_version', { recommended: e.target.value })} /></Field>
            </div>
            <div className="mt-4">
              <Field label="Lien de téléchargement"><input className={inputClass} value={minVersion.updateUrl} onChange={(e) => patch('min_version', { updateUrl: e.target.value })} /></Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Annonce sur l'accueil" entry={entries.announcement} footer={<SaveButton busy={saving === 'announcement'} onClick={() => save('announcement')} />}>
            <Toggle checked={Boolean(announcement.enabled)} onChange={(enabled) => patch('announcement', { enabled })} label="Afficher l'annonce" />
            <div className="space-y-3">
              <Field label="Titre"><input className={inputClass} maxLength={80} value={announcement.title} onChange={(e) => patch('announcement', { title: e.target.value })} placeholder="Nouveaux stages à Douala" /></Field>
              <Field label="Message"><textarea className={`${inputClass} min-h-[72px]`} maxLength={240} value={announcement.message} onChange={(e) => patch('announcement', { message: e.target.value })} /></Field>
              <Field label="Lien (facultatif)"><input className={inputClass} value={announcement.link} onChange={(e) => patch('announcement', { link: e.target.value })} placeholder="https://" /></Field>
              <Field label="Ton">
                <select className={inputClass} value={announcement.tone} onChange={(e) => patch('announcement', { tone: e.target.value })}>
                  <option value="info">Information</option>
                  <option value="success">Bonne nouvelle</option>
                  <option value="warning">Alerte</option>
                </select>
              </Field>
            </div>
            <div className="mt-5">
              <div className="mb-2 text-[12px] font-medium text-fg-subtle">Aperçu dans l'app</div>
              <div className="rounded-[22px] border-[6px] border-tower bg-surface-2 p-3 pt-20">
                {announcement.title || announcement.message ? (
                  <div className={`rounded-xl p-3 text-on-primary ${announcement.tone === 'warning' ? 'bg-primary-active' : 'bg-tower'}`}>
                    {announcement.title ? <div className="text-[13px] font-semibold">{announcement.title}</div> : null}
                    {announcement.message ? <div className="mt-0.5 text-[12px] opacity-80">{announcement.message}</div> : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-3 text-center text-[12px] text-fg-subtle">Écrivez un titre ou un message</div>
                )}
                <div className="mt-3 h-8 rounded-lg bg-surface" />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, entry, children, footer, tone }: { title: string; entry: Entry; children: ReactNode; footer: ReactNode; tone?: 'warning' }) {
  return (
    <section className={`rounded-xl border bg-surface ${tone === 'warning' ? 'border-warning' : 'border-border'}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border-light px-5 py-4">
        <h2 className="font-display text-[17px] font-bold text-fg">{title}</h2>
        <span className="text-[11.5px] text-fg-subtle">
          {entry.updatedAt ? `Modifié ${dateTime(entry.updatedAt)}${entry.updatedBy ? ` par ${entry.updatedBy}` : ''}` : 'Valeur par défaut'}
        </span>
      </div>
      <div className="px-5 py-3">{children}</div>
      <div className="flex justify-end border-t border-border-light px-5 py-3">{footer}</div>
    </section>
  );
}

function SaveButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer
    </button>
  );
}
