import { databasePool } from './database';
import { outlineFor, type StudyField } from './document-outlines';

export type Document = {
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
  // Theme colors — applied live to H1 (primary) and H2 (secondary) in the
  // editor preview and cover page. Optional because some legacy rows may
  // predate the migration; the UI falls back to its own defaults.
  primary_color?: string | null;
  secondary_color?: string | null;
  // Module 20: raw stored style (resolve with `resolveStyle` before use).
  document_style?: unknown;
  field?: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentSection = {
  id: string;
  document_id: string;
  title: string;
  content_html: string;
  content_json?: any;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentImage = {
  id: string;
  document_id: string;
  user_id: string;
  file_name: string;
  // Legacy rows hold a raw URL; new rows hold `file:<fileId>` and set file_id.
  image_url: string;
  file_id?: string | null;
  ai_description: string;
  suggested_caption: string;
  suggested_section_id?: string | null;
  is_placed: boolean;
  created_at: string;
};

export const MEMOIRE_RESEARCH_SECTIONS = [
  'Page de garde',
  'Résumé et Mots-clés',
  'Dédicaces et Remerciements',
  'Sommaire',
  'Liste des Figures et Tableaux',
  'Liste des Abréviations',
  'Introduction Générale',
  'Chapitre 1 : Problématique, Questions et Objectifs de Recherche',
  'Chapitre 2 : Revue de Littérature et Cadre Théorique',
  'Chapitre 3 : Méthodologie de Recherche',
  'Chapitre 4 : Présentation et Analyse des Résultats',
  'Chapitre 5 : Discussion des Résultats',
  'Conclusion Générale et Recommandations',
  'Bibliographie',
  'Annexes',
];

export const MEMOIRE_PROFESSIONAL_SECTIONS = [
  'Page de garde',
  'Résumé et Mots-clés',
  'Dédicaces et Remerciements',
  'Sommaire',
  'Liste des Figures et Tableaux',
  'Liste des Abréviations',
  'Introduction Générale',
  'Chapitre 1 : Contexte et Analyse du Besoin',
  'Chapitre 2 : Cahier des Charges et État de l’Art',
  'Chapitre 3 : Méthodologie et Conception de la Solution',
  'Chapitre 4 : Réalisation et Mise en Œuvre',
  'Chapitre 5 : Tests, Évaluation et Résultats',
  'Chapitre 6 : Discussion Critique et Recommandations',
  'Conclusion Générale',
  'Bibliographie',
  'Annexes',
];

// Default structures based on template types
const TEMPLATE_SECTIONS: Record<string, string[]> = {
  stage: [
    'Page de garde',
    'Fiche d\'identification du stage',
    'Dédicaces et Remerciements',
    'Sommaire',
    'Liste des Figures et Tableaux',
    'Liste des Abréviations',
    'Chapitre 1 : Contexte et Présentation de l\'Entreprise',
    'Chapitre 2 : Analyse des Besoins et Étude Préalable',
    'Chapitre 3 : Conception Architecturale et Réalisations Techniques',
    'Chapitre 4 : Bilan Critique, Compétences Acquises et Recommandations',
    'Conclusion Générale et Perspectives',
    'Bibliographie et Webographie',
    'Annexes',
  ],
  memoire: MEMOIRE_RESEARCH_SECTIONS,
  cv: [
    'CV généré',
  ],
  lettre_motivation: [
    'Lettre de motivation',
  ],
  blank: [
    'Page de garde',
    'Sommaire',
    'Introduction',
    'Chapitre 1',
    'Conclusion',
  ],
};

export async function resolveDbUserId(userId: string): Promise<string> {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
  if (isUuid) return userId;
  try {
    const existing = await databasePool.query('select id from public.app_users order by created_at desc limit 1');
    if (existing.rows[0]?.id) return String(existing.rows[0].id);
    
    const created = await databasePool.query(
      `insert into public.app_users (email, name, role) values ('student@campus360.app', 'Étudiant Campus 360', 'student') on conflict do nothing returning id`
    );
    if (created.rows[0]?.id) return String(created.rows[0].id);
  } catch (err) {
    console.warn('[resolveDbUserId] Warning:', err);
  }
  return '00000000-0000-0000-0000-000000000001';
}

export async function listUserDocuments(userId: string): Promise<Document[]> {
  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
    const targetId = isUuid ? userId : await resolveDbUserId(userId);
    const res = await databasePool.query(
      'select * from public.app_documents where user_id = $1 order by updated_at desc',
      [targetId]
    );
    return res.rows.map((row) => ({
      ...row,
      line_spacing: Number(row.line_spacing),
    }));
  } catch (err) {
    console.warn('[documents-db] Database query failed in listUserDocuments, returning empty array:', err);
    return [];
  }
}

export async function getDocumentById(documentId: string, userId: string): Promise<Document | null> {
  try {
    // Ownership is always enforced: a document is only ever returned to its owner.
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!isUuid.test(userId) || !isUuid.test(documentId)) return null;
    const res = await databasePool.query(
      'select * from public.app_documents where id = $1 and user_id = $2 limit 1',
      [documentId, userId]
    );
    if (res.rows.length === 0) return null;
    return {
      ...res.rows[0],
      line_spacing: Number(res.rows[0].line_spacing),
    };
  } catch (err) {
    console.warn('[documents-db] Database query failed in getDocumentById, returning null:', err);
    return null;
  }
}

export async function getDocumentSections(documentId: string): Promise<DocumentSection[]> {
  try {
    const res = await databasePool.query(
      'select * from public.app_document_sections where document_id = $1 order by sort_order asc',
      [documentId]
    );
    return res.rows;
  } catch (err) {
    console.warn('[documents-db] Database query failed in getDocumentSections, returning empty array:', err);
    return [];
  }
}

export async function createDocument(
  userId: string,
  title: string,
  description: string,
  templateType: string,
  field: StudyField | null = null
): Promise<Document> {
  const targetUserId = await resolveDbUserId(userId);
  const client = await databasePool.connect();
  try {
    await client.query('begin');

    // 1. Insert document
    const documentRes = await client.query(
      `insert into public.app_documents (user_id, title, description, template_type, field)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [targetUserId, title, description || null, templateType, field]
    );

    const document = documentRes.rows[0];

    // 2. Generate sections based on template
    // Reports and theses follow the outline of the student's field.
    const sectionNames = (templateType === 'stage' || templateType === 'memoire') && field
      ? outlineFor(templateType, field)
      : TEMPLATE_SECTIONS[templateType] || TEMPLATE_SECTIONS.blank;
    for (let i = 0; i < sectionNames.length; i++) {
      const isSystem = i === 0 || sectionNames[i] === 'Sommaire';
      await client.query(
        `insert into public.app_document_sections (document_id, title, sort_order, is_system)
         values ($1, $2, $3, $4)`,
        [document.id, sectionNames[i], i, isSystem]
      );
    }

    await client.query('commit');
    return {
      ...document,
      line_spacing: Number(document.line_spacing),
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDocumentSettings(
  documentId: string,
  userId: string,
  settings: {
    title?: string;
    description?: string;
    font_family?: string;
    line_spacing?: number;
    margins?: string;
    cover_template?: string;
    cover_data?: Record<string, any>;
    primary_color?: string | null;
    secondary_color?: string | null;
    document_style?: object;
  }
): Promise<Document> {
  const fields: string[] = [];
  const params: any[] = [documentId, userId];
  let paramCount = 3;

  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    const d = await getDocumentById(documentId, userId);
    if (!d) throw new Error('Document introuvable.');
    return d;
  }

  const res = await databasePool.query(
    `update public.app_documents
     set ${fields.join(', ')}, updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    params
  );

  if (res.rows.length === 0) {
    throw new Error('Document introuvable ou droits insuffisants.');
  }

  return {
    ...res.rows[0],
    line_spacing: Number(res.rows[0].line_spacing),
  };
}

export async function deleteDocument(documentId: string, userId: string): Promise<boolean> {
  const res = await databasePool.query(
    'delete from public.app_documents where id = $1 and user_id = $2 returning id',
    [documentId, userId]
  );
  return res.rows.length > 0;
}

export async function updateDocumentSection(
  documentId: string,
  sectionId: string,
  data: {
    title?: string;
    content_html?: string;
    content_json?: any;
    sort_order?: number;
  }
): Promise<DocumentSection> {
  const fields: string[] = [];
  const params: any[] = [sectionId, documentId];
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
      'select * from public.app_document_sections where id = $1 and document_id = $2 limit 1',
      [sectionId, documentId]
    );
    if (res.rows.length === 0) throw new Error('Section introuvable.');
    return res.rows[0];
  }

  const res = await databasePool.query(
    `update public.app_document_sections
     set ${fields.join(', ')}, updated_at = now()
     where id = $1 and document_id = $2
     returning *`,
    params
  );

  if (res.rows.length === 0) {
    throw new Error('Section introuvable.');
  }

  // Also touch the parent document update timestamp
  await databasePool.query(
    'update public.app_documents set updated_at = now() where id = $1',
    [documentId]
  );

  return res.rows[0];
}

export async function addDocumentSection(
  documentId: string,
  title: string,
  sortOrder: number
): Promise<DocumentSection> {
  const res = await databasePool.query(
    `insert into public.app_document_sections (document_id, title, sort_order)
     values ($1, $2, $3)
     returning *`,
    [documentId, title, sortOrder]
  );

  await databasePool.query(
    'update public.app_documents set updated_at = now() where id = $1',
    [documentId]
  );

  return res.rows[0];
}

export async function deleteDocumentSection(documentId: string, sectionId: string): Promise<boolean> {
  const sectionRes = await databasePool.query(
    'select is_system from public.app_document_sections where id = $1 and document_id = $2 limit 1',
    [sectionId, documentId]
  );

  if (sectionRes.rows.length === 0) return false;
  if (sectionRes.rows[0].is_system) {
    throw new Error('Les sections système (Page de garde, Sommaire) ne peuvent pas être supprimées.');
  }

  const res = await databasePool.query(
    'delete from public.app_document_sections where id = $1 and document_id = $2 returning id',
    [sectionId, documentId]
  );

  await databasePool.query(
    'update public.app_documents set updated_at = now() where id = $1',
    [documentId]
  );

  return res.rows.length > 0;
}

export async function reorderDocumentSections(
  documentId: string,
  orders: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    for (const item of orders) {
      await client.query(
        'update public.app_document_sections set sort_order = $1 where id = $2 and document_id = $3',
        [item.sort_order, item.id, documentId]
      );
    }
    await client.query('update public.app_documents set updated_at = now() where id = $1', [documentId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

// ── Sources & Reference Documents (PDF, Photos, Notes) ─────────────────────


// ── Images & AI Figure Management ──────────────────────────────────────────

export async function getDocumentImages(documentId: string, userId: string): Promise<DocumentImage[]> {  const res = await databasePool.query(
    `SELECT * FROM public.app_document_images
     WHERE document_id = $1 AND user_id = $2
     ORDER BY created_at DESC`,
    [documentId, userId]
  );
  return res.rows;
}

export async function addDocumentImage(data: {
  documentId: string;
  userId: string;
  fileName: string;
  fileId: string;
  aiDescription?: string;
  suggestedCaption?: string;
  suggestedSectionId?: string | null;
}): Promise<DocumentImage> {  const res = await databasePool.query(
    `INSERT INTO public.app_document_images (
       document_id, user_id, file_name, image_url, ai_description, suggested_caption, suggested_section_id, file_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.documentId,
      data.userId,
      data.fileName,
      `file:${data.fileId}`,
      data.aiDescription || '',
      data.suggestedCaption || '',
      data.suggestedSectionId || null,
      data.fileId,
    ]
  );
  return res.rows[0];
}

export async function updateDocumentImage(
  imageId: string,
  documentId: string,
  userId: string,
  patch: { isPlaced?: boolean; suggestedCaption?: string }
): Promise<DocumentImage | null> {  const fields: string[] = [];
  const params: any[] = [imageId, documentId, userId];
  let pIdx = 4;

  if (patch.isPlaced !== undefined) {
    fields.push(`is_placed = $${pIdx}`);
    params.push(patch.isPlaced);
    pIdx++;
  }
  if (patch.suggestedCaption !== undefined) {
    fields.push(`suggested_caption = $${pIdx}`);
    params.push(patch.suggestedCaption);
    pIdx++;
  }

  if (fields.length === 0) return null;

  const res = await databasePool.query(
    `UPDATE public.app_document_images
     SET ${fields.join(', ')}
     WHERE id = $1 AND document_id = $2 AND user_id = $3
     RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

export async function deleteDocumentImage(imageId: string, documentId: string, userId: string): Promise<boolean> {  const res = await databasePool.query(
    `DELETE FROM public.app_document_images
     WHERE id = $1 AND document_id = $2 AND user_id = $3
     RETURNING id`,
    [imageId, documentId, userId]
  );
  return res.rows.length > 0;
}


// Interview answers of one section ("Rédiger avec moi"). Callers check that the
// document belongs to the user first; the section must belong to that document.
export async function getSectionForInterview(
  documentId: string,
  sectionId: string,
): Promise<{ id: string; title: string; interview_answers: unknown } | null> {
  const result = await databasePool.query(
    `select id, title, interview_answers from public.app_document_sections
      where id = $1 and document_id = $2 limit 1`,
    [sectionId, documentId],
  );
  return result.rows[0] ?? null;
}

export async function saveSectionInterview(documentId: string, sectionId: string, interview: object): Promise<boolean> {
  const result = await databasePool.query(
    `update public.app_document_sections set interview_answers = $3::jsonb, updated_at = now()
      where id = $1 and document_id = $2`,
    [sectionId, documentId, JSON.stringify(interview)],
  );
  return (result.rowCount ?? 0) > 0;
}
