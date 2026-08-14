import type { CampusDocument, CampusPdfPack } from '../../types';
import { isSupabaseConfigured, publicEnv } from '../../config/env';
import { authFetch, getStudentAccount } from '../auth/betterAuth';

type SupabaseDocumentRow = {
  id: string;
  title: string;
  description: string;
  university: string;
  faculty: string;
  subject: string;
  teacher: string | null;
  level: string;
  academic_year: string;
  price_coins: number;
  page_count: number;
  file_path: string;
  preview_path: string | null;
  file_size: string | null;
  status: CampusDocument['status'];
  commission_rate: number;
  rating: number;
  sales_count: number;
  downloads_count: number;
  ai_summary?: string | null;
  ai_tags?: string[] | null;
  ai_difficulty?: string | null;
  suggested_price_coins?: number | null;
  quality_score?: number | null;
  ai_study_plan?: string[] | null;
  ai_quiz?: Array<{ question: string; answer: string }> | null;
  created_at: string;
};

type SupabasePackRow = {
  id: string;
  title: string;
  description: string;
  university: string | null;
  faculty: string | null;
  level: string | null;
  semester: string | null;
  pack_type: CampusPdfPack['packType'] | null;
  price_coins: number;
  original_price_coins: number | null;
  discount_percent: number | null;
  status: CampusPdfPack['status'];
  sales_count: number;
  revenue_coins: number;
  ai_summary: string | null;
  ai_confidence: number | null;
  created_at: string;
};

type SupabasePackItemRow = {
  pack_id: string;
  document_id: string;
  sort_order: number | null;
};

export type CreatePdfDocumentInput = {
  title: string;
  description: string;
  university: string;
  faculty: string;
  subject: string;
  teacher?: string;
  level: string;
  academicYear: string;
  price: number;
  pageCount: number;
  filePath: string;
  previewPath?: string;
  fileSize?: string;
  status: CampusDocument['status'];
  commissionRate: number;
};

export type PdfPurchaseResult = {
  purchaseId: string;
  documentId: string;
  buyerId: string;
};

export type PackPurchaseResult = {
  purchaseId: string;
  packId: string;
  buyerId: string;
  documentIds: string[];
};

export type PdfAnalyticsEventType =
  | 'catalog_view'
  | 'search'
  | 'preview_open'
  | 'purchase_start'
  | 'purchase_success'
  | 'purchase_failed'
  | 'reader_open'
  | 'assistant_question'
  | 'free_pdf_claim';

type PdfAnalyticsInput = {
  eventType: PdfAnalyticsEventType;
  documentId?: string;
  metadata?: Record<string, unknown>;
  accessToken?: string;
};

const getBaseUrl = () => publicEnv.supabaseUrl.replace(/\/$/, '');
let memoryAnalyticsSessionId = '';

const getStorage = () => {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
};

const getAnalyticsSessionId = () => {
  const key = 'campus-360.analytics-session';
  const storage = getStorage();
  const existing = storage?.getItem(key) ?? memoryAnalyticsSessionId;
  if (existing) return existing;

  const next = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  memoryAnalyticsSessionId = next;
  storage?.setItem(key, next);
  return next;
};

const isSupabaseJwt = (token?: string) =>
  Boolean(token && token !== 'better-auth' && token.split('.').length === 3);

const getHeaders = (accessToken?: string) => {
  const token = isSupabaseJwt(accessToken) ? accessToken : publicEnv.supabaseAnonKey;
  return {
    apikey: publicEnv.supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const assertConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Service PDF indisponible.');
  }
};

const mapDocumentRow = (row: SupabaseDocumentRow): CampusDocument => ({
  id: row.id,
  title: row.title,
  description: row.description,
  university: row.university,
  faculty: row.faculty,
  subject: row.subject,
  teacher: row.teacher ?? 'Non renseigne',
  level: row.level,
  academicYear: row.academic_year,
  price: row.price_coins,
  pageCount: row.page_count,
  fileSize: row.file_size ?? 'PDF',
  filePath: row.file_path,
  previewPath: row.preview_path ?? undefined,
  previewPages: row.preview_path ? 1 : 0,
  rating: Number(row.rating ?? 0),
  sales: row.sales_count,
  downloads: row.downloads_count,
  uploaderName: 'Admin Campus 3602',
  status: row.status,
  commissionRate: row.commission_rate,
  createdAt: new Date(row.created_at).toLocaleDateString('fr-FR'),
  aiSummary: row.ai_summary ?? undefined,
  aiTags: row.ai_tags ?? undefined,
  aiDifficulty: row.ai_difficulty ?? undefined,
  suggestedPrice: row.suggested_price_coins ?? undefined,
  qualityScore: row.quality_score ?? undefined,
  studyPlan: row.ai_study_plan ?? undefined,
  quiz: row.ai_quiz ?? undefined,
});

const mapPackRow = (
  row: SupabasePackRow,
  documentIds: string[],
  documents: CampusDocument[],
): CampusPdfPack => {
  const includedDocuments = documents.filter((document) => documentIds.includes(document.id));
  const originalPrice =
    row.original_price_coins ??
    includedDocuments.reduce((sum, document) => sum + document.price, 0);
  const pageCount = includedDocuments.reduce((sum, document) => sum + document.pageCount, 0);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    university: row.university ?? 'Multi-etablissements',
    faculty: row.faculty ?? 'Transversal',
    level: row.level ?? 'Tous niveaux',
    semester: row.semester ?? 'Libre',
    packType: row.pack_type ?? 'transversal',
    price: row.price_coins,
    originalPrice,
    discountPercent:
      row.discount_percent ?? (originalPrice > 0 ? Math.max(0, Math.round(100 - (row.price_coins / originalPrice) * 100)) : 0),
    documentIds,
    documentCount: documentIds.length,
    pageCount,
    status: row.status,
    sales: row.sales_count,
    revenue: row.revenue_coins,
    aiSummary: row.ai_summary ?? undefined,
    aiConfidence: row.ai_confidence ?? undefined,
    createdAt: new Date(row.created_at).toLocaleDateString('fr-FR'),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const SAMPLE_DOCUMENTS: CampusDocument[] = [
  {
    id: 'sample-doc-1',
    title: 'Droit des Obligations & Contrats Civils',
    description: 'Cours complet sur le droit des contrats, la formation et les effets des obligations juridiques.',
    subject: 'Droit Privé',
    level: 'Licence 2',
    teacher: 'Prof. Nguema',
    academicYear: '2025-2026',
    pageCount: 38,
    fileSize: '2.4 MB',
    status: 'published',
    previewPages: 5,
    price: 0,
    sales: 142,
    downloads: 120,
    rating: 4.9,
    commissionRate: 0,
    uploaderName: 'Faculté de Droit',
    university: 'Université de Yaoundé II',
    faculty: 'Sciences Juridiques et Politiques',
    filePath: 'admin/sample-droit.pdf',
    createdAt: new Date().toLocaleDateString('fr-FR'),
    aiSummary: "Ce cours fondamental traite de la formation, de l'exécution et de l'extinction des obligations contractuelles. Il détaille le consentement, la capacité, l'objet et la cause.",
    studyPlan: [
      'Chapitre 1 : La notion d’obligation et les sources d’obligations',
      'Chapitre 2 : La formation du contrat (Offre et Acceptation)',
      'Chapitre 3 : Les vices du consentement (Erreur, Dol, Violence)',
      'Chapitre 4 : L’inexécution et les sanctions contractuelles',
    ],
    quiz: [
      { question: 'Quels sont les 3 vices traditionnels du consentement ?', answer: "L'erreur, le dol et la violence." },
      { question: 'Quelle est la sanction principale de la nullité relative ?', answer: "L'annulation du contrat protégeant l'intérêt privé d'une des parties." },
    ],
  },
  {
    id: 'sample-doc-2',
    title: 'Algorithmique & Structures de Données Avancées',
    description: 'Structure de données complexes, graphes, arbres équilibrés et complexité algorithmique.',
    subject: 'Informatique',
    level: 'Licence 3',
    teacher: 'Dr. Lucien Pascal',
    academicYear: '2025-2026',
    pageCount: 52,
    fileSize: '3.8 MB',
    status: 'published',
    previewPages: 8,
    price: 0,
    sales: 215,
    downloads: 180,
    rating: 4.8,
    commissionRate: 0,
    uploaderName: 'Département Informatique',
    university: 'Polytechnique',
    faculty: 'Génie Informatique',
    filePath: 'admin/sample-algo.pdf',
    createdAt: new Date().toLocaleDateString('fr-FR'),
    aiSummary: "Synthèse exhaustive sur les structures de données non-linéaires, parcours d'arbres (DFS, BFS), algorithmes de plus court chemin (Dijkstra) et calcul de complexité Big O.",
    studyPlan: [
      'Module 1 : Analyse asymptotique et notation Grand O',
      'Module 2 : Arbres AVL et Arbres Rouges et Noirs',
      'Module 3 : Graphes et algorithmes de parcours (Largeur & Profondeur)',
      'Module 4 : Programmation dynamique vs Algorithmes gloutons',
    ],
    quiz: [
      { question: 'Quelle est la complexité moyenne de recherche dans une table de hachage ?', answer: 'O(1) en temps constant.' },
      { question: 'Quel algorithme trouve le plus court chemin dans un graphe avec poids positifs ?', answer: "L'algorithme de Dijkstra." },
    ],
  }
];

export const listPublishedPdfDocuments = async (): Promise<CampusDocument[]> => {
  if (!isSupabaseConfigured()) {
    return SAMPLE_DOCUMENTS;
  }

  try {
    const url = `${getBaseUrl()}/rest/v1/documents?select=*&order=created_at.desc`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      console.warn('[pdfApi] Supabase non-ok response, fallback to sample documents');
      return SAMPLE_DOCUMENTS;
    }
    const rows = (await response.json()) as SupabaseDocumentRow[];
    if (!rows || rows.length === 0) return SAMPLE_DOCUMENTS;
    return rows.map(mapDocumentRow);
  } catch (err) {
    console.warn('[pdfApi] Supabase unreachable or paused, using sample documents:', err);
    return SAMPLE_DOCUMENTS;
  }
};

export const listPublishedPdfPacks = async (documents: CampusDocument[]): Promise<CampusPdfPack[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const [packRows, itemRows] = await Promise.all([
    handleResponse<SupabasePackRow[]>(
      await fetch(`${getBaseUrl()}/rest/v1/pdf_packs?status=eq.published&select=*&order=created_at.desc`, {
        headers: getHeaders(),
      }),
    ).catch(() => []),
    handleResponse<SupabasePackItemRow[]>(
      await fetch(`${getBaseUrl()}/rest/v1/pdf_pack_items?select=pack_id,document_id,sort_order`, {
        headers: getHeaders(),
      }),
    ).catch(() => []),
  ]);

  return packRows.map((pack) => {
    const documentIds = itemRows
      .filter((item) => item.pack_id === pack.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item) => item.document_id);
    return mapPackRow(pack, documentIds, documents);
  });
};

export const buildSuggestedPacks = (documents: CampusDocument[]): CampusPdfPack[] => {
  const published = documents.filter((document) => document.status !== 'archived');
  const groups = new Map<string, CampusDocument[]>();

  for (const document of published) {
    const key = [document.university, document.faculty, document.level, document.subject].join('|');
    groups.set(key, [...(groups.get(key) ?? []), document]);
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length >= 2)
    .slice(0, 6)
    .map(([key, items], index) => {
      const [university, faculty, level, subject] = key.split('|');
      const originalPrice = items.reduce((sum, document) => sum + document.price, 0);
      const price = Math.max(100, Math.round(originalPrice * 0.82 / 50) * 50);
      const pageCount = items.reduce((sum, document) => sum + document.pageCount, 0);
      return {
        id: `local-pack-${index}-${key}`,
        title: `Pack ${subject} - ${level}`,
        description: `Parcours de revision avec ${items.length} PDF classes pour avancer plus vite.`,
        university,
        faculty,
        level,
        semester: 'Semestre a confirmer',
        packType: 'course_bundle',
        price,
        originalPrice,
        discountPercent: originalPrice > 0 ? Math.max(0, Math.round(100 - (price / originalPrice) * 100)) : 0,
        documentIds: items.map((document) => document.id),
        documentCount: items.length,
        pageCount,
        status: 'published',
        sales: items.reduce((sum, document) => sum + document.sales, 0),
        revenue: 0,
        aiSummary: `Pack suggere automatiquement a partir des PDF ${subject}.`,
        aiConfidence: 72,
        createdAt: new Date().toLocaleDateString('fr-FR'),
      } satisfies CampusPdfPack;
    });
};

export const recordPdfAnalyticsEvent = async ({
  eventType,
  documentId,
  metadata,
  accessToken,
}: PdfAnalyticsInput): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    if (accessToken) {
      await authFetch('/api/mobile/events', {
        method: 'POST',
        body: JSON.stringify({
          eventType,
          documentId,
          metadata: metadata ?? {},
          sessionId: getAnalyticsSessionId(),
        }),
      });
    } else {
      await fetch(`${getBaseUrl()}/rest/v1/rpc/record_document_event`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          event_type: eventType,
          target_document_id: documentId ?? null,
          event_metadata: metadata ?? {},
          analytics_session_id: getAnalyticsSessionId(),
        }),
      });
    }
  } catch {
    // Analytics must never block reading, previewing or buying PDFs.
  }
};

export const listPurchasedPdfIds = async (): Promise<string[]> =>
  (await getStudentAccount()).purchasedDocumentIds;

export const listPurchasedPackIds = async (): Promise<string[]> =>
  (await getStudentAccount()).purchasedPackIds;

export const purchasePdfDocument = async (
  documentId: string,
): Promise<PdfPurchaseResult> => {
  const row = await handleResponse<{
    id: string;
    document_id: string;
    buyer_id: string;
  }>(
    await authFetch('/api/mobile/purchase/document', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),
  );

  return {
    purchaseId: row.id,
    documentId: row.document_id,
    buyerId: row.buyer_id,
  };
};

export const purchasePdfPack = async (
  packId: string,
): Promise<PackPurchaseResult> => {
  const row = await handleResponse<{
    id: string;
    pack_id: string;
    buyer_id: string;
    document_ids?: string[] | null;
  }>(
    await authFetch('/api/mobile/purchase/pack', {
      method: 'POST',
      body: JSON.stringify({ packId }),
    }),
  );

  return {
    purchaseId: row.id,
    packId: row.pack_id,
    buyerId: row.buyer_id,
    documentIds: row.document_ids ?? [],
  };
};

export const createPdfDocument = async (
  input: CreatePdfDocumentInput,
  accessToken: string,
): Promise<CampusDocument> => {
  assertConfigured();

  const url = `${getBaseUrl()}/rest/v1/documents?select=*`;
  const rows = await handleResponse<SupabaseDocumentRow[]>(
    await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        university: input.university,
        faculty: input.faculty,
        subject: input.subject,
        teacher: input.teacher ?? null,
        level: input.level,
        academic_year: input.academicYear,
        price_coins: input.price,
        page_count: input.pageCount,
        file_path: input.filePath,
        preview_path: input.previewPath ?? null,
        file_size: input.fileSize ?? null,
        status: input.status,
        commission_rate: input.commissionRate,
      }),
    }),
  );

  return mapDocumentRow(rows[0]);
};

export const createSignedPdfUrl = async (
  bucket: 'documents' | 'document-previews',
  path: string,
  accessToken?: string,
  expiresInSeconds = 900,
): Promise<string> => {
  assertConfigured();

  if (bucket === 'documents' || bucket === 'document-previews') {
    try {
      const payload = await handleResponse<{ url: string }>(
        await authFetch('/api/mobile/pdf/signed-url', {
          method: 'POST',
          body: JSON.stringify({ bucket, path, expiresIn: expiresInSeconds }),
        }),
      );
      if (payload?.url) return payload.url;
    } catch (err) {
      console.warn('[pdfApi] authFetch signed-url failed, attempting direct production API call:', err);
      try {
        const prodApiUrl = `${publicEnv.authUrl.replace(/\/$/, '')}/api/mobile/pdf/signed-url`;
        const res = await fetch(prodApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket, path, expiresIn: expiresInSeconds }),
        });
        if (res.ok) {
          const payload = (await res.json()) as { url: string };
          if (payload?.url) return payload.url;
        }
      } catch (prodErr) {
        console.warn('[pdfApi] Production API signed-url fallback failed:', prodErr);
      }
    }
  }

  const url = `${getBaseUrl()}/storage/v1/object/sign/${bucket}/${path}`;
  const response = await handleResponse<{ signedURL: string }>(
    await fetch(url, {
      method: 'POST',
      headers: getHeaders(accessToken),
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    }),
  );

  return `${getBaseUrl()}/storage/v1${response.signedURL}`;
};

export const uploadPdfBlob = async (
  bucket: 'documents' | 'document-previews',
  path: string,
  file: Blob,
  accessToken: string,
): Promise<string> => {
  assertConfigured();

  const url = `${getBaseUrl()}/storage/v1/object/${bucket}/${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: publicEnv.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Upload failed with status ${response.status}`);
  }

  return path;
};
