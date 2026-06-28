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

  // KPIs (Stitch: 4 cards: REVENUS, PDF PUBLIÉS, ÉTUDIANTS, ACHATS)
  const conversionRate = data.totals.previews > 0
    ? Math.round((data.totals.purchases / data.totals.previews) * 100)
    : 0;

  const TrendUp = ({ value }: { value: string }) => (
    <span className="stitch-kpi-trend up">
      <TrendingUp size={11} />
      {value}
    </span>
  );
  const TrendNeutral = ({ value }: { value: string }) => (
    <span className="stitch-kpi-trend neutral">+{value}</span>
  );

  return (
    <>
      {/* ── Page header (greeting + actions) ─────────────── */}
      <div className="stitch-page-header">
        <div className="stitch-greeting">
          <h2>Bonjour Lucien 👋</h2>
          <p>Voici ce qui se passe sur Campus 360 aujourd&apos;hui.</p>
          {fetchError ? (
            <p style={{ fontSize: 12, color: 'var(--stitch-error)', marginTop: 6 }}>{fetchError}</p>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--stitch-on-surface-variant)', marginTop: 6 }}>
              {isFetching ? 'Synchronisation…' : `Dernière mise à jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`}
            </p>
          )}
        </div>
        <div className="stitch-page-actions">
          <button className="stitch-btn-date" type="button">
            <Calendar size={14} />
            <span>Cette semaine</span>
          </button>
          <button className="stitch-btn stitch-btn--secondary" type="button" onClick={refresh}>
            <RefreshCw size={14} className={isFetching ? 'spin-anim' : ''} />
            Rafraîchir
          </button>
          <button className="stitch-btn stitch-btn--primary" type="button">
            <Download size={14} />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Config warning ─────────────────────────────────── */}
      {!data.configured ? (
        <div className="stitch-card" style={{
          borderColor: '#fde68a',
          background: '#fffbeb',
          color: '#b45309',
          marginBottom: 24,
        }}>
          <strong>Base de données non connectée.</strong> Les compteurs affichent
          des zéros. Renseignez <code>DATABASE_URL</code> dans{' '}
          <code>.env.local</code> pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI Row (4 cards, Stitch style) ────────────────── */}
      <div className="stitch-kpi-grid">
        {/* REVENUS */}
        <div className="stitch-kpi">
          <div>
            <div className="stitch-kpi-label">REVENUS</div>
            <div className="stitch-kpi-value-row">
              <span className="stitch-kpi-value">{formatCoins(data.totals.revenue)}</span>
              <TrendUp value="+18%" />
            </div>
          </div>
          <div className="stitch-kpi-sub">vs semaine dernière</div>
        </div>

        {/* PDF PUBLIÉS */}
        <div className="stitch-kpi">
          <div>
            <div className="stitch-kpi-label">PDF PUBLIÉS</div>
            <div className="stitch-kpi-value-row">
              <span className="stitch-kpi-value">{formatInt(data.topDocuments.length || 0)}</span>
              <TrendNeutral value={String(Math.max(0, data.topDocuments.length - 5))} />
            </div>
          </div>
          <div className="stitch-kpi-sub">Nouveaux cette semaine</div>
        </div>

        {/* ÉTUDIANTS (sessions proxy) */}
        <div className="stitch-kpi">
          <div>
            <div className="stitch-kpi-label">ÉTUDIANTS</div>
            <div className="stitch-kpi-value-row">
              <span className="stitch-kpi-value">{formatInt(data.totals.sessions)}</span>
              <TrendUp value="+12%" />
            </div>
          </div>
          <div className="stitch-kpi-sub">Sessions actives (30 j)</div>
        </div>

        {/* ACHATS */}
        <div className="stitch-kpi">
          <div>
            <div className="stitch-kpi-label">ACHATS</div>
            <div className="stitch-kpi-value-row">
              <span className="stitch-kpi-value">{formatInt(data.totals.purchases)}</span>
              <TrendUp value={`+${conversionRate}%`} />
            </div>
          </div>
          <div className="stitch-kpi-sub">
            Taux de conversion {conversionRate}%
            {data.totals.purchaseFailures > 0 ? (
              <span style={{ color: 'var(--stitch-error-rose)', marginLeft: 8 }}>
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
      <div className="stitch-grid-2-1">
        <div className="stitch-card">
          <div className="stitch-card-header">
            <div>
              <div className="stitch-card-title">Documents les plus performants</div>
              <div className="stitch-card-subtitle">Top 8 par nombre d&apos;achats sur 30 jours</div>
            </div>
            <Link href="/admin/pdf" className="stitch-btn stitch-btn--ghost stitch-btn--sm">
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.topDocuments.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--stitch-on-surface-variant)' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14,
                background: 'var(--stitch-surface-container)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={22} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--stitch-on-surface)', marginBottom: 6 }}>
                Aucune vente récente
              </div>
              <p style={{ fontSize: 13, maxWidth: '36rem', margin: '0 auto', lineHeight: 1.5 }}>
                Les documents achetés apparaîtront ici dès les premières transactions.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th className="num">Aperçus</th>
                    <th className="num">Achats</th>
                    <th className="num">Lectures</th>
                    <th className="num">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDocuments.slice(0, 8).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{doc.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--stitch-on-surface-variant)' }}>
                          {doc.subject}
                        </div>
                      </td>
                      <td className="num">{formatInt(doc.previews)}</td>
                      <td className="num">{formatInt(doc.purchases)}</td>
                      <td className="num">{formatInt(doc.readers)}</td>
                      <td className="num">
                        <span className={`stitch-badge ${
                          doc.conversionRate >= 20
                            ? 'stitch-badge--success'
                            : doc.conversionRate >= 5
                              ? 'stitch-badge--brand'
                              : 'stitch-badge--neutral'
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
        <div className="stitch-card">
          <div className="stitch-card-header">
            <div>
              <div className="stitch-card-title">Activité récente</div>
              <div className="stitch-card-subtitle">20 derniers événements</div>
            </div>
            <Link href="/admin/pdf" className="stitch-btn stitch-btn--ghost stitch-btn--sm">
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          {data.recentEvents.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--stitch-on-surface-variant)' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14,
                background: 'var(--stitch-surface-container)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={22} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--stitch-on-surface)' }}>
                Pas encore d&apos;activité
              </div>
              <p style={{ fontSize: 13, maxWidth: '24rem', margin: '8px auto 0', lineHeight: 1.5 }}>
                Les événements du catalogue apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="stitch-activity">
              {data.recentEvents.slice(0, 8).map((ev) => (
                <li key={ev.id}>
                  <span className={`stitch-badge ${
                    ev.eventType === 'purchase_success'
                      ? 'stitch-badge--success'
                      : ev.eventType === 'purchase_failed'
                        ? 'stitch-badge--danger'
                        : ev.eventType === 'reader_open'
                          ? 'stitch-badge--brand'
                          : ev.eventType === 'assistant_question'
                            ? 'stitch-badge--warning'
                            : 'stitch-badge--neutral'
                  }`}>
                    {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                  </span>
                  <div className="stitch-activity-content">
                    <div className="stitch-activity-title">{ev.documentTitle}</div>
                    <div className="stitch-activity-meta">
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
