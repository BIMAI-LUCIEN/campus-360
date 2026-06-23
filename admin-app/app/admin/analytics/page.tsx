import { Users, FileText, ShoppingBag, TrendingUp, Download, Eye, Calendar } from 'lucide-react';
import { requireAdminPage } from '@/lib/access';
import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';
import { DashboardCharts } from './DashboardCharts';

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

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

export default async function PdfAnalyticsPage() {
  await requireAdminPage();
  const analytics = await getSupabasePdfAnalytics();
  
  const conversionRate =
    analytics.totals.previews > 0
      ? Math.round((analytics.totals.purchases / analytics.totals.previews) * 100)
      : 0;

  return (
    <>
      <div className="flup-page-header">
        <h1 className="flup-page-title">Dashboard</h1>
        <div className="flup-date-picker">
          <Calendar size={16} />
          <span>30 derniers jours</span>
        </div>
      </div>

      {!analytics.configured ? (
        <div className="alert" style={{ marginBottom: 24 }}>Ajoute `DATABASE_URL` dans `admin-app/.env.local` pour lire les analytics Supabase.</div>
      ) : null}

      {/* KPI Cards */}
      <div className="flup-kpi-grid">
        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <Users size={16} />
            Total Sessions
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(analytics.totals.sessions)}</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>

        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <ShoppingBag size={16} />
            Revenus Générés
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(analytics.totals.revenue)} C</span>
            <span className="kpi-trend up">~</span>
          </div>
        </div>

        <div className="flup-card kpi-card">
          <div className="kpi-label">
            <FileText size={16} />
            Achats (Commandes)
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(analytics.totals.purchases)}</span>
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
      {analytics.configured && (
        <DashboardCharts dailyStats={analytics.dailyStats} categoryStats={analytics.categoryStats} />
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
              {analytics.topDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title}</td>
                  <td>{doc.subject}</td>
                  <td><strong>{doc.purchases}</strong></td>
                  <td>{doc.previews}</td>
                  <td>{doc.conversionRate}%</td>
                </tr>
              ))}
              {analytics.topDocuments.length === 0 && (
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
              {analytics.recentEvents.slice(0, 8).map((event) => (
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
              {analytics.recentEvents.length === 0 && (
                <tr><td colSpan={3} style={{ color: 'var(--flup-text-muted)' }}>Aucun événement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
