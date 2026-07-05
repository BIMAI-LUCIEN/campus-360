'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { PdfAnalyticsSummary } from '@/lib/supabase-pdf';
import { DashboardCharts } from './DashboardCharts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface AnalyticsDashboardProps {
  initialData: PdfAnalyticsSummary;
}

const EVENT_LABELS: Record<string, string> = {
  catalog_view: 'Vu le catalogue',
  preview_open: 'Aperçu PDF',
  reader_open: 'Lecture complète',
  purchase_start: "Début d'achat",
  purchase_success: 'Achat réussi',
  purchase_failed: 'Échec de paiement',
  search: 'Recherche',
  assistant_question: "Question à l'IA",
};

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #c3c6d7',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
  color: '#0b1c30',
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
};

const formatInt = (v: number) => new Intl.NumberFormat('fr-FR').format(v);
const formatCoins = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} C`;

const badgeClass: Record<string, string> = {
  purchase_success: 'bg-stitch-success-light text-stitch-success-dark',
  purchase_failed:  'bg-stitch-error-light text-stitch-error',
  reader_open:      'bg-stitch-primary-fixed text-stitch-primary',
  assistant_question: 'bg-amber-50 text-amber-700',
  default:          'bg-stitch-surface-container-high text-stitch-on-surface-variant',
};

const TrendUp = ({ value }: { value: string }) => (
  <span className="inline-flex items-center gap-0.5 rounded-full bg-stitch-success-light px-2 py-0.5 text-[11px] font-bold text-stitch-success-dark">
    <TrendingUp size={11} />
    {value}
  </span>
);

const TrendNeutral = ({ value }: { value: string }) => (
  <span className="inline-flex items-center rounded-full bg-stitch-primary-fixed px-2 py-0.5 text-[11px] font-bold text-stitch-primary">
    {value}
  </span>
);

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  } catch {
    return dateStr;
  }
}

function getInitials(email: string | null | undefined): string {
  if (!email) return '?';
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(email: string | null | undefined): string {
  const colors = [
    'bg-stitch-primary-container',
    'bg-stitch-tertiary-container',
    'bg-stitch-success',
    'bg-stitch-secondary-container',
  ];
  if (!email) return colors[0];
  const idx = email.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<PdfAnalyticsSummary>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');

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

  const walletChartData = useMemo(() => {
    if (!data.wallet) return [];
    const labels = ['Semaine -3', 'Semaine -2', 'Semaine -1', 'Cette semaine'];
    return labels.map((label, idx) => ({
      name: label,
      recharge: data.wallet.weeklyRecharge?.[idx] ?? 0,
      spend: data.wallet.weeklySpend?.[idx] ?? 0,
    }));
  }, [data.wallet]);

  const totalIaRequests = data.ia?.totalQuestions || 0;
  const facultyStats = data.ia?.byFaculty || [];

  // Weekly trend (purchase delta week-over-week) sourced from dailyStats
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

  return (
    <>
      {/* ── Page header (greeting + actions) ─────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-stitch-headline mb-1 m-0 text-[32px] font-bold tracking-tight text-stitch-on-surface">
            Bonjour Lucien 👋
          </h2>
          <p className="m-0 text-[15px] text-stitch-on-surface-variant">
            Voici ce qui se passe sur Campus 360 aujourd&apos;hui.
          </p>
          {fetchError ? (
            <p className="mt-1.5 text-xs text-stitch-error">{fetchError}</p>
          ) : (
            <p className="mt-1.5 text-xs text-stitch-on-surface-variant">
              {isFetching
                ? 'Synchronisation…'
                : `Dernière mise à jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-lg border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2 text-[13px] font-semibold text-stitch-on-surface transition-colors hover:bg-stitch-surface-container"
            type="button"
          >
            <Calendar size={14} className="text-stitch-primary" />
            <span>Cette semaine</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2 text-[13px] font-semibold text-stitch-on-surface transition-colors hover:bg-stitch-surface-container"
            type="button"
            onClick={refresh}
          >
            <RefreshCw size={14} className={isFetching ? 'spin-anim' : ''} />
            Rafraîchir
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-stitch-primary px-4 py-2 text-[13px] font-semibold text-stitch-on-primary transition-all hover:opacity-90 hover:shadow-stitch-md"
            type="button"
          >
            <Download size={14} />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Config warning ─────────────────────────────────── */}
      {!data.configured ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800">
          <strong>Base de données non connectée.</strong> Les compteurs affichent
          des zéros. Renseignez <code>DATABASE_URL</code> dans{' '}
          <code>.env.local</code> pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI Row (4 cards) ─────────────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {/* REVENUS */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              REVENUS
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {formatCoins(data.totals.revenue)}
              </span>
              {weeklyTrend !== 0 ? (
                <TrendUp value={`${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend}%`} />
              ) : (
                <TrendNeutral value="Stable" />
              )}
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            vs semaine dernière
          </div>
        </div>

        {/* PDF PUBLIÉS */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              PDF PUBLIÉS
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {formatInt(data.catalog?.publishedPdfs || 0)}
              </span>
              <TrendNeutral value={`+${data.catalog?.newPdfsThisWeek || 0}`} />
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            Nouveaux cette semaine
          </div>
        </div>

        {/* ÉTUDIANTS */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              ÉTUDIANTS
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {formatInt(data.catalog?.studentUsers || 0)}
              </span>
              {data.catalog?.newUsersThisWeek > 0 ? (
                <TrendUp value={`+${data.catalog.newUsersThisWeek}`} />
              ) : (
                <TrendNeutral value="0" />
              )}
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            Inscrits cette semaine
          </div>
        </div>

        {/* CONVERSION */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              CONVERSION
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {conversionRate}%
              </span>
              <span className="rounded-full bg-stitch-surface-container px-2 py-0.5 text-[11px] font-semibold text-stitch-on-surface-variant">
                {conversionRate >= 15 ? 'Excellent' : conversionRate >= 5 ? 'Stable' : 'Faible'}
              </span>
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            Aperçus → Achats
          </div>
        </div>
      </div>

      {/* ── Charts (sales + categories) ────────────────────── */}
      <DashboardCharts
        dailyStats={data.dailyStats}
        categoryStats={data.categoryStats}
      />

      {/* ── Portefeuille & Suivi Financier ─────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-stitch-outline-variant bg-white p-6 shadow-sm">
          <div>
            <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
              Portefeuille & Crédits
            </div>
            <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
              Recharges et dépenses des étudiants
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-stitch-surface p-3 border border-stitch-outline-variant/60">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                Total Rechargé
              </div>
              <div className="mt-1 font-stitch-headline text-2xl font-bold text-stitch-primary">
                {formatCoins(data.wallet?.totalRecharge || 0)}
              </div>
            </div>
            
            <div className="rounded-lg bg-stitch-surface p-3 border border-stitch-outline-variant/60">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                Total Dépensé (PDF + IA)
              </div>
              <div className="mt-1 font-stitch-headline text-2xl font-bold text-stitch-on-surface">
                {formatCoins(data.wallet?.totalSpend || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stitch-outline-variant bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
                Historique Portefeuille (4 Semaines)
              </div>
              <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
                Recharges vs Dépenses en Coins
              </div>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-stitch-on-surface-variant">
                <span className="h-2 w-2 rounded-sm bg-stitch-primary" />
                Recharges
              </span>
              <span className="inline-flex items-center gap-1 text-stitch-on-surface-variant">
                <span className="h-2 w-2 rounded-sm bg-stitch-outline" />
                Dépenses
              </span>
            </div>
          </div>
          <div className="h-[200px] w-full">
            {walletChartData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart
                  data={walletChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e1d8" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#434655', fontFamily: 'Inter' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#434655', fontFamily: 'Inter' }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="recharge"
                    fill="#004ac6"
                    radius={[4, 4, 0, 0]}
                    name="Recharges"
                  />
                  <Bar
                    dataKey="spend"
                    fill="#737686"
                    radius={[4, 4, 0, 0]}
                    name="Dépenses"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-stitch-on-surface-variant">
                Pas de données de portefeuille
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── IA & Entonnoir de Conversion ────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stitch-outline-variant bg-white p-6 shadow-sm">
          <div className="mb-5">
            <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
              Utilisation de l&apos;IA par Filière
            </div>
            <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
              Total questions posées : <span className="font-bold text-stitch-primary">{data.ia?.totalQuestions || 0}</span> (30J)
            </div>
          </div>

          {facultyStats.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-stitch-on-surface-variant">
              Aucune question IA enregistrée.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {facultyStats.map((item, idx) => {
                const percent = totalIaRequests > 0 ? Math.round((item.requests / totalIaRequests) * 100) : 0;
                return (
                  <div key={item.faculty + idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-stitch-on-surface">{item.faculty}</span>
                      <span className="text-stitch-on-surface-variant font-bold">
                        {item.requests} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stitch-surface-container">
                      <div
                        className="h-full rounded-full bg-stitch-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stitch-outline-variant bg-white p-6 shadow-sm">
          <div className="mb-5">
            <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
              Entonnoir de Conversion (30J)
            </div>
            <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
              Taux de conversion global : <span className="font-bold text-stitch-success-dark">{conversionRate}%</span>
            </div>
          </div>

          {data.funnel ? (
            <div className="flex flex-col gap-3.5">
              {[
                { label: 'Visiteurs uniques', val: data.funnel.visitors, base: data.funnel.visitors, color: 'bg-stitch-primary' },
                { label: 'Recherches', val: data.funnel.searchers, base: data.funnel.visitors, color: 'bg-stitch-primary/80' },
                { label: 'Aperçus ouverts', val: data.funnel.previewers, base: data.funnel.visitors, color: 'bg-stitch-primary/65' },
                { label: 'Achats validés', val: data.funnel.buyers, base: data.funnel.visitors, color: 'bg-stitch-success' },
                { label: 'Lectures sécurisées', val: data.funnel.readers, base: data.funnel.visitors, color: 'bg-stitch-success/80' },
              ].map((step, idx) => {
                const percent = step.base > 0 ? Math.round((step.val / step.base) * 100) : 0;
                return (
                  <div key={step.label + idx} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stitch-on-surface">{step.label}</span>
                      <span className="text-stitch-on-surface-variant font-bold">
                        {step.val.toLocaleString('fr-FR')} {idx > 0 ? `(${percent}%)` : ''}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-md bg-stitch-surface-container overflow-hidden">
                      <div
                        className={`h-full ${step.color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-stitch-on-surface-variant">
              Données de l&apos;entonnoir non disponibles
            </div>
          )}
        </div>
      </div>

      {/* ── Top documents + Recent activity ────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Top documents table ────────────────────────── */}
        <div className="rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
                Documents les plus performants
              </div>
              <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
                Top 8 par nombre d&apos;achats sur 30 jours
              </div>
            </div>
            <Link
              href="/admin/pdf"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface"
            >
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.topDocuments.length === 0 ? (
            <div className="px-6 py-12 text-center text-stitch-on-surface-variant">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-stitch-surface-container">
                <Loader2 size={22} />
              </div>
              <div className="mb-1.5 text-base font-bold text-stitch-on-surface">
                Aucune vente récente
              </div>
              <p className="mx-auto max-w-md text-[13px] leading-relaxed">
                Les documents achetés apparaîtront ici dès les premières transactions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="rounded-tl-xl border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                      Document
                    </th>
                    <th className="border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                      Aperçus
                    </th>
                    <th className="border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                      Achats
                    </th>
                    <th className="border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                      Lectures
                    </th>
                    <th className="rounded-tr-xl border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDocuments.slice(0, 8).map((doc) => (
                    <tr key={doc.id} className="hover:bg-stitch-surface-container-low transition-colors">
                      <td className="border-b border-stitch-surface-container px-4 py-3.5 text-sm text-stitch-on-surface">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-xs text-stitch-on-surface-variant">{doc.subject}</div>
                      </td>
                      <td className="border-b border-stitch-surface-container px-4 py-3.5 text-right text-sm tabular-nums text-stitch-on-surface">
                        {formatInt(doc.previews)}
                      </td>
                      <td className="border-b border-stitch-surface-container px-4 py-3.5 text-right text-sm tabular-nums text-stitch-on-surface">
                        {formatInt(doc.purchases)}
                      </td>
                      <td className="border-b border-stitch-surface-container px-4 py-3.5 text-right text-sm tabular-nums text-stitch-on-surface">
                        {formatInt(doc.readers)}
                      </td>
                      <td className="border-b border-stitch-surface-container px-4 py-3.5 text-right text-stitch-on-surface">
                        <span
                          className={
                            doc.conversionRate >= 20
                              ? 'inline-flex items-center rounded-full bg-stitch-success-light px-2.5 py-0.5 text-[11px] font-semibold text-stitch-success-dark'
                              : doc.conversionRate >= 5
                                ? 'inline-flex items-center rounded-full bg-stitch-primary-fixed px-2.5 py-0.5 text-[11px] font-semibold text-stitch-primary'
                                : 'inline-flex items-center rounded-full bg-stitch-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-stitch-on-surface-variant'
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
        </div>

        {/* ── Recent activity ─────────────────────────────── */}
        <div className="rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
                Activité récente
              </div>
              <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
                20 derniers événements
              </div>
            </div>
            <Link
              href="/admin/pdf"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface"
            >
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.recentEvents.length === 0 ? (
            <div className="px-6 py-12 text-center text-stitch-on-surface-variant">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-stitch-surface-container">
                <Loader2 size={22} />
              </div>
              <div className="text-base font-bold text-stitch-on-surface">
                Pas encore d&apos;activité
              </div>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed">
                Les événements du catalogue apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0 p-0">
              {data.recentEvents.slice(0, 8).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 border-b border-stitch-surface-container py-3 last:border-b-0"
                >
                  {/* Avatar circle */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getAvatarColor(ev.userEmail)}`}
                  >
                    {getInitials(ev.userEmail)}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-stitch-on-surface-variant">
                        {formatRelativeTime(ev.createdAt)}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          badgeClass[ev.eventType] ?? badgeClass.default
                        }`}
                      >
                        {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                      </span>
                    </div>
                    <div className="truncate text-[13px] font-medium text-stitch-on-surface">
                      {ev.documentTitle}
                    </div>
                    <div className="truncate text-[11px] text-stitch-on-surface-variant">
                      {ev.userEmail ?? 'Visiteur'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
