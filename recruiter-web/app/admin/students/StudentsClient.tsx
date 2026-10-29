'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';

import type { AdminStudentDetail, AdminStudentRow, AdminStudentTotals } from '@/lib/admin-students';
import {
  Drawer, Field, Figure, FigureStrip, Notice, PageTitle,
  dateTime, fcfa, inputClass, num, relative, shortDate,
} from '../_components/admin-kit';

const FILTERS = [
  ['all', 'Tous'],
  ['paying', 'Ont payé'],
  ['inactive', 'Inactifs 7 j'],
  ['banned', 'Bannis'],
  ['admins', 'Admins'],
] as const;

const SORTS = [
  ['recent', 'Inscription récente'],
  ['active', 'Activité récente'],
  ['paid', 'Montant payé'],
  ['applications', 'Candidatures'],
  ['documents', 'Documents créés'],
] as const;

type Filter = (typeof FILTERS)[number][0];
type Sort = (typeof SORTS)[number][0];

export function StudentsClient() {
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [totals, setTotals] = useState<AdminStudentTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useCallback(
    (format?: 'csv') => {
      const params = new URLSearchParams({ filter, sort });
      if (search.trim()) params.set('search', search.trim());
      if (format) params.set('format', format);
      return `/api/admin/students?${params.toString()}`;
    },
    [filter, sort, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(query());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chargement impossible');
      setStudents(data.students);
      setTotals(data.totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div>
      <PageTitle
        title="Étudiants"
        lead="Chaque compte avec ce qu'il a produit et payé : CV, rapports, mémoires, candidatures, recharges. Cliquez sur une ligne pour ouvrir la fiche."
        actions={
          <a
            href={query('csv')}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            <Download size={15} /> Exporter en CSV
          </a>
        }
      />

      {totals ? (
        <FigureStrip>
          <Figure label="Comptes" value={num(totals.students)} hint={`${num(totals.active7d)} actifs sur 7 jours`} />
          <Figure label="CV générés" value={num(totals.cvs)} tone="primary" />
          <Figure label="Rapports · mémoires" value={`${num(totals.reports)} · ${num(totals.memoirs)}`} />
          <Figure label="Encaissé" value={fcfa(totals.paidFcfa)} hint={`${num(totals.payments)} recharges · ${num(totals.applications)} candidatures`} tone="money" />
        </FigureStrip>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, e-mail, téléphone, université"
            aria-label="Rechercher un étudiant"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={[
                'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                filter === value ? 'bg-surface text-fg shadow-card' : 'text-fg-subtle hover:text-fg',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier" className={`${inputClass} w-auto sm:ml-auto`}>
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>Trier : {label}</option>
          ))}
        </select>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border bg-surface-soft text-[12px] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Étudiant</th>
                <th className="px-3 py-3 font-medium">Dernière activité</th>
                <th className="px-3 py-3 text-right font-medium">CV</th>
                <th className="px-3 py-3 text-right font-medium">Rapports</th>
                <th className="px-3 py-3 text-right font-medium">Mémoires</th>
                <th className="px-3 py-3 text-right font-medium">Candid.</th>
                <th className="px-3 py-3 text-right font-medium">Payé</th>
                <th className="px-3 py-3 text-right font-medium">Solde</th>
                <th className="px-4 py-3 text-right font-medium">IA 24 h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {loading && students.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-14 text-center text-fg-subtle"><Loader2 className="mx-auto animate-spin" size={20} /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-14 text-center text-fg-subtle">Aucun étudiant ne correspond. Changez le filtre ou la recherche.</td></tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setOpenId(s.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setOpenId(s.id)}
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-primary-tint focus:bg-primary-tint focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-[13px] font-bold text-primary">
                          {s.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-fg">{s.name}</span>
                            {s.banned ? <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-danger">Banni</span> : null}
                            {s.role !== 'student' ? <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary">{s.role}</span> : null}
                          </div>
                          <div className="truncate text-[12px] text-fg-subtle">{s.email}{s.university ? ` · ${s.university}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-muted">{relative(s.lastActiveAt)}</td>
                    <Count n={s.cvCount} />
                    <Count n={s.reportCount} />
                    <Count n={s.memoirCount} />
                    <Count n={s.applicationCount} />
                    <td className="px-3 py-3 text-right font-mono text-[13px] tabular-nums">
                      {s.paidFcfa > 0 ? <span className="font-semibold text-money">{num(s.paidFcfa)}</span> : <span className="text-fg-faint">0</span>}
                      {s.paymentCount > 0 ? <span className="ml-1 text-[11px] text-fg-subtle">({s.paymentCount})</span> : null}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[13px] tabular-nums text-fg">{num(s.balanceCoins)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-fg-muted">{s.aiCalls24h}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border-light px-4 py-2.5 text-[12px] text-fg-subtle">
          {students.length} étudiant(s) affiché(s) · montants payés en FCFA, soldes en coins (1 coin = 1 FCFA)
        </div>
      </div>

      <StudentDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}

function Count({ n }: { n: number }) {
  return (
    <td className="px-3 py-3 text-right font-mono text-[13px] tabular-nums">
      {n > 0 ? <span className="font-semibold text-fg">{n}</span> : <span className="text-fg-faint">0</span>}
    </td>
  );
}

const TABS = [
  ['payments', 'Paiements'],
  ['applications', 'Candidatures'],
  ['documents', 'Documents'],
  ['account', 'Compte'],
] as const;

type Tab = (typeof TABS)[number][0];

const TX_LABELS: Record<string, string> = {
  topup: 'Recharge Mobile Money',
  purchase: 'Achat',
  bonus: 'Bonus offert',
  admin_adjustment: 'Ajustement admin',
  ia_pack: 'Pack IA',
  subscription: 'Abonnement',
  withdrawal: 'Retrait',
  commission: 'Commission',
};

const DOC_LABELS: Record<string, string> = {
  cv: 'CV',
  stage: 'Rapport de stage',
  memoire: 'Mémoire',
  lettre_motivation: 'Lettre de motivation',
  blank: 'Document libre',
};

const APP_STATUS: Record<string, string> = {
  PENDING: 'Envoyée',
  REVIEWING: 'En étude',
  INTERVIEW: 'Entretien',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Retirée',
};

function StudentDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('payments');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fiche introuvable');
      setDetail(data);
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setDetail(null);
    setNotice(null);
    setTab('payments');
    setAmount('');
    setReason('');
    void load();
  }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}, confirmText?: string) => {
    if (!id || (confirmText && !window.confirm(confirmText))) return;
    setBusy(action);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action impossible');
      setNotice({ tone: 'success', text: data.message });
      await load();
      onChanged();
      return true;
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur réseau' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const s = detail?.student;
  const payments = detail?.transactions.filter((t) => t.type === 'topup') ?? [];

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={s?.name ?? 'Chargement…'}
      subtitle={s ? `${s.email}${s.phone ? ` · ${s.phone}` : ''} · inscrit le ${shortDate(s.createdAt)}` : undefined}
    >
      {loading && !detail ? (
        <div className="flex justify-center py-20 text-fg-subtle"><Loader2 className="animate-spin" /></div>
      ) : s && detail ? (
        <div>
          <div className="grid grid-cols-3 gap-px border-b border-border bg-border-light sm:grid-cols-6 [&>*]:bg-surface">
            <Mini label="Solde" value={num(s.balanceCoins)} />
            <Mini label="Payé" value={num(s.paidFcfa)} money />
            <Mini label="CV" value={num(s.cvCount)} />
            <Mini label="Rapports" value={num(s.reportCount)} />
            <Mini label="Mémoires" value={num(s.memoirCount)} />
            <Mini label="Candid." value={num(s.applicationCount)} />
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-border px-4">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={[
                  '-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-[13.5px] font-medium',
                  tab === value ? 'border-primary text-primary' : 'border-transparent text-fg-subtle hover:text-fg',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {notice ? <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice> : null}

            {tab === 'payments' ? (
              <div className="space-y-6">
                <div className="text-[13px] text-fg-muted">
                  {payments.filter((p) => p.status === 'success').length} recharge(s) réussie(s) ·{' '}
                  {payments.filter((p) => p.status === 'pending').length} en attente ·{' '}
                  {payments.filter((p) => p.status === 'failed').length} échouée(s) · {num(s.spentCoins)} coins dépensés
                </div>
                <List
                  empty="Aucun mouvement sur ce wallet."
                  rows={detail.transactions.map((t) => ({
                    key: t.id,
                    title: TX_LABELS[t.type] ?? t.type,
                    meta: [dateTime(t.createdAt), t.packType, t.referenceId, t.note].filter(Boolean).join(' · '),
                    right: (
                      <div className="text-right">
                        <div className={`font-mono text-[13px] font-semibold tabular-nums ${t.amountCoins > 0 ? 'text-money' : t.amountCoins < 0 ? 'text-fg' : 'text-fg-subtle'}`}>
                          {t.amountCoins > 0 ? '+' : ''}{num(t.amountCoins)}
                        </div>
                        <StatusTag status={t.status} />
                      </div>
                    ),
                  }))}
                />
                {detail.pdfPurchases.length ? (
                  <div>
                    <h3 className="mb-2 text-[13px] font-semibold text-fg">PDF achetés</h3>
                    <List
                      empty=""
                      rows={detail.pdfPurchases.map((p) => ({
                        key: p.id,
                        title: p.title,
                        meta: dateTime(p.createdAt),
                        right: <span className="font-mono text-[13px] tabular-nums">{num(p.amountCoins)}</span>,
                      }))}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === 'applications' ? (
              <List
                empty="Cet étudiant n'a encore postulé à aucune offre."
                rows={detail.applications.map((a) => ({
                  key: a.id,
                  title: a.jobTitle,
                  meta: `${a.companyName} · ${dateTime(a.appliedAt)}${a.hasCv ? ' · CV joint' : ''}${a.hasLetter ? ' · lettre jointe' : ''}`,
                  right: <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-fg-muted">{APP_STATUS[a.status] ?? a.status}</span>,
                }))}
              />
            ) : null}

            {tab === 'documents' ? (
              <List
                empty="Aucun document créé dans l'app."
                rows={detail.documents.map((d) => ({
                  key: d.id,
                  title: d.title,
                  meta: `Modifié ${relative(d.updatedAt)} · créé le ${shortDate(d.createdAt)}`,
                  right: <span className="rounded-md bg-primary-tint px-2 py-0.5 text-[12px] font-medium text-primary">{DOC_LABELS[d.templateType] ?? d.templateType}</span>,
                }))}
              />
            ) : null}

            {tab === 'account' ? (
              <div className="space-y-7">
                <section>
                  <h3 className="mb-1 font-display text-base font-bold text-fg">Créditer ou débiter des coins</h3>
                  <p className="mb-3 text-[12.5px] text-fg-subtle">Montant négatif pour un débit, 50 000 coins au maximum. Le motif apparaît dans l'historique du wallet.</p>
                  <form
                    className="grid gap-3 sm:grid-cols-[140px_1fr_auto]"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const value = Number(amount);
                      const ok = await act('adjust-wallet', { amount: value, reason }, `${value > 0 ? 'Créditer' : 'Débiter'} ${Math.abs(value)} coins à ${s.name} ?`);
                      if (ok) { setAmount(''); setReason(''); }
                    }}
                  >
                    <Field label="Montant"><input className={inputClass} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" required pattern="-?\d+" /></Field>
                    <Field label="Motif"><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Geste commercial, recharge non reçue…" required minLength={3} /></Field>
                    <button type="submit" disabled={busy === 'adjust-wallet'} className="h-[38px] self-end rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50">
                      Appliquer
                    </button>
                  </form>
                </section>

                <section className="divide-y divide-border-light rounded-xl border border-border">
                  <ActionRow
                    title="Quota IA"
                    text={`${s.aiCalls24h} appel(s) sur les dernières 24 h.`}
                    label="Remettre à zéro"
                    busy={busy === 'reset-ai-quota'}
                    onClick={() => act('reset-ai-quota')}
                  />
                  <ActionRow
                    title="Sessions"
                    text={`${detail.sessions.length} session(s) ouverte(s) · ${detail.pushDevices} appareil(s) pour les notifications · vu ${relative(s.lastActiveAt)}.`}
                    label="Déconnecter partout"
                    busy={busy === 'revoke-sessions'}
                    onClick={() => act('revoke-sessions', {}, `Déconnecter ${s.name} de tous ses appareils ?`)}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                    <div>
                      <div className="text-sm font-semibold text-fg">Rôle</div>
                      <div className="text-[12.5px] text-fg-subtle">Un admin accède à ce dashboard.</div>
                    </div>
                    <select
                      value={s.role}
                      disabled={busy === 'set-role'}
                      onChange={(e) => act('set-role', { role: e.target.value }, `Passer ${s.name} en « ${e.target.value} » ?`)}
                      className={`${inputClass} w-auto`}
                      aria-label="Rôle"
                    >
                      <option value="student">Étudiant</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </div>
                  {s.banned ? (
                    <ActionRow title="Compte banni" text="L'étudiant ne peut plus se connecter." label="Débannir" busy={busy === 'unban'} onClick={() => act('unban')} />
                  ) : (
                    <ActionRow
                      title="Bannir"
                      text="Bloque la connexion et ferme toutes les sessions."
                      label="Bannir"
                      danger
                      busy={busy === 'ban'}
                      onClick={() => {
                        const why = window.prompt(`Motif du bannissement de ${s.name} :`);
                        if (why !== null) void act('ban', { reason: why });
                      }}
                    />
                  )}
                </section>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                  <Info label="Université" value={s.university} />
                  <Info label="Filière" value={s.faculty} />
                  <Info label="Niveau" value={s.level} />
                  <Info label="Lettres de motivation" value={String(s.letterCount)} />
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function Mini({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11.5px] text-fg-subtle">{label}</div>
      <div className={`font-mono text-[17px] font-semibold tabular-nums ${money ? 'text-money' : 'text-fg'}`}>{value}</div>
    </div>
  );
}

function List({ rows, empty }: { rows: Array<{ key: string; title: string; meta: string; right: React.ReactNode }>; empty: string }) {
  if (!rows.length) return empty ? <p className="py-8 text-center text-sm text-fg-subtle">{empty}</p> : null;
  return (
    <ul className="divide-y divide-border-light rounded-xl border border-border">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-fg">{r.title}</div>
            <div className="truncate text-[12px] text-fg-subtle">{r.meta}</div>
          </div>
          <div className="shrink-0">{r.right}</div>
        </li>
      ))}
    </ul>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    success: ['Réussi', 'text-money'],
    pending: ['En attente', 'text-warning'],
    failed: ['Échoué', 'text-danger'],
  };
  const [label, color] = map[status] ?? [status, 'text-fg-subtle'];
  return <div className={`text-[11px] font-medium ${color}`}>{label}</div>;
}

function ActionRow({ title, text, label, onClick, busy, danger }: { title: string; text: string; label: string; onClick: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-fg">{title}</div>
        <div className="text-[12.5px] text-fg-subtle">{text}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={[
          'h-8 rounded-lg border px-3 text-[13px] font-semibold disabled:opacity-50',
          danger ? 'border-danger/40 text-danger hover:bg-danger-soft' : 'border-border text-fg hover:bg-surface-2',
        ].join(' ')}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : label}
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="font-medium text-fg">{value || '—'}</dd>
    </div>
  );
}
