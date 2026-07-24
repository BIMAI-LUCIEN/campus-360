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
  Plus,
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
    <div className="flex items-center gap-4 rounded-xl border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-sm">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="font-label-md text-stitch-on-surface-variant">{label}</p>
        <h4 className="font-stitch-headline text-stitch-on-surface">{value}</h4>
      </div>
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
  const [uploadOpen, setUploadOpen] = useState(false);
  // Batch upload: analyze each PDF and publish it straight away when the AI
  // score clears the quality bar (else it lands in "à corriger" for review).
  const [autoPublish, setAutoPublish] = useState(true);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

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
    // pdfjs-dist requires a worker script to be configured — without this it
    // throws 'No "GlobalWorkerOptions.workerSrc" specified.' on every call,
    // which silently aborts analysis (no auto-fill, pageCount stays unset).
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
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

  const uploadAnalyzedFile = async (
    file: File,
    form: HTMLFormElement,
    publishWhenReady: boolean,
  ): Promise<PdfDocument['status']> => {
    // 1. Local extraction (pdf.js) pre-fills the row so it's complete even
    //    before the LLM runs, and gives us the raw text the server AI reuses.
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
    // Created in "analyzing"; the real OpenRouter pass below decides the fate.
    data.set('status', 'analyzing');
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

    // 2. Create the row (returns the generated id).
    const response = await fetch('/api/pdf', { method: 'POST', body: data });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(
        payload.error
          ? JSON.stringify(payload.error)
          : `Upload impossible: ${file.name}`,
      );
    const docId: string | undefined = payload.document?.id;
    if (!docId) throw new Error(`Upload impossible: ${file.name}`);

    // 3. Full OpenRouter analysis on the stored text — better summary, tags,
    //    difficulty and quality score than the local heuristic. Falls back to
    //    the heuristic values if the LLM call fails or no key is configured.
    let qualityScore = Number(hints.qualityScore) || 0;
    let hasSummary = Boolean(hints.aiSummary);
    try {
      const analyzeRes = await fetch(`/api/pdf/${docId}/analyze`, { method: 'POST' });
      if (analyzeRes.ok) {
        const analyzed = (await analyzeRes.json())?.document;
        if (analyzed) {
          qualityScore = Number(analyzed.qualityScore ?? qualityScore) || 0;
          hasSummary = Boolean(analyzed.aiSummary);
        }
      }
    } catch {
      // Keep heuristic values; the row still exists in needs_review below.
    }

    // 4. Publish only what the AI is confident about; the rest waits in review.
    const publishable = qualityScore >= 70 && hasSummary;
    const finalStatus: PdfDocument['status'] =
      publishWhenReady && publishable ? 'published' : 'needs_review';
    await fetch(`/api/pdf/${docId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: finalStatus }),
    });
    return finalStatus;
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    const file = files[0];
    const form = event.currentTarget.form;
    if (!file || !form) return;

    setAnalysisLoading(true);
    setMessage(
      files.length > 1
        ? `Analyse IA de ${files.length} PDF… (cela peut prendre un moment)`
        : 'Analyse du PDF en cours...',
    );

    try {
      if (files.length > 1) {
        let published = 0;
        let review = 0;
        let failed = 0;
        setBatchProgress({ done: 0, total: files.length });
        for (let i = 0; i < files.length; i += 1) {
          try {
            const resultStatus = await uploadAnalyzedFile(files[i], form, autoPublish);
            if (resultStatus === 'published') published += 1;
            else review += 1;
          } catch {
            // One bad file must not abort the whole batch.
            failed += 1;
          }
          setBatchProgress({ done: i + 1, total: files.length });
        }
        const parts = [
          published > 0 ? `${published} publié${published > 1 ? 's' : ''}` : '',
          review > 0 ? `${review} à corriger` : '',
          failed > 0 ? `${failed} échec${failed > 1 ? 's' : ''}` : '',
        ].filter(Boolean);
        setMessage(`${files.length} PDF traités — ${parts.join(' · ')}.`);
        setBatchProgress(null);
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

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setSubject('');
    setLevel('');
  };

  const badgeClass: Record<string, string> = {
    published: 'bg-stitch-primary-fixed text-stitch-on-primary-fixed-variant border-stitch-primary/20',
    needs_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    analyzing: 'bg-blue-50 text-blue-700 border border-blue-200',
    draft: 'bg-stitch-secondary-container text-stitch-on-surface-variant border border-stitch-outline-variant',
    archived: 'bg-slate-50 text-slate-700 border border-slate-200',
  };

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-stitch-headline text-stitch-on-surface m-0 text-3xl font-bold tracking-tight">
            Catalogue PDF
          </h1>
          <p className="text-sm text-stitch-on-surface-variant">
            Gère tes PDF académiques : upload, prévisualise et publie.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            aria-label="Actualiser"
            className="flex items-center gap-2 px-4 py-2 border border-stitch-outline-variant text-stitch-on-surface font-label-md rounded-lg hover:bg-stitch-surface-container transition-colors"
          >
            <Download size={18} />
            Export
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-stitch-primary text-stitch-on-primary font-label-md rounded-lg hover:opacity-90 transition-all shadow-sm"
          >
            <Plus size={18} />
            Nouveau PDF
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="mb-6 bg-white rounded-xl border border-stitch-outline-variant shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatus(status === 'all' ? 'published' : status)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stitch-surface-container-high text-stitch-on-surface font-label-md hover:bg-stitch-surface-container-high transition-colors"
          >
            Statut
            <span className="text-stitch-on-surface-variant">{status === 'all' ? '' : `: ${status}`}</span>
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setSubject(subject === '' ? 'Mathématiques' : subject)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stitch-surface-container-high text-stitch-on-surface font-label-md hover:bg-stitch-surface-container-high transition-colors"
          >
            Matière
            {subject && <span className="text-stitch-on-surface-variant">: {subject}</span>}
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setLevel(level === '' ? 'L2' : level)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stitch-surface-container-high text-stitch-on-surface font-label-md hover:bg-stitch-surface-container-high transition-colors"
          >
            Niveau
            {level && <span className="text-stitch-on-surface-variant">: {level}</span>}
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setQuery(query === '' ? 'math' : query)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stitch-surface-container-high text-stitch-on-surface font-label-md hover:bg-stitch-surface-container-high transition-colors"
          >
            Recherche
            {query && <span className="text-stitch-on-surface-variant">: {query}</span>}
            <ChevronDown size={14} />
          </button>
          <div className="h-6 w-px bg-stitch-outline-variant mx-2" />
          <button
            onClick={resetFilters}
            className="text-stitch-primary font-label-md hover:underline decoration-2 underline-offset-4 px-2"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Grid Layout ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {paginatedDocuments.map((document) => (
          <div
            key={document.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-stitch-outline-variant bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
          >
            {/* Aspect ratio cover / preview area */}
            <div className="relative aspect-[3/4] w-full bg-stitch-surface-container flex items-center justify-center p-4">
               <FileText size={48} className="text-stitch-on-surface-variant opacity-30" />
               <div className="absolute top-2 left-2 z-10">
                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${badgeClass[document.status] ?? ''}`}>
                   {document.status.replace('_', ' ')}
                 </span>
               </div>
               {/* Overlay actions */}
               <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur rounded-lg shadow-sm border border-black/5 p-1 flex flex-col gap-1 z-20">
                  <button onClick={() => reanalyze(document.id)} className="p-1.5 rounded hover:bg-stitch-surface-container-high text-stitch-primary" title="Réanalyser IA"><Sparkles size={14} /></button>
                  <button onClick={() => updateStatus(document.id, 'published')} className="p-1.5 rounded hover:bg-stitch-surface-container-high text-stitch-success" title="Publier"><Check size={14} /></button>
                  <button onClick={() => updateStatus(document.id, 'needs_review')} className="p-1.5 rounded hover:bg-stitch-surface-container-high text-orange-700" title="À corriger"><CircleAlert size={14} /></button>
                  <button onClick={() => updateStatus(document.id, 'archived')} className="p-1.5 rounded hover:bg-stitch-surface-container-high text-stitch-on-surface-variant" title="Archiver"><Archive size={14} /></button>
                  <button onClick={() => remove(document.id)} className="p-1.5 rounded hover:bg-stitch-error-light text-stitch-error" title="Supprimer"><Trash2 size={14} /></button>
               </div>
            </div>

            {/* Content area */}
            <div className="flex flex-1 flex-col p-3 md:p-4">
              <h3 className="font-semibold text-stitch-on-surface line-clamp-2 text-sm mb-2" title={document.title}>
                {document.title}
              </h3>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {[document.subject, document.level].filter(Boolean).map((tag) => (
                  <span key={tag} className="inline-flex rounded text-[10px] bg-stitch-surface-container-high px-1.5 py-0.5 text-stitch-on-surface-variant font-medium line-clamp-1 max-w-[100px]">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between border-t border-stitch-outline-variant">
                <div className="text-[11px] md:text-xs text-stitch-on-surface-variant line-clamp-1 flex-1 pr-2" title={document.faculty}>
                  {document.faculty}
                </div>
                <div className="flex items-center gap-1 bg-stitch-surface-container-low px-1.5 py-1 rounded border border-stitch-outline-variant">
                  <input
                    type="number"
                    defaultValue={document.priceCoins}
                    step="50"
                    min="0"
                    onBlur={(e) => {
                      const newPrice = parseInt(e.target.value, 10);
                      if (!isNaN(newPrice) && newPrice !== document.priceCoins) {
                        updatePrice(document.id, newPrice);
                      }
                    }}
                    className="w-10 md:w-12 bg-transparent text-[11px] md:text-xs font-bold text-stitch-on-surface text-right focus:outline-none"
                  />
                  <span className="text-[11px] md:text-xs font-bold text-stitch-primary">C</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {paginatedDocuments.length === 0 && (
          <div className="col-span-full py-20 text-center text-stitch-on-surface-variant bg-white rounded-xl border border-stitch-outline-variant shadow-sm">
            Aucun PDF trouvé.
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────── */}
      <div className="mb-6 p-4 rounded-xl border border-stitch-outline-variant flex flex-wrap items-center justify-between bg-white shadow-sm gap-4">
        <div className="font-label-md text-stitch-on-surface-variant">
          {visibleDocuments.length} PDF
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Page précédente"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-stitch-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-stitch-on-surface-variant"
          >
            <ChevronLeft size={18} />
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
                    ? 'flex h-8 w-8 items-center justify-center rounded bg-stitch-primary text-stitch-on-primary font-label-md'
                    : 'flex h-8 w-8 items-center justify-center rounded hover:bg-stitch-surface-container font-label-md text-stitch-on-surface-variant transition-colors'
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
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-stitch-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-stitch-on-surface-variant"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 font-label-md text-stitch-on-surface-variant">
          <span>Afficher:</span>
          <select className="bg-transparent border-none focus:ring-0 cursor-pointer pr-8 py-0 font-label-md">
            <option>{ITEMS_PER_PAGE} / page</option>
            <option>20 / page</option>
            <option>50 / page</option>
          </select>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          icon={FileText}
          iconColor="#004ac6"
          iconBg="#dbe1ff"
          label="Total PDFs"
          value={formatCoins(metrics.totalPdfs)}
        />
        <KpiCard
          icon={Check}
          iconColor="#10b981"
          iconBg="#ecfdf5"
          label="Publiés"
          value={formatCoins(metrics.publishedPdfs)}
        />
        <KpiCard
          icon={Archive}
          iconColor="#004ac6"
          iconBg="#dbe1ff"
          label="Revenu Estimé"
          value={`${formatCoins(metrics.totalRevenue)} C`}
        />
      </div>

      {/* ── Upload Modal ────────────────────────────────────────── */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUploadOpen(false);
          }}
        >
          <div className="bg-stitch-surface-lowest rounded-xl border border-stitch-outline-variant shadow-stitch-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stitch-outline-variant">
              <div className="flex items-center gap-3">
                <UploadCloud size={20} className="text-stitch-primary" />
                <h2 className="font-stitch-headline text-stitch-on-surface text-lg font-bold">
                  Ajouter un PDF
                </h2>
              </div>
              <button
                onClick={() => setUploadOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-stitch-surface-container text-stitch-on-surface-variant transition-colors"
                aria-label="Fermer"
              >
                <span className="text-lg">&times;</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={submit} className="p-6">
              {message ? (
                <div className="mb-4 rounded-xl border border-stitch-outline-variant bg-stitch-surface-container-low p-3 text-sm text-stitch-on-surface">
                  {message}
                </div>
              ) : null}

              <label className="mb-1.5 mt-3 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                Titre
              </label>
              <input
                name="title"
                required
                placeholder="Analyse 2 - sujets corrigés"
                className="mb-3 w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
              />

              <label className="mb-1.5 mt-3 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                Description
              </label>
              <textarea
                name="description"
                required
                placeholder="Ce que l'étudiant trouvera dans le PDF"
                className="mb-3 min-h-[74px] w-full resize-y rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
              />

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Université
                  </label>
                  <input
                    name="university"
                    required
                    defaultValue="Université de Douala"
                    className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Filière / Faculté
                  </label>
                  <input
                    name="faculty"
                    required
                    placeholder="Informatique"
                    className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                  />
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Matière
                  </label>
                  <input
                    name="subject"
                    required
                    placeholder="Mathématiques"
                    className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Professeur
                  </label>
                  <input
                    name="teacher"
                    placeholder="Pr. Nom"
                    className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                  />
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Niveau
                  </label>
                  <input
                    name="level"
                    required
                    placeholder="L2 Informatique"
                    className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                    Année académique
                  </label>
                  <input
                    name="academicYear"
                    required
                    defaultValue="2025-2026"
                    className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                  />
                </div>
              </div>

              {/* Collapsible advanced section */}
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="mb-3 flex w-full items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant transition-colors hover:text-stitch-on-surface"
              >
                {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {advancedOpen ? 'Masquer les options' : 'Options avancées'}
              </button>

              {advancedOpen && (
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                      Prix en Coins
                    </label>
                    <input
                      name="priceCoins"
                      type="number"
                      min="0"
                      step="50"
                      defaultValue="300"
                      className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                      Statut
                    </label>
                    <select
                      name="status"
                      defaultValue="draft"
                      className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
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
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                      Prix en Coins
                    </label>
                    <input
                      name="priceCoins"
                      type="number"
                      min="0"
                      step="50"
                      defaultValue="300"
                      className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-stitch-on-surface-variant">
                      Statut
                    </label>
                    <select
                      name="status"
                      defaultValue="draft"
                      className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
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
                className="mb-1 w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface file:mr-3 file:rounded-lg file:border-0 file:bg-stitch-primary-fixed file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-stitch-primary file:cursor-pointer"
              />

              <p className="mb-3 mt-1 text-[12px] text-stitch-on-surface-variant">
                Astuce : sélectionne <strong>plusieurs PDF à la fois</strong> pour les
                analyser et les publier en lot.
              </p>

              <input type="hidden" name="pageCount" defaultValue={1} />
              <input type="hidden" name="aiSummary" />
              <input type="hidden" name="aiTags" />
              <input type="hidden" name="aiDifficulty" />
              <input type="hidden" name="suggestedPriceCoins" />
              <input type="hidden" name="qualityScore" />
              <input type="hidden" name="aiStudyPlan" />
              <input type="hidden" name="aiQuiz" />
              <input type="hidden" name="extractedText" />

              {/* Auto-publish toggle (batch upload) */}
              <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-stitch-outline-variant bg-stitch-surface p-3">
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-stitch-primary"
                />
                <span className="text-[13px] text-stitch-on-surface">
                  <strong className="block font-semibold">Analyser et publier automatiquement</strong>
                  <span className="text-stitch-on-surface-variant">
                    En upload multiple, chaque PDF jugé prêt par l&apos;IA (score ≥ 70) est
                    publié directement ; les autres passent en « à corriger ».
                  </span>
                </span>
              </label>

              {/* Batch progress */}
              {batchProgress ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[12px] font-medium text-stitch-on-surface-variant">
                    <span>Traitement des PDF…</span>
                    <span className="tabular-nums">
                      {batchProgress.done}/{batchProgress.total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stitch-surface-container">
                    <div
                      className="h-full rounded-full bg-stitch-primary transition-all duration-300"
                      style={{ width: `${Math.round((batchProgress.done / batchProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {/* AI note */}
              <div className="mt-4 grid grid-cols-[34px_1fr] items-center gap-2.5 rounded-xl border border-stitch-outline-variant bg-stitch-primary-fixed p-3 text-stitch-on-surface">
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
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-stitch-outline-variant px-5 py-2.5 text-sm font-bold text-stitch-on-surface transition-colors hover:bg-stitch-surface-container"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || analysisLoading}
                  className="flex min-h-10 items-center gap-2 rounded-lg border-none bg-stitch-primary px-5 py-2.5 text-sm font-bold text-stitch-on-primary transition-all hover:opacity-90 hover:shadow-stitch-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Upload...' : analysisLoading ? 'Analyse...' : 'Enregistrer PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
