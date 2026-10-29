'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

import type { PushCampaign } from '@/lib/admin-app-control';
import { Field, Notice, PageTitle, dateTime, inputClass, num } from '../_components/admin-kit';

const AUDIENCES = [
  ['all', 'Tous les étudiants'],
  ['inactive7d', 'Inactifs depuis 7 jours'],
  ['paying', 'Ont déjà rechargé'],
  ['never_paid', "N'ont jamais rechargé"],
  ['university', 'Une université'],
  ['faculty', 'Une filière'],
] as const;

type Audience = (typeof AUDIENCES)[number][0];

export function NotificationsClient() {
  const [audience, setAudience] = useState<Audience>('all');
  const [segmentValue, setSegmentValue] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [reach, setReach] = useState<{ users: number; devices: number } | null>(null);
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const needsValue = audience === 'university' || audience === 'faculty';
  const segment = { audience, value: needsValue ? segmentValue : undefined };

  const loadCampaigns = useCallback(() => {
    fetch('/api/admin/push').then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? [])).catch(() => undefined);
  }, []);

  useEffect(loadCampaigns, [loadCampaigns]);

  useEffect(() => {
    if (needsValue && !segmentValue.trim()) {
      setReach(null);
      return;
    }
    const t = setTimeout(() => {
      fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', segment }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setReach(d ? { users: d.users, devices: d.devices } : null))
        .catch(() => setReach(null));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, segmentValue]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Envoyer « ${title} » à ${reach ? num(reach.users) : '?'} étudiant(s) ? Une notification envoyée ne peut pas être retirée.`)) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', segment, title, body, link }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Envoi impossible');
      setNotice({ tone: 'success', text: data.message });
      setTitle('');
      setBody('');
      setLink('');
      loadCampaigns();
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur réseau' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageTitle title="Notifications" lead="Envoyez une notification push sur le téléphone des étudiants. Seuls les comptes qui ont autorisé les notifications la reçoivent." />
      {notice ? <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={send} className="rounded-xl border border-border bg-surface">
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Destinataires">
                <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                  {AUDIENCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              {needsValue ? (
                <Field label={audience === 'university' ? 'Université' : 'Filière'}>
                  <input className={inputClass} value={segmentValue} onChange={(e) => setSegmentValue(e.target.value)} placeholder={audience === 'university' ? 'Université de Yaoundé I' : 'Informatique'} required />
                </Field>
              ) : null}
            </div>
            <Field label="Titre" hint={`${title.length}/65`}>
              <input className={inputClass} maxLength={65} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="12 nouveaux stages cette semaine" />
            </Field>
            <Field label="Message" hint={`${body.length}/240`}>
              <textarea className={`${inputClass} min-h-[96px]`} maxLength={240} value={body} onChange={(e) => setBody(e.target.value)} required minLength={2} placeholder="Ouvre Campus 360 pour postuler en un clic." />
            </Field>
            <Field label="Lien à ouvrir (facultatif)">
              <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light px-5 py-3">
            <span className="text-[13px] text-fg-muted">
              {reach ? <>Portée : <b className="font-mono text-fg">{num(reach.users)}</b> étudiant(s), {num(reach.devices)} appareil(s)</> : 'Portée inconnue'}
            </span>
            <button type="submit" disabled={sending || !reach?.devices} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Envoyer
            </button>
          </div>
        </form>

        <div>
          <div className="mb-2 text-[12px] font-medium text-fg-subtle">Aperçu sur le téléphone</div>
          <div className="rounded-[26px] bg-tower p-4 pb-24">
            <div className="mb-6 text-center font-mono text-[28px] font-semibold text-tower-fg">09:41</div>
            <div className="rounded-2xl bg-surface/95 p-3">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-fg-subtle">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[9px] font-bold text-on-primary">C</span>
                CAMPUS 360 · maintenant
              </div>
              <div className="text-[13px] font-semibold text-fg">{title || 'Titre de la notification'}</div>
              <div className="text-[12.5px] text-fg-muted">{body || 'Le message apparaît ici.'}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-10 font-display text-lg font-bold text-fg">Envois précédents</h2>
      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-subtle">Aucune notification envoyée pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-border-light rounded-xl border border-border bg-surface">
          {campaigns.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-fg">{c.title}</div>
                <div className="truncate text-[12px] text-fg-subtle">
                  {dateTime(c.createdAt)} · {AUDIENCES.find(([v]) => v === c.segment.audience)?.[1] ?? c.segment.audience}
                  {c.segment.value ? ` « ${c.segment.value} »` : ''} · par {c.createdBy ?? '—'}
                </div>
              </div>
              <div className="font-mono text-[13px] tabular-nums text-fg-muted">
                <span className="text-money">{num(c.sentCount)}</span> envoyés{c.failedCount ? <> · <span className="text-danger">{num(c.failedCount)}</span> échecs</> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
