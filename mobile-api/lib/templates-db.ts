import { createHash } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import { databasePool } from './database';
import { resolveStyle, type DocumentStyle } from './document-style';
import { detectFileType } from './file-validation';
import { canTransition, publishProblems, type TemplateKind, type TemplateStatus } from './template-rules';
import type { TemplateInput, TemplatePatch } from './template-schema';

// Report templates (Module 24): table app_document_templates (migration 0013).
// Every function takes an optional pool so tests can pass their own.

type Db = Pool | PoolClient;

export class TemplateError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = 'TemplateError';
    this.status = status;
  }
}

export type TemplateOutlineEntry = { title: string; system?: boolean };
export type TemplateLogoAssets = { school?: string; company?: string; department?: string };

export type DocumentTemplate = {
  id: string;
  name: string;
  establishment: string;
  degree: string;
  kind: TemplateKind;
  document_style: DocumentStyle;
  outline: TemplateOutlineEntry[];
  logo_assets: TemplateLogoAssets;
  preview_asset_id: string | null;
  status: TemplateStatus;
  source_format: 'docx' | 'pdf' | 'manual' | null;
  source_report: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type TemplateAsset = { id: string; template_id: string; role: 'logo' | 'preview'; mime: string; bytes: number; data: Buffer; sha256: string };

export const MAX_TEMPLATE_ASSET_BYTES = 2 * 1024 * 1024;

const COLUMNS = `id, name, establishment, degree, kind, document_style, outline, logo_assets, preview_asset_id, status,
  source_format, source_report, created_by, created_at, updated_at, published_at`;

// A stored style is always resolved, so a template can never break rendering.
// In a template, logos go through logo_assets: the style's file ids stay empty.
const cleanStyle = (style: unknown): DocumentStyle => {
  const resolved = resolveStyle(style);
  resolved.cover.schoolLogoFileId = null;
  resolved.cover.companyLogoFileId = null;
  resolved.cover.departmentLogoFileId = null;
  return resolved;
};

const mapRow = (row: Record<string, any>): DocumentTemplate => ({
  ...(row as DocumentTemplate),
  document_style: cleanStyle(row.document_style),
  outline: Array.isArray(row.outline) ? row.outline : [],
  logo_assets: row.logo_assets && typeof row.logo_assets === 'object' ? row.logo_assets : {},
});

export const listTemplates = async (filter: { status?: TemplateStatus; establishment?: string } = {}, db: Db = databasePool) => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filter.status) {
    values.push(filter.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filter.establishment) {
    values.push(filter.establishment);
    conditions.push(`establishment = $${values.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await db.query(`select ${COLUMNS} from public.app_document_templates ${where} order by updated_at desc limit 200`, values);
  return rows.map(mapRow);
};

export const getTemplate = async (id: string, db: Db = databasePool): Promise<DocumentTemplate | null> => {
  const { rows } = await db.query(`select ${COLUMNS} from public.app_document_templates where id = $1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
};

export const createTemplate = async (
  input: TemplateInput,
  adminAppUserId: string | null,
  source: { format: 'docx' | 'pdf' | 'manual'; report?: unknown } | null = null,
  db: Db = databasePool,
): Promise<DocumentTemplate> => {
  const { rows } = await db.query(
    `insert into public.app_document_templates (name, establishment, degree, kind, document_style, outline, created_by, source_format, source_report)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9::jsonb)
     returning ${COLUMNS}`,
    [
      input.name,
      input.establishment,
      input.degree,
      input.kind,
      JSON.stringify(cleanStyle(input.documentStyle)),
      JSON.stringify(input.outline),
      adminAppUserId,
      source?.format ?? null,
      source?.report === undefined ? null : JSON.stringify(source.report),
    ],
  );
  return mapRow(rows[0]);
};

export const updateTemplate = async (id: string, patch: TemplatePatch, db: Db = databasePool): Promise<DocumentTemplate> => {
  const current = await getTemplate(id, db);
  if (!current) throw new TemplateError('Modèle introuvable.', 404);
  if (current.status === 'archived') throw new TemplateError('Un modèle archivé ne se modifie plus.', 409);
  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown, cast = '') => {
    values.push(value);
    sets.push(`${column} = $${values.length}${cast}`);
  };
  if (patch.name !== undefined) set('name', patch.name);
  if (patch.establishment !== undefined) set('establishment', patch.establishment);
  if (patch.degree !== undefined) set('degree', patch.degree);
  if (patch.kind !== undefined) set('kind', patch.kind);
  if (patch.documentStyle !== undefined) set('document_style', JSON.stringify(cleanStyle(patch.documentStyle)), '::jsonb');
  if (patch.outline !== undefined) set('outline', JSON.stringify(patch.outline), '::jsonb');
  if (!sets.length) return current;
  values.push(id);
  const { rows } = await db.query(
    `update public.app_document_templates set ${sets.join(', ')}, updated_at = now() where id = $${values.length} returning ${COLUMNS}`,
    values,
  );
  return mapRow(rows[0]);
};

export const setTemplateStatus = async (id: string, next: TemplateStatus, db: Db = databasePool): Promise<DocumentTemplate> => {
  const current = await getTemplate(id, db);
  if (!current) throw new TemplateError('Modèle introuvable.', 404);
  if (current.status === next) return current;
  if (!canTransition(current.status, next)) throw new TemplateError(`Passage de « ${current.status} » à « ${next} » impossible.`, 409);
  if (next === 'published') {
    const problems = publishProblems(current);
    if (problems.length) throw new TemplateError(problems.join(' '), 422);
  }
  const { rows } = await db.query(
    `update public.app_document_templates
        set status = $1, updated_at = now(), published_at = case when $1 = 'published' then now() else published_at end
      where id = $2 returning ${COLUMNS}`,
    [next, id],
  );
  return mapRow(rows[0]);
};

// Stores a logo or preview image. The real type is read from the bytes.
export const addTemplateAsset = async (
  templateId: string,
  role: 'logo' | 'preview',
  data: Buffer,
  db: Db = databasePool,
): Promise<{ id: string; mime: string; bytes: number }> => {
  if (data.length === 0) throw new TemplateError('Fichier vide.');
  if (data.length > MAX_TEMPLATE_ASSET_BYTES) throw new TemplateError('Image trop lourde (2 Mo maximum).', 413);
  const detected = detectFileType(data);
  if (!detected || detected.kind !== 'image') throw new TemplateError('Seules les images PNG, JPEG ou WebP sont acceptées.', 415);
  const sha256 = createHash('sha256').update(data).digest('hex');
  const { rows } = await db.query(
    `insert into public.app_template_assets (template_id, role, mime, bytes, data, sha256)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [templateId, role, detected.mime, data.length, data, sha256],
  );
  return { id: rows[0].id, mime: detected.mime, bytes: data.length };
};

export const getTemplateAsset = async (id: string, db: Db = databasePool): Promise<TemplateAsset | null> => {
  const { rows } = await db.query(
    'select id, template_id, role, mime, bytes, data, sha256 from public.app_template_assets where id = $1',
    [id],
  );
  return rows[0] ?? null;
};

// What a student's gallery needs: no source report, no author.
export const listPublishedTemplates = async (filter: { establishment?: string } = {}, db: Db = databasePool) => {
  const values: unknown[] = [];
  let where = `status = 'published'`;
  if (filter.establishment) {
    values.push(filter.establishment);
    where += ` and establishment = $1`;
  }
  const { rows } = await db.query(
    `select id, name, establishment, degree, kind, preview_asset_id, published_at
       from public.app_document_templates where ${where} order by establishment, name limit 200`,
    values,
  );
  return rows as Pick<DocumentTemplate, 'id' | 'name' | 'establishment' | 'degree' | 'kind' | 'preview_asset_id' | 'published_at'>[];
};

export const setTemplateLogo = async (id: string, slot: 'school' | 'company' | 'department', assetId: string | null, db: Db = databasePool) => {
  const { rows } = await db.query(
    `update public.app_document_templates
        set logo_assets = case when $2::text is null then logo_assets - $3 else jsonb_set(logo_assets, array[$3], to_jsonb($2::text)) end,
            updated_at = now()
      where id = $1 and status <> 'archived' returning ${COLUMNS}`,
    [id, assetId, slot],
  );
  if (!rows[0]) throw new TemplateError('Modèle introuvable ou archivé.', 404);
  return mapRow(rows[0]);
};

export const setTemplatePreview = async (id: string, assetId: string, db: Db = databasePool) => {
  await db.query('update public.app_document_templates set preview_asset_id = $2 where id = $1', [id, assetId]);
};

// Data URIs of several assets at once (previews of a list, logos of a template).
export const assetDataUris = async (ids: (string | null | undefined)[], db: Db = databasePool): Promise<Map<string, string>> => {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!wanted.length) return new Map();
  const { rows } = await db.query('select id, mime, data from public.app_template_assets where id = any($1::uuid[])', [wanted]);
  return new Map(rows.map((r: { id: string; mime: string; data: Buffer }) => [r.id, `data:${r.mime};base64,${Buffer.from(r.data).toString('base64')}`]));
};

// A published template, as a student may see it (no admin data, no logos).
export const getPublishedTemplate = async (id: string, db: Db = databasePool) => {
  const template = await getTemplate(id, db);
  if (!template || template.status !== 'published') return null;
  return {
    id: template.id,
    name: template.name,
    establishment: template.establishment,
    degree: template.degree,
    kind: template.kind,
    outline: template.outline,
    document_style: template.document_style,
    preview_asset_id: template.preview_asset_id,
  };
};
