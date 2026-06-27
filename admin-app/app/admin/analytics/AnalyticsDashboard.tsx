'use client';

import React, { useState, useEffect } from 'react';
import { Users, FileText, ShoppingBag, TrendingUp, Search, Calendar } from 'lucide-react';
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
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const conversionRate =
    data.totals.previews > 0
      ? Math.round((data.totals.purchases / data.totals.previews) * 100)
      : 0;

  return (
    <>
      <div className="flup-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="flup-page-title">Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4a5568', marginTop: 4 }}>
            <span style={{ 
              display: 'inline-block', 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: isFetching ? '#f59e0b' : '#10b981',
              boxShadow: isFetching ? '0 0 8px #f59e0b' : '0 0 8px #10b981',
              transition: 'background-color 0.3s ease'
            }} />
            <span>
              {isFetching ? 'Mise à jour...' : 'Live (Mise à jour auto/10s)'} — Dernière synchronisation : {lastUpdated.toLocaleTimeString('fr-FR')}
            </span>
          </div>
        </div>
        <div className="flup-date-picker" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} />
          <span>30 derniers jours</span>
        </div>
      </div>

      {!data.configured ? (
        <div className="alert" style={{ marginBottom: 24 }}>
          Ajoute `DATABASE_URL` dans `admin-app/.env.local` pour lire les analytics Supabase.
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="flup-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <Users size={16} />
            Total Sessions
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(data.totals.sessions)}</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>

        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <Search size={16} />
            Nombre de recherches
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(data.totals.searches)}</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>

        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <ShoppingBag size={16} />
            Revenus Générés
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(data.totals.revenue)} C</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>

        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <FileText size={16} />
            Achats (Commandes)
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(data.totals.purchases)}</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>

        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <TrendingUp size={16} />
            Taux de Conversion
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{conversionRate}%</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {data.configured && (
        <DashboardCharts dailyStats={data.dailyStats} categoryStats={data.categoryStats} />
      )}

      {/* Bottom Lists */}
      <div className="flup-dash-grid">
        {/* Top Documents */}
        <div className="flup-card">
          <h3 className="flup-chart-title" style={{ marginBottom: 16 }}>Top Documents vendus</h3>
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
                  <td>{doc.title}</td>
                  <td>{doc.subject}</td>
                  <td><strong>{doc.purchases}</strong></td>
                  <td>{doc.previews}</td>
                  <td>{doc.conversionRate}%</td>
                </tr>
              ))}
              {data.topDocuments.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--flup-text-muted)' }}>Aucun document vendu.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Events */}
        <div className="flup-card">
          <h3 className="flup-chart-title" style={{ marginBottom: 16 }}>Événements récents</h3>
          <table className="flup-list-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Utilisateur</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEvents.slice(0, 8).map((event) => (
                <tr key={event.id}>
                  <td>
                    <span style={{ 
                      color: event.eventType === 'purchase_success' ? 'var(--flup-brand)' : 'inherit',
                      fontWeight: event.eventType === 'purchase_success' ? 600 : 500 
                    }}>
                      {EVENT_TRANSLATIONS[event.eventType] || event.eventType}
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--flup-text-muted)' }}>{event.documentTitle}</div>
                  </td>
                  <td>{event.userEmail || 'Visiteur anonyme'}</td>
                  <td style={{ fontSize: 12 }}>{event.createdAt}</td>
                </tr>
              ))}
              {data.recentEvents.length === 0 && (
                <tr><td colSpan={3} style={{ color: 'var(--flup-text-muted)' }}>Aucun événement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
