'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Package,
  Sparkles,
  TrendingUp,
  MoreHorizontal,
  Trash2,
  Edit3,
  Archive,
  Check,
  Eye,
  Search,
  RefreshCw,
  Calendar,
  Tags,
  Percent,
  Wallet,
} from 'lucide-react';
import type { PdfPack, PdfStatus } from '@/lib/course-db';
import {
  KpiCard,
  Card,
  Button,
  IconButton,
  Pill,
  FilterChip,
  FilterSelect,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@/app/admin/_components/ui';

const coinsFmt = new Intl.NumberFormat('fr-CM');
const formatCoins = (value: number) => coinsFmt.format(value);

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'published', label: 'Publiés' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'needs_review', label: 'À corriger' },
  { value: 'analyzing', label: 'Analyse IA' },
  { value: 'archived', label: 'Archivés' },
];

const PACK_TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'semester', label: 'Semestre' },
  { value: 'exam_prep', label: 'Prépa examens' },
  { value: 'corrections', label: 'Corrections' },
  { value: 'course_bundle', label: 'Bundle de cours' },
  { value: 'catch_up', label: 'Rattrapage' },
  { value: 'transversal', label: 'Transversal' },
];

// Status → Pill tone (kept aligned with PdfDashboardClient's palette).
const statusTone: Record<PdfStatus, 'green' | 'amber' | 'blue' | 'neutral'> = {
  published: 'green',
  needs_review: 'amber',
  analyzing: 'blue',
  draft: 'neutral',
  archived: 'neutral',
};

const statusLabel: Record<PdfStatus, string> = {
  published: 'Publié',
  needs_review: 'À corriger',
  analyzing: 'Analyse IA',
  draft: 'Brouillon',
  archived: 'Archivé',
};

// Pack type → Pill tone.
type PackPillTone = 'blue' | 'rose' | 'amber' | 'violet' | 'cyan' | 'neutral';

const packTypeTone: Record<PdfPack['packType'], PackPillTone> = {
  semester: 'blue',
  exam_prep: 'rose',
  corrections: 'amber',
  course_bundle: 'violet',
  catch_up: 'cyan',
  transversal: 'neutral',
};

const packTypeLabel: Record<PdfPack['packType'], string> = {
  semester: 'Semestre',
  exam_prep: 'Prépa examens',
  corrections: 'Corrections',
  course_bundle: 'Bundle cours',
  catch_up: 'Rattrapage',
  transversal: 'Transversal',
};

// Deterministic accent gradient per pack id, for the card thumbnail strip.
const ACCENT_PALETTE: Array<[string, string]> = [
  ['#dbeafe', '#2563eb'],
  ['#ede9fe', '#7c3aed'],
  ['#ffe4e6', '#e11d48'],
  ['#fef3c7', '#d97706'],
  ['#cffafe', '#0891b2'],
  ['#dcfce7', '#16a34a'],
  ['#fce7f3', '#db2777'],
  ['#e0e7ff', '#4f46e5'],
];

function accentGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const [a, b] = ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function formatDateFr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diffMs / day);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'il y a 1 jour';
  if (days < 7) return `il y a ${days} jours`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return 'il y a 1 semaine';
  if (weeks < 5) return `il y a ${weeks} semaines`;
  return formatDateFr(iso);
}

export function PacksDashboardClient() {
  const [packs, setPacks] = useState<PdfPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch('/api/packs', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Chargement impossible');
      }
      setPacks((payload.packs ?? []) as PdfPack[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!openMenuId) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenuId]);

  const metrics = useMemo(() => {
    const total = packs.length;
    const published = packs.filter((p) => p.status === 'published').length;
    const drafts = packs.filter(
      (p) => p.status === 'draft' || p.status === 'needs_review',
    ).length;
    const revenue = packs.reduce((sum, p) => sum + p.revenueCoins, 0);
    const totalSales = packs.reduce((sum, p) => sum + p.salesCount, 0);
    const aiConfidenceAvg =
      total > 0
        ? Math.round(
            packs.reduce((sum, p) => sum + (Number.isFinite(p.aiConfidence) ? p.aiConfidence : 0), 0) /
              total,
          )
        : 0;
    return { total, published, drafts, revenue, totalSales, aiConfidenceAvg };
  }, [packs]);

  const visiblePacks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return packs.filter((p) => {
      const haystack = [
        p.title,
        p.description,
        p.faculty,
        p.university,
        p.level,
        p.semester,
        p.aiSummary,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (statusFilter === 'all' || p.status === statusFilter) &&
        (typeFilter === 'all' || p.packType === typeFilter) &&
        (!facultyFilter ||
          p.faculty.toLowerCase().includes(facultyFilter.toLowerCase())) &&
        (!levelFilter ||
          p.level.toLowerCase().includes(levelFilter.toLowerCase()))
      );
    });
  }, [packs, query, statusFilter, typeFilter, facultyFilter, levelFilter]);

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setFacultyFilter('');
    setLevelFilter('');
  };

  const updatePack = useCallback(
    async (packId: string, mutate: (pack: PdfPack) => PdfPack) => {
      setPacks((prev) => prev.map((p) => (p.id === packId ? mutate(p) : p)));
    },
    [],
  );

  const updateStatus = async (packId: string, nextStatus: PdfStatus) => {
    try {
      const response = await fetch(`/api/packs/${packId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage('Changement de statut impossible.');
        return;
      }
      setOpenMenuId(null);
      setMessage(
        nextStatus === 'published'
          ? 'Pack publié.'
          : nextStatus === 'archived'
            ? 'Pack archivé.'
            : 'Statut mis à jour.',
      );
      await updatePack(packId, (p) => ({ ...p, status: nextStatus }));
    } catch {
      setMessage('Changement de statut impossible.');
    }
  };

  const removePack = async (packId: string) => {
    if (!confirm('Supprimer ce pack ? Cette action est irréversible.')) return;
    try {
      const response = await fetch(`/api/packs/${packId}`, { method: 'DELETE' });
      if (!response.ok) {
        setMessage('Suppression du pack impossible.');
        return;
      }
      setOpenMenuId(null);
      setMessage('Pack supprimé.');
      setPacks((prev) => prev.filter((p) => p.id !== packId));
    } catch {
      setMessage('Suppression du pack impossible.');
    }
  };

  const viewPackDocuments = (pack: PdfPack) => {
    setOpenMenuId(null);
    const count = pack.documentIds.length;
    setMessage(
      count > 0
        ? `Ce pack contient ${count} document${count > 1 ? 's' : ''}.`
        : "Ce pack ne contient aucun PDF pour l'instant.",
    );
  };

  const createFirstPack = () => {
    setMessage(
      "La création de pack arrive bientôt — pour l'instant, ajoute des PDFs au catalogue puis regroupe-les depuis l'IA.",
    );
  };

  const { total, published, drafts, revenue } = metrics;

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Packs de PDF"
        subtitle="Gère les packs thématiques vendus aux étudiants (semestre, examens, corrections, etc.)."
        breadcrumb={{ parent: 'Dashboard', current: 'Packs' }}
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={refresh}
            >
              Actualiser
            </Button>
            <Button variant="primary" size="md" icon={Plus} onClick={createFirstPack}>
              Nouveau Pack
            </Button>
          </>
        }
      />

      {/* ── KPI cards ───────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Packs"
          value={loading ? '—' : total}
          icon={Package}
          accent="blue"
          caption={loading ? 'Chargement…' : `${metrics.totalSales} ventes cumulées`}
        />
        <KpiCard
          label="Publiés"
          value={loading ? '—' : published}
          icon={Check}
          accent="green"
          caption={loading ? 'Chargement…' : `${total > 0 ? Math.round((published / total) * 100) : 0}% du catalogue`}
        />
        <KpiCard
          label="Brouillons"
          value={loading ? '—' : drafts}
          icon={Edit3}
          accent="amber"
          caption={loading ? 'Chargement…' : 'À finaliser avant publication'}
        />
        <KpiCard
          label="Revenu Total"
          value={loading ? '—' : `${formatCoins(revenue)} FCFA`}
          icon={Wallet}
          accent="purple"
          caption={loading ? 'Chargement…' : `Confiance IA moyenne: ${metrics.aiConfidenceAvg}%`}
        />
      </div>

      {/* ── Filter row ──────────────────────────────────────────── */}
      <Card padded={false} className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-light px-5 py-4">
          <FilterChip label="Statut" icon={Tags}>
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              ariaLabel="Filtrer par statut"
            />
          </FilterChip>

          <FilterChip label="Type" icon={Package}>
            <FilterSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={PACK_TYPE_OPTIONS}
              ariaLabel="Filtrer par type de pack"
            />
          </FilterChip>

          <FilterChip label="Faculté" icon={Search}>
            <input
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              placeholder="Toutes"
              aria-label="Filtrer par faculté"
              className="w-28 appearance-none bg-transparent border-0 outline-none text-sm font-medium text-fg placeholder:text-fg-faint"
            />
          </FilterChip>

          <FilterChip label="Niveau" icon={Search}>
            <input
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              placeholder="Tous"
              aria-label="Filtrer par niveau"
              className="w-24 appearance-none bg-transparent border-0 outline-none text-sm font-medium text-fg placeholder:text-fg-faint"
            />
          </FilterChip>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-sm font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-faint">
              <Search size={14} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pack, une faculté, un semestre…"
              aria-label="Rechercher un pack"
              className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-faint focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-fg-subtle">
            <span className="font-semibold text-fg">{visiblePacks.length}</span>
            <span>pack{visiblePacks.length > 1 ? 's' : ''}</span>
            {query || statusFilter !== 'all' || typeFilter !== 'all' || facultyFilter || levelFilter ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                filtres actifs
              </span>
            ) : null}
          </div>
        </div>
      </Card>

      {/* ── Inline message ──────────────────────────────────────── */}
      {message ? (
        <div className="mb-6 rounded-md border border-border bg-primary-softer px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {/* ── Error state ─────────────────────────────────────────── */}
      {error ? (
        <Card>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-fg">Impossible de charger les packs</p>
              <p className="mt-1 text-sm text-fg-subtle">{error}</p>
            </div>
            <Button variant="primary" icon={RefreshCw} onClick={refresh}>
              Réessayer
            </Button>
          </div>
        </Card>
      ) : null}

      {/* ── Loading skeleton ────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-surface border border-border rounded-xl p-5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-5/6" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="mt-5 h-12 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!loading && !error && packs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="Aucun pack créé"
            description="Les packs regroupent plusieurs PDFs autour d'un thème (semestre, examens, corrections). Crée ton premier pack pour commencer à vendre des bundles."
            action={
              <Button variant="primary" icon={Plus} onClick={createFirstPack}>
                Créer mon premier pack
              </Button>
            }
          />
        </Card>
      ) : null}

      {/* ── Filtered empty state ────────────────────────────────── */}
      {!loading && !error && packs.length > 0 && visiblePacks.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="Aucun pack ne correspond aux filtres"
            description="Ajuste ta recherche ou réinitialise les filtres pour voir plus de packs."
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            }
          />
        </Card>
      ) : null}

      {/* ── Pack grid ───────────────────────────────────────────── */}
      {!loading && !error && visiblePacks.length > 0 ? (
        <div ref={menuRef} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visiblePacks.map((pack) => {
            const docCount = pack.documentIds.length;
            const hasDiscount = pack.discountPercent > 0;
            const originalPrice = pack.originalPriceCoins;
            const finalPrice = pack.priceCoins;
            const tone = statusTone[pack.status] ?? 'neutral';

            return (
              <article
                key={pack.id}
                className="relative flex flex-col bg-surface border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5"
              >
                {/* Accent strip + pills row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={tone}>{statusLabel[pack.status] ?? pack.status}</Pill>
                    <Pill tone={packTypeTone[pack.packType]}>
                      {packTypeLabel[pack.packType]}
                    </Pill>
                  </div>
                  <div
                    aria-hidden
                    className="h-9 w-9 shrink-0 rounded-lg shadow-sm"
                    style={{ background: accentGradient(pack.id) }}
                  />
                </div>

                {/* Title */}
                <h3 className="mt-4 font-display text-[16px] font-bold leading-snug text-fg line-clamp-2">
                  {pack.title}
                </h3>

                {/* AI Summary */}
                {pack.aiSummary ? (
                  <p className="mt-2 text-sm text-fg-subtle line-clamp-2">
                    {pack.aiSummary}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-fg-faint">
                    Résumé IA en cours de génération…
                  </p>
                )}

                {/* Metadata grid */}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-fg-faint">
                      Université
                    </dt>
                    <dd className="mt-0.5 truncate font-medium text-fg-muted" title={pack.university}>
                      {pack.university || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-fg-faint">
                      Faculté
                    </dt>
                    <dd className="mt-0.5 truncate font-medium text-fg-muted" title={pack.faculty}>
                      {pack.faculty || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-fg-faint">
                      Niveau
                    </dt>
                    <dd className="mt-0.5 truncate font-medium text-fg-muted" title={pack.level}>
                      {pack.level || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-fg-faint">
                      Documents
                    </dt>
                    <dd className="mt-0.5 inline-flex items-center gap-1 font-medium text-fg-muted">
                      <FileTextMini />
                      <span className="tabular-nums">{docCount}</span>
                      <span>{docCount > 1 ? 'PDFs' : 'PDF'}</span>
                    </dd>
                  </div>
                </dl>

                {/* Price block */}
                <div className="mt-5 rounded-lg border border-border-light bg-surface-2 px-4 py-3">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-bold text-fg tabular-nums">
                          {formatCoins(finalPrice)}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                          Coins
                        </span>
                      </div>
                      {hasDiscount && originalPrice > finalPrice ? (
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          <span className="text-fg-faint line-through tabular-nums">
                            {formatCoins(originalPrice)}
                          </span>
                          <span className="text-fg-subtle">prix unitaire</span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-fg-subtle">
                          Bundle {pack.semester ? `· ${pack.semester}` : ''}
                        </div>
                      )}
                    </div>
                    {hasDiscount ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">
                        <Percent size={11} />
                        -{pack.discountPercent}%
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-md bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-1 text-fg-subtle">
                      <Package size={12} />
                      <span className="font-semibold uppercase tracking-wider text-fg-faint">
                        Ventes
                      </span>
                    </div>
                    <div className="mt-1 font-display text-base font-bold text-fg tabular-nums">
                      {formatCoins(pack.salesCount)}
                    </div>
                  </div>
                  <div className="rounded-md bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-1 text-fg-subtle">
                      <TrendingUp size={12} />
                      <span className="font-semibold uppercase tracking-wider text-fg-faint">
                        Revenu
                      </span>
                    </div>
                    <div className="mt-1 font-display text-base font-bold text-fg tabular-nums">
                      {formatCoins(pack.revenueCoins)}
                    </div>
                  </div>
                  <div className="rounded-md bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-1 text-fg-subtle">
                      <Sparkles size={12} />
                      <span className="font-semibold uppercase tracking-wider text-fg-faint">
                        IA
                      </span>
                    </div>
                    <div className="mt-1 font-display text-base font-bold text-fg tabular-nums">
                      {pack.aiConfidence || 0}%
                    </div>
                  </div>
                </div>

                {/* Bottom action row */}
                <div className="mt-auto flex items-center justify-between border-t border-border-light pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
                    <Calendar size={12} className="text-fg-faint" />
                    <span className="tabular-nums">{relativeDate(pack.createdAt)}</span>
                  </span>
                  <div className="relative">
                    <IconButton
                      icon={MoreHorizontal}
                      label={`Actions pour ${pack.title}`}
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === pack.id ? null : pack.id))
                      }
                    />
                    {openMenuId === pack.id ? (
                      <div className="absolute right-0 top-11 z-20 w-52 rounded-lg border border-border bg-surface p-1 shadow-popover">
                        <button
                          type="button"
                          onClick={() => viewPackDocuments(pack)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                        >
                          <Eye size={14} className="text-fg-muted" />
                          Voir les PDFs
                        </button>
                        {pack.status !== 'published' ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(pack.id, 'published')}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                          >
                            <Check size={14} className="text-success" />
                            Publier
                          </button>
                        ) : null}
                        {pack.status !== 'archived' ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(pack.id, 'archived')}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                          >
                            <Archive size={14} className="text-fg-muted" />
                            Archiver
                          </button>
                        ) : null}
                        <div className="my-1 border-t border-border-light" />
                        <button
                          type="button"
                          onClick={() => removePack(pack.id)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg cursor-pointer"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

// Tiny inline document-count icon (kept here to avoid pulling FileText if unused).
function FileTextMini() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-fg-faint"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
