import { databasePool } from './database';

export type Report = {
  id: string;
  user_id: string;
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

export type ReportSection = {
  id: string;
  report_id: string;
  title: string;
  content_html: string;
  content_json?: any;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

// Default structures based on template types
const TEMPLATE_SECTIONS: Record<string, string[]> = {
  stage: [
    'Page de garde',
    'Remerciements',
    'Sommaire',
    'Introduction',
    'Présentation de l\'entreprise',
    'Missions et Travaux réalisés',
    'Bilan et Conclusion',
    'Annexes',
  ],
  memoire: [
    'Page de garde',
    'Dédicaces',
    'Remerciements',
    'Sommaire',
    'Introduction générale',
    'Revue de la littérature',
    'Méthodologie',
    'Résultats et Analyses',
    'Discussion',
    'Conclusion générale',
    'Bibliographie',
  ],
  blank: [
    'Page de garde',
    'Sommaire',
    'Introduction',
    'Chapitre 1',
    'Conclusion',
  ],
};

export async function listUserReports(userId: string): Promise<Report[]> {
  const res = await databasePool.query(
    'select * from public.app_reports where user_id = $1 order by updated_at desc',
    [userId]
  );
  return res.rows.map((row) => ({
    ...row,
    line_spacing: Number(row.line_spacing),
  }));
}

export async function getReportById(reportId: string, userId: string): Promise<Report | null> {
  const res = await databasePool.query(
    'select * from public.app_reports where id = $1 and user_id = $2 limit 1',
    [reportId, userId]
  );
  if (res.rows.length === 0) return null;
  return {
    ...res.rows[0],
    line_spacing: Number(res.rows[0].line_spacing),
  };
}

export async function getReportSections(reportId: string): Promise<ReportSection[]> {
  const res = await databasePool.query(
    'select * from public.app_report_sections where report_id = $1 order by sort_order asc',
    [reportId]
  );
  return res.rows;
}

export async function createReport(
  userId: string,
  title: string,
  description: string,
  templateType: string
): Promise<Report> {
  const client = await databasePool.connect();
  try {
    await client.query('begin');

    // 1. Insert report
    const reportRes = await client.query(
      `insert into public.app_reports (user_id, title, description, template_type)
       values ($1, $2, $3, $4)
       returning *`,
      [userId, title, description || null, templateType]
    );

    const report = reportRes.rows[0];

    // 2. Generate sections based on template
    const sectionNames = TEMPLATE_SECTIONS[templateType] || TEMPLATE_SECTIONS.blank;
    for (let i = 0; i < sectionNames.length; i++) {
      const isSystem = i === 0 || sectionNames[i] === 'Sommaire'; // Page de garde and Sommaire are handled by template system
      await client.query(
        `insert into public.app_report_sections (report_id, title, sort_order, is_system)
         values ($1, $2, $3, $4)`,
        [report.id, sectionNames[i], i, isSystem]
      );
    }

    await client.query('commit');
    return {
      ...report,
      line_spacing: Number(report.line_spacing),
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateReportSettings(
  reportId: string,
  userId: string,
  settings: {
    title?: string;
    description?: string;
    font_family?: string;
    line_spacing?: number;
    margins?: string;
    cover_template?: string;
    cover_data?: Record<string, any>;
  }
): Promise<Report> {
  const fields: string[] = [];
  const params: any[] = [reportId, userId];
  let paramCount = 3;

  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    const r = await getReportById(reportId, userId);
    if (!r) throw new Error('Report introuvable.');
    return r;
  }

  const res = await databasePool.query(
    `update public.app_reports
     set ${fields.join(', ')}, updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    params
  );

  if (res.rows.length === 0) {
    throw new Error('Report introuvable ou droits insuffisants.');
  }

  return {
    ...res.rows[0],
    line_spacing: Number(res.rows[0].line_spacing),
  };
}

export async function deleteReport(reportId: string, userId: string): Promise<boolean> {
  const res = await databasePool.query(
    'delete from public.app_reports where id = $1 and user_id = $2 returning id',
    [reportId, userId]
  );
  return res.rows.length > 0;
}

export async function updateReportSection(
  reportId: string,
  sectionId: string,
  data: {
    title?: string;
    content_html?: string;
    content_json?: any;
    sort_order?: number;
  }
): Promise<ReportSection> {
  const fields: string[] = [];
  const params: any[] = [sectionId, reportId];
  let paramCount = 3;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    const res = await databasePool.query(
      'select * from public.app_report_sections where id = $1 and report_id = $2 limit 1',
      [sectionId, reportId]
    );
    if (res.rows.length === 0) throw new Error('Section introuvable.');
    return res.rows[0];
  }

  const res = await databasePool.query(
    `update public.app_report_sections
     set ${fields.join(', ')}, updated_at = now()
     where id = $1 and report_id = $2
     returning *`,
    params
  );

  if (res.rows.length === 0) {
    throw new Error('Section introuvable.');
  }

  // Also touch the parent report update timestamp
  await databasePool.query(
    'update public.app_reports set updated_at = now() where id = $1',
    [reportId]
  );

  return res.rows[0];
}

export async function addReportSection(
  reportId: string,
  title: string,
  sortOrder: number
): Promise<ReportSection> {
  const res = await databasePool.query(
    `insert into public.app_report_sections (report_id, title, sort_order)
     values ($1, $2, $3)
     returning *`,
    [reportId, title, sortOrder]
  );

  await databasePool.query(
    'update public.app_reports set updated_at = now() where id = $1',
    [reportId]
  );

  return res.rows[0];
}

export async function deleteReportSection(reportId: string, sectionId: string): Promise<boolean> {
  const sectionRes = await databasePool.query(
    'select is_system from public.app_report_sections where id = $1 and report_id = $2 limit 1',
    [sectionId, reportId]
  );

  if (sectionRes.rows.length === 0) return false;
  if (sectionRes.rows[0].is_system) {
    throw new Error('Les sections système (Page de garde, Sommaire) ne peuvent pas être supprimées.');
  }

  const res = await databasePool.query(
    'delete from public.app_report_sections where id = $1 and report_id = $2 returning id',
    [sectionId, reportId]
  );

  await databasePool.query(
    'update public.app_reports set updated_at = now() where id = $1',
    [reportId]
  );

  return res.rows.length > 0;
}

export async function reorderReportSections(
  reportId: string,
  orders: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    for (const item of orders) {
      await client.query(
        'update public.app_report_sections set sort_order = $1 where id = $2 and report_id = $3',
        [item.sort_order, item.id, reportId]
      );
    }
    await client.query('update public.app_reports set updated_at = now() where id = $1', [reportId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
