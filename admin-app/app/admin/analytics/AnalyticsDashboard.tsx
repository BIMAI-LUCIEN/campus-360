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
  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stitch-success-light text-stitch-success-dark">
    <TrendingUp size={11} />
    {value}
  </span>
);

const TrendNeutral = ({ value }: { value: string }) => (
  <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-stitch-primary-fixed text-stitch-primary">
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

  const conversionRate = data.totals.previews > 0
    ? Math.round((data.totals.purchases / data.totals.previews) * 100)
    : 0;

  return (
    <>
      {/* ── Page header (greeting + actions) ─────────────── */}
      <div className="flex justify-between items-end gap-4 mb-8 flex-wrap">
        <div>
          <h2 className="font-stitch-headline text-[32px] font-bold text-stitch-on-surface tracking-tight m-0 mb-1">
            Bonjour Lucien 👋
          </h2>
          <p className="text-[15px] text-stitch-on-surface-variant m-0">
            Voici ce qui se passe sur Campus 360 aujourd&apos;hui.
          </p>
          {fetchError ? (
            <p className="text-xs text-stitch-error mt-1.5">{fetchError}</p>
          ) : (
            <p className="text-xs text-stitch-on-surface-variant mt-1.5">
              {isFetching ? 'Synchronisation…' : `Dernière mise à jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-2 bg-stitch-surface-lowest border border-stitch-outline-variant px-4 py-2 rounded-stitch text-[13px] font-medium text-stitch-on-surface hover:bg-stitch-surface-container transition-colors" type="button">
            <Calendar size={14} />
            <span>Cette semaine</span>
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-stitch text-[13px] font-semibold border bg-stitch-surface-lowest text-stitch-on-surface border-stitch-outline-variant hover:bg-stitch-surface-container transition-colors" type="button" onClick={refresh}>
            <RefreshCw size={14} className={isFetching ? 'spin-anim' : ''} />
            Rafraîchir
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-stitch text-[13px] font-semibold border border-transparent bg-stitch-primary text-stitch-on-primary hover:opacity-90 hover:shadow-stitch-md transition-all" type="button">
            <Download size={14} />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Config warning ─────────────────────────────────── */}
      {!data.configured ? (
        <div className="bg-amber-50 border border-amber-200 rounded-stitch px-6 py-4 text-amber-800 mb-6">
          <strong>Base de données non connectée.</strong> Les compteurs affichent
          des zéros. Renseignez <code>DATABASE_URL</code> dans{' '}
          <code>.env.local</code> pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI Row (4 cards) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* REVENUS */}
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              REVENUS
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="font-stitch-headline text-[32px] font-bold text-stitch-on-surface leading-none">
                {formatCoins(data.totals.revenue)}
              </span>
              <TrendUp value="+18%" />
            </div>
          </div>
          <div className="text-[13px] text-stitch-on-surface-variant mt-4">vs semaine dernière</div>
        </div>

        {/* PDF PUBLIÉS */}
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              PDF PUBLIÉS
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="font-stitch-headline text-[32px] font-bold text-stitch-on-surface leading-none">
                {formatInt(data.topDocuments.length || 0)}
              </span>
              <TrendNeutral value={String(Math.max(0, data.topDocuments.length - 5))} />
            </div>
          </div>
          <div className="text-[13px] text-stitch-on-surface-variant mt-4">Nouveaux cette semaine</div>
        </div>

        {/* ÉTUDIANTS (sessions proxy) */}
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              ÉTUDIANTS
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="font-stitch-headline text-[32px] font-bold text-stitch-on-surface leading-none">
                {formatInt(data.totals.sessions)}
              </span>
              <TrendUp value="+12%" />
            </div>
          </div>
          <div className="text-[13px] text-stitch-on-surface-variant mt-4">Sessions actives (30 j)</div>
        </div>

        {/* ACHATS */}
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
              ACHATS
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="font-stitch-headline text-[32px] font-bold text-stitch-on-surface leading-none">
                {formatInt(data.totals.purchases)}
              </span>
              <TrendUp value={`+${conversionRate}%`} />
            </div>
          </div>
          <div className="text-[13px] text-stitch-on-surface-variant mt-4">
            Taux de conversion {conversionRate}%
            {data.totals.purchaseFailures > 0 ? (
              <span className="text-stitch-error-rose ml-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm">
          <div className="flex justify-between items-center mb-5 gap-3">
            <div>
              <div className="font-stitch-headline text-base font-bold text-stitch-on-surface tracking-tight">
                Documents les plus performants
              </div>
              <div className="text-xs text-stitch-on-surface-variant mt-0.5">
                Top 8 par nombre d&apos;achats sur 30 jours
              </div>
            </div>
            <Link href="/admin/pdf" className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-stitch-sm text-xs font-semibold border border-transparent bg-transparent text-stitch-on-surface-variant hover:bg-stitch-surface-container-high hover:text-stitch-on-surface transition-colors">
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.topDocuments.length === 0 ? (
            <div className="py-12 px-6 text-center text-stitch-on-surface-variant">
              <div className="w-14 h-14 mx-auto mb-4 rounded-stitch flex items-center justify-center bg-stitch-surface-container">
                <Loader2 size={22} />
              </div>
              <div className="text-base font-bold text-stitch-on-surface mb-1.5">
                Aucune vente récente
              </div>
              <p className="text-[13px] max-w-md mx-auto leading-relaxed">
                Les documents achetés apparaîtront ici dès les premières transactions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant px-4 py-2.5 text-left bg-stitch-surface-container-low border-b border-stitch-outline-variant first:rounded-tl-stitch-sm last:rounded-tr-stitch-sm">
                      Document
                    </th>
                    <th className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant px-4 py-2.5 text-right bg-stitch-surface-container-low border-b border-stitch-outline-variant">
                      Aperçus
                    </th>
                    <th className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant px-4 py-2.5 text-right bg-stitch-surface-container-low border-b border-stitch-outline-variant">
                      Achats
                    </th>
                    <th className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant px-4 py-2.5 text-right bg-stitch-surface-container-low border-b border-stitch-outline-variant">
                      Lectures
                    </th>
                    <th className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant px-4 py-2.5 text-right bg-stitch-surface-container-low border-b border-stitch-outline-variant last:rounded-tr-stitch-sm">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDocuments.slice(0, 8).map((doc) => (
                    <tr key={doc.id} className="hover:bg-stitch-surface-container-low">
                      <td className="px-4 py-3.5 text-sm text-stitch-on-surface border-b border-stitch-surface-container">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-xs text-stitch-on-surface-variant">{doc.subject}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-stitch-on-surface text-right tabular-nums border-b border-stitch-surface-container">
                        {formatInt(doc.previews)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-stitch-on-surface text-right tabular-nums border-b border-stitch-surface-container">
                        {formatInt(doc.purchases)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-stitch-on-surface text-right tabular-nums border-b border-stitch-surface-container">
                        {formatInt(doc.readers)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-stitch-on-surface text-right border-b border-stitch-surface-container">
                        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-transparent ${
                          doc.conversionRate >= 20
                            ? 'bg-stitch-success-light text-stitch-success-dark'
                            : doc.conversionRate >= 5
                              ? 'bg-stitch-primary-fixed text-stitch-primary'
                              : 'bg-stitch-surface-container-high text-stitch-on-surface-variant'
                        }`}>
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
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm">
          <div className="flex justify-between items-center mb-5 gap-3">
            <div>
              <div className="font-stitch-headline text-base font-bold text-stitch-on-surface tracking-tight">
                Activité récente
              </div>
              <div className="text-xs text-stitch-on-surface-variant mt-0.5">
                20 derniers événements
              </div>
            </div>
            <Link href="/admin/pdf" className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-stitch-sm text-xs font-semibold border border-transparent bg-transparent text-stitch-on-surface-variant hover:bg-stitch-surface-container-high hover:text-stitch-on-surface transition-colors">
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.recentEvents.length === 0 ? (
            <div className="py-12 px-6 text-center text-stitch-on-surface-variant">
              <div className="w-14 h-14 mx-auto mb-4 rounded-stitch flex items-center justify-center bg-stitch-surface-container">
                <Loader2 size={22} />
              </div>
              <div className="text-base font-bold text-stitch-on-surface">
                Pas encore d&apos;activité
              </div>
              <p className="text-[13px] max-w-sm mx-auto mt-2 leading-relaxed">
                Les événements du catalogue apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-1">
              {data.recentEvents.slice(0, 8).map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 py-3 border-b border-stitch-surface-container last:border-b-0">
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-transparent whitespace-nowrap shrink-0 mt-0.5 ${
                    badgeClass[ev.eventType] ?? badgeClass.default
                  }`}>
                    {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-stitch-on-surface truncate mb-0.5">
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
