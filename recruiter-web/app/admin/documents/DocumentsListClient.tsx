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

type Document = {
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
  cv:               { label: 'CV',                badge: 'bg-blue-100 text-blue-700' },
  lettre_motivation:{ label: 'Lettre de motivation', badge: 'bg-purple-100 text-purple-700' },
  stage:            { label: 'Rapport de stage', badge: 'bg-stitch-primary-fixed text-stitch-primary' },
  memoire:          { label: 'Mémoire',          badge: 'bg-stitch-tertiary-container/15 text-stitch-tertiary' },
  blank:            { label: 'Document vierge',  badge: 'bg-stitch-surface-container-high text-stitch-on-surface-variant' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function DocumentsListClient() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/mobile/documents', { credentials: 'include' });
      if (!res.ok) throw new Error(`Erreur ${res.status} lors du chargement.`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (typeof window === 'undefined') return;
    if (!window.confirm(`Supprimer définitivement « ${title} » ?`)) return;
    try {
      const res = await fetch(`/api/mobile/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Suppression impossible');
      setDocuments((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      window.alert(err.message || 'Erreur de suppression');
    }
  };

  const total = documents.length;
  const cvs = documents.filter((r) => r.template_type === 'cv').length;
  const lettres = documents.filter((r) => r.template_type === 'lettre_motivation').length;
  const stages = documents.filter((r) => r.template_type === 'stage').length;
  const memoires = documents.filter((r) => r.template_type === 'memoire').length;
  const oneWeekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = documents.filter(
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
              Hub de documents étudiants
            </h1>
            <p className="text-[14px] text-stitch-on-surface-variant mt-1.5 max-w-[60ch] m-0 leading-relaxed">
              CV, lettres de motivation, rapports de stage et mémoires — générez, éditez et exportez en PDF depuis un seul endroit.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/documents/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-stitch text-sm font-semibold border border-transparent bg-stitch-primary text-stitch-on-primary hover:opacity-90 hover:shadow-stitch-md transition-all"
            >
              <Plus size={16} />
              Créer un nouveau document
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiMini icon={FileText}  iconClass="bg-stitch-success-light text-stitch-success-dark"         label="Total"            value={total} />
        <KpiMini icon={FileText}  iconClass="bg-blue-100 text-blue-600"                                label="CV"               value={cvs} />
        <KpiMini icon={FileText}  iconClass="bg-purple-100 text-purple-600"                            label="Lettres"           value={lettres} />
        <KpiMini icon={BookOpen}  iconClass="bg-stitch-primary-fixed text-stitch-primary"              label="Stage"            value={stages} />
        <KpiMini icon={Calendar}  iconClass="bg-stitch-secondary-container text-stitch-on-surface-variant" label="Cette semaine" value={thisWeek} />
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 px-4 py-3 rounded-stitch-sm border border-stitch-error-rose/20 bg-stitch-error-light text-stitch-error text-sm font-medium"
        >
          <span>{error}</span>
          <button
            onClick={fetchDocuments}
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
      ) : documents.length === 0 ? (
        <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch py-12 px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-stitch flex items-center justify-center bg-stitch-surface-container text-stitch-on-surface-variant">
            <FileText size={26} />
          </div>
          <div className="text-base font-bold text-stitch-on-surface mb-1.5">
            Aucun document pour le moment
          </div>
          <p className="text-[13px] text-stitch-on-surface-variant max-w-md mx-auto mb-5 leading-relaxed">
            Créez votre premier document — CV, lettre de motivation, rapport de stage ou mémoire. L&apos;IA vous aide à démarrer en quelques secondes.
          </p>
          <Link
            href="/admin/documents/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-stitch text-sm font-semibold border border-transparent bg-stitch-primary text-stitch-on-primary hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Créer mon premier document
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => {
            const tpl = TEMPLATE_META[document.template_type] ?? {
              label: document.template_type,
              badge: 'bg-stitch-surface-container-high text-stitch-on-surface-variant',
            };

            return (
              <div
                key={document.id}
                className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-5 shadow-stitch-sm hover:shadow-stitch-md transition-shadow flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border border-transparent ${tpl.badge}`}>
                    {tpl.label}
                  </span>
                  <span className="text-[11px] text-stitch-on-surface-variant font-medium">
                    {formatDate(document.updated_at)}
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
                  {document.title}
                </h3>

                {document.description ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--color-stitch-on-surface-variant)',
                      margin: '0 0 16px',
                      lineHeight: 1.5,
                    }}
                  >
                    {document.description}
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
                    href={`/documents/${document.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-stitch-primary text-stitch-on-primary text-[12px] font-bold hover:opacity-90 transition-opacity"
                  >
                    <Edit3 size={13} />
                    Modifier
                  </Link>
                  <a
                    href={`/api/mobile/documents/${document.id}/export/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-stitch-surface-container-low text-stitch-on-surface text-[12px] font-bold hover:bg-stitch-surface-container border border-stitch-outline-variant transition-colors"
                    title="Aperçu PDF"
                  >
                    <Eye size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(document.id, document.title)}
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
