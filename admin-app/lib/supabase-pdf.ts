import { Pool } from 'pg';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { pdfUploadDir } from './paths';

import type { PdfDocument, PdfPack } from './course-db';

let pool: Pool | null = null;

export interface PdfAnalyticsSummary {
  configured: boolean;
  totals: {
    sessions: number;
    searches: number;
    previews: number;
    purchaseStarts: number;
    purchases: number;
    purchaseFailures: number;
    readers: number;
    assistantQuestions: number;
    revenue: number;
  };
  /** Counts of catalog entities (live snapshot, not event-derived). */
  catalog: {
    totalUsers: number;
    studentUsers: number;
    newUsersThisWeek: number;
    totalPdfs: number;
    publishedPdfs: number;
    newPdfsThisWeek: number;
    totalPacks: number;
    publishedPacks: number;
    newPacksThisWeek: number;
  };
  dailyStats: {
    date: string;
    purchases: number;
    previews: number;
  }[];
  categoryStats: {
    subject: string;
    purchases: number;
  }[];
  topDocuments: {
    id: string;
    title: string;
    subject: string;
    previews: number;
    purchases: number;
    readers: number;
    conversionRate: number;
  }[];
  recentEvents: {
    id: string;
    eventType: string;
    documentTitle: string;
    documentId: string;
    sessionId: string;
    userId: string;
    userEmail?: string;
    createdAt: string;
  }[];
}

export const getPool = () => {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
  return pool;
};

export const isSupabaseDbConfigured = () => Boolean(process.env.DATABASE_URL);
export const isSupabaseStorageConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const getSupabaseUrl = () => process.env.SUPABASE_URL?.replace(/\/$/, '') ?? '';
export const emptyAnalytics = (configured: boolean): PdfAnalyticsSummary => ({
  configured,
  totals: {
    sessions: 0,
    searches: 0,
    previews: 0,
    purchaseStarts: 0,
    purchases: 0,
    purchaseFailures: 0,
    readers: 0,
    assistantQuestions: 0,
    revenue: 0,
  },
  catalog: {
    totalUsers: 0,
    studentUsers: 0,
    newUsersThisWeek: 0,
    totalPdfs: 0,
    publishedPdfs: 0,
    newPdfsThisWeek: 0,
    totalPacks: 0,
    publishedPacks: 0,
    newPacksThisWeek: 0,
  },
  topDocuments: [],
  dailyStats: [],
  categoryStats: [],
  recentEvents: [],
});

export const uploadSupabasePdfBytes = async (filePath: string, bytes: Buffer, bucket: string = 'documents') => {
  if (!isSupabaseStorageConfigured()) return;

  const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${bucket}/${filePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: new Uint8Array(bytes),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase Storage upload failed with ${response.status}`);
  }
};

export const upsertSupabasePdf = async (document: PdfDocument | null) => {
  const db = getPool();
  if (!db || !document) return;

  await db.query(
    `
      insert into public.documents (
        id, title, description, university, faculty, subject, teacher, level, academic_year,
        price_coins, page_count, file_path, preview_path, file_size, status, commission_rate, rating,
        sales_count, downloads_count, ai_summary, ai_tags, ai_difficulty, suggested_price_coins,
        quality_score, ai_study_plan, ai_quiz, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $26, $13, $14, $15, $16,
        $17, $18, $19, $20::jsonb, $21, $22,
        $23, $24::jsonb, $25::jsonb, now()
      )
      on conflict (id) do update
      set title = excluded.title,
          description = excluded.description,
          university = excluded.university,
          faculty = excluded.faculty,
          subject = excluded.subject,
          teacher = excluded.teacher,
          level = excluded.level,
          academic_year = excluded.academic_year,
          price_coins = excluded.price_coins,
          page_count = excluded.page_count,
          file_path = excluded.file_path,
          preview_path = excluded.preview_path,
          file_size = excluded.file_size,
          status = excluded.status,
          commission_rate = excluded.commission_rate,
          sales_count = excluded.sales_count,
          downloads_count = excluded.downloads_count,
          ai_summary = excluded.ai_summary,
          ai_tags = excluded.ai_tags,
          ai_difficulty = excluded.ai_difficulty,
          suggested_price_coins = excluded.suggested_price_coins,
          quality_score = excluded.quality_score,
          ai_study_plan = excluded.ai_study_plan,
          ai_quiz = excluded.ai_quiz,
          updated_at = now()
    `,
    [
      document.id,
      document.title,
      document.description,
      document.university,
      document.faculty,
      document.subject,
      document.teacher,
      document.level,
      document.academicYear,
      document.priceCoins,
      document.pageCount,
      document.filePath.replace(/^\/uploads\/pdfs\//, 'admin/'),
      document.fileSize,
      document.status,
      document.commissionRate,
      4.7,
      document.salesCount,
      document.downloadsCount,
      document.aiSummary,
      JSON.stringify(document.aiTags),
      document.aiDifficulty,
      document.suggestedPriceCoins,
      document.qualityScore,
      JSON.stringify(document.aiStudyPlan),
      JSON.stringify(document.aiQuiz),
      document.previewPath,
    ],
  );
};

export const upsertSupabasePack = async (pack: PdfPack | null) => {
  const db = getPool();
  if (!db || !pack) return;

  await db.query('begin');
  try {
    await db.query(
      `
        insert into public.pdf_packs (
          id, title, description, university, faculty, level, semester, pack_type,
          price_coins, original_price_coins, discount_percent, status,
          sales_count, revenue_coins, ai_summary, ai_confidence, updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, now()
        )
        on conflict (id) do update
        set title = excluded.title,
            description = excluded.description,
            university = excluded.university,
            faculty = excluded.faculty,
            level = excluded.level,
            semester = excluded.semester,
            pack_type = excluded.pack_type,
            price_coins = excluded.price_coins,
            original_price_coins = excluded.original_price_coins,
            discount_percent = excluded.discount_percent,
            status = excluded.status,
            sales_count = excluded.sales_count,
            revenue_coins = excluded.revenue_coins,
            ai_summary = excluded.ai_summary,
            ai_confidence = excluded.ai_confidence,
            updated_at = now()
      `,
      [
        pack.id,
        pack.title,
        pack.description,
        pack.university,
        pack.faculty,
        pack.level,
        pack.semester,
        pack.packType,
        pack.priceCoins,
        pack.originalPriceCoins,
        pack.discountPercent,
        pack.status,
        pack.salesCount,
        pack.revenueCoins,
        pack.aiSummary,
        pack.aiConfidence,
      ],
    );

    await db.query('delete from public.pdf_pack_items where pack_id = $1', [pack.id]);
    for (const [index, documentId] of pack.documentIds.entries()) {
      await db.query(
        `
          insert into public.pdf_pack_items (pack_id, document_id, sort_order)
          values ($1, $2, $3)
          on conflict (pack_id, document_id) do update set sort_order = excluded.sort_order
        `,
        [pack.id, documentId, index],
      );
    }

    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
};

export const deleteSupabaseFile = async (bucket: string, storagePath: string) => {
  if (!isSupabaseStorageConfigured()) return;
  const url = `${getSupabaseUrl()}/storage/v1/object/${bucket}/${storagePath}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      },
    });
    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      console.error(`Failed to delete file from Supabase bucket ${bucket}: ${body}`);
    }
  } catch (err) {
    console.error(`Error deleting file from Supabase bucket ${bucket}:`, err);
  }
};

export const deleteSupabasePdf = async (documentId: string) => {
  const db = getPool();
  if (!db) return;

  // 1. Retrieve the file_path and preview_path
  const { rows } = await db.query(
    'select file_path, preview_path from public.documents where id = $1',
    [documentId]
  );
  const doc = rows[0];

  if (doc) {
    // 2. Call DELETE request via the Supabase Storage API for both files
    if (doc.file_path) {
      await deleteSupabaseFile('documents', doc.file_path);
    }
    if (doc.preview_path) {
      await deleteSupabaseFile('document-previews', doc.preview_path);
    }

    // 3. Unlink/delete the local file if it exists
    if (doc.file_path) {
      const filename = doc.file_path.split('/').pop();
      if (filename) {
        const localPath = path.join(pdfUploadDir, filename);
        try {
          await unlink(localPath);
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error(`Error deleting local file ${localPath}:`, err);
          }
        }
      }
    }
  }

  // 4. Delete the document database record
  await db.query('delete from public.documents where id = $1', [documentId]);
};

export const getSupabasePdfAnalytics = async (): Promise<PdfAnalyticsSummary> => {
  const db = getPool();
  if (!db) return emptyAnalytics(false);

  try {
    const [totalsResult, topDocumentsResult, recentEventsResult, dailyStatsResult, categoryStatsResult, catalogResult] = await Promise.all([
      db.query(`
        select
          count(distinct e.session_id)::int as sessions,
          count(*) filter (where e.event_type = 'search')::int as searches,
          count(*) filter (where e.event_type = 'preview_open')::int as previews,
          count(*) filter (where e.event_type = 'purchase_start')::int as purchase_starts,
          count(*) filter (where e.event_type = 'purchase_success')::int as purchases,
          count(*) filter (where e.event_type = 'purchase_failed')::int as purchase_failures,
          count(*) filter (where e.event_type = 'reader_open')::int as readers,
          count(*) filter (where e.event_type = 'assistant_question')::int as assistant_questions,
          (select coalesce(sum(amount_coins), 0)::int from public.document_purchases where created_at >= now() - interval '30 days') as revenue
        from public.document_events e
        where e.created_at >= now() - interval '30 days'
      `),
      db.query(`
        select
          coalesce(d.id, e.document_id) as id,
          coalesce(d.title, e.document_id, 'Document') as title,
          coalesce(d.subject, 'Matiere') as subject,
          count(*) filter (where e.event_type = 'preview_open')::int as previews,
          count(*) filter (where e.event_type = 'purchase_success')::int as purchases,
          count(*) filter (where e.event_type = 'reader_open')::int as readers
        from public.document_events e
        left join public.documents d on d.id = e.document_id
        where e.document_id is not null
          and e.created_at >= now() - interval '30 days'
        group by coalesce(d.id, e.document_id), coalesce(d.title, e.document_id, 'Document'), coalesce(d.subject, 'Matiere')
        order by purchases desc, previews desc, readers desc
        limit 8
      `),
      db.query(`
        select
          e.id,
          e.event_type,
          e.document_id,
          e.session_id,
          e.user_id,
          e.created_at,
          coalesce(d.title, e.document_id, 'Catalogue') as document_title,
          p.email as user_email
        from public.document_events e
        left join public.documents d on d.id = e.document_id
        left join public.profiles p on p.id = e.user_id
        order by e.created_at desc
        limit 20
      `),
      db.query(`
        select
          to_char(created_at, 'DD Mon') as date,
          count(*) filter (where event_type = 'purchase_success')::int as purchases,
          count(*) filter (where event_type = 'preview_open')::int as previews
        from public.document_events
        where created_at >= now() - interval '14 days'
        group by to_char(created_at, 'DD Mon'), date_trunc('day', created_at)
        order by date_trunc('day', created_at) asc
      `),
      db.query(`
        select
          coalesce(d.subject, 'Autre') as subject,
          count(*) filter (where e.event_type = 'purchase_success')::int as purchases
        from public.document_events e
        left join public.documents d on d.id = e.document_id
        where e.created_at >= now() - interval '30 days'
        group by coalesce(d.subject, 'Autre')
        having count(*) filter (where e.event_type = 'purchase_success') > 0
        order by purchases desc
      `),
      // Catalog snapshot — direct counts from the canonical tables, not
      // event-derived (so a doc with no recent activity still shows up).
      db.query(`
        select
          (select count(*) from public."user")::int as total_users,
          (select count(*) from public."user" where role = 'student')::int as student_users,
          (select count(*) from public."user" where "createdAt" >= now() - interval '7 days')::int as new_users_week,
          (select count(*) from public.documents)::int as total_pdfs,
          (select count(*) from public.documents where status = 'published')::int as published_pdfs,
          (select count(*) from public.documents where "createdAt" >= now() - interval '7 days')::int as new_pdfs_week,
          (select count(*) from public.packs)::int as total_packs,
          (select count(*) from public.packs where status = 'published')::int as published_packs,
          (select count(*) from public.packs where "createdAt" >= now() - interval '7 days')::int as new_packs_week
      `)
    ]);

    const totalsRow = totalsResult.rows[0] ?? {};
    const totals = {
      sessions: Number(totalsRow.sessions ?? 0),
      searches: Number(totalsRow.searches ?? 0),
      previews: Number(totalsRow.previews ?? 0),
      purchaseStarts: Number(totalsRow.purchase_starts ?? 0),
      purchases: Number(totalsRow.purchases ?? 0),
      purchaseFailures: Number(totalsRow.purchase_failures ?? 0),
      readers: Number(totalsRow.readers ?? 0),
      assistantQuestions: Number(totalsRow.assistant_questions ?? 0),
      revenue: Number(totalsRow.revenue ?? 0),
    };

    return {
      configured: true,
      totals,
      catalog: (() => {
        const r = catalogResult.rows[0] ?? {};
        return {
          totalUsers: Number(r.total_users ?? 0),
          studentUsers: Number(r.student_users ?? 0),
          newUsersThisWeek: Number(r.new_users_week ?? 0),
          totalPdfs: Number(r.total_pdfs ?? 0),
          publishedPdfs: Number(r.published_pdfs ?? 0),
          newPdfsThisWeek: Number(r.new_pdfs_week ?? 0),
          totalPacks: Number(r.total_packs ?? 0),
          publishedPacks: Number(r.published_packs ?? 0),
          newPacksThisWeek: Number(r.new_packs_week ?? 0),
        };
      })(),
      dailyStats: dailyStatsResult.rows.map((row) => ({
        date: String(row.date),
        purchases: Number(row.purchases ?? 0),
        previews: Number(row.previews ?? 0),
      })),
      categoryStats: categoryStatsResult.rows.map((row) => ({
        subject: String(row.subject),
        purchases: Number(row.purchases ?? 0),
      })),
      topDocuments: topDocumentsResult.rows.map((row) => {
        const previews = Number(row.previews ?? 0);
        const purchases = Number(row.purchases ?? 0);
        return {
          id: String(row.id ?? ''),
          title: String(row.title ?? 'Document'),
          subject: String(row.subject ?? 'Matiere'),
          previews,
          purchases,
          readers: Number(row.readers ?? 0),
          conversionRate: previews > 0 ? Math.round((purchases / previews) * 100) : 0,
        };
      }),
      recentEvents: recentEventsResult.rows.map((row) => ({
        id: String(row.id),
        eventType: String(row.event_type),
        documentTitle: String(row.document_title),
        documentId: String(row.document_id ?? ''),
        sessionId: String(row.session_id ?? ''),
        userId: String(row.user_id ?? ''),
        userEmail: row.user_email ? String(row.user_email) : undefined,
        createdAt: new Date(row.created_at).toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    };
  } catch {
    return emptyAnalytics(true);
  }
};
