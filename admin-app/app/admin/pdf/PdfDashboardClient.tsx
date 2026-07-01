'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  RefreshCw,
  Download,
  Eye,
  DollarSign,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  CircleAlert,
  Archive,
  FilePenLine,
  Trash2,
  Search,
} from 'lucide-react';
import type { PdfDocument, PdfPack } from '@/lib/course-db';
import {
  KpiCard,
  Card,
  CardHeader,
  Button,
  IconButton,
  Pill,
  FilterChip,
  FilterSelect,
  EmptyState,
  PageHeader,
} from '@/app/admin/_components/ui';

type Props = {
  initialDocuments: PdfDocument[];
};

const formatCoins = (value: number) => new Intl.NumberFormat('fr-CM').format(value);
const ITEMS_PER_PAGE = 20;

// ── Helpers for AI field inference (unchanged from original) ───────────
const titleFromFileName = (fileName: string) =>
  fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanMatch = (value?: string) =>
  value
    ?.replace(/\s+/g, ' ')
    .replace(/[|:;,.]+$/g, '')
    .trim();

const firstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = cleanMatch(match?.[1] ?? match?.[0]);
    if (value) return value;
  }
  return '';
};

const inferSubject = (text: string, fallback: string) => {
  const lower = text.toLowerCase();
  const subjects = [
    'Mathematiques',
    'Analyse',
    'Algebre',
    'Informatique',
    'Algorithmique',
    'Programmation',
    'Droit',
    'Droit OHADA',
    'Comptabilite',
    'Economie',
    'Physique',
    'Chimie',
    'Anglais',
  ];
  return (
    subjects.find((subject) => lower.includes(subject.toLowerCase())) ??
    fallback.split(' ').slice(0, 3).join(' ')
  );
};

const inferPdfFields = (fileName: string, rawText: string, pageCount: number) => {
  const text = rawText.replace(/\s+/g, ' ').trim();
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => cleanMatch(line))
    .filter((line): line is string => Boolean(line && line.length >= 4));
  const fallbackTitle = titleFromFileName(fileName);
  const heading = lines.find(
    (line) => !/page\s+\d+/i.test(line) && line.length <= 90,
  );
  const level = firstMatch(text, [
    /\b((?:L|Licence)\s?[1-3]\s?[A-Za-z ]{0,35})\b/i,
    /\b((?:M|Master)\s?[1-2]\s?[A-Za-z ]{0,35})\b/i,
    /\b((?:BTS|DUT)\s?[A-Za-z ]{0,35})\b/i,
  ]);
  const faculty = firstMatch(text, [
    /\b(Faculte\s+(?:des?|de|d')\s+[\p{L} ]{3,60})/iu,
    /\b(Ecole\s+(?:nationale|superieure)?\s*[\p{L} ]{3,60})/iu,
    /\b(Institut\s+[\p{L} ]{3,60})/iu,
  ]);
  const subject = inferSubject(text, fallbackTitle);
  const tags = Array.from(
    new Set(
      [
        subject,
        level,
        faculty,
        firstMatch(text, [/\b(examen|controle|td|tp|corrige|resume|cours)\b/i]),
      ]
        .map((item) => cleanMatch(item))
        .filter((item): item is string => Boolean(item)),
    ),
  ).slice(0, 6);
  const difficulty = /master|m2|m1|l3|niveau\s?3/i.test(text)
    ? 'avance'
    : /l2|niveau\s?2|droit|analyse/i.test(text)
      ? 'intermediaire'
      : 'standard';
  const suggestedPrice = Math.max(
    100,
    Math.min(1000, Math.round((pageCount * 8 + tags.length * 25) / 50) * 50),
  );
  const qualityScore = Math.min(
    100,
    25 +
      (heading ? 15 : 0) +
      (subject ? 15 : 0) +
      (level ? 15 : 0) +
      (faculty ? 10 : 0) +
      (pageCount > 1 ? 10 : 0) +
      (tags.length >= 3 ? 10 : 0),
  );

  return {
    title: heading ?? fallbackTitle,
    description:
      lines.slice(0, 4).join(' - ').slice(0, 240) ||
      `Document ${fallbackTitle}`,
    university: firstMatch(text, [
      /\b(Universite\s+(?:de|d')\s+[\p{L} -]{3,60})/iu,
      /\b(University\s+of\s+[\p{L} -]{3,60})/iu,
    ]),
    faculty,
    subject,
    teacher: firstMatch(text, [
      /\b((?:Pr|Prof|Professeur|Dr|Docteur)\.?\s+\p{Lu}[\p{L} -]{2,50})/iu,
      /\b(Enseignant\s*:?\s*\p{Lu}[\p{L} -]{2,50})/iu,
    ]).replace(/^Enseignant\s*:?\s*/i, ''),
    level,
    academicYear: firstMatch(text, [
      /\b(20\d{2}\s*[-/]\s*20\d{2})\b/,
      /\b(20\d{2})\b/,
    ]),
    pageCount,
    aiSummary:
      lines.slice(0, 5).join(' ').slice(0, 420) ||
      `Document de ${subject} pour ${level || 'niveau non précise'}.`,
    aiTags: tags,
    aiDifficulty: difficulty,
    suggestedPriceCoins: suggestedPrice,
    qualityScore,
    aiStudyPlan: [
      `Lire le résumé et isoler les notions clés de ${subject}.`,
      `Faire une fiche courte pour ${level || 'le niveau cible'}.`,
      "Traiter les exercices ou exemples, puis noter les erreurs.",
      'Finir par un quiz rapide avant publication.',
    ],
    aiQuiz: [
      {
        question: `Quel est le thème principal de "${heading ?? fallbackTitle}" ?`,
        answer: subject,
      },
      {
        question: 'Comment réviser ce PDF efficacement ?',
        answer:
          'Lire le résumé, faire une fiche, pratiquer, puis corriger les erreurs.',
      },
      {
        question: 'Quel niveau est visé ?',
        answer: level || 'Niveau à confirmer dans le dashboard.',
      },
    ],
    extractedText: text.slice(0, 6000),
  };
};

// ── Status → Pill tone mapping ─────────────────────────────────────────
const statusTone: Record<string, 'green' | 'amber' | 'blue' | 'neutral'> = {
  published: 'green',
  needs_review: 'amber',
  analyzing: 'blue',
  draft: 'neutral',
  archived: 'neutral',
};

const statusLabel: Record<string, string> = {
  published: 'Publié',
  needs_review: 'À corriger',
  analyzing: 'Analyse IA',
  draft: 'Brouillon',
  archived: 'Archivé',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'published', label: 'Publiés' },
  { value: 'needs_review', label: 'À corriger' },
  { value: 'analyzing', label: 'Analyse IA' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'archived', label: 'Archives' },
];

// Deterministic gradient pair for preview thumbnails.
const PREVIEW_PALETTE: Array<[string, string]> = [
  ['#dbeafe', '#2563eb'],
  ['#dcfce7', '#16a34a'],
  ['#fef3c7', '#d97706'],
  ['#fce7f3', '#db2777'],
  ['#ede9fe', '#7c3aed'],
  ['#cffafe', '#0891b2'],
  ['#fee2e2', '#dc2626'],
  ['#d1fae5', '#059669'],
];

function previewGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const [a, b] = PREVIEW_PALETTE[hash % PREVIEW_PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function PdfDashboardClient({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [packs, setPacks] = useState<PdfPack[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    refreshPacks();
  }, []);

  const metrics = useMemo(
    () => ({
      totalPdfs: documents.length,
      totalPacks: packs.length,
      publishedPdfs: documents.filter((d) => d.status === 'published').length,
      publishedPacks: packs.filter((p) => p.status === 'published').length,
      reviewPdfs: documents.filter(
        (d) => d.status === 'needs_review' || d.qualityScore < 70,
      ).length,
      aiReadyPdfs: documents.filter((d) => d.aiSummary && d.aiTags.length > 0).length,
      totalSales: documents.reduce((sum, d) => sum + d.salesCount, 0),
      packSales: packs.reduce((sum, p) => sum + p.salesCount, 0),
      totalRevenue:
        documents.reduce(
          (sum, d) =>
            sum +
            Math.round(d.salesCount * d.priceCoins * (d.commissionRate / 100)),
          0,
        ) + packs.reduce((sum, p) => sum + p.revenueCoins, 0),
      totalViews: documents.reduce(
        (sum, d) => sum + d.downloadsCount + d.salesCount * 3,
        0,
      ),
    }),
    [documents, packs],
  );

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const priceNum = priceFilter ? Number(priceFilter) : null;
    return documents.filter((d) => {
      const haystack = [
        d.title,
        d.description,
        d.subject,
        d.teacher,
        d.level,
        d.faculty,
        d.university,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (status === 'all' || d.status === status) &&
        (!facultyFilter ||
          d.faculty.toLowerCase().includes(facultyFilter.toLowerCase())) &&
        (!levelFilter ||
          d.level.toLowerCase().includes(levelFilter.toLowerCase())) &&
        (!authorFilter ||
          d.teacher.toLowerCase().includes(authorFilter.toLowerCase())) &&
        (priceNum === null || Number.isNaN(priceNum) || d.priceCoins <= priceNum)
      );
    });
  }, [documents, query, status, facultyFilter, levelFilter, priceFilter, authorFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / ITEMS_PER_PAGE));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [visibleDocuments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, status, facultyFilter, levelFilter, priceFilter, authorFilter]);

  const refresh = async () => {
    const response = await fetch('/api/pdf', { cache: 'no-store' });
    const payload = await response.json();
    setDocuments(payload.documents ?? []);
    await refreshPacks();
  };

  const refreshPacks = async () => {
    const response = await fetch('/api/packs', { cache: 'no-store' });
    const payload = await response.json();
    setPacks(payload.packs ?? []);
  };

  const analyzePdf = async (file: File) => {
    const pdfjs = await import('pdfjs-dist');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data, disableWorker: true } as object).promise;
    const pageTexts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 5);
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(
        content.items
          .map((item: { str?: string }) => item.str ?? '')
          .filter(Boolean)
          .join(' '),
      );
    }
    return inferPdfFields(file.name, pageTexts.join('\n'), pdf.numPages);
  };

  const fieldValue = (
    form: HTMLFormElement,
    name: string,
    fallback = '',
  ) => {
    const field = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    return field?.value || fallback;
  };

  const uploadAnalyzedFile = async (file: File, form: HTMLFormElement) => {
    const hints = await analyzePdf(file);
    const data = new FormData();
    data.set('title', hints.title || titleFromFileName(file.name));
    data.set('description', hints.description || `Document ${titleFromFileName(file.name)}`);
    data.set(
      'university',
      hints.university || fieldValue(form, 'university', 'Multi-établissements'),
    );
    data.set(
      'faculty',
      hints.faculty || fieldValue(form, 'faculty', 'Transversal'),
    );
    data.set(
      'subject',
      hints.subject || fieldValue(form, 'subject', 'Matière à confirmer'),
    );
    data.set(
      'teacher',
      hints.teacher || fieldValue(form, 'teacher', 'Non renseigné'),
    );
    data.set('level', hints.level || fieldValue(form, 'level', 'Tous niveaux'));
    data.set(
      'academicYear',
      hints.academicYear || fieldValue(form, 'academicYear', '2025-2026'),
    );
    data.set(
      'priceCoins',
      String(hints.suggestedPriceCoins || Number(fieldValue(form, 'priceCoins', '300'))),
    );
    data.set('pageCount', String(hints.pageCount || 1));
    data.set('status', hints.qualityScore >= 75 ? 'needs_review' : 'draft');
    data.set('commissionRate', fieldValue(form, 'commissionRate', '20'));
    data.set('aiSummary', hints.aiSummary);
    data.set('aiTags', JSON.stringify(hints.aiTags));
    data.set('aiDifficulty', hints.aiDifficulty);
    data.set('suggestedPriceCoins', String(hints.suggestedPriceCoins));
    data.set('qualityScore', String(hints.qualityScore));
    data.set('aiStudyPlan', JSON.stringify(hints.aiStudyPlan));
    data.set('aiQuiz', JSON.stringify(hints.aiQuiz));
    data.set('extractedText', hints.extractedText);
    data.set('file', file);

    const response = await fetch('/api/pdf', { method: 'POST', body: data });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(
        payload.error
          ? JSON.stringify(payload.error)
          : `Upload impossible: ${file.name}`,
      );
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    const file = files[0];
    const form = event.currentTarget.form;
    if (!file || !form) return;

    setAnalysisLoading(true);
    setMessage(
      files.length > 1
        ? `Analyse et téléchargement de ${files.length} PDF...`
        : 'Analyse du PDF en cours...',
    );

    try {
      if (files.length > 1) {
        for (const item of files) {
          await uploadAnalyzedFile(item, form);
        }
        setMessage(
          `${files.length} PDF analysés et enregistrés. Vérifie les packs IA proposés.`,
        );
        await refresh();
        form.reset();
        return;
      }

      const hints = await analyzePdf(file);
      const setField = (name: string, value?: string | number) => {
        if (value === undefined || value === '') return;
        const field = form.elements.namedItem(name) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        if (!field) return;
        field.value = String(value);
      };

      setField('title', hints.title);
      setField('description', hints.description);
      setField('university', hints.university);
      setField('faculty', hints.faculty);
      setField('subject', hints.subject);
      setField('teacher', hints.teacher);
      setField('level', hints.level);
      setField('academicYear', hints.academicYear);
      setField('pageCount', hints.pageCount);
      setField('priceCoins', hints.suggestedPriceCoins);
      setField('suggestedPriceCoins', hints.suggestedPriceCoins);
      setField('qualityScore', hints.qualityScore);
      setField('aiDifficulty', hints.aiDifficulty);
      setField('aiSummary', hints.aiSummary);
      setField('aiTags', JSON.stringify(hints.aiTags));
      setField('aiStudyPlan', JSON.stringify(hints.aiStudyPlan));
      setField('aiQuiz', JSON.stringify(hints.aiQuiz));
      setField('extractedText', hints.extractedText);
      setField('status', hints.qualityScore >= 75 ? 'needs_review' : 'draft');
      setMessage(
        `Analyse IA terminée. Score qualité: ${hints.qualityScore}/100. Prix conseillé: ${hints.suggestedPriceCoins} Coins.`,
      );
    } catch {
      setMessage("Analyse impossible. Complète les champs manuellement.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch('/api/pdf', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ? JSON.stringify(payload.error) : 'Upload impossible');
      form.reset();
      setMessage('PDF enregistré.');
      setUploadOpen(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur upload');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (documentId: string, nextStatus: PdfDocument['status']) => {
    const current = documents.find((d) => d.id === documentId);
    if (
      nextStatus === 'published' &&
      current &&
      (current.qualityScore < 70 || !current.aiSummary)
    ) {
      setMessage(
        "Publication bloquée : complète l'analyse IA, le résumé et le score qualité avant publication.",
      );
      return;
    }
    const response = await fetch(`/api/pdf/${documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      setMessage('Changement de statut impossible.');
      return;
    }
    setOpenMenuId(null);
    await refresh();
  };

  const updatePrice = async (documentId: string, newPrice: number) => {
    const response = await fetch(`/api/pdf/${documentId}/price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceCoins: newPrice }),
    });
    if (!response.ok) {
      setMessage('Mise à jour du prix impossible.');
      return;
    }
    setMessage('Prix mis à jour avec succès.');
    await refresh();
  };

  const remove = async (documentId: string) => {
    if (!confirm('Supprimer ce PDF ?')) return;
    const response = await fetch(`/api/pdf/${documentId}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Suppression impossible.');
      return;
    }
    setOpenMenuId(null);
    await refresh();
  };

  const reanalyze = async (documentId: string) => {
    setMessage('Réanalyse IA en cours...');
    const response = await fetch(`/api/pdf/${documentId}/analyze`, { method: 'POST' });
    if (!response.ok) {
      setMessage('Réanalyse impossible.');
      return;
    }
    setMessage('PDF réanalysé. Vérifie puis publie si tout est correct.');
    setOpenMenuId(null);
    await refresh();
  };

  const removePack = async (packId: string) => {
    if (!confirm('Supprimer ce pack ?')) return;
    const response = await fetch(`/api/packs/${packId}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Suppression du pack impossible.');
      return;
    }
    setMessage('Pack supprimé.');
    await refreshPacks();
  };

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setFacultyFilter('');
    setLevelFilter('');
    setPriceFilter('');
    setAuthorFilter('');
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allChecked = paginatedDocuments.every((d) => next.has(d.id));
      if (allChecked) {
        paginatedDocuments.forEach((d) => next.delete(d.id));
      } else {
        paginatedDocuments.forEach((d) => next.add(d.id));
      }
      return next;
    });
  };

  const pageNumbers = useMemo(() => {
    const pages: Array<number | 'gap'> = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push('gap');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('gap');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────── */}
      <PageHeader
        title="Catalogue PDF"
        subtitle="Gère les ressources académiques, l'analyse IA et la publication des PDF."
        breadcrumb={{ parent: 'Dashboard', current: 'Catalogue PDF' }}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => window.open('/api/pdf', '_blank')}
            >
              Export
            </Button>
            <Button
              variant="primary"
              icon={UploadCloud}
              onClick={() => setUploadOpen(true)}
            >
              Nouveau PDF
            </Button>
          </>
        }
      />

      {/* ── Top KPI row ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Uploads"
          value={metrics.totalPdfs + metrics.totalPacks}
          icon={UploadCloud}
          accent="blue"
          caption={`${metrics.totalPdfs} PDF · ${metrics.totalPacks} packs`}
        />
        <KpiCard
          label="Vues Catalogue"
          value={formatCoins(metrics.totalViews)}
          icon={Eye}
          accent="cyan"
          caption={`${metrics.totalSales} ventes · ${metrics.totalPdfs + metrics.totalPacks} ressources`}
        />
        <KpiCard
          label="Revenu Estimé"
          value={`${formatCoins(metrics.totalRevenue)} FCFA`}
          icon={DollarSign}
          accent="green"
          caption={`Commission cumulée sur les ventes`}
        />
      </div>

      {/* ── Catalogue card ───────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-light px-5 py-4">
          <FilterChip label="Statut" icon={FileText}>
            <FilterSelect
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
              ariaLabel="Filtrer par statut"
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

          <FilterChip label="Prix" icon={DollarSign}>
            <input
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              placeholder="Max"
              type="number"
              aria-label="Filtrer par prix max"
              className="w-20 appearance-none bg-transparent border-0 outline-none text-sm font-medium text-fg placeholder:text-fg-faint"
            />
          </FilterChip>

          <FilterChip label="Auteur" icon={Search}>
            <input
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              placeholder="Tous"
              aria-label="Filtrer par auteur"
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

        {/* Search summary bar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-faint">
              <Search size={14} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un PDF, une matière, un professeur…"
              aria-label="Rechercher dans le catalogue"
              className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-faint focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-fg-subtle">
            <span className="font-semibold text-fg">{visibleDocuments.length}</span>
            <span>ressource{visibleDocuments.length > 1 ? 's' : ''}</span>
            {selected.size > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={refresh}
            >
              Actualiser
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={
                      paginatedDocuments.length > 0 &&
                      paginatedDocuments.every((d) => selected.has(d.id))
                    }
                    onChange={toggleAllOnPage}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Aperçu
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Titre
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Faculté
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Niveau
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Prix
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Statut
                </th>
                <th className="w-12 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.map((document) => (
                <tr
                  key={document.id}
                  className="border-t border-border-light transition-colors hover:bg-surface-2"
                >
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${document.title}`}
                      checked={selected.has(document.id)}
                      onChange={() => toggleSelected(document.id)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: previewGradient(document.id) }}
                    >
                      <FileText size={16} />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="font-semibold text-fg line-clamp-1">
                      {document.title}
                    </div>
                    <div className="mt-0.5 text-xs text-fg-subtle line-clamp-1">
                      {document.subject || 'Matière non renseignée'}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-fg-muted">
                    {document.faculty || '—'}
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-fg-muted">
                    {document.level || '—'}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="inline-flex items-baseline gap-1 font-display font-bold text-fg tabular-nums">
                      {formatCoins(document.priceCoins)}
                      <span className="text-[11px] font-medium text-fg-subtle">C</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Pill tone={statusTone[document.status] ?? 'neutral'}>
                      {statusLabel[document.status] ?? document.status}
                    </Pill>
                  </td>
                  <td className="relative px-4 py-3 align-middle">
                    <IconButton
                      icon={MoreHorizontal}
                      label={`Actions pour ${document.title}`}
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === document.id ? null : document.id))
                      }
                    />
                    {openMenuId === document.id ? (
                      <div
                        className="absolute right-4 top-12 z-20 w-52 rounded-lg border border-border bg-surface p-1 shadow-popover"
                        onMouseLeave={() => setOpenMenuId(null)}
                      >
                        <button
                          type="button"
                          onClick={() => reanalyze(document.id)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                        >
                          <Sparkles size={14} className="text-primary" />
                          Réanalyser IA
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(document.id, 'published')}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                        >
                          <Check size={14} className="text-success" />
                          Publier
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(document.id, 'needs_review')}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                        >
                          <CircleAlert size={14} className="text-warning" />
                          Marquer à corriger
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(document.id, 'draft')}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                        >
                          <FilePenLine size={14} className="text-fg-muted" />
                          Mettre en brouillon
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(document.id, 'archived')}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 cursor-pointer"
                        >
                          <Archive size={14} className="text-fg-muted" />
                          Archiver
                        </button>
                        <div className="my-1 border-t border-border-light" />
                        <button
                          type="button"
                          onClick={() => remove(document.id)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg cursor-pointer"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {paginatedDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-0">
                    <EmptyState
                      icon={FileText}
                      title="Aucun PDF trouvé"
                      description="Ajuste tes filtres ou importe un nouveau PDF pour démarrer."
                      action={
                        <Button
                          variant="primary"
                          icon={UploadCloud}
                          onClick={() => setUploadOpen(true)}
                        >
                          Nouveau PDF
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {visibleDocuments.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light px-5 py-3">
            <div className="text-xs text-fg-muted">
              <span className="font-semibold text-fg">{visibleDocuments.length}</span>{' '}
              PDF
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                icon={ChevronLeft}
                label="Page précédente"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''}
              />
              {pageNumbers.map((page, idx) =>
                page === 'gap' ? (
                  <span
                    key={`gap-${idx}`}
                    className="px-2 text-xs text-fg-faint"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={[
                      'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors cursor-pointer',
                      currentPage === page
                        ? 'bg-primary text-on-primary'
                        : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                    ].join(' ')}
                  >
                    {page}
                  </button>
                ),
              )}
              <IconButton
                icon={ChevronRight}
                label="Page suivante"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={
                  currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : ''
                }
              />
            </div>
            <div className="text-xs text-fg-muted">
              Afficher:{' '}
              <span className="font-semibold text-fg">{ITEMS_PER_PAGE}</span> / page
            </div>
          </div>
        ) : null}
      </Card>

      {/* ── Bottom recap row ─────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Uploads"
          value={metrics.totalPdfs + metrics.totalPacks}
          icon={UploadCloud}
          accent="blue"
        />
        <KpiCard
          label="Vues Catalogue"
          value={formatCoins(metrics.totalViews)}
          icon={Eye}
          accent="cyan"
        />
        <KpiCard
          label="Revenu Estimé"
          value={`${formatCoins(metrics.totalRevenue)} FCFA`}
          icon={DollarSign}
          accent="green"
        />
      </div>

      {/* ── Upload modal ─────────────────────────────────────────── */}
      {uploadOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fg/30 backdrop-blur-sm p-4"
          onClick={() => setUploadOpen(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Card padded={false} className="max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-fg">
                    Ajouter un PDF
                  </h2>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    L'IA pré-remplit les champs et propose un score qualité.
                  </p>
                </div>
                <IconButton
                  icon={X}
                  label="Fermer"
                  onClick={() => setUploadOpen(false)}
                />
              </div>

              {message ? (
                <div className="mx-6 mt-4 rounded-md border border-border bg-primary-softer p-3 text-sm text-primary">
                  {message}
                </div>
              ) : null}

              <form onSubmit={submit} className="px-6 py-5">
                <Field label="Titre" required>
                  <input
                    name="title"
                    required
                    placeholder="Analyse 2 - sujets corrigés"
                    className="form-input"
                  />
                </Field>

                <Field label="Description" required>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="Ce que l'étudiant trouvera dans le PDF"
                    className="form-input resize-y"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Université" required>
                    <input
                      name="university"
                      required
                      defaultValue="Université de Douala"
                      className="form-input"
                    />
                  </Field>
                  <Field label="Filière / Faculté" required>
                    <input
                      name="faculty"
                      required
                      placeholder="Informatique"
                      className="form-input"
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Matière" required>
                    <input
                      name="subject"
                      required
                      placeholder="Mathématiques"
                      className="form-input"
                    />
                  </Field>
                  <Field label="Professeur">
                    <input
                      name="teacher"
                      placeholder="Pr. Nom"
                      className="form-input"
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Niveau" required>
                    <input
                      name="level"
                      required
                      placeholder="L2 Informatique"
                      className="form-input"
                    />
                  </Field>
                  <Field label="Année académique" required>
                    <input
                      name="academicYear"
                      required
                      defaultValue="2025-2026"
                      className="form-input"
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Prix (Coins)">
                    <input
                      name="priceCoins"
                      type="number"
                      min="0"
                      step="50"
                      defaultValue="300"
                      className="form-input"
                    />
                  </Field>
                  <Field label="Statut">
                    <select name="status" defaultValue="draft" className="form-input">
                      <option value="draft">Brouillon</option>
                      <option value="analyzing">Analyse IA</option>
                      <option value="needs_review">À corriger</option>
                      <option value="published">Publié</option>
                      <option value="archived">Archive</option>
                    </select>
                  </Field>
                </div>

                <Field label="Fichier PDF" required className="mt-4">
                  <input
                    name="file"
                    type="file"
                    accept="application/pdf"
                    required
                    multiple
                    onChange={onFileChange}
                    className="form-input file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary file:cursor-pointer"
                  />
                </Field>

                <input type="hidden" name="aiSummary" />
                <input type="hidden" name="aiTags" />
                <input type="hidden" name="aiDifficulty" />
                <input type="hidden" name="suggestedPriceCoins" />
                <input type="hidden" name="qualityScore" />
                <input type="hidden" name="aiStudyPlan" />
                <input type="hidden" name="aiQuiz" />
                <input type="hidden" name="extractedText" />

                <div className="mt-4 flex items-start gap-3 rounded-md border border-border bg-primary-softer p-3 text-fg">
                  <Sparkles size={16} className="mt-0.5 text-primary" />
                  <div>
                    <strong className="block text-sm text-fg">Analyse IA admin</strong>
                    <span className="mt-0.5 block text-xs text-fg-muted">
                      Le PDF pré-remplit les champs, propose un prix, un résumé,
                      des tags et un score avant publication.
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setUploadOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={UploadCloud}
                    loading={loading || analysisLoading}
                  >
                    {loading
                      ? 'Upload…'
                      : analysisLoading
                        ? 'Analyse…'
                        : 'Enregistrer PDF'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Local form input styling using Tailwind tokens. */}
      <style jsx global>{`
        .form-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-fg);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input::placeholder {
          color: var(--color-fg-faint);
        }
        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
        }
      `}</style>
    </>
  );
}

// ── Local field wrapper for the modal form ────────────────────────────
function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {children}
    </div>
  );
}
