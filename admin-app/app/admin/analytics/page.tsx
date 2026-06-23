import { BarChart3, Bot, Eye, FileText, MousePointerClick, Search, ShoppingBag, XCircle } from 'lucide-react';

import { requireAdminPage } from '@/lib/access';
import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

export default async function PdfAnalyticsPage() {
  await requireAdminPage();
  const analytics = await getSupabasePdfAnalytics();
  const conversionRate =
    analytics.totals.previews > 0
      ? Math.round((analytics.totals.purchases / analytics.totals.previews) * 100)
      : 0;

  return (
    <>
      <div className="header">
        <div>
          <div className="route-pill">
            <BarChart3 size={15} />
            <span>/admin/analytics</span>
          </div>
          <h1>Analytics PDF</h1>
        </div>
      </div>

      {!analytics.configured ? (
        <div className="alert">Ajoute `DATABASE_URL` dans `admin-app/.env.local` pour lire les analytics Supabase.</div>
      ) : null}

      {analytics.configured && analytics.recentEvents.length === 0 ? (
        <div className="alert">Aucun evenement recu pour le moment. Les chiffres apparaitront apres usage de l'app mobile.</div>
      ) : null}

      <div className="metrics">
        <div className="metric">
          <span className="metric-icon">
            <MousePointerClick size={18} />
          </span>
          <div>
            <strong>{formatNumber(analytics.totals.sessions)}</strong>
            <span className="muted">Sessions</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <Search size={18} />
          </span>
          <div>
            <strong>{formatNumber(analytics.totals.searches)}</strong>
            <span className="muted">Recherches</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <Eye size={18} />
          </span>
          <div>
            <strong>{formatNumber(analytics.totals.previews)}</strong>
            <span className="muted">Previews</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <ShoppingBag size={18} />
          </span>
          <div>
            <strong>{formatNumber(analytics.totals.purchases)}</strong>
            <span className="muted">Achats</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <BarChart3 size={18} />
          </span>
          <div>
            <strong>{conversionRate}%</strong>
            <span className="muted">Conversion</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <Bot size={18} />
          </span>
          <div>
            <strong>{formatNumber(analytics.totals.assistantQuestions)}</strong>
            <span className="muted">Assistant</span>
          </div>
        </div>
      </div>

      <div className="workspace analytics-workspace">
        <section className="panel">
          <h2 className="section-title">
            <FileText size={18} />
            Documents actifs
          </h2>
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Preview</th>
                <th>Achat</th>
                <th>Lecture</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topDocuments.map((document) => (
                <tr key={document.id}>
                  <td data-label="Document">
                    <div className="doc-title">
                      <FileText size={16} />
                      <span>{document.title}</span>
                    </div>
                    <div className="doc-meta">
                      <span className="meta-chip">{document.subject}</span>
                    </div>
                  </td>
                  <td data-label="Preview">{formatNumber(document.previews)}</td>
                  <td data-label="Achat">{formatNumber(document.purchases)}</td>
                  <td data-label="Lecture">{formatNumber(document.readers)}</td>
                  <td data-label="Conv.">{document.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2 className="section-title">
            <MousePointerClick size={18} />
            Evenements recents
          </h2>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Document</th>
                <th>Session</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td data-label="Action">
                    <span className={`badge ${event.eventType === 'purchase_failed' ? 'archived' : 'published'}`}>
                      {event.eventType}
                    </span>
                  </td>
                  <td data-label="Document">{event.documentTitle}</td>
                  <td data-label="Session">{event.sessionId.slice(0, 12)}</td>
                  <td data-label="Date">{event.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {analytics.totals.purchaseFailures > 0 ? (
            <div className="alert analytics-alert">
              <XCircle size={17} />
              {formatNumber(analytics.totals.purchaseFailures)} achat(s) echoue(s) sur les 30 derniers jours.
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
