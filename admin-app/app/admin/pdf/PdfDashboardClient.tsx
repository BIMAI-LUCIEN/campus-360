'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  CircleAlert,
  Download,
  FilePenLine,
  FileText,
  PackagePlus,
  Sparkles,
  RefreshCw,
  Trash2,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PdfDocument, PdfPack } from '@/lib/course-db';

type Props = {
  initialDocuments: PdfDocument[];
};

const formatCoins = (value: number) => new Intl.NumberFormat('fr-CM').format(value);
const ITEMS_PER_PAGE = 15;

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

// ── KPI Card helper ────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-5 shadow-stitch-sm">
      <div
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-stitch-sm"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon size={18} />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-stitch-on-surface">{value}</div>
    </div>
  );
}

export function PdfDashboardClient({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [packs, setPacks] = useState<PdfPack[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
    }),
    [documents, packs],
  );

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
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
        (!subject || d.subject.toLowerCase().includes(subject.toLowerCase())) &&
        (!level || d.level.toLowerCase().includes(level.toLowerCase()))
      );
    });
  }, [documents, level, query, status, subject]);

  const totalPages = Math.ceil(visibleDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [visibleDocuments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, status, subject, level]);

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

  const badgeClass: Record<string, string> = {
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    needs_review: 'bg-orange-50 text-orange-700 border border-orange-200',
    analyzing: 'bg-blue-50 text-blue-700 border border-blue-200',
    draft: 'bg-violet-50 text-violet-700 border border-violet-200',
    archived: 'bg-slate-50 text-slate-700 border border-slate-200',
  };

  return (
    <>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-stitch-outline-variant bg-stitch-primary-fixed px-3 py-1 text-xs font-bold text-stitch-primary">
            <FileText size={15} />
            <span>/admin/pdf</span>
          </div>
          <h1 className="font-stitch-headline m-0 text-3xl font-bold tracking-tight text-stitch-on-surface">
            PDF académiques
          </h1>
        </div>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            onClick={refresh}
            aria-label="Actualiser"
            className="flex min-h-10 items-center gap-2 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2.5 text-sm font-bold text-stitch-on-surface shadow-stitch-sm transition-colors hover:bg-stitch-surface-container"
          >
            <RefreshCw size={17} />
            Actualiser
          </button>
          <a
            href="/api/pdf"
            className="flex min-h-10 items-center gap-2 rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2.5 text-sm font-bold text-stitch-on-surface shadow-stitch-sm transition-colors hover:bg-stitch-surface-container"
          >
            <Download size={17} />
            JSON
          </a>
        </div>
      </div>

      {/* ── Metrics row ───────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard icon={FileText}    iconColor="#0891b2" iconBg="#ecfeff" label="PDF"        value={metrics.totalPdfs} />
        <KpiCard icon={Check}       iconColor="#10b981" iconBg="#ecfdf5" label="Publiés"    value={metrics.publishedPdfs} />
        <KpiCard icon={PackagePlus} iconColor="#8b5cf6" iconBg="#f5f3ff" label="Packs"      value={metrics.totalPacks} />
        <KpiCard icon={CircleAlert} iconColor="#f97316" iconBg="#fff7ed" label="À corriger" value={metrics.reviewPdfs} />
        <KpiCard icon={Sparkles}    iconColor="#3b82f6" iconBg="#eff6ff" label="IA prêts"   value={metrics.aiReadyPdfs} />
        <KpiCard icon={FilePenLine} iconColor="#06b6d4" iconBg="#ecfeff" label="Ventes"     value={metrics.totalSales} />
        <KpiCard icon={Archive}     iconColor="#10b981" iconBg="#ecfdf5" label="Revenus"    value={`${formatCoins(metrics.totalRevenue)} C`} />
      </div>

      {/* ── Workspace (2-col grid) ──────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[340px_1fr]">
        {/* ── Upload form ─────────────────────────────────────── */}
        <section className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
          <h2 className="mb-4 inline-flex items-center gap-2 text-base font-bold text-stitch-on-surface">
            <UploadCloud size={18} className="text-stitch-primary" />
            Ajouter un PDF
          </h2>

          {message ? (
            <div className="mb-3 rounded-stitch border border-stitch-outline-variant bg-stitch-surface p-3 text-sm text-stitch-on-surface-variant">
              {message}
            </div>
          ) : null}

          <form onSubmit={submit}>
            <label className="mb-1.5 mt-3 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
              Titre
            </label>
            <input
              name="title"
              required
              placeholder="Analyse 2 - sujets corrigés"
              className="mb-2 w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
            />

            <label className="mb-1.5 mt-3 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
              Description
            </label>
            <textarea
              name="description"
              required
              placeholder="Ce que l'étudiant trouvera dans le PDF"
              className="mb-2 min-h-[74px] w-full resize-y rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
            />

            <div className="mb-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                  Université
                </label>
                <input
                  name="university"
                  required
                  defaultValue="Université de Douala"
                  className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                  Filière / Faculté
                </label>
                <input
                  name="faculty"
                  required
                  placeholder="Informatique"
                  className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                  Matière
                </label>
                <input
                  name="subject"
                  required
                  placeholder="Mathématiques"
                  className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                  Professeur
                </label>
                <input
                  name="teacher"
                  placeholder="Pr. Nom"
                  className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                  Niveau
                </label>
                <input
                  name="level"
                  required
                  placeholder="L2 Informatique"
                  className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                  Année académique
                </label>
                <input
                  name="academicYear"
                  required
                  defaultValue="2025-2026"
                  className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Collapsible advanced section */}
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="mb-2 mt-3 flex w-full items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant transition-colors hover:text-stitch-on-surface"
            >
              {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {advancedOpen ? 'Masquer les options' : 'Options avancées'}
            </button>

            {advancedOpen && (
              <div className="mb-2 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Prix en Coins
                  </label>
                  <input
                    name="priceCoins"
                    type="number"
                    min="0"
                    step="50"
                    defaultValue="300"
                    className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Statut
                  </label>
                  <select
                    name="status"
                    defaultValue="draft"
                    className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="analyzing">Analyse IA</option>
                    <option value="needs_review">À corriger</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archive</option>
                  </select>
                </div>
              </div>
            )}

            {!advancedOpen && (
              <div className="mb-2 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Prix en Coins
                  </label>
                  <input
                    name="priceCoins"
                    type="number"
                    min="0"
                    step="50"
                    defaultValue="300"
                    className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 mt-1 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Statut
                  </label>
                  <select
                    name="status"
                    defaultValue="draft"
                    className="w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="analyzing">Analyse IA</option>
                    <option value="needs_review">À corriger</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archive</option>
                  </select>
                </div>
              </div>
            )}

            <label className="mb-1.5 mt-3 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
              Fichier PDF
            </label>
            <input
              name="file"
              type="file"
              accept="application/pdf"
              required
              multiple
              onChange={onFileChange}
              className="mb-1 w-full rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface file:mr-3 file:rounded file:border-0 file:bg-stitch-primary-fixed file:px-3 file:py-1 file:text-sm file:font-bold file:text-stitch-primary file:cursor-pointer"
            />

            <input type="hidden" name="aiSummary" />
            <input type="hidden" name="aiTags" />
            <input type="hidden" name="aiDifficulty" />
            <input type="hidden" name="suggestedPriceCoins" />
            <input type="hidden" name="qualityScore" />
            <input type="hidden" name="aiStudyPlan" />
            <input type="hidden" name="aiQuiz" />
            <input type="hidden" name="extractedText" />

            {/* AI note */}
            <div className="mt-4 grid grid-cols-[34px_1fr] items-center gap-2.5 rounded-stitch border border-stitch-outline-variant bg-stitch-primary-fixed p-3 text-stitch-on-surface">
              <Sparkles size={18} className="text-stitch-primary" />
              <div>
                <strong className="block text-stitch-on-surface">Analyse IA admin</strong>
                <span className="mt-0.5 block text-[13px] text-stitch-on-surface-variant">
                  Le PDF pré-remplit les champs, propose un prix, un résumé, des tags
                  et un score avant publication.
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="submit"
                disabled={loading || analysisLoading}
                className="flex min-h-10 items-center gap-2 rounded-stitch border-none bg-stitch-primary px-5 py-2.5 text-sm font-bold text-stitch-on-primary transition-all hover:opacity-90 hover:shadow-stitch-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Upload...' : analysisLoading ? 'Analyse...' : 'Enregistrer PDF'}
              </button>
            </div>
          </form>
        </section>

        {/* ── Catalogue ───────────────────────────────────────── */}
        <section className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
          <h2 className="mb-4 inline-flex items-center gap-2 text-base font-bold text-stitch-on-surface">
            <FileText size={18} className="text-stitch-primary" />
            Catalogue
          </h2>

          {/* Toolbar */}
          <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher dans le catalogue"
              className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filtrer par statut"
              className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="needs_review">À corriger</option>
              <option value="analyzing">Analyse IA</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archives</option>
            </select>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Matière"
              aria-label="Filtrer par matière"
              className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
            />
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Niveau"
              aria-label="Filtrer par niveau"
              className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-stitch-outline-variant">
                  {['Document', 'Prix', 'Statut', 'Ventes', 'Revenu', 'Actions'].map((th) => (
                    <th
                      key={th}
                      scope="col"
                      className="px-2.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant"
                    >
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((document) => {
                  const revenue = Math.round(
                    document.salesCount *
                      document.priceCoins *
                      (document.commissionRate / 100),
                  );
                  return (
                    <tr
                      key={document.id}
                      className="border-b border-stitch-surface-container transition-colors last:border-0 hover:bg-stitch-surface-container-low"
                    >
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-2 font-bold text-stitch-on-surface">
                          <FileText size={16} className="shrink-0 text-stitch-on-surface-variant" />
                          <span className="break-all">{document.title}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {[document.subject, document.level, document.teacher].map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded-full border border-stitch-outline-variant bg-stitch-surface-container px-2 py-0.5 text-[11px] font-medium text-stitch-on-surface-variant"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={document.priceCoins}
                            step="50"
                            min="0"
                            aria-label={`Prix de ${document.title}`}
                            onBlur={(e) => {
                              const newPrice = parseInt(e.target.value, 10);
                              if (
                                !isNaN(newPrice) &&
                                newPrice !== document.priceCoins
                              ) {
                                updatePrice(document.id, newPrice);
                              }
                            }}
                            className="w-20 rounded border border-stitch-outline-variant bg-stitch-surface px-2 py-1 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none"
                          />
                          <span className="text-sm text-stitch-on-surface-variant">C</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeClass[document.status] ?? ''}`}
                        >
                          {document.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-sm font-semibold text-stitch-on-surface">
                        {document.salesCount}
                      </td>
                      <td className="px-2.5 py-2.5 text-sm text-stitch-on-surface-variant">
                        {formatCoins(revenue)} C
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex flex-nowrap gap-1">
                          <button
                            onClick={() => reanalyze(document.id)}
                            aria-label="Reanalyser avec IA"
                            className="flex h-8 w-8 items-center justify-center rounded-stitch border border-stitch-outline-variant bg-stitch-surface text-stitch-primary transition-colors hover:border-stitch-primary hover:bg-stitch-primary-fixed"
                          >
                            <Sparkles size={16} />
                          </button>
                          <button
                            onClick={() => updateStatus(document.id, 'published')}
                            aria-label="Publier"
                            className="flex h-8 w-8 items-center justify-center rounded-stitch border border-stitch-outline-variant bg-stitch-surface text-stitch-success transition-colors hover:border-stitch-success hover:bg-stitch-success-light"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => updateStatus(document.id, 'needs_review')}
                            aria-label="Marquer à corriger"
                            className="flex h-8 w-8 items-center justify-center rounded-stitch border border-stitch-outline-variant bg-stitch-surface text-orange-700 transition-colors hover:border-orange-400 hover:bg-orange-50"
                          >
                            <CircleAlert size={16} />
                          </button>
                          <button
                            onClick={() => updateStatus(document.id, 'draft')}
                            aria-label="Mettre en brouillon"
                            className="flex h-8 w-8 items-center justify-center rounded-stitch border border-stitch-outline-variant bg-stitch-surface text-violet-700 transition-colors hover:border-violet-400 hover:bg-violet-50"
                          >
                            <FilePenLine size={16} />
                          </button>
                          <button
                            onClick={() => updateStatus(document.id, 'archived')}
                            aria-label="Archiver"
                            className="flex h-8 w-8 items-center justify-center rounded-stitch border border-stitch-outline-variant bg-stitch-surface text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container"
                          >
                            <Archive size={16} />
                          </button>
                          <button
                            onClick={() => remove(document.id)}
                            aria-label="Supprimer"
                            className="flex h-8 w-8 items-center justify-center rounded-stitch border border-stitch-outline-variant bg-stitch-surface text-stitch-error transition-colors hover:border-stitch-error hover:bg-stitch-error-light"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedDocuments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-stitch-on-surface-variant"
                    >
                      Aucun PDF trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-stitch-outline-variant px-4 py-3">
              <span className="text-[13px] text-stitch-on-surface-variant">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, visibleDocuments.length)} sur{' '}
                {visibleDocuments.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Page précédente"
                  className="flex h-8 w-8 items-center justify-center rounded-stitch-sm text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container hover:text-stitch-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={
                        currentPage === page
                          ? 'flex h-8 w-8 items-center justify-center rounded-stitch-sm bg-stitch-primary text-[13px] font-medium text-stitch-on-primary'
                          : 'flex h-8 w-8 items-center justify-center rounded-stitch-sm text-[13px] font-medium text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container hover:text-stitch-on-surface'
                      }
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Page suivante"
                  className="flex h-8 w-8 items-center justify-center rounded-stitch-sm text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container hover:text-stitch-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
