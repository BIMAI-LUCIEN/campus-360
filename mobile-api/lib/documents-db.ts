import { databasePool } from './database';

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
  memoire: [
    'Page de garde',
    'Fiche de Synthèse',
    'Dédicaces et Remerciements',
    'Sommaire',
    'Liste des Figures et Tableaux',
    'Liste des Abréviations',
    'Introduction Générale',
    'Chapitre 1 : Cadre Théorique et État de l\'Art',
    'Chapitre 2 : Méthodologie et Analyse des Données',
    'Chapitre 3 : Implémentation et Résultats Expérimentaux',
    'Chapitre 4 : Discussion et Analyse Critique',
    'Conclusion Générale et Perspectives de Recherche',
    'Bibliographie',
    'Annexes',
  ],
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
}

export async function getDocumentById(documentId: string, userId: string): Promise<Document | null> {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
  let res;
  if (!isUuid || userId === 'guest-student') {
    res = await databasePool.query(
      'select * from public.app_documents where id = $1 limit 1',
      [documentId]
    );
  } else {
    res = await databasePool.query(
      'select * from public.app_documents where id = $1 and user_id = $2 limit 1',
      [documentId, userId]
    );
  }
  if (res.rows.length === 0) return null;
  return {
    ...res.rows[0],
    line_spacing: Number(res.rows[0].line_spacing),
  };
}

export async function getDocumentSections(documentId: string): Promise<DocumentSection[]> {
  const res = await databasePool.query(
    'select * from public.app_document_sections where document_id = $1 order by sort_order asc',
    [documentId]
  );
  return res.rows;
}

export async function createDocument(
  userId: string,
  title: string,
  description: string,
  templateType: string
): Promise<Document> {
  const targetUserId = await resolveDbUserId(userId);
  const client = await databasePool.connect();
  try {
    await client.query('begin');

    // 1. Insert document
    const documentRes = await client.query(
      `insert into public.app_documents (user_id, title, description, template_type)
       values ($1, $2, $3, $4)
       returning *`,
      [targetUserId, title, description || null, templateType]
    );

    const document = documentRes.rows[0];

    // 2. Generate sections based on template
    const sectionNames = TEMPLATE_SECTIONS[templateType] || TEMPLATE_SECTIONS.blank;
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
