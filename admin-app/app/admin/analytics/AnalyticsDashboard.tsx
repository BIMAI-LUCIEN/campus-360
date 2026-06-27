'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  Plus,
  Eye,
  CreditCard,
} from 'lucide-react';
import type { PdfAnalyticsSummary } from '@/lib/supabase-pdf';
import { DashboardCharts } from './DashboardCharts';

interface AnalyticsDashboardProps {
  initialData: PdfAnalyticsSummary;
}

const EVENT_TRANSLATIONS: Record<string, string> = {
  'catalog_view': 'Vu le catalogue',
  'preview_open': 'Aperçu du PDF',
  'reader_open': 'Lecture complète',
  'purchase_start': 'Début d\'achat',
  'purchase_success': 'Achat réussi',
  'purchase_failed': 'Échec de paiement',
  'search': 'Recherche',
  'assistant_question': 'Question à l\'IA',
};

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

function KpiCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  trend,
  trendUp,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={18} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <span className="kpi-value">{value}</span>
        <span className={`kpi-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend}
        </span>
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<PdfAnalyticsSummary>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsFetching(true);
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const freshData = await res.json();
          setData(freshData);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Error fetching live analytics:', err);
      } finally {
        setIsFetching(false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const conversionRate =
    data.totals.previews > 0
      ? Math.round((data.totals.purchases / data.totals.previews) * 100)
      : 0;

  return (
    <>
      {/* Page Header */}
      <div className="flup-page-header">
        <div>
          <h1 className="flup-page-title">Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginTop: 4 }}>
            <span className="live-dot" />
            <span>
              {isFetching
                ? 'Mise à jour…'
                : `Live — Dernière synchro : ${lastUpdated.toLocaleTimeString('fr-FR')}`}
            </span>
          </div>
        </div>
        <div className="flup-date-picker">
          <Calendar size={15} />
          <span>30 derniers jours</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="flup-kpi-grid">
        <KpiCard
          icon={Users}
          iconColor="#0891b2"
          iconBg="#ecfeff"
          label="Total Sessions"
          value={formatNumber(data.totals.sessions)}
          trend="2.5%"
          trendUp={true}
        />
        <KpiCard
          icon={CreditCard}
          iconColor="#3b82f6"
          iconBg="#eff6ff"
          label="Revenus Générés"
          value={`${formatNumber(data.totals.revenue)} C`}
          trend="0.5%"
          trendUp={true}
        />
        <KpiCard
          icon={ShoppingBag}
          iconColor="#f97316"
          iconBg="#fff7ed"
          label="Achats (Commandes)"
          value={formatNumber(data.totals.purchases)}
          trend="0.2%"
          trendUp={false}
        />
        <KpiCard
          icon={Eye}
          iconColor="#8b5cf6"
          iconBg="#f5f3ff"
          label="Aperçus"
          value={formatNumber(data.totals.previews)}
          trend="0.12%"
          trendUp={true}
        />
        <KpiCard
          icon={TrendingUp}
          iconColor="#10b981"
          iconBg="#ecfdf5"
          label="Taux de Conversion"
          value={`${conversionRate}%`}
          trend="0.5%"
          trendUp={true}
        />
      </div>

      {/* Charts Row */}
      {data.configured && (
        <DashboardCharts dailyStats={data.dailyStats} categoryStats={data.categoryStats} />
      )}

      {/* Bottom: Top Documents + Recent Events */}
      <div className="flup-dash-grid two-col">
        {/* Top Documents */}
        <div className="flup-card">
          <div className="flup-chart-header">
            <h3 className="flup-chart-title">📄 Top Documents vendus</h3>
          </div>
          <table className="flup-list-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Matière</th>
                <th>Ventes</th>
                <th>Aperçus</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {data.topDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600 }}>{doc.title}</td>
                  <td>{doc.subject}</td>
                  <td><strong style={{ color: 'var(--flup-brand)' }}>{doc.purchases}</strong></td>
                  <td>{doc.previews}</td>
                  <td>
                    <span style={{
                      background: 'var(--flup-brand-light)',
                      color: 'var(--flup-brand)',
                      fontWeight: 600,
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}>
                      {doc.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.topDocuments.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--flup-text-muted)', textAlign: 'center', padding: 24 }}>Aucun document vendu.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Events */}
        <div className="flup-card">
          <div className="flup-chart-header">
            <h3 className="flup-chart-title">🕐 Événements récents</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.recentEvents.slice(0, 8).map((event) => (
              <div key={event.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--flup-bg)',
                border: '1px solid var(--flup-border-soft)',
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: event.eventType === 'purchase_success' ? '#ecfdf5' : 'var(--flup-brand-light)',
                  color: event.eventType === 'purchase_success' ? '#059669' : 'var(--flup-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {event.eventType === 'purchase_success' ? (
                    <ShoppingBag size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--flup-text-main)' }}>
                    {EVENT_TRANSLATIONS[event.eventType] || event.eventType}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--flup-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.documentTitle}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--flup-text-muted)', flexShrink: 0 }}>
                  {event.userEmail?.split('@')[0] || 'anon'}
                </div>
              </div>
            ))}
            {data.recentEvents.length === 0 && (
              <div style={{ color: 'var(--flup-text-muted)', textAlign: 'center', padding: 24, fontSize: 14 }}>
                Aucun événement.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

