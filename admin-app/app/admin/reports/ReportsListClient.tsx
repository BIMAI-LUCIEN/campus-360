'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

type Report = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

const TEMPLATE_META: Record<
  string,
  { label: string; badge: string }
> = {
  stage:   { label: 'Rapport de stage', badge: 'flup-badge--brand' },
  memoire: { label: 'Mémoire',          badge: 'flup-badge--purple' },
  blank:   { label: 'Document vierge',  badge: 'flup-badge--neutral' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ReportsListClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/mobile/reports', { credentials: 'include' });
      if (!res.ok) throw new Error(`Erreur ${res.status} lors du chargement.`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos rapports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (typeof window === 'undefined') return;
    if (!window.confirm(`Supprimer définitivement « ${title} » ?`)) return;
    try {
      const res = await fetch(`/api/mobile/reports/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Suppression impossible');
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      window.alert(err.message || 'Erreur de suppression');
    }
  };

  const total = reports.length;
  const stages = reports.filter((r) => r.template_type === 'stage').length;
  const memoires = reports.filter((r) => r.template_type === 'memoire').length;
  const blanks = reports.filter((r) => r.template_type === 'blank').length;
  const oneWeekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = reports.filter(
    (r) => new Date(r.updated_at).getTime() >= oneWeekAgo,
  ).length;

  return (
    <div className="flup-page">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="flup-card">
        <div className="flup-page-header">
          <div>
            <div className="flup-eyebrow">
              <BookOpen size={13} />
              <span>Documents</span>
            </div>
            <h1 className="flup-page-title">Rapports de stage &amp; Mémoires</h1>
            <p className="flup-page-subtitle">
              Gérez les rapports de vos étudiants. Créez, modifiez et exportez
              en PDF ou Word. Toutes les actions sont synchronisées avec la
              base de données.
            </p>
          </div>
          <div className="flup-page-actions">
            <Link href="/admin/reports/new" className="flup-btn flup-btn--primary flup-btn--lg">
              <Plus size={16} />
              Créer un nouveau rapport
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────── */}
      <div className="flup-kpi-grid">
        <KpiMini icon={FileText} iconClass="kpi-icon teal" label="Total rapports" value={total} />
        <KpiMini icon={BookOpen} iconClass="kpi-icon blue" label="Rapports de stage" value={stages} />
        <KpiMini icon={BookOpen} iconClass="kpi-icon purple" label="Mémoires" value={memoires} />
        <KpiMini icon={Plus} iconClass="kpi-icon orange" label="Vierges" value={blanks} />
        <KpiMini icon={Calendar} iconClass="kpi-icon green" label="Cette semaine" value={thisWeek} />
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error ? (
        <div className="flup-alert flup-alert--danger" role="alert">
          <span>{error}</span>
          <button
            onClick={fetchReports}
            className="flup-btn flup-btn--ghost flup-btn--sm"
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={13} />
            Réessayer
          </button>
        </div>
      ) : null}

      {/* ── Content ─────────────────────────────────────── */}
      {loading ? (
        <div className="flup-card flup-empty">
          <Loader2 size={32} className="spin-anim" style={{ color: 'var(--color-flup-brand)' }} />
        </div>
      ) : reports.length === 0 ? (
        <div className="flup-card flup-empty">
          <div className="flup-empty-icon">
            <FileText size={26} />
          </div>
          <div className="flup-empty-title">Aucun rapport pour le moment</div>
          <p className="flup-empty-text">
            Créez votre premier rapport de stage ou mémoire en quelques
            secondes. L&apos;éditeur s&apos;ouvrira automatiquement avec les
            sections pré-remplies (page de garde, sommaire, etc.).
          </p>
          <Link href="/admin/reports/new" className="flup-btn flup-btn--primary">
            <Plus size={16} />
            Créer mon premier rapport
          </Link>
        </div>
      ) : (
        <div className="flup-grid-3">
          {reports.map((report) => {
            const tpl = TEMPLATE_META[report.template_type] ?? {
              label: report.template_type,
              badge: 'flup-badge--neutral',
            };

            return (
              <div
                key={report.id}
                className="flup-card flup-card--hover"
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span className={`flup-badge ${tpl.badge}`}>{tpl.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-flup-text-muted)',
                      fontWeight: 500,
                    }}
                  >
                    {formatDate(report.updated_at)}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--color-flup-text-main)',
                    margin: '0 0 6px',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {report.title}
                </h3>

                {report.description ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--color-flup-text-muted)',
                      margin: '0 0 16px',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {report.description}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-flup-text-muted)',
                      fontStyle: 'italic',
                      margin: '0 0 16px',
                    }}
                  >
                    Aucune description.
                  </p>
                )}

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 14,
                    borderTop: '1px solid var(--color-flup-border-soft)',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <Link
                    href={`/reports/${report.id}`}
                    className="flup-btn flup-btn--primary flup-btn--sm"
                    style={{ flex: 1 }}
                  >
                    <Edit3 size={13} />
                    Modifier
                  </Link>
                  <a
                    href={`/api/mobile/reports/${report.id}/export/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flup-btn flup-btn--secondary flup-btn--sm"
                    title="Aperçu PDF"
                  >
                    <Eye size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(report.id, report.title)}
                    className="flup-btn flup-btn--danger flup-btn--sm"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiMini({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="kpi-card">
      <span className={iconClass}>
        <Icon size={18} />
      </span>
      <span className="kpi-label">{label}</span>
      <div className="kpi-value-row">
        <span className="kpi-value">{value.toLocaleString('fr-FR')}</span>
      </div>
    </div>
  );
}