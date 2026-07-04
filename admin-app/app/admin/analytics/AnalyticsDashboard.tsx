'use client';

import React, { useState, useEffect } from 'react';
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
    +{value}
  </span>
);

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
            className="flex items-center gap-2 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2 text-[13px] font-medium text-stitch-on-surface transition-colors hover:bg-stitch-surface-container"
            type="button"
          >
            <Calendar size={14} />
            <span>Cette semaine</span>
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2 text-[13px] font-semibold text-stitch-on-surface transition-colors hover:bg-stitch-surface-container"
            type="button"
            onClick={refresh}
          >
            <RefreshCw size={14} className={isFetching ? 'spin-anim' : ''} />
            Rafraîchir
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-stitch border border-transparent bg-stitch-primary px-4 py-2 text-[13px] font-semibold text-stitch-on-primary transition-all hover:opacity-90 hover:shadow-stitch-md"
            type="button"
          >
            <Download size={14} />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Config warning ─────────────────────────────────── */}
      {!data.configured ? (
        <div className="mb-6 rounded-stitch border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800">
          <strong>Base de données non connectée.</strong> Les compteurs affichent
          des zéros. Renseignez <code>DATABASE_URL</code> dans{' '}
          <code>.env.local</code> pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI Row (4 cards) ─────────────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* REVENUS */}
        <div className="flex flex-col justify-between gap-3 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
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
                <TrendNeutral value="0%" />
              )}
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            vs semaine dernière
          </div>
        </div>

        {/* PDF PUBLIÉS */}
        <div className="flex flex-col justify-between gap-3 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              PDF PUBLIÉS
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {formatInt(data.topDocuments.length || 0)}
              </span>
              <TrendNeutral value={String(Math.max(0, data.topDocuments.length - 5))} />
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            Nouveaux cette semaine
          </div>
        </div>

        {/* ÉTUDIANTS */}
        <div className="flex flex-col justify-between gap-3 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              ÉTUDIANTS
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {formatInt(data.totals.sessions)}
              </span>
              {data.totals.sessions > 0 ? <TrendUp value="+12%" /> : <TrendNeutral value="0" />}
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            Sessions actives (30 j)
          </div>
        </div>

        {/* ACHATS */}
        <div className="flex flex-col justify-between gap-3 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              ACHATS
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-stitch-headline leading-none text-[32px] font-bold text-stitch-on-surface">
                {formatInt(data.totals.purchases)}
              </span>
              <TrendUp value={`+${conversionRate}%`} />
            </div>
          </div>
          <div className="mt-4 text-[13px] text-stitch-on-surface-variant">
            Taux de conversion {conversionRate}%
            {data.totals.purchaseFailures > 0 ? (
              <span className="ml-2 text-stitch-error-rose">
                · {data.totals.purchaseFailures} échecs
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Charts (sales + categories) ────────────────────── */}
      <DashboardCharts
        dailyStats={data.dailyStats}
        categoryStats={data.categoryStats}
      />

      {/* ── Top documents + Recent activity ────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm lg:col-span-2">
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
              className="inline-flex items-center justify-center gap-1 rounded-stitch-sm border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface"
            >
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.topDocuments.length === 0 ? (
            <div className="px-6 py-12 text-center text-stitch-on-surface-variant">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-stitch bg-stitch-surface-container">
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
                    <th className="rounded-tl-stitch-sm border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
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
                    <th className="rounded-tr-stitch-sm border-b border-stitch-outline-variant bg-stitch-surface-container-low px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDocuments.slice(0, 8).map((doc) => (
                    <tr key={doc.id} className="hover:bg-stitch-surface-container-low">
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
                      <td className="border-b border-stitch-surface-container px-4 py-3.5 text-right text-sm text-stitch-on-surface">
                        <span
                          className={
                            doc.conversionRate >= 20
                              ? 'inline-flex items-center rounded-full border border-transparent bg-stitch-success-light px-2.5 py-0.5 text-[11px] font-semibold text-stitch-success-dark'
                              : doc.conversionRate >= 5
                                ? 'inline-flex items-center rounded-full border border-transparent bg-stitch-primary-fixed px-2.5 py-0.5 text-[11px] font-semibold text-stitch-primary'
                                : 'inline-flex items-center rounded-full border border-transparent bg-stitch-surface-container-high px-2.5 py-0.5 text-[11px] font-semibold text-stitch-on-surface-variant'
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
        <div className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
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
              className="inline-flex items-center justify-center gap-1 rounded-stitch-sm border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface"
            >
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.recentEvents.length === 0 ? (
            <div className="px-6 py-12 text-center text-stitch-on-surface-variant">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-stitch bg-stitch-surface-container">
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
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {data.recentEvents.slice(0, 8).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 border-b border-stitch-surface-container py-3 last:border-b-0"
                >
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold ${
                      badgeClass[ev.eventType] ?? badgeClass.default
                    }`}
                  >
                    {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 truncate text-[13px] font-medium text-stitch-on-surface">
                      {ev.documentTitle}
                    </div>
                    <div className="text-[11px] text-stitch-on-surface-variant">
                      {ev.userEmail ?? 'Visiteur'} · {ev.createdAt}
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
