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

const TEMPLATE_META: Record<string, { label: string; badge: string }> = {
  stage:   { label: 'Rapport de stage', badge: 'bg-stitch-primary-fixed text-stitch-primary' },
  memoire: { label: 'Mémoire',          badge: 'bg-stitch-tertiary-container/15 text-stitch-tertiary' },
  blank:   { label: 'Document vierge',  badge: 'bg-stitch-surface-container-high text-stitch-on-surface-variant' },
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
    <div className="flex flex-col gap-5 min-w-0">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 text-stitch-primary bg-stitch-primary-fixed border border-stitch-outline-variant rounded-full px-2.5 py-1 text-[11px] font-bold mb-3">
              <BookOpen size={13} />
              <span>Documents</span>
            </div>
            <h1 className="font-stitch-headline text-[26px] font-bold text-stitch-on-surface tracking-tight m-0">
              Rapports de stage &amp; Mémoires
            </h1>
            <p className="text-[14px] text-stitch-on-surface-variant mt-1.5 max-w-[60ch] m-0 leading-relaxed">
              Gérez les rapports de vos étudiants. Créez, modifiez et exportez
              en PDF ou Word. Toutes les actions sont synchronisées avec la
              base de données.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/reports/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-stitch text-sm font-semibold border border-transparent bg-stitch-primary text-stitch-on-primary hover:opacity-90 hover:shadow-stitch-md transition-all"
            >
              <Plus size={16} />
              Créer un nouveau rapport
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiMini icon={FileText} iconClass="bg-stitch-success-light text-stitch-success-dark" label="Total rapports" value={total} />
        <KpiMini icon={BookOpen} iconClass="bg-stitch-primary-fixed text-stitch-primary" label="Rapports de stage" value={stages} />
        <KpiMini icon={BookOpen} iconClass="bg-stitch-tertiary-container/15 text-stitch-tertiary" label="Mémoires" value={memoires} />
        <KpiMini icon={Plus} iconClass="bg-stitch-error-light text-stitch-error-rose" label="Vierges" value={blanks} />
        <KpiMini icon={Calendar} iconClass="bg-stitch-secondary-container text-stitch-on-surface-variant" label="Cette semaine" value={thisWeek} />
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 px-4 py-3 rounded-stitch-sm border border-stitch-error-rose/20 bg-stitch-error-light text-stitch-error text-sm font-medium"
        >
          <span>{error}</span>
          <button
            onClick={fetchReports}
            className="ml-auto inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-stitch-sm text-xs font-semibold border border-transparent bg-transparent text-stitch-error-rose hover:bg-white transition-colors"
          >
            <RefreshCw size={13} />
            Réessayer
          </button>
        </div>
      ) : null}

      {/* ── Content ─────────────────────────────────────── */}
      {loading ? (
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch py-12 flex items-center justify-center">
          <Loader2 size={32} className="spin-anim text-stitch-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch py-12 px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-stitch flex items-center justify-center bg-stitch-surface-container text-stitch-on-surface-variant">
            <FileText size={26} />
          </div>
          <div className="text-base font-bold text-stitch-on-surface mb-1.5">
            Aucun rapport pour le moment
          </div>
          <p className="text-[13px] text-stitch-on-surface-variant max-w-md mx-auto mb-5 leading-relaxed">
            Créez votre premier rapport de stage ou mémoire en quelques
            secondes. L&apos;éditeur s&apos;ouvrira automatiquement avec les
            sections pré-remplies (page de garde, sommaire, etc.).
          </p>
          <Link
            href="/admin/reports/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-stitch text-sm font-semibold border border-transparent bg-stitch-primary text-stitch-on-primary hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Créer mon premier rapport
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const tpl = TEMPLATE_META[report.template_type] ?? {
              label: report.template_type,
              badge: 'bg-stitch-surface-container-high text-stitch-on-surface-variant',
            };

            return (
              <div
                key={report.id}
                className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-5 shadow-stitch-sm hover:shadow-stitch-md transition-shadow flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border border-transparent ${tpl.badge}`}>
                    {tpl.label}
                  </span>
                  <span className="text-[11px] text-stitch-on-surface-variant font-medium">
                    {formatDate(report.updated_at)}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--color-stitch-on-surface)',
                    margin: '0 0 6px',
                    lineHeight: 1.35,
                  }}
                >
                  {report.title}
                </h3>

                {report.description ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--color-stitch-on-surface-variant)',
                      margin: '0 0 16px',
                      lineHeight: 1.5,
                    }}
                  >
                    {report.description}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-stitch-on-surface-variant)',
                      fontStyle: 'italic',
                      margin: '0 0 16px',
                    }}
                  >
                    Aucune description.
                  </p>
                )}

                <div className="mt-auto pt-3 border-t border-stitch-surface-container flex gap-2">
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-stitch-primary text-stitch-on-primary text-[12px] font-bold hover:opacity-90 transition-opacity"
                  >
                    <Edit3 size={13} />
                    Modifier
                  </Link>
                  <a
                    href={`/api/mobile/reports/${report.id}/export/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-stitch-surface-container-low text-stitch-on-surface text-[12px] font-bold hover:bg-stitch-surface-container border border-stitch-outline-variant transition-colors"
                    title="Aperçu PDF"
                  >
                    <Eye size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(report.id, report.title)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-stitch-surface-container-low text-stitch-error text-[12px] font-bold hover:bg-stitch-error-light border border-stitch-outline-variant transition-colors"
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
    <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-4 shadow-stitch-sm flex flex-col gap-2.5">
      <span className={`w-10 h-10 rounded-lg inline-flex items-center justify-center ${iconClass}`}>
        <Icon size={18} />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
        {label}
      </span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="font-stitch-headline text-xl font-bold text-stitch-on-surface leading-none tabular-nums">
          {value.toLocaleString('fr-FR')}
        </span>
      </div>
    </div>
  );
}
