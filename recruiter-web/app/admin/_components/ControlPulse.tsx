'use client';

// Top of the overview: what students produce and pay, what waits for the admin,
// and the live state of the mobile app.
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { AdminStudentTotals } from '@/lib/admin-students';
import { fcfa, num } from './admin-kit';

type State = {
  totals: AdminStudentTotals | null;
  pendingOffers: number | null;
  maintenance: boolean | null;
  disabled: string[];
};

const FEATURE_LABELS: Record<string, string> = { ai: 'IA', payments: 'paiements', stages: 'candidatures', pdf: 'PDF', documents: 'documents' };

export function ControlPulse() {
  const [state, setState] = useState<State>({ totals: null, pendingOffers: null, maintenance: null, disabled: [] });

  useEffect(() => {
    fetch('/api/admin/students?sort=recent').then((r) => (r.ok ? r.json() : null)).then((d) => d && setState((s) => ({ ...s, totals: d.totals }))).catch(() => undefined);
    fetch('/api/admin/stages?pipeline=pending_review').then((r) => (r.ok ? r.json() : null)).then((d) => Array.isArray(d) && setState((s) => ({ ...s, pendingOffers: d.length }))).catch(() => undefined);
    fetch('/api/admin/app-config').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d?.entries) return;
      const get = (key: string) => d.entries.find((e: { key: string }) => e.key === key)?.value ?? {};
      const features = get('features') as Record<string, boolean>;
      setState((s) => ({
        ...s,
        maintenance: Boolean(get('maintenance').enabled),
        disabled: Object.entries(features).filter(([, on]) => on === false).map(([k]) => FEATURE_LABELS[k] ?? k),
      }));
    }).catch(() => undefined);
  }, []);

  const t = state.totals;
  const appLine = state.maintenance === null
    ? '…'
    : state.maintenance
      ? 'En maintenance'
      : state.disabled.length
        ? `En ligne, ${state.disabled.join(', ')} coupé(s)`
        : 'En ligne, tout est actif';

  return (
    <section className="mb-8">
      <h1 className="font-display text-[30px] font-bold leading-none tracking-tight text-fg sm:text-[34px]">Tour de contrôle</h1>
      <p className="mt-2 text-sm text-fg-subtle">Ce que les étudiants font dans l'app, ce qui attend votre validation, et l'état de l'app.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border-light sm:grid-cols-3 [&>*]:bg-surface">
          <Stat label="Étudiants" value={t ? num(t.students) : '…'} hint={t ? `${num(t.active7d)} actifs cette semaine` : undefined} href="/admin/students" />
          <Stat label="CV générés" value={t ? num(t.cvs) : '…'} href="/admin/students" />
          <Stat label="Rapports · mémoires" value={t ? `${num(t.reports)} · ${num(t.memoirs)}` : '…'} href="/admin/students" />
          <Stat label="Candidatures" value={t ? num(t.applications) : '…'} href="/admin/applications" />
          <Stat label="Recharges réussies" value={t ? num(t.payments) : '…'} href="/admin/payments" />
          <Stat label="Encaissé" value={t ? fcfa(t.paidFcfa) : '…'} money href="/admin/payments" />
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/admin/mobile" className="group flex-1 rounded-xl bg-tower p-5 text-tower-fg transition-colors hover:bg-tower-2">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tower-muted">App mobile</div>
            <div className="mt-2 flex items-center gap-2 font-display text-xl font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${state.maintenance ? 'bg-warning' : 'bg-chart-green'}`} />
              {appLine}
            </div>
            <div className="mt-3 text-[13px] text-tower-muted group-hover:text-tower-fg">Maintenance, version minimale, interrupteurs, annonce →</div>
          </Link>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/stages" className="rounded-xl border border-border bg-surface p-4 hover:border-primary">
              <div className="text-[12px] text-fg-subtle">Offres à valider</div>
              <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${state.pendingOffers ? 'text-primary' : 'text-fg'}`}>{state.pendingOffers ?? '…'}</div>
            </Link>
            <Link href="/admin/notifications" className="rounded-xl border border-border bg-surface p-4 hover:border-primary">
              <div className="text-[12px] text-fg-subtle">Prévenir les étudiants</div>
              <div className="mt-1 text-sm font-semibold text-primary">Envoyer une notification →</div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint, href, money }: { label: string; value: string; hint?: string; href: string; money?: boolean }) {
  return (
    <Link href={href} className="block px-5 py-4 transition-colors hover:bg-primary-tint">
      <div className="text-[12px] text-fg-subtle">{label}</div>
      <div className={`mt-1 truncate font-mono text-[22px] font-semibold tabular-nums ${money ? 'text-money' : 'text-fg'}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11.5px] text-fg-subtle">{hint}</div> : null}
    </Link>
  );
}
