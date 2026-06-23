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
} from 'lucide-react';
import type { PdfDocument, PdfPack } from '@/lib/course-db';

type Props = {
  initialDocuments: PdfDocument[];
};

const formatCoins = (value: number) => new Intl.NumberFormat('fr-CM').format(value);

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

  return subjects.find((subject) => lower.includes(subject.toLowerCase())) ?? fallback.split(' ').slice(0, 3).join(' ');
};

const inferPdfFields = (fileName: string, rawText: string, pageCount: number) => {
  const text = rawText.replace(/\s+/g, ' ').trim();
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => cleanMatch(line))
    .filter((line): line is string => Boolean(line && line.length >= 4));
  const fallbackTitle = titleFromFileName(fileName);
  const heading = lines.find((line) => !/page\s+\d+/i.test(line) && line.length <= 90);
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
      [subject, level, faculty, firstMatch(text, [/\b(examen|controle|td|tp|corrige|resume|cours)\b/i])]
        .map((item) => cleanMatch(item))
        .filter((item): item is string => Boolean(item)),
    ),
  ).slice(0, 6);
  const difficulty = /master|m2|m1|l3|niveau\s?3/i.test(text)
    ? 'avance'
    : /l2|niveau\s?2|droit|analyse/i.test(text)
      ? 'intermediaire'
      : 'standard';
  const suggestedPrice = Math.max(100, Math.min(1000, Math.round((pageCount * 8 + (tags.length * 25)) / 50) * 50));
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
    description: lines.slice(0, 4).join(' - ').slice(0, 240) || `Document ${fallbackTitle}`,
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
    academicYear: firstMatch(text, [/\b(20\d{2}\s*[-/]\s*20\d{2})\b/, /\b(20\d{2})\b/]),
    pageCount,
    aiSummary:
      lines.slice(0, 5).join(' ').slice(0, 420) ||
      `Document de ${subject} pour ${level || 'niveau non precise'}.`,
    aiTags: tags,
    aiDifficulty: difficulty,
    suggestedPriceCoins: suggestedPrice,
    qualityScore,
    aiStudyPlan: [
      `Lire le resume et isoler les notions cles de ${subject}.`,
      `Faire une fiche courte pour ${level || 'le niveau cible'}.`,
      'Traiter les exercices ou exemples, puis noter les erreurs.',
      'Finir par un quiz rapide avant publication.',
    ],
    aiQuiz: [
      {
        question: `Quel est le theme principal de "${heading ?? fallbackTitle}" ?`,
        answer: subject,
      },
      {
        question: 'Comment reviser ce PDF efficacement ?',
        answer: 'Lire le resume, faire une fiche, pratiquer, puis corriger les erreurs.',
      },
      {
        question: 'Quel niveau est vise ?',
        answer: level || 'Niveau a confirmer dans le dashboard.',
      },
    ],
    extractedText: text.slice(0, 6000),
  };
};

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

  useEffect(() => {
    refreshPacks();
  }, []);

  const metrics = useMemo(
    () => ({
      totalPdfs: documents.length,
      totalPacks: packs.length,
      publishedPdfs: documents.filter((document) => document.status === 'published').length,
      publishedPacks: packs.filter((pack) => pack.status === 'published').length,
      reviewPdfs: documents.filter((document) => document.status === 'needs_review' || document.qualityScore < 70).length,
      aiReadyPdfs: documents.filter((document) => document.aiSummary && document.aiTags.length > 0).length,
      totalSales: documents.reduce((sum, document) => sum + document.salesCount, 0),
      packSales: packs.reduce((sum, pack) => sum + pack.salesCount, 0),
      totalRevenue: documents.reduce(
        (sum, document) =>
          sum + Math.round(document.salesCount * document.priceCoins * (document.commissionRate / 100)),
        0,
      ) + packs.reduce((sum, pack) => sum + pack.revenueCoins, 0),
    }),
    [documents, packs],
  );

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return documents.filter((document) => {
      const haystack = [
        document.title,
        document.description,
        document.subject,
        document.teacher,
        document.level,
        document.faculty,
        document.university,
      ]
        .join(' ')
        .toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (status === 'all' || document.status === status) &&
        (!subject || document.subject.toLowerCase().includes(subject.toLowerCase())) &&
        (!level || document.level.toLowerCase().includes(level.toLowerCase()))
      );
    });
  }, [documents, level, query, status, subject]);

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

  const packSuggestions = useMemo(() => {
    const groups = new Map<string, PdfDocument[]>();
    for (const document of documents.filter((item) => item.status !== 'archived')) {
      const key = [document.university, document.faculty, document.level, document.subject].join('|');
      groups.set(key, [...(groups.get(key) ?? []), document]);
    }

    return Array.from(groups.entries())
      .filter(([, items]) => items.length >= 2)
      .slice(0, 8)
      .map(([key, items]) => {
        const [university, faculty, level, subject] = key.split('|');
        const originalPriceCoins = items.reduce((sum, item) => sum + item.priceCoins, 0);
        const priceCoins = Math.max(100, Math.round(originalPriceCoins * 0.82 / 50) * 50);
        return {
          key,
          title: `Pack ${subject} - ${level}`,
          description: `${items.length} PDF classes pour reviser ${subject} sans chercher document par document.`,
          university,
          faculty,
          level,
          semester: 'Semestre a confirmer',
          packType: 'course_bundle' as const,
          priceCoins,
          originalPriceCoins,
          discountPercent: originalPriceCoins > 0 ? Math.max(0, Math.round(100 - (priceCoins / originalPriceCoins) * 100)) : 0,
          documentIds: items.map((item) => item.id),
          aiSummary: `Pack propose par IA a partir de ${items.length} PDF ${subject}.`,
          aiConfidence: Math.min(95, 60 + items.length * 8),
        };
      });
  }, [documents]);

  const createSuggestedPack = async (suggestion: (typeof packSuggestions)[number]) => {
    setMessage('Creation du pack IA...');
    const response = await fetch('/api/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...suggestion, status: 'needs_review' }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ? JSON.stringify(payload.error) : 'Creation pack impossible.');
      return;
    }
    setMessage('Pack IA cree. Verifie puis publie.');
    await refreshPacks();
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

  const fieldValue = (form: HTMLFormElement, name: string, fallback = '') => {
    const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return field?.value || fallback;
  };

  const uploadAnalyzedFile = async (file: File, form: HTMLFormElement) => {
    const hints = await analyzePdf(file);
    const data = new FormData();
    data.set('title', hints.title || titleFromFileName(file.name));
    data.set('description', hints.description || `Document ${titleFromFileName(file.name)}`);
    data.set('university', hints.university || fieldValue(form, 'university', 'Multi-etablissements'));
    data.set('faculty', hints.faculty || fieldValue(form, 'faculty', 'Transversal'));
    data.set('subject', hints.subject || fieldValue(form, 'subject', 'Matiere a confirmer'));
    data.set('teacher', hints.teacher || fieldValue(form, 'teacher', 'Non renseigne'));
    data.set('level', hints.level || fieldValue(form, 'level', 'Tous niveaux'));
    data.set('academicYear', hints.academicYear || fieldValue(form, 'academicYear', '2025-2026'));
    data.set('priceCoins', String(hints.suggestedPriceCoins || Number(fieldValue(form, 'priceCoins', '300'))));
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

    const response = await fetch('/api/pdf', {
      method: 'POST',
      body: data,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ? JSON.stringify(payload.error) : `Upload impossible: ${file.name}`);
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    const file = files[0];
    const form = event.currentTarget.form;
    if (!file || !form) return;

    setAnalysisLoading(true);
    setMessage(files.length > 1 ? `Analyse et upload de ${files.length} PDF...` : 'Analyse du PDF...');

    try {
      if (files.length > 1) {
        for (const item of files) {
          await uploadAnalyzedFile(item, form);
        }
        setMessage(`${files.length} PDF analyses et enregistres. Verifie les packs IA proposes.`);
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
      setMessage(`Analyse IA terminee. Score qualite: ${hints.qualityScore}/100. Prix conseille: ${hints.suggestedPriceCoins} Coins.`);
    } catch {
      setMessage('Analyse impossible. Complete les champs manuellement.');
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
      const response = await fetch('/api/pdf', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ? JSON.stringify(payload.error) : 'Upload impossible');
      form.reset();
      setMessage('PDF enregistre.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur upload');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (documentId: string, nextStatus: PdfDocument['status']) => {
    const current = documents.find((document) => document.id === documentId);
    if (nextStatus === 'published' && current && (current.qualityScore < 70 || !current.aiSummary)) {
      setMessage('Publication bloquee: complete analyse IA, resume et score qualite avant publication.');
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
    setMessage('Reanalyse IA en cours...');
    const response = await fetch(`/api/pdf/${documentId}/analyze`, { method: 'POST' });
    if (!response.ok) {
      setMessage('Reanalyse impossible.');
      return;
    }
    setMessage('PDF reanalyse. Verifie puis publie si tout est correct.');
    await refresh();
  };

  const updatePack = async (packId: string, nextStatus: PdfPack['status']) => {
    const response = await fetch(`/api/packs/${packId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      setMessage('Changement de statut du pack impossible.');
      return;
    }
    setMessage(`Pack ${nextStatus}.`);
    await refreshPacks();
  };

  const removePack = async (packId: string) => {
    if (!confirm('Supprimer ce pack ?')) return;
    const response = await fetch(`/api/packs/${packId}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Suppression du pack impossible.');
      return;
    }
    setMessage('Pack supprime.');
    await refreshPacks();
  };

  return (
    <>
      <div className="header">
        <div>
          <div className="route-pill">
            <FileText size={15} />
            <span>/admin/pdf</span>
          </div>
          <h1>PDF academiques</h1>
        </div>
        <div className="actions">
          <button className="btn secondary" type="button" onClick={refresh}>
            <RefreshCw size={17} />
            Actualiser
          </button>
          <a className="btn secondary" href="/api/pdf">
            <Download size={17} />
            JSON
          </a>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric-icon">
            <FileText size={18} />
          </span>
          <div>
            <strong>{metrics.totalPdfs}</strong>
            <span className="muted">PDF</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <Check size={18} />
          </span>
          <div>
            <strong>{metrics.publishedPdfs}</strong>
            <span className="muted">Publies</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <PackagePlus size={18} />
          </span>
          <div>
            <strong>{metrics.totalPacks}</strong>
            <span className="muted">Packs</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <CircleAlert size={18} />
          </span>
          <div>
            <strong>{metrics.reviewPdfs}</strong>
            <span className="muted">A corriger</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <Sparkles size={18} />
          </span>
          <div>
            <strong>{metrics.aiReadyPdfs}</strong>
            <span className="muted">IA prets</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <FilePenLine size={18} />
          </span>
          <div>
            <strong>{metrics.totalSales}</strong>
            <span className="muted">Ventes</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">
            <Archive size={18} />
          </span>
          <div>
            <strong>{formatCoins(metrics.totalRevenue)}</strong>
            <span className="muted">Revenus</span>
          </div>
        </div>
      </div>

      <div className="workspace">
        <section className="panel">
          <h2 className="section-title">
            <UploadCloud size={18} />
            Ajouter un PDF
          </h2>
          {message ? <div className="alert">{message}</div> : null}
          <form onSubmit={submit}>
            <label>Titre</label>
            <input name="title" required placeholder="Analyse 2 - sujets corriges" />

            <label>Description</label>
            <textarea name="description" required placeholder="Ce que l'etudiant trouvera dans le PDF" />

            <div className="form-row">
              <div>
                <label>Universite</label>
                <input name="university" required defaultValue="Universite de Douala" />
              </div>
              <div>
                <label>Filiere / Faculte</label>
                <input name="faculty" required placeholder="Informatique" />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Matiere</label>
                <input name="subject" required placeholder="Mathematiques" />
              </div>
              <div>
                <label>Professeur</label>
                <input name="teacher" placeholder="Pr. Nom" />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Niveau</label>
                <input name="level" required placeholder="L2 Informatique" />
              </div>
              <div>
                <label>Annee academique</label>
                <input name="academicYear" required defaultValue="2025-2026" />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Prix en Coins</label>
                <input name="priceCoins" required type="number" min="0" step="50" defaultValue="300" />
              </div>
              <div>
                <label>Statut</label>
                <select name="status" defaultValue="draft">
                  <option value="draft">Brouillon</option>
                  <option value="analyzing">Analyse IA</option>
                  <option value="needs_review">A corriger</option>
                  <option value="published">Publie</option>
                  <option value="archived">Archive</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Pages</label>
                <input name="pageCount" type="number" min="1" defaultValue="20" />
              </div>
              <div>
                <label>Commission (%)</label>
                <input name="commissionRate" type="number" min="0" max="100" defaultValue="20" />
              </div>
            </div>

            <label>Fichier PDF</label>
            <input name="file" type="file" accept="application/pdf" required multiple onChange={onFileChange} />
            <input type="hidden" name="aiSummary" />
            <input type="hidden" name="aiTags" />
            <input type="hidden" name="aiDifficulty" />
            <input type="hidden" name="suggestedPriceCoins" />
            <input type="hidden" name="qualityScore" />
            <input type="hidden" name="aiStudyPlan" />
            <input type="hidden" name="aiQuiz" />
            <input type="hidden" name="extractedText" />

            <div className="ai-note">
              <Sparkles size={18} />
              <div>
                <strong>Analyse IA admin</strong>
                <span>Le PDF pre-remplit les champs, propose un prix, un resume, des tags et un score avant publication.</span>
              </div>
            </div>

            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn" type="submit" disabled={loading || analysisLoading}>
                {loading ? 'Upload...' : analysisLoading ? 'Analyse...' : 'Enregistrer PDF'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2 className="section-title">
            <PackagePlus size={18} />
            Packs IA
          </h2>
          <div className="pack-grid">
            {packSuggestions.length ? (
              packSuggestions.map((suggestion) => {
                const exists = packs.some((pack) => pack.title === suggestion.title);
                return (
                  <div className="pack-card" key={suggestion.key}>
                    <div className="pack-card-top">
                      <div>
                        <strong>{suggestion.title}</strong>
                        <span>{suggestion.university} - {suggestion.level}</span>
                      </div>
                      <span className="badge needs_review">{suggestion.aiConfidence}% IA</span>
                    </div>
                    <p>{suggestion.description}</p>
                    <div className="doc-meta">
                      <span className="meta-chip">{suggestion.documentIds.length} PDF</span>
                      <span className="meta-chip">{formatCoins(suggestion.priceCoins)} C</span>
                      <span className="meta-chip">-{suggestion.discountPercent}%</span>
                    </div>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={exists}
                      onClick={() => createSuggestedPack(suggestion)}
                    >
                      <PackagePlus size={16} />
                      {exists ? 'Deja cree' : 'Creer le pack'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="empty-panel">
                <strong>Aucune proposition fiable</strong>
                <span>Ajoute au moins deux PDF proches par matiere, niveau et filiere.</span>
              </div>
            )}
          </div>

          <h3 className="subsection-title">Packs existants</h3>
          <div className="pack-list">
            {packs.map((pack) => (
              <div className="pack-row" key={pack.id}>
                <div className="pack-row-main">
                  <strong>{pack.title}</strong>
                  <span>{pack.documentIds.length} PDF - {pack.level} - {pack.semester}</span>
                  {pack.aiSummary ? <p className="pack-row-summary">{pack.aiSummary}</p> : null}
                </div>
                <div className="pack-row-side">
                  <span className={`badge ${pack.status}`}>{pack.status}</span>
                  <strong>{formatCoins(pack.priceCoins)} C</strong>
                  <div className="table-actions">
                    <button className="icon-btn publish" title="Publier" onClick={() => updatePack(pack.id, 'published')}>
                      <Check size={16} />
                    </button>
                    <button className="icon-btn review" title="A corriger" onClick={() => updatePack(pack.id, 'needs_review')}>
                      <CircleAlert size={16} />
                    </button>
                    <button className="icon-btn draft" title="Brouillon" onClick={() => updatePack(pack.id, 'draft')}>
                      <FilePenLine size={16} />
                    </button>
                    <button className="icon-btn" title="Archiver" onClick={() => updatePack(pack.id, 'archived')}>
                      <Archive size={16} />
                    </button>
                    <button className="icon-btn danger" title="Supprimer" onClick={() => removePack(pack.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">
            <FileText size={18} />
            Catalogue
          </h2>
          <div className="toolbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher..." />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="published">Publies</option>
              <option value="needs_review">A corriger</option>
              <option value="analyzing">Analyse IA</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archives</option>
            </select>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Matiere" />
            <input value={level} onChange={(event) => setLevel(event.target.value)} placeholder="Niveau" />
          </div>

          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Ventes</th>
                <th>Revenu</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((document) => {
                const revenue = Math.round(document.salesCount * document.priceCoins * (document.commissionRate / 100));
                return (
                  <tr key={document.id}>
                    <td data-label="Document">
                      <div className="doc-title">
                        <FileText size={16} />
                        <span>{document.title}</span>
                      </div>
                      <div className="doc-meta">
                        <span className="meta-chip">{document.subject}</span>
                        <span className="meta-chip">{document.level}</span>
                        <span className="meta-chip">{document.teacher}</span>
                        <span className="meta-chip">{document.pageCount} pages</span>
                        <span className="meta-chip">Qualite {document.qualityScore}/100</span>
                        <span className="meta-chip">{document.aiDifficulty}</span>
                      </div>
                      {document.aiSummary ? <p className="doc-summary">{document.aiSummary}</p> : null}
                      {document.aiTags.length ? (
                        <div className="doc-meta">
                          {document.aiTags.map((tag) => (
                            <span className="meta-chip ai" key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      {document.aiStudyPlan.length ? (
                        <div className="doc-mini-plan">
                          {document.aiStudyPlan.slice(0, 2).map((step) => (
                            <span key={step}>{step}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td data-label="Prix">{formatCoins(document.priceCoins)} C</td>
                    <td data-label="Statut">
                      <span className={`badge ${document.status}`}>{document.status}</span>
                    </td>
                    <td data-label="Ventes">{document.salesCount}</td>
                    <td data-label="Revenu">{formatCoins(revenue)} C</td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        <button className="icon-btn ai" title="Reanalyser IA" onClick={() => reanalyze(document.id)}>
                          <Sparkles size={16} />
                        </button>
                        <button className="icon-btn publish" title="Publier" onClick={() => updateStatus(document.id, 'published')}>
                          <Check size={16} />
                        </button>
                        <button className="icon-btn review" title="A corriger" onClick={() => updateStatus(document.id, 'needs_review')}>
                          <CircleAlert size={16} />
                        </button>
                        <button className="icon-btn draft" title="Brouillon" onClick={() => updateStatus(document.id, 'draft')}>
                          <FilePenLine size={16} />
                        </button>
                        <button className="icon-btn" title="Archiver" onClick={() => updateStatus(document.id, 'archived')}>
                          <Archive size={16} />
                        </button>
                        <button className="icon-btn danger" title="Supprimer" onClick={() => remove(document.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
