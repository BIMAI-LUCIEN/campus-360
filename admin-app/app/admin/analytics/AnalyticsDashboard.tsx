'use client';

import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Wallet,
  Banknote,
  Loader2,
} from 'lucide-react';
import type { PdfAnalyticsSummary } from '@/lib/supabase-pdf';
import {
  Card,
  CardHeader,
  KpiCard,
  Pill,
  Button,
  PageHeader,
  EmptyState,
} from '@/app/admin/_components/ui';
import { DashboardCharts } from './DashboardCharts';

interface AnalyticsDashboardProps {
  initialData: PdfAnalyticsSummary;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Formatters
 * ──────────────────────────────────────────────────────────────────────── */

const formatInt = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

function formatFcfa(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 1).replace(/\.0$/, '')}M FCFA`;
  }
  if (v >= 1_000) {
    return `${Math.round(v / 1_000)}k FCFA`;
  }
  return `${formatInt(v)} FCFA`;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Wallet sparkline (tiny inline SVG) — receives live weekly values.
 * ──────────────────────────────────────────────────────────────────────── */

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const w = 220;
  const h = 56;
  const padX = 8;
  const padY = 8;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const barW = (innerW / values.length) * 0.55;
  const gap = (innerW / values.length) * 0.45;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-full"
      role="img"
      aria-label="Tendance hebdomadaire du portefeuille"
    >
      {values.map((v, i) => {
        const x = padX + i * (barW + gap);
        const ratio = v / max;
        const barH = Math.max(6, ratio * innerH);
        const y = h - padY - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill="#10b981"
              opacity={0.4 + (i / Math.max(1, values.length - 1)) * 0.5}
            />
            <text
              x={x + barW / 2}
              y={h - 1}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#6b7280"
              fontFamily="Inter, sans-serif"
            >
              S{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Cohort heatmap colour scale (no mock data, only real values).
 * ──────────────────────────────────────────────────────────────────────── */

function retentionColor(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped === 0) return '#f1f5f9';
  const stops = [
    { v: 0, c: [209, 250, 229] },   // emerald-100 (uses our brand green)
    { v: 50, c: [16, 185, 129] },   // emerald-500
    { v: 100, c: [4, 120, 87] },    // emerald-700
  ];
  let from = stops[0];
  let to = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (clamped >= stops[i].v && clamped <= stops[i + 1].v) {
      from = stops[i];
      to = stops[i + 1];
      break;
    }
  }
  const t = (clamped - from.v) / Math.max(1, to.v - from.v);
  const r = Math.round(from.c[0] + (to.c[0] - from.c[0]) * t);
  const g = Math.round(from.c[1] + (to.c[1] - from.c[1]) * t);
  const b = Math.round(from.c[2] + (to.c[2] - from.c[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function textColorFor(value: number): string {
  return value >= 50 ? '#ffffff' : '#064e3b';
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ──────────────────────────────────────────────────────────────────────── */

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<PdfAnalyticsSummary>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [range, setRange] = useState<'7j' | '30j' | '90j'>('30j');

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsFetching(true);
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const freshData = await res.json();
          setData(freshData);
          setLastUpdated(new Date());
          setFetchError('');
        } else {
          setFetchError(`Synchronisation impossible (${res.status}).`);
        }
      } catch (err) {
        console.error('Error fetching live analytics:', err);
        setFetchError('Hors ligne — données affichées en cache.');
      } finally {
        setIsFetching(false);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
        setLastUpdated(new Date());
        setFetchError('');
      }
    } catch {
      setFetchError('Hors ligne.');
    } finally {
      setIsFetching(false);
    }
  };

  const conversionRate =
    data.totals.previews > 0
      ? Math.round((data.totals.purchases / data.totals.previews) * 100)
      : 0;

  // Weekly trend: compare last 7d purchases to prior 7d.
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekPurchases = data.dailyStats
    .filter((d) => {
      const date = new Date(d.date);
      return date >= oneWeekAgo && date <= today;
    })
    .reduce((sum, d) => sum + d.purchases, 0);

  const lastWeekPurchases = data.dailyStats
    .filter((d) => {
      const date = new Date(d.date);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    })
    .reduce((sum, d) => sum + d.purchases, 0);

  const weeklyTrend =
    lastWeekPurchases > 0
      ? Math.round(((thisWeekPurchases - lastWeekPurchases) / lastWeekPurchases) * 100)
      : thisWeekPurchases > 0
        ? 100
        : 0;

  // ── Funnel — derive from the API's funnel block. ────────────
  const funnel = data.funnel;
  const funnelStages = useMemo(() => {
    const base = funnel.visitors || 0;
    if (base === 0) return [];
    return [
      { stage: 'Visiteur',  value: 100, count: funnel.visitors },
      { stage: 'Recherche', value: funnel.visitors ? Math.round((funnel.searchers / funnel.visitors) * 100) : 0, count: funnel.searchers },
      { stage: 'Aperçu',    value: funnel.visitors ? Math.round((funnel.previewers / funnel.visitors) * 100) : 0, count: funnel.previewers },
      { stage: 'Achat',     value: funnel.visitors ? Math.round((funnel.buyers / funnel.visitors) * 100) : 0, count: funnel.buyers },
      { stage: 'Lecture',   value: funnel.visitors ? Math.round((funnel.readers / funnel.visitors) * 100) : 0, count: funnel.readers },
    ];
  }, [funnel]);

  // ── Wallet ────────────────────────────────────────────────
  const wallet = data.wallet;
  const walletRechargeSeries = wallet.weeklyRecharge ?? [];
  const walletSpendSeries = wallet.weeklySpend ?? [];

  // ── IA ───────────────────────────────────────────────────
  const ia = data.ia;
  const maxIaRequests = Math.max(1, ...(ia.byFaculty ?? []).map((f) => f.requests));

  // ── Cohorts ──────────────────────────────────────────────
  const cohorts = data.cohorts ?? [];
  const cohortLabels = ['Sem.0', 'Sem.1', 'Sem.2', 'Sem.3'];

  const hasAnyData = data.configured && (
    data.totals.sessions > 0 ||
    funnel.visitors > 0 ||
    wallet.totalRecharge > 0 ||
    ia.totalQuestions > 0
  );

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <PageHeader
        breadcrumb={{ parent: 'Dashboard', current: 'Analytics' }}
        title="Analytics"
        subtitle="Comprendre comment Campus 360 performe."
        actions={
          <>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-fg">
              <Calendar size={14} className="text-fg-subtle" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as '7j' | '30j' | '90j')}
                className="appearance-none bg-transparent outline-none cursor-pointer pr-1"
                aria-label="Plage temporelle"
              >
                <option value="7j">7 derniers jours</option>
                <option value="30j">30 derniers jours</option>
                <option value="90j">90 derniers jours</option>
              </select>
            </div>
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={refresh}
              className={isFetching ? '[&_svg]:animate-spin' : ''}
            >
              Rafraîchir
            </Button>
            <Button variant="primary" icon={Download}>
              PDF Export
            </Button>
          </>
        }
      />

      {/* Status row */}
      {fetchError ? (
        <p className="mb-4 text-xs text-danger">{fetchError}</p>
      ) : (
        <p className="-mt-6 mb-6 text-xs text-fg-subtle">
          {isFetching
            ? 'Synchronisation…'
            : `Dernière mise à jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`}
        </p>
      )}

      {/* Unconfigured warning */}
      {!data.configured ? (
        <div className="mb-6 rounded-lg border border-warning-soft bg-warning-bg px-6 py-4 text-[13px] text-warning">
          <strong className="font-semibold">Base de données non connectée.</strong>{' '}
          Les compteurs affichent des zéros. Renseignez{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">
            DATABASE_URL
          </code>{' '}
          dans <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">.env.local</code>{' '}
          pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI row (4 cards) — all live data, no fallbacks ────── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenu Total"
          value={data.totals.revenue > 0 ? formatFcfa(data.totals.revenue) : '—'}
          icon={Banknote}
          accent="green"
          trend={
            weeklyTrend !== 0
              ? {
                  value: `${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend}%`,
                  direction: weeklyTrend > 0 ? 'up' : 'down',
                }
              : { value: '0%', direction: 'stable' }
          }
          caption="30 derniers jours"
        />
        <KpiCard
          label="Étudiants actifs"
          value={formatInt(funnel.visitors)}
          icon={TrendingUp}
          accent="blue"
          trend={
            data.catalog.newUsersThisWeek > 0
              ? { value: `+${data.catalog.newUsersThisWeek}`, direction: 'up' as const }
              : { value: '0%', direction: 'stable' as const }
          }
          caption={`${formatInt(data.totals.sessions)} sessions (30 j)`}
        />
        <KpiCard
          label="Conversions"
          value={data.totals.purchases > 0 ? `${conversionRate}%` : '—'}
          icon={ArrowRight}
          accent="purple"
          trend={
            data.totals.purchases > 0
              ? {
                  value: `${conversionRate}%`,
                  direction:
                    conversionRate >= 20 ? 'up' : conversionRate >= 5 ? 'stable' : 'down',
                }
              : { value: '0%', direction: 'stable' as const }
          }
          caption={`${formatInt(data.totals.purchases)} achats validés`}
        />
        <KpiCard
          label="Questions IA"
          value={formatInt(data.totals.assistantQuestions)}
          icon={Sparkles}
          accent="cyan"
          trend={{ value: '+0%', direction: 'stable' as const }}
          caption="30 derniers jours"
        />
      </div>

      {/* ── Section 1: Revenue surveillance (full width) ───── */}
      <Card className="mb-6">
        <CardHeader
          title="Surveillance des Revenus"
          subtitle="Évolution sur les 30 derniers jours"
          action={
            <div className="flex items-center gap-4 text-[11px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Achats / jour
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-blue" />
                Aperçus / jour
              </span>
            </div>
          }
        />
        {data.dailyStats.length > 0 ? (
          <DashboardCharts dailyStats={data.dailyStats} />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Aucun revenu enregistré"
            description="Les premiers achats apparaîtront ici dès qu'un étudiant achètera un document."
          />
        )}
      </Card>

      {/* ── Section 2: Conversion funnel + cohort retention ── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — Funnel */}
        <Card>
          <CardHeader
            title="Entonnoir de Conversion"
            subtitle="Sessions uniques par étape (30 j)"
            action={<Pill tone="blue">30 jours</Pill>}
          />
          {funnelStages.length === 0 ? (
            <EmptyState
              icon={ArrowRight}
              title="Aucune session"
              description="L'entonnoir apparaîtra dès qu'un étudiant ouvre le catalogue."
            />
          ) : (
            <div className="mt-2 flex flex-col gap-3.5">
              {funnelStages.map((stage, i) => {
                const opacity = 1 - i * 0.18;
                const bg = `rgba(16, 185, 129, ${Math.max(0.28, opacity)})`;
                return (
                  <div key={stage.stage}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12px] font-semibold text-fg">
                          {stage.stage}
                        </span>
                        <span className="text-[11px] font-semibold text-primary tabular-nums">
                          {stage.value}%
                        </span>
                      </div>
                      <span className="text-[11px] text-fg-subtle tabular-nums">
                        {formatInt(stage.count)} sessions
                      </span>
                    </div>
                    <div className="relative h-9 w-full overflow-hidden rounded-md bg-surface-2">
                      <div
                        className="h-full rounded-md transition-all duration-700"
                        style={{ width: `${stage.value}%`, background: bg }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* RIGHT — Cohort retention */}
        <Card>
          <CardHeader
            title="Rétention par Cohorte"
            subtitle="% d'étudiants revenus chaque semaine après inscription"
            action={<Pill tone="violet">{cohorts.length} cohortes</Pill>}
          />
          {cohorts.length === 0 ? (
            <EmptyState
              icon={Loader2}
              title="Pas encore de cohorte"
              description="Les rétentions s'afficheront dès qu'un mois d'inscription aura une semaine complète d'activité."
            />
          ) : (
            <>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full border-separate border-spacing-1 px-2">
                  <thead>
                    <tr>
                      <th className="rounded-md bg-surface-3 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                        Cohorte
                      </th>
                      <th className="rounded-md bg-surface-3 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                        Users
                      </th>
                      {cohortLabels.map((s) => (
                        <th
                          key={s}
                          className="rounded-md bg-surface-3 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-fg-muted"
                        >
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c) => (
                      <tr key={c.label}>
                        <td className="rounded-md bg-surface-2 px-3 py-2 text-[12px] font-semibold text-fg">
                          {c.label}
                        </td>
                        <td className="rounded-md bg-surface-2 px-3 py-2 text-right text-[12px] font-semibold text-fg tabular-nums">
                          {formatInt(c.users)}
                        </td>
                        {c.retentionPct.map((w, idx) => (
                          <td key={idx} className="p-0.5">
                            <div
                              className="flex h-9 items-center justify-center rounded-md text-[11px] font-bold tabular-nums"
                              style={{
                                backgroundColor: retentionColor(w),
                                color: textColorFor(w),
                              }}
                              title={`Sem.${idx} — ${w}%`}
                            >
                              {w}%
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-fg-subtle">
                <span>Faible</span>
                <div className="flex gap-0.5">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <span
                      key={v}
                      className="h-3 w-5 rounded-sm"
                      style={{ backgroundColor: retentionColor(v) }}
                    />
                  ))}
                </div>
                <span>Élevé</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Section 3: Wallet (live totals + weekly sparkline) ──── */}
      <Card className="mb-6">
        <CardHeader
          title="Portefeuille Campus 360 Pay"
          subtitle="Mouvements de recharge et dépenses (cumulé + 4 dernières semaines)"
          action={
            <Pill tone="blue">
              <Wallet size={10} className="mr-1" />
              Live
            </Pill>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border-light bg-surface-2 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              Total Recharge
            </div>
            <div className="mt-1.5 font-display text-[26px] font-bold leading-none text-fg tabular-nums">
              {wallet.totalRecharge > 0 ? formatFcfa(wallet.totalRecharge) : '—'}
            </div>
            <div className="mt-2 text-[10px] text-fg-subtle">
              Sommes entrantes via wallet_transactions (type = topup)
            </div>
          </div>
          <div className="rounded-lg border border-border-light bg-surface-2 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              Total Dépensé
            </div>
            <div className="mt-1.5 font-display text-[26px] font-bold leading-none text-fg tabular-nums">
              {wallet.totalSpend > 0 ? formatFcfa(wallet.totalSpend) : '—'}
            </div>
            <div className="mt-2 text-[10px] text-fg-subtle">
              Achats PDF, packs, abonnements, IA
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              Tendance 4 semaines (recharge)
            </span>
            <span className="text-[10px] text-fg-subtle">FCFA</span>
          </div>
          {walletRechargeSeries.some((v) => v > 0) ? (
            <Sparkline values={walletRechargeSeries} />
          ) : (
            <p className="py-6 text-center text-[12px] text-fg-subtle">
              Aucune recharge enregistrée sur les 4 dernières semaines.
            </p>
          )}
        </div>
      </Card>

      {/* ── Section 4: IA usage by faculty (live) ──────────────── */}
      <Card className="mb-6">
        <CardHeader
          title="Utilisation de l'IA par Faculté"
          subtitle="Volume de requêtes IA sur 30 jours (depuis public.ia_usage_logs)"
          action={
            <Pill tone="cyan">
              <Sparkles size={10} className="mr-1" />
              Campus IA
            </Pill>
          }
        />
        {ia.byFaculty.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Aucune question IA"
            description="Les requêtes des étudiants apparaîtront ici dès qu'ils utilisent Campus IA."
          />
        ) : (
          <div className="flex flex-col gap-3.5">
            {ia.byFaculty.map((f) => {
              const pct = Math.round((f.requests / maxIaRequests) * 100);
              return (
                <div
                  key={f.faculty}
                  className="grid grid-cols-[1fr_2fr_auto] items-center gap-3"
                >
                  <div className="truncate text-[12px] font-medium text-fg">
                    {f.faculty}
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background:
                          'linear-gradient(90deg, #10b981 0%, #047857 100%)',
                      }}
                    />
                  </div>
                  <div className="text-right text-[12px] font-bold text-fg tabular-nums">
                    {formatInt(f.requests)}{' '}
                    <span className="text-[10px] font-medium text-fg-subtle">
                      requêtes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Section 5: Top documents + Recent activity ─────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Documents les plus performants"
            subtitle="Top 8 par nombre d'achats sur 30 jours"
            action={
              <Link
                href="/admin/pdf"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
              >
                Voir tout <ChevronRight size={13} />
              </Link>
            }
          />
          {data.topDocuments.length === 0 ? (
            <EmptyState
              icon={Loader2}
              title="Aucune vente récente"
              description="Les documents achetés apparaîtront ici dès les premières transactions."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="rounded-tl-md border-b border-border bg-surface-2 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Document
                    </th>
                    <th className="border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Aperçus
                    </th>
                    <th className="border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Achats
                    </th>
                    <th className="border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Lectures
                    </th>
                    <th className="rounded-tr-md border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDocuments.slice(0, 8).map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="border-b border-border-light px-4 py-3.5 text-sm text-fg">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-xs text-fg-subtle">{doc.subject}</div>
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                        {formatInt(doc.previews)}
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                        {formatInt(doc.purchases)}
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                        {formatInt(doc.readers)}
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm text-fg">
                        <span
                          className={
                            doc.conversionRate >= 20
                              ? 'inline-flex items-center rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success'
                              : doc.conversionRate >= 5
                                ? 'inline-flex items-center rounded-full bg-primary-softer px-2.5 py-0.5 text-[11px] font-semibold text-primary'
                                : 'inline-flex items-center rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted'
                          }
                        >
                          {doc.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Activité récente"
            subtitle="20 derniers événements"
            action={
              <Link
                href="/admin/analytics"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
              >
                Voir tout <ChevronRight size={13} />
              </Link>
            }
          />
          {data.recentEvents.length === 0 ? (
            <EmptyState
              icon={Loader2}
              title="Pas encore d'activité"
              description="Les événements du catalogue apparaîtront ici."
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {data.recentEvents.slice(0, 8).map((ev) => {
                const tone =
                  ev.eventType === 'purchase_success'
                    ? 'green'
                    : ev.eventType === 'purchase_failed'
                      ? 'rose'
                      : ev.eventType === 'reader_open'
                        ? 'blue'
                        : ev.eventType === 'assistant_question'
                          ? 'amber'
                          : 'neutral';
                const label =
                  {
                    catalog_view: 'Vu le catalogue',
                    preview_open: 'Aperçu PDF',
                    reader_open: 'Lecture complète',
                    purchase_start: "Début d'achat",
                    purchase_success: 'Achat réussi',
                    purchase_failed: 'Échec de paiement',
                    search: 'Recherche',
                    assistant_question: "Question à l'IA",
                  }[ev.eventType] ?? ev.eventType;
                return (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 border-b border-border-light py-3 last:border-b-0"
                  >
                    <Pill tone={tone}>{label}</Pill>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 truncate text-[13px] font-medium text-fg">
                        {ev.documentTitle}
                      </div>
                      <div className="text-[11px] text-fg-subtle">
                        {ev.userEmail ?? 'Visiteur'} · {ev.createdAt}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
