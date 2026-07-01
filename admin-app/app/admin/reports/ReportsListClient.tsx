'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  IconButton,
  KpiCard,
  PageHeader,
  Pill,
  Skeleton,
} from '../_components/ui';

type PillTone = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'cyan';

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

type TemplateKey = 'stage' | 'memoire' | 'blank';

const TEMPLATE_META: Record<string, { label: string; tone: PillTone }> = {
  stage:   { label: 'Rapport de stage', tone: 'blue' },
  memoire: { label: 'Mémoire',          tone: 'amber' },
  blank:   { label: 'Document vierge',  tone: 'neutral' },
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
      <PageHeader
        breadcrumb={{ parent: 'Dashboard', current: 'Rapports' }}
        title="Rapports de stage & Mémoires"
        subtitle="Gérez les rapports de vos étudiants. Créez, modifiez et exportez en PDF ou Word."
        actions={
          <Link href="/admin/reports/new">
            <Button variant="primary" icon={Plus}>
              Nouveau rapport
            </Button>
          </Link>
        }
      />

      {/* ── KPI strip ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total rapports"
          value={total.toLocaleString('fr-FR')}
          icon={FileText}
          accent="blue"
        />
        <KpiCard
          label="Rapports de stage"
          value={stages.toLocaleString('fr-FR')}
          icon={BookOpen}
          accent="green"
        />
        <KpiCard
          label="Mémoires"
          value={memoires.toLocaleString('fr-FR')}
          icon={BookOpen}
          accent="purple"
        />
        <KpiCard
          label="Vierges"
          value={blanks.toLocaleString('fr-FR')}
          icon={Plus}
          accent="rose"
        />
        <KpiCard
          label="Cette semaine"
          value={thisWeek.toLocaleString('fr-FR')}
          icon={Calendar}
          accent="cyan"
        />
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-danger-soft bg-danger-bg p-3 text-sm text-danger"
        >
          <span className="font-medium">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchReports}
            className="text-danger hover:bg-danger-soft"
          >
            Réessayer
          </Button>
        </div>
      ) : null}

      {/* ── Content ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <div className="mt-2 flex gap-2 border-t border-border-light pt-4">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface shadow-card">
          <EmptyState
            icon={FileText}
            title="Aucun rapport pour le moment"
            description="Créez votre premier rapport de stage ou mémoire en quelques secondes. L'éditeur s'ouvrira automatiquement avec les sections pré-remplies (page de garde, sommaire, etc.)."
            action={
              <Link href="/admin/reports/new">
                <Button variant="primary" icon={Plus}>
                  Créer mon premier rapport
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const tpl = TEMPLATE_META[report.template_type] ?? {
              label: report.template_type,
              tone: 'neutral' as PillTone,
            };

            return (
              <article
                key={report.id}
                className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Pill tone={tpl.tone}>{tpl.label}</Pill>
                  <span className="text-xs text-fg-subtle">
                    {formatDate(report.updated_at)}
                  </span>
                </div>

                <h3 className="mb-1.5 line-clamp-2 font-display text-[15px] font-bold leading-snug text-fg">
                  {report.title}
                </h3>

                {report.description ? (
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-fg-subtle">
                    {report.description}
                  </p>
                ) : (
                  <p className="mb-4 text-xs italic text-fg-subtle">
                    Aucune description.
                  </p>
                )}

                <div className="mt-auto flex gap-2 border-t border-border-light pt-4">
                  <Link href={`/reports/${report.id}`} className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Edit3}
                      className="w-full"
                    >
                      Modifier
                    </Button>
                  </Link>
                  <a
                    href={`/api/mobile/reports/${report.id}/export/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Aperçu PDF"
                    aria-label="Aperçu PDF"
                  >
                    <IconButton icon={Eye} label="Aperçu" />
                  </a>
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    variant="danger"
                    onClick={() => handleDelete(report.id, report.title)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}