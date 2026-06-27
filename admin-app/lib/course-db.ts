import { getPool, upsertSupabasePdf, upsertSupabasePack, deleteSupabasePdf } from './supabase-pdf';
import crypto from 'node:crypto';

export type UserRole = 'student' | 'admin' | 'super_admin';
export type PdfStatus = 'draft' | 'analyzing' | 'needs_review' | 'published' | 'archived';

export type PdfDocument = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  university: string;
  faculty: string;
  subject: string;
  teacher: string;
  level: string;
  academicYear: string;
  priceCoins: number;
  pageCount: number;
  fileName: string;
  filePath: string;
  fileSize: string;
  status: PdfStatus;
  salesCount: number;
  downloadsCount: number;
  commissionRate: number;
  aiSummary: string;
  aiTags: string[];
  aiDifficulty: string;
  suggestedPriceCoins: number;
  qualityScore: number;
  aiStudyPlan: string[];
  aiQuiz: Array<{ question: string; answer: string }>;
  extractedText: string;
  previewPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PdfPack = {
  id: string;
  title: string;
  description: string;
  university: string;
  faculty: string;
  level: string;
  semester: string;
  packType: 'semester' | 'exam_prep' | 'corrections' | 'course_bundle' | 'catch_up' | 'transversal';
  priceCoins: number;
  originalPriceCoins: number;
  discountPercent: number;
  status: PdfStatus;
  salesCount: number;
  revenueCoins: number;
  aiSummary: string;
  aiConfidence: number;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePdfInput = {
  title: string;
  description: string;
  university: string;
  faculty: string;
  subject: string;
  teacher: string;
  level: string;
  academicYear: string;
  priceCoins: number;
  pageCount: number;
  fileName: string;
  filePath: string;
  fileSize: string;
  status: PdfStatus;
  commissionRate: number;
  aiSummary?: string;
  aiTags?: string[];
  aiDifficulty?: string;
  suggestedPriceCoins?: number;
  qualityScore?: number;
  aiStudyPlan?: string[];
  aiQuiz?: Array<{ question: string; answer: string }>;
  extractedText?: string;
  previewPath?: string;
};

export type CreatePackInput = {
  title: string;
  description: string;
  university: string;
  faculty: string;
  level: string;
  semester: string;
  packType: PdfPack['packType'];
  priceCoins: number;
  originalPriceCoins: number;
  discountPercent: number;
  status: PdfStatus;
  aiSummary?: string;
  aiConfidence?: number;
  documentIds: string[];
};

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;

const mapPdf = (row: any): PdfDocument => ({
  id: String(row.id),
  courseId: String(row.id), // No courses table anymore
  title: String(row.title),
  description: String(row.description),
  university: String(row.university),
  faculty: String(row.faculty),
  subject: String(row.subject),
  teacher: String(row.teacher || 'Non renseigne'),
  level: String(row.level),
  academicYear: String(row.academic_year || '2025-2026'),
  priceCoins: Number(row.price_coins),
  pageCount: Number(row.page_count),
  fileName: String(row.file_path).split('/').pop() || 'document.pdf',
  filePath: String(row.file_path),
  fileSize: String(row.file_size || '0 MB'),
  status: row.status as PdfStatus,
  salesCount: Number(row.sales_count),
  downloadsCount: Number(row.downloads_count),
  commissionRate: Number(row.commission_rate),
  aiSummary: String(row.ai_summary || ''),
  aiTags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
  aiDifficulty: String(row.ai_difficulty || 'standard'),
  suggestedPriceCoins: Number(row.suggested_price_coins || 0),
  qualityScore: Number(row.quality_score || 0),
  aiStudyPlan: Array.isArray(row.ai_study_plan) ? row.ai_study_plan : [],
  aiQuiz: Array.isArray(row.ai_quiz) ? row.ai_quiz : [],
  extractedText: '', // Kept empty for admin UI lightness
  previewPath: row.preview_path ? String(row.preview_path) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const mapPack = (row: any, documentIds: string[] = []): PdfPack => ({
  id: String(row.id),
  title: String(row.title),
  description: String(row.description),
  university: String(row.university),
  faculty: String(row.faculty),
  level: String(row.level),
  semester: String(row.semester),
  packType: row.pack_type as PdfPack['packType'],
  priceCoins: Number(row.price_coins),
  originalPriceCoins: Number(row.original_price_coins),
  discountPercent: Number(row.discount_percent),
  status: row.status as PdfStatus,
  salesCount: Number(row.sales_count),
  revenueCoins: Number(row.revenue_coins),
  aiSummary: String(row.ai_summary || ''),
  aiConfidence: Number(row.ai_confidence || 0),
  documentIds,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const listPdfs = async (): Promise<PdfDocument[]> => {
  const db = getPool();
  if (!db) return [];
  const { rows } = await db.query('select * from public.documents order by created_at desc');
  return rows.map(mapPdf);
};

export const listPacks = async (): Promise<PdfPack[]> => {
  const db = getPool();
  if (!db) return [];
  const { rows } = await db.query('select * from public.pdf_packs order by created_at desc');
  
  const packs = [];
  for (const row of rows) {
    const { rows: items } = await db.query('select document_id from public.pdf_pack_items where pack_id = $1 order by sort_order asc', [row.id]);
    packs.push(mapPack(row, items.map(item => item.document_id)));
  }
  return packs;
};

export const listPublishedPdfs = async () => {
  const pdfs = await listPdfs();
  return pdfs.filter(p => p.status === 'published');
};

export const listPublishedPacks = async () => {
  const packs = await listPacks();
  return packs.filter(p => p.status === 'published');
};

export const getPdfById = async (pdfId: string): Promise<PdfDocument | null> => {
  const db = getPool();
  if (!db) return null;
  const { rows } = await db.query('select * from public.documents where id = $1', [pdfId]);
  return rows[0] ? mapPdf(rows[0]) : null;
};

export const createPdf = async (input: CreatePdfInput, adminUserId: string) => {
  const pdfId = id('pdf');
  const now = new Date().toISOString();
  
  const document: PdfDocument = {
    ...input,
    id: pdfId,
    courseId: pdfId,
    fileName: input.fileName,
    filePath: input.filePath,
    fileSize: input.fileSize,
    salesCount: 0,
    downloadsCount: 0,
    aiSummary: input.aiSummary ?? '',
    aiTags: input.aiTags ?? [],
    aiDifficulty: input.aiDifficulty ?? 'standard',
    suggestedPriceCoins: input.suggestedPriceCoins ?? input.priceCoins,
    qualityScore: input.qualityScore ?? 0,
    aiStudyPlan: input.aiStudyPlan ?? [],
    aiQuiz: input.aiQuiz ?? [],
    extractedText: input.extractedText ?? '',
    previewPath: input.previewPath ?? null,
    createdAt: now,
    updatedAt: now,
  };
  
  await upsertSupabasePdf(document);
  await audit(adminUserId, 'pdf.create', 'pdf_document', pdfId, { title: input.title });
  return getPdfById(pdfId);
};

export const createPack = async (input: CreatePackInput, adminUserId: string) => {
  if (!input.documentIds.length) throw new Error('Un pack doit contenir au moins un PDF');
  
  const packId = id('pack');
  const now = new Date().toISOString();
  
  const pack: PdfPack = {
    ...input,
    id: packId,
    salesCount: 0,
    revenueCoins: 0,
    aiSummary: input.aiSummary ?? '',
    aiConfidence: input.aiConfidence ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  
  await upsertSupabasePack(pack);
  await audit(adminUserId, 'pack.create', 'pdf_pack', packId, { title: input.title, documentIds: input.documentIds });
  return pack;
};

export const updatePackStatus = async (packId: string, status: PdfStatus, adminUserId: string) => {
  const db = getPool();
  if (!db) return null;
  await db.query('update public.pdf_packs set status = $1, updated_at = now() where id = $2', [status, packId]);
  await audit(adminUserId, `pack.${status}`, 'pdf_pack', packId, { status });
  
  const { rows } = await db.query('select * from public.pdf_packs where id = $1', [packId]);
  if (!rows[0]) return null;
  const { rows: items } = await db.query('select document_id from public.pdf_pack_items where pack_id = $1 order by sort_order', [packId]);
  return mapPack(rows[0], items.map(i => i.document_id));
};

export const deletePack = async (packId: string, adminUserId: string) => {
  const db = getPool();
  if (!db) return;
  await db.query('delete from public.pdf_packs where id = $1', [packId]);
  await audit(adminUserId, 'pack.delete', 'pdf_pack', packId, {});
};

export const updatePdfStatus = async (pdfId: string, status: PdfStatus, adminUserId: string) => {
  const db = getPool();
  if (!db) return null;
  await db.query('update public.documents set status = $1, updated_at = now() where id = $2', [status, pdfId]);
  await audit(adminUserId, `pdf.${status}`, 'pdf_document', pdfId, { status });
  return getPdfById(pdfId);
};

export const updatePdfPrice = async (pdfId: string, priceCoins: number, adminUserId: string) => {
  const db = getPool();
  if (!db) return null;
  await db.query('update public.documents set price_coins = $1, updated_at = now() where id = $2', [priceCoins, pdfId]);
  await audit(adminUserId, 'pdf.update_price', 'pdf_document', pdfId, { priceCoins });
  return getPdfById(pdfId);
};

export const updatePdfAiMetadata = async (
  pdfId: string,
  input: {
    aiSummary: string;
    aiTags: string[];
    aiDifficulty: string;
    suggestedPriceCoins: number;
    qualityScore: number;
    aiStudyPlan?: string[];
    aiQuiz?: Array<{ question: string; answer: string }>;
    extractedText?: string;
  },
  adminUserId: string,
) => {
  const db = getPool();
  if (!db) return null;
  await db.query(`
    update public.documents
    set ai_summary = $1, ai_tags = $2::jsonb, ai_difficulty = $3, suggested_price_coins = $4, quality_score = $5,
        ai_study_plan = $6::jsonb, ai_quiz = $7::jsonb, updated_at = now()
    where id = $8
  `, [
    input.aiSummary,
    JSON.stringify(input.aiTags),
    input.aiDifficulty,
    input.suggestedPriceCoins,
    input.qualityScore,
    JSON.stringify(input.aiStudyPlan ?? []),
    JSON.stringify(input.aiQuiz ?? []),
    pdfId
  ]);
  await audit(adminUserId, 'pdf.ai_metadata', 'pdf_document', pdfId, input);
  return getPdfById(pdfId);
};

export const deletePdf = async (pdfId: string, adminUserId: string) => {
  await deleteSupabasePdf(pdfId);
  await audit(adminUserId, 'pdf.delete', 'pdf_document', pdfId, {});
};

export const hasPurchasedPdf = async (pdfId: string, userId: string) => {
  const db = getPool();
  if (!db) return false;
  const { rows } = await db.query('select 1 from public.document_purchases where document_id = $1 and buyer_id = $2', [pdfId, userId]);
  return rows.length > 0;
};

export const purchasePdf = async (pdfId: string, userId: string) => {
  throw new Error("purchasePdf should be called from Supabase RPC, not via Admin backend directly.");
};

export const audit = async (adminUserId: string, action: string, entityType: string, entityId: string, metadata: unknown) => {
  const db = getPool();
  if (!db) {
    // create public.admin_audit_logs if not exists just in case
    return;
  }
  
  await db.query(`
    create table if not exists public.admin_audit_logs (
      id text primary key,
      admin_user_id text not null,
      action text not null,
      entity_type text not null,
      entity_id text not null,
      metadata text not null default '{}',
      created_at timestamptz not null default now()
    );
  `);
  
  await db.query(`
    insert into public.admin_audit_logs (id, admin_user_id, action, entity_type, entity_id, metadata, created_at)
    values ($1, $2, $3, $4, $5, $6, now())
  `, [id('audit'), adminUserId, action, entityType, entityId, JSON.stringify(metadata)]);
};

export const metrics = async () => {
  const db = getPool();
  if (!db) return { totalPdfs: 0, totalPacks: 0, publishedPdfs: 0, publishedPacks: 0, reviewPdfs: 0, reviewPacks: 0, aiReadyPdfs: 0, totalSales: 0, packSales: 0, totalRevenue: 0 };
  
  const [docStats, packStats] = await Promise.all([
    db.query(`
      select 
        count(*) as total,
        count(*) filter (where status = 'published') as published,
        count(*) filter (where status = 'needs_review' or quality_score < 70) as review,
        count(*) filter (where ai_summary != '' and jsonb_array_length(ai_tags) > 0) as ai_ready,
        sum(sales_count) as total_sales,
        sum(sales_count * price_coins * (commission_rate::numeric / 100.0)) as revenue
      from public.documents
    `),
    db.query(`
      select 
        count(*) as total,
        count(*) filter (where status = 'published') as published,
        count(*) filter (where status = 'needs_review') as review,
        sum(sales_count) as total_sales,
        sum(revenue_coins) as revenue
      from public.pdf_packs
    `)
  ]);
  
  const doc = docStats.rows[0];
  const pack = packStats.rows[0];
  
  return {
    totalPdfs: Number(doc.total || 0),
    totalPacks: Number(pack.total || 0),
    publishedPdfs: Number(doc.published || 0),
    publishedPacks: Number(pack.published || 0),
    reviewPdfs: Number(doc.review || 0),
    reviewPacks: Number(pack.review || 0),
    aiReadyPdfs: Number(doc.ai_ready || 0),
    totalSales: Number(doc.total_sales || 0),
    packSales: Number(pack.total_sales || 0),
    totalRevenue: Number(doc.revenue || 0) + Number(pack.revenue || 0),
  };
};
