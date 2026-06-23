import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { databasePath, pdfUploadDir } from './paths';

export type UserRole = 'student' | 'admin' | 'super_admin';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type PdfStatus = 'draft' | 'analyzing' | 'needs_review' | 'published' | 'archived';

export type Course = {
  id: string;
  title: string;
  description: string;
  university: string;
  faculty: string;
  level: string;
  subject: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
};

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
  createdAt: string;
  updatedAt: string;
};

export type PdfPurchase = {
  id: string;
  pdfId: string;
  userId: string;
  amountCoins: number;
  createdAt: string;
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

export type AdminAuditLog = {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string;
  createdAt: string;
};

const db = new DatabaseSync(databasePath);

export const getDb = () => db;

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;

const ensureColumn = (table: string, column: string, definition: string) => {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`);
  }
};

const parseJson = <T,>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value ?? '')) as T;
  } catch {
    return fallback;
  }
};

export const initCourseDb = () => {
  mkdirSync(pdfUploadDir, { recursive: true });

  db.exec(`
    create table if not exists profiles (
      id text primary key,
      email text unique not null,
      name text not null,
      role text not null default 'student',
      university text,
      faculty text,
      level text,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists wallets (
      id text primary key,
      user_id text unique not null,
      balance_coins integer not null default 0 check (balance_coins >= 0),
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists courses (
      id text primary key,
      title text not null,
      description text not null,
      university text not null,
      faculty text not null,
      level text not null,
      subject text not null,
      status text not null default 'draft',
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists pdf_documents (
      id text primary key,
      course_id text not null,
      title text not null,
      description text not null,
      university text not null,
      faculty text not null,
      subject text not null,
      teacher text not null,
      level text not null,
      academic_year text not null,
      price_coins integer not null default 0,
      page_count integer not null default 1,
      file_name text not null,
      file_path text not null,
      file_size text not null,
      status text not null default 'draft',
      sales_count integer not null default 0,
      downloads_count integer not null default 0,
      commission_rate integer not null default 20,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP,
      foreign key (course_id) references courses(id)
    );

    create table if not exists pdf_purchases (
      id text primary key,
      pdf_id text not null,
      user_id text not null,
      amount_coins integer not null,
      created_at text not null default CURRENT_TIMESTAMP,
      unique (pdf_id, user_id),
      foreign key (pdf_id) references pdf_documents(id)
    );

    create table if not exists pdf_packs (
      id text primary key,
      title text not null,
      description text not null,
      university text not null default 'Multi-etablissements',
      faculty text not null default 'Transversal',
      level text not null default 'Tous niveaux',
      semester text not null default 'Libre',
      pack_type text not null default 'transversal',
      price_coins integer not null default 0,
      original_price_coins integer not null default 0,
      discount_percent integer not null default 0,
      status text not null default 'draft',
      sales_count integer not null default 0,
      revenue_coins integer not null default 0,
      ai_summary text not null default '',
      ai_confidence integer not null default 0,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists pdf_pack_items (
      id text primary key,
      pack_id text not null,
      pdf_id text not null,
      sort_order integer not null default 0,
      created_at text not null default CURRENT_TIMESTAMP,
      unique (pack_id, pdf_id),
      foreign key (pack_id) references pdf_packs(id) on delete cascade,
      foreign key (pdf_id) references pdf_documents(id) on delete cascade
    );

    create table if not exists wallet_transactions (
      id text primary key,
      user_id text not null,
      type text not null,
      amount_coins integer not null,
      reference_id text,
      status text not null default 'success',
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists pdf_download_logs (
      id text primary key,
      pdf_id text not null,
      user_id text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists admin_audit_logs (
      id text primary key,
      admin_user_id text not null,
      action text not null,
      entity_type text not null,
      entity_id text not null,
      metadata text not null default '{}',
      created_at text not null default CURRENT_TIMESTAMP
    );

    create index if not exists pdf_documents_status_idx on pdf_documents(status, subject, level);
    create index if not exists pdf_packs_status_idx on pdf_packs(status, university, faculty, level);
    create index if not exists pdf_pack_items_pack_idx on pdf_pack_items(pack_id, sort_order);
    create index if not exists pdf_purchases_user_idx on pdf_purchases(user_id);
    create index if not exists audit_logs_admin_idx on admin_audit_logs(admin_user_id, created_at);
  `);

  ensureColumn('pdf_documents', 'ai_summary', "text not null default ''");
  ensureColumn('pdf_documents', 'ai_tags', "text not null default '[]'");
  ensureColumn('pdf_documents', 'ai_difficulty', "text not null default 'standard'");
  ensureColumn('pdf_documents', 'suggested_price_coins', 'integer not null default 0');
  ensureColumn('pdf_documents', 'quality_score', 'integer not null default 0');
  ensureColumn('pdf_documents', 'ai_study_plan', "text not null default '[]'");
  ensureColumn('pdf_documents', 'ai_quiz', "text not null default '[]'");
  ensureColumn('pdf_documents', 'extracted_text', "text not null default ''");

  if (process.env.ENABLE_DEMO_DATA === '1') {
    seedCourseData();
  }
  backfillPdfAiMetadata();
};

const seedCourseData = () => {
  const count = db.prepare('select count(*) as count from courses').get() as { count: number };
  if (count.count > 0) return;

  const courseId = 'course_analyse_2';
  db.prepare(`
    insert into courses (id, title, description, university, faculty, level, subject, status)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    courseId,
    'Analyse 2',
    'Cours et sujets corriges pour reviser Analyse 2.',
    'Universite de Douala',
    'Faculte des Sciences',
    'L2 Informatique',
    'Mathematiques',
    'published',
  );

  db.prepare(`
    insert into pdf_documents (
      id, course_id, title, description, university, faculty, subject, teacher, level,
      academic_year, price_coins, page_count, file_name, file_path, file_size, status,
      sales_count, downloads_count, commission_rate
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pdf_analyse_2_seed',
    courseId,
    'Analyse 2 - sujets corriges',
    'Compilation de sujets corriges avec rappels de methode.',
    'Universite de Douala',
    'Faculte des Sciences',
    'Mathematiques',
    'Pr. Moukoko',
    'L2 Informatique',
    '2025-2026',
    350,
    42,
    'analyse-2-sujets-corriges.pdf',
    '/uploads/pdfs/analyse-2-sujets-corriges.pdf',
    '4.8 MB',
    'published',
    32,
    31,
    20,
  );
};

const backfillPdfAiMetadata = () => {
  const rows = db
    .prepare(
      "select id, title, description, subject, level, page_count, price_coins from pdf_documents where ai_summary = '' or quality_score = 0",
    )
    .all() as Array<{
    id: string;
    title: string;
    description: string;
    subject: string;
    level: string;
    page_count: number;
    price_coins: number;
  }>;

  for (const row of rows) {
    const tags = [row.subject, row.level, row.page_count > 40 ? 'long format' : 'revision'].filter(Boolean);
    db.prepare(`
      update pdf_documents
      set ai_summary = ?, ai_tags = ?, ai_difficulty = ?, suggested_price_coins = ?, quality_score = ?
          , ai_study_plan = ?, ai_quiz = ?, extracted_text = ?
      where id = ?
    `).run(
      `${row.title}. ${row.description}`,
      JSON.stringify(tags),
      row.page_count > 50 ? 'avance' : 'standard',
      row.price_coins,
      78,
      JSON.stringify([
        `Lire le resume de ${row.subject}`,
        `Faire une fiche pour ${row.level}`,
        'Tester avec un quiz rapide',
      ]),
      JSON.stringify([
        { question: `Quel est le theme principal de ${row.title} ?`, answer: row.subject },
        { question: 'Comment utiliser ce PDF efficacement ?', answer: 'Lire, pratiquer, corriger les erreurs.' },
      ]),
      `${row.title}. ${row.description}`,
      row.id,
    );
  }
};

const mapCourse = (row: Record<string, unknown>): Course => ({
  id: String(row.id),
  title: String(row.title),
  description: String(row.description),
  university: String(row.university),
  faculty: String(row.faculty),
  level: String(row.level),
  subject: String(row.subject),
  status: row.status as CourseStatus,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const mapPdf = (row: Record<string, unknown>): PdfDocument => ({
  id: String(row.id),
  courseId: String(row.course_id),
  title: String(row.title),
  description: String(row.description),
  university: String(row.university),
  faculty: String(row.faculty),
  subject: String(row.subject),
  teacher: String(row.teacher),
  level: String(row.level),
  academicYear: String(row.academic_year),
  priceCoins: Number(row.price_coins),
  pageCount: Number(row.page_count),
  fileName: String(row.file_name),
  filePath: String(row.file_path),
  fileSize: String(row.file_size),
  status: row.status as PdfStatus,
  salesCount: Number(row.sales_count),
  downloadsCount: Number(row.downloads_count),
  commissionRate: Number(row.commission_rate),
  aiSummary: String(row.ai_summary ?? ''),
  aiTags: parseJson<string[]>(row.ai_tags, []),
  aiDifficulty: String(row.ai_difficulty ?? 'standard'),
  suggestedPriceCoins: Number(row.suggested_price_coins ?? 0),
  qualityScore: Number(row.quality_score ?? 0),
  aiStudyPlan: parseJson<string[]>(row.ai_study_plan, []),
  aiQuiz: parseJson<Array<{ question: string; answer: string }>>(row.ai_quiz, []),
  extractedText: String(row.extracted_text ?? ''),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const mapPack = (row: Record<string, unknown>, documentIds: string[] = []): PdfPack => ({
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
  aiSummary: String(row.ai_summary ?? ''),
  aiConfidence: Number(row.ai_confidence ?? 0),
  documentIds,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const listCourses = () =>
  (db.prepare('select * from courses order by created_at desc').all() as Record<string, unknown>[]).map(mapCourse);

export const listPdfs = () =>
  (db.prepare('select * from pdf_documents order by created_at desc').all() as Record<string, unknown>[]).map(mapPdf);

export const listPacks = () => {
  const rows = db.prepare('select * from pdf_packs order by created_at desc').all() as Record<string, unknown>[];
  return rows.map((row) => {
    const items = db
      .prepare('select pdf_id from pdf_pack_items where pack_id = ? order by sort_order asc, created_at asc')
      .all(String(row.id)) as Array<{ pdf_id: string }>;
    return mapPack(row, items.map((item) => item.pdf_id));
  });
};

export const listPublishedPacks = () => listPacks().filter((pack) => pack.status === 'published');

export const listPublishedPdfs = () =>
  (
    db.prepare("select * from pdf_documents where status = 'published' order by created_at desc").all() as Record<
      string,
      unknown
    >[]
  ).map(mapPdf);

export const getPdfById = (pdfId: string) => {
  const row = db.prepare('select * from pdf_documents where id = ?').get(pdfId) as Record<string, unknown> | undefined;
  return row ? mapPdf(row) : null;
};

export const ensureCourse = (input: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  const existing = db
    .prepare(
      'select * from courses where title = ? and university = ? and faculty = ? and level = ? and subject = ? limit 1',
    )
    .get(input.title, input.university, input.faculty, input.level, input.subject) as Record<string, unknown> | undefined;

  if (existing) return mapCourse(existing);

  const courseId = id('course');
  db.prepare(`
    insert into courses (id, title, description, university, faculty, level, subject, status, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
  `).run(courseId, input.title, input.description, input.university, input.faculty, input.level, input.subject, now(), now());

  return mapCourse(
    db.prepare('select * from courses where id = ?').get(courseId) as Record<string, unknown>,
  );
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

export const createPdf = (input: CreatePdfInput, adminUserId: string) => {
  const course = ensureCourse({
    title: input.subject,
    description: `Documents de ${input.subject} pour ${input.level}.`,
    university: input.university,
    faculty: input.faculty,
    level: input.level,
    subject: input.subject,
  });

  const pdfId = id('pdf');
  db.prepare(`
    insert into pdf_documents (
      id, course_id, title, description, university, faculty, subject, teacher, level, academic_year,
      price_coins, page_count, file_name, file_path, file_size, status, commission_rate,
      ai_summary, ai_tags, ai_difficulty, suggested_price_coins, quality_score,
      ai_study_plan, ai_quiz, extracted_text, created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pdfId,
    course.id,
    input.title,
    input.description,
    input.university,
    input.faculty,
    input.subject,
    input.teacher,
    input.level,
    input.academicYear,
    input.priceCoins,
    input.pageCount,
    input.fileName,
    input.filePath,
    input.fileSize,
    input.status,
    input.commissionRate,
    input.aiSummary ?? '',
    JSON.stringify(input.aiTags ?? []),
    input.aiDifficulty ?? 'standard',
    input.suggestedPriceCoins ?? input.priceCoins,
    input.qualityScore ?? 0,
    JSON.stringify(input.aiStudyPlan ?? []),
    JSON.stringify(input.aiQuiz ?? []),
    input.extractedText ?? '',
    now(),
    now(),
  );

  audit(adminUserId, 'pdf.create', 'pdf_document', pdfId, { title: input.title });
  return getPdfById(pdfId);
};

export const createPack = (input: CreatePackInput, adminUserId: string) => {
  if (!input.documentIds.length) throw new Error('Un pack doit contenir au moins un PDF');

  const packId = id('pack');
  db.exec('begin immediate transaction');
  try {
    db.prepare(`
      insert into pdf_packs (
        id, title, description, university, faculty, level, semester, pack_type,
        price_coins, original_price_coins, discount_percent, status,
        ai_summary, ai_confidence, created_at, updated_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      packId,
      input.title,
      input.description,
      input.university,
      input.faculty,
      input.level,
      input.semester,
      input.packType,
      input.priceCoins,
      input.originalPriceCoins,
      input.discountPercent,
      input.status,
      input.aiSummary ?? '',
      input.aiConfidence ?? 0,
      now(),
      now(),
    );

    input.documentIds.forEach((pdfId, index) => {
      db.prepare(`
        insert or ignore into pdf_pack_items (id, pack_id, pdf_id, sort_order, created_at)
        values (?, ?, ?, ?, ?)
      `).run(id('pack_item'), packId, pdfId, index, now());
    });

    audit(adminUserId, 'pack.create', 'pdf_pack', packId, { title: input.title, documentIds: input.documentIds });
    db.exec('commit');
  } catch (error) {
    db.exec('rollback');
    throw error;
  }

  return listPacks().find((pack) => pack.id === packId) ?? null;
};

export const updatePackStatus = (packId: string, status: PdfStatus, adminUserId: string) => {
  db.prepare('update pdf_packs set status = ?, updated_at = ? where id = ?').run(status, now(), packId);
  audit(adminUserId, `pack.${status}`, 'pdf_pack', packId, { status });
  return listPacks().find((pack) => pack.id === packId) ?? null;
};

export const deletePack = (packId: string, adminUserId: string) => {
  db.prepare('delete from pdf_packs where id = ?').run(packId);
  audit(adminUserId, 'pack.delete', 'pdf_pack', packId, {});
};

export const updatePdfStatus = (pdfId: string, status: PdfStatus, adminUserId: string) => {
  db.prepare('update pdf_documents set status = ?, updated_at = ? where id = ?').run(status, now(), pdfId);
  audit(adminUserId, `pdf.${status}`, 'pdf_document', pdfId, { status });
  return getPdfById(pdfId);
};

export const updatePdfAiMetadata = (
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
  db.prepare(`
    update pdf_documents
    set ai_summary = ?, ai_tags = ?, ai_difficulty = ?, suggested_price_coins = ?, quality_score = ?,
        ai_study_plan = ?, ai_quiz = ?, extracted_text = ?, updated_at = ?
    where id = ?
  `).run(
    input.aiSummary,
    JSON.stringify(input.aiTags),
    input.aiDifficulty,
    input.suggestedPriceCoins,
    input.qualityScore,
    JSON.stringify(input.aiStudyPlan ?? []),
    JSON.stringify(input.aiQuiz ?? []),
    input.extractedText ?? '',
    now(),
    pdfId,
  );
  audit(adminUserId, 'pdf.ai_metadata', 'pdf_document', pdfId, input);
  return getPdfById(pdfId);
};

export const deletePdf = (pdfId: string, adminUserId: string) => {
  db.prepare('delete from pdf_documents where id = ?').run(pdfId);
  audit(adminUserId, 'pdf.delete', 'pdf_document', pdfId, {});
};

export const hasPurchasedPdf = (pdfId: string, userId: string) =>
  Boolean(db.prepare('select 1 from pdf_purchases where pdf_id = ? and user_id = ?').get(pdfId, userId));

export const purchasePdf = (pdfId: string, userId: string) => {
  const pdf = getPdfById(pdfId);
  if (!pdf || pdf.status !== 'published') throw new Error('PDF indisponible');
  if (hasPurchasedPdf(pdfId, userId)) throw new Error('PDF deja achete');

  db.exec('begin immediate transaction');
  try {
    const wallet = db.prepare('select * from wallets where user_id = ?').get(userId) as
      | { balance_coins: number }
      | undefined;
    const balance = wallet?.balance_coins ?? 0;
    if (balance < pdf.priceCoins) throw new Error('Solde insuffisant');

    const purchaseId = id('purchase');
    db.prepare('update wallets set balance_coins = balance_coins - ?, updated_at = ? where user_id = ?').run(
      pdf.priceCoins,
      now(),
      userId,
    );
    db.prepare('insert into pdf_purchases (id, pdf_id, user_id, amount_coins, created_at) values (?, ?, ?, ?, ?)').run(
      purchaseId,
      pdfId,
      userId,
      pdf.priceCoins,
      now(),
    );
    db.prepare(
      'insert into wallet_transactions (id, user_id, type, amount_coins, reference_id, status, created_at) values (?, ?, ?, ?, ?, ?, ?)',
    ).run(id('tx'), userId, 'pdf_purchase', -pdf.priceCoins, pdfId, 'success', now());
    db.prepare('update pdf_documents set sales_count = sales_count + 1, updated_at = ? where id = ?').run(now(), pdfId);
    db.exec('commit');
    return purchaseId;
  } catch (error) {
    db.exec('rollback');
    throw error;
  }
};

export const audit = (adminUserId: string, action: string, entityType: string, entityId: string, metadata: unknown) => {
  db.prepare(`
    insert into admin_audit_logs (id, admin_user_id, action, entity_type, entity_id, metadata, created_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(id('audit'), adminUserId, action, entityType, entityId, JSON.stringify(metadata), now());
};

export const metrics = () => {
  const pdfs = listPdfs();
  const packs = listPacks();
  return {
    totalPdfs: pdfs.length,
    totalPacks: packs.length,
    publishedPdfs: pdfs.filter((pdf) => pdf.status === 'published').length,
    publishedPacks: packs.filter((pack) => pack.status === 'published').length,
    reviewPdfs: pdfs.filter((pdf) => pdf.status === 'needs_review' || pdf.qualityScore < 70).length,
    reviewPacks: packs.filter((pack) => pack.status === 'needs_review' || pack.documentIds.length === 0).length,
    aiReadyPdfs: pdfs.filter((pdf) => pdf.aiSummary && pdf.aiTags.length > 0).length,
    totalSales: pdfs.reduce((sum, pdf) => sum + pdf.salesCount, 0),
    packSales: packs.reduce((sum, pack) => sum + pack.salesCount, 0),
    totalRevenue:
      pdfs.reduce((sum, pdf) => sum + Math.round(pdf.salesCount * pdf.priceCoins * (pdf.commissionRate / 100)), 0) +
      packs.reduce((sum, pack) => sum + pack.revenueCoins, 0),
  };
};

initCourseDb();
