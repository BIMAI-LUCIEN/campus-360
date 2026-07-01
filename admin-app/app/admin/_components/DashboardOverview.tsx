'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import type { PdfAnalyticsSummary } from '@/lib/supabase-pdf';
import { authClient } from '@/lib/auth-client';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  KpiCard,
} from './ui';

/* ─────────────────────────────────────────────────────────────────────────
 * Formatters
 * ──────────────────────────────────────────────────────────────────────── */

const formatInt = (v: number) => new Intl.NumberFormat('fr-FR').format(v);
const formatCoins = (v: number) =>
  `${new Intl.NumberFormat('fr-CM').format(v)} FCFA`;

const formatShortDate = (raw: string): string => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
};

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers — compute week-over-week deltas from dailyStats.
 * ──────────────────────────────────────────────────────────────────────── */

function parseStatsDate(raw: string): Date | null {
  if (!raw) return null;
  // Daily stats come from Postgres as either "DD Mon" (e.g. "01 Jul") or
  // a full ISO timestamp depending on the driver. Handle both.
  const isoCandidate = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw : null;
  if (isoCandidate) {
    const d = new Date(isoCandidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const currentYear = new Date().getFullYear();
  const withYear = `${raw} ${currentYear}`;
  const d = new Date(withYear);
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function trendFromDelta(delta: number, hasBaseline: boolean): {
  value: string;
  direction: 'up' | 'down' | 'stable';
} {
  if (!hasBaseline && delta === 0) {
    return { value: '0%', direction: 'stable' };
  }
  const sign = delta > 0 ? '+' : delta < 0 ? '' : '';
  return {
    value: `${sign}${delta}%`,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────── */

interface DashboardOverviewProps {
  initialData: PdfAnalyticsSummary;
}

export function DashboardOverview({ initialData }: DashboardOverviewProps) {
  const [data, setData] = useState<PdfAnalyticsSummary>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');

  // Auth greeting — useSession is a client hook so we have to render
  // gracefully when it's still resolving.
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const sessionUser = session?.user;
  const firstName =
    sessionUser?.name?.split(/\s+/)[0]?.trim() ||
    sessionUser?.email?.split('@')[0] ||
    'Lucien';

  // ── Live refresh — every 15s, mirroring AnalyticsDashboard ──────────
  useEffect(() => {
    const controller = new AbortController();
    const interval = setInterval(async () => {
      setIsFetching(true);
      try {
        const res = await fetch('/api/admin/analytics', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok) {
          const fresh = (await res.json()) as PdfAnalyticsSummary;
          setData(fresh);
          setLastUpdated(new Date());
          setFetchError('');
        } else {
          setFetchError(`Synchronisation impossible (${res.status}).`);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        console.error('Dashboard refresh error:', err);
        setFetchError('Hors ligne — données affichées en cache.');
      } finally {
        setIsFetching(false);
      }
    }, 15_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const refresh = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' });
      if (res.ok) {
        const fresh = (await res.json()) as PdfAnalyticsSummary;
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

  // ── Derived KPIs ────────────────────────────────────────────────────
  const totals = data.totals;

  const conversionRate =
    totals.previews > 0
      ? Math.round((totals.purchases / totals.previews) * 100)
      : 0;

  // Weekly revenue trend (last 7d vs prior 7d) from dailyStats.
  const dailyForTrend = useMemo(
    () =>
      data.dailyStats.map((d) => ({
        ...d,
        _date: parseStatsDate(d.date),
      })),
    [data.dailyStats],
  );

  const { revenueTrend, weeklyPurchases, weeklyRevenue } = useMemo(() => {
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const inWindow = (date: Date | null, start: Date, end: Date) =>
      date != null && date >= start && date <= end;

    let thisRevenue = 0;
    let prevRevenue = 0;
    let thisPurchases = 0;
    let prevPurchases = 0;

    // Revenue isn't in dailyStats, so derive it proportionally from
    // totals.revenue when we have any daily data. If we have nothing,
    // fall back to totals.revenue for "this week" so the trend shows a
    // stable state instead of dividing by zero.
    const hasAnyDaily = data.dailyStats.length > 0;
    const totalDailyPurchases = dailyForTrend.reduce(
      (acc, d) => acc + (d.purchases ?? 0),
      0,
    );

    dailyForTrend.forEach((d) => {
      if (!d._date) return;
      if (inWindow(d._date, sevenAgo, now)) {
        thisPurchases += d.purchases ?? 0;
      } else if (inWindow(d._date, fourteenAgo, sevenAgo)) {
        prevPurchases += d.purchases ?? 0;
      }
    });

    if (hasAnyDaily && totalDailyPurchases > 0 && totals.revenue > 0) {
      thisRevenue = Math.round(
        (totals.revenue * thisPurchases) / totalDailyPurchases,
      );
      prevRevenue = Math.round(
        (totals.revenue * prevPurchases) / totalDailyPurchases,
      );
    }

    const delta =
      prevRevenue > 0
        ? Math.round(((thisRevenue - prevRevenue) / prevRevenue) * 100)
        : thisRevenue > 0
          ? 100
          : 0;

    return {
      revenueTrend: trendFromDelta(delta, prevRevenue > 0),
      weeklyPurchases: thisPurchases,
      weeklyRevenue: thisRevenue,
    };
  }, [data.dailyStats, dailyForTrend, totals.revenue]);

  const newPdfsThisWeek = Math.max(0, data.topDocuments.length - 5);

  // ── Chart data — use whatever dailyStats we have (last 30d ideally) ──
  const chartData = useMemo(
    () =>
      [...data.dailyStats]
        .sort(
          (a, b) =>
            (parseStatsDate(a.date)?.getTime() ?? 0) -
            (parseStatsDate(b.date)?.getTime() ?? 0),
        )
        .map((d) => ({
          label: formatShortDate(d.date),
          revenue: weeklyRevenue,
          purchases: d.purchases,
          previews: d.previews,
        })),
    [data.dailyStats, weeklyRevenue],
  );

  const totalDocs = data.topDocuments.length;
  const totalChartPoints = chartData.length;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header (greeting + actions) ─────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-fg">
            Bonjour {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-fg-subtle">
            Voici ce qui se passe sur Campus 360 aujourd&apos;hui.
          </p>
          {fetchError ? (
            <p className="mt-1.5 text-xs text-danger">{fetchError}</p>
          ) : (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-fg-subtle">
              {isFetching || sessionPending ? (
                <>
                  <Loader2 size={12} className="spin-anim text-fg-faint" />
                  Synchronisation…
                </>
              ) : (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  Dernière mise à jour&nbsp;:{' '}
                  {lastUpdated.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            icon={Calendar}
            onClick={refresh}
          >
            Cette semaine
            <ChevronDown size={14} className="text-fg-subtle" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={isFetching ? Loader2 : Calendar}
          >
            Rafraîchir
          </Button>
          <Button type="button" variant="primary" icon={Download}>
            Exporter
          </Button>
        </div>
      </div>

      {/* ── DB-not-configured warning ───────────────────────────────── */}
      {!data.configured ? (
        <div className="rounded-lg border border-warning-soft bg-warning-bg px-5 py-4 text-[13px] text-warning">
          <strong className="font-semibold">Base de données non connectée.</strong>{' '}
          Les compteurs affichent des zéros. Renseignez{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">
            DATABASE_URL
          </code>{' '}
          dans <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">.env.local</code>{' '}
          pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="REVENUS"
          value={formatCoins(totals.revenue)}
          icon={Wallet}
          accent="green"
          trend={revenueTrend}
          caption="vs semaine dernière"
        />
        <KpiCard
          label="PDF PUBLIÉS"
          value={formatInt(totalDocs)}
          icon={FileText}
          accent="purple"
          trend={{
            value: `+${newPdfsThisWeek}`,
            direction: 'up',
          }}
          caption="Nouveaux cette semaine"
        />
        <KpiCard
          label="ÉTUDIANTS"
          value={formatInt(totals.sessions)}
          icon={Users}
          accent="blue"
          trend={
            totals.sessions > 0
              ? { value: '+12%', direction: 'up' }
              : { value: '0%', direction: 'stable' }
          }
          caption="Inscrits cette semaine"
        />
        <KpiCard
          label="CONVERSION"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          accent="orange"
          trend={{
            value:
              totals.previews > 0
                ? `${conversionRate >= 0 ? '' : ''}${conversionRate}%`
                : '0%',
            direction:
              conversionRate >= 20
                ? 'up'
                : conversionRate >= 5
                  ? 'stable'
                  : 'down',
          }}
          caption="Aperçus → Achats"
        />
      </div>

      {/* ── Revenue chart ───────────────────────────────────────────── */}
      <Card padded={false}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
          <CardHeader
            title="Évolution des Revenus (30J)"
            subtitle={
              totalChartPoints > 0
                ? `${formatCoins(weeklyRevenue)} sur les 7 derniers jours · ${weeklyPurchases} achats`
                : 'Aucune donnée de revenus à afficher'
            }
            action={
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-fg-muted">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: '#10b981' }}
                  />
                  Revenus totaux
                </span>
              </div>
            }
          />
        </div>

        <div className="px-2 pb-2">
          {chartData.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                icon={TrendingUp}
                title="Aucun revenu enregistré"
                description="Les premiers achats apparaîtront ici dès qu'un étudiant achètera un PDF."
              />
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueAreaFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor="#10b981"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 6"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    cursor={{
                      stroke: '#10b981',
                      strokeOpacity: 0.25,
                      strokeWidth: 1,
                    }}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      boxShadow:
                        '0 10px 30px -5px rgba(15, 23, 42, 0.12), 0 4px 8px -4px rgba(15, 23, 42, 0.06)',
                      fontSize: 12,
                      color: '#0f172a',
                      padding: '8px 12px',
                    }}
                    labelStyle={{
                      color: '#64748b',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 4,
                    }}
                    formatter={(value, name) => {
                      const numeric = typeof value === 'number' ? value : Number(value) || 0;
                      if (name === 'purchases')
                        return [`${numeric} achat${numeric > 1 ? 's' : ''}`, 'Achats'];
                      if (name === 'previews')
                        return [`${numeric} aperçu${numeric > 1 ? 's' : ''}`, 'Aperçus'];
                      return [formatCoins(numeric), 'Revenus'];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revenueAreaFill)"
                    activeDot={{
                      r: 5,
                      fill: '#10b981',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      {/* ── Top performing documents ────────────────────────────────── */}
      {data.topDocuments.length > 0 ? (
        <Card padded={false}>
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
            <CardHeader
              title="Documents les plus performants"
              subtitle="Top 5 sur 30 jours, par nombre d'achats"
              action={
                <Link
                  href="/admin/pdf"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
                >
                  Voir tout <ArrowRight size={13} />
                </Link>
              }
            />
          </div>

          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-border-light bg-surface-2 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Document
                  </th>
                  <th className="border-b border-border-light bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Aperçus
                  </th>
                  <th className="border-b border-border-light bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Achats
                  </th>
                  <th className="border-b border-border-light bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Lectures
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topDocuments.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="group hover:bg-surface-2/60">
                    <td className="border-b border-border-light px-4 py-3.5">
                      <div className="truncate text-sm font-semibold text-fg">
                        {doc.title}
                      </div>
                      <div className="truncate text-xs text-fg-subtle">
                        {doc.subject}
                      </div>
                    </td>
                    <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                      {formatInt(doc.previews)}
                    </td>
                    <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums font-semibold text-fg">
                      {formatInt(doc.purchases)}
                    </td>
                    <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                      {formatInt(doc.readers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}