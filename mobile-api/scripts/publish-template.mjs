/**
 * Publishes a report template described in a JSON file (Module 24), e.g.
 *   node scripts/publish-template.mjs templates/iut-douala-rapport-de-stage.json [--dry-run]
 *
 * The file is validated with the same schema as the admin API. A template with
 * the same name is updated (not duplicated), then published with a thumbnail of
 * its cover drawn with fictitious data and empty logo slots. Never prints secrets.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { loadTsWithPackages } from '../tests/helpers/load-ts.mjs';
import { resolveDatabaseUrl } from './migrate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, '..'));

const file = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!file) {
  console.log('Usage: node scripts/publish-template.mjs <modele.json> [--dry-run]');
  process.exit(1);
}

const { templateInputSchema } = await loadTsWithPackages('lib/template-schema.ts', ['lib/document-style.ts', 'lib/document-style-schema.ts']);
const { templatePreviewHtml } = await loadTsWithPackages('lib/template-preview.ts', ['lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts']);
const { renderHtmlToJpeg } = await loadTsWithPackages('lib/pdf-render.ts');

const input = templateInputSchema.parse(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')));
const style = { ...input.documentStyle, cover: { ...input.documentStyle.cover, schoolLogoFileId: null, companyLogoFileId: null, departmentLogoFileId: null } };
console.log(`[modèle] « ${input.name} » valide : ${style.cover.blocks?.length ?? 0} blocs de garde, ${input.outline.length} sections.`);

const html = templatePreviewHtml(style, input.outline, {}).replace('<style>', '<style>body { zoom: 0.4535; } ');
const preview = await renderHtmlToJpeg(html, 360, 510);
console.log(`[modèle] vignette : ${preview.length} octets.`);
if (dryRun) {
  console.log('[modèle] simulation : rien n’est écrit.');
  process.exit(0);
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) throw new Error('DATABASE_URL absente.');
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' } });
await client.connect();
try {
  await client.query('begin');
  const existing = await client.query("select id from public.app_document_templates where name = $1 and status <> 'archived' order by created_at limit 1", [input.name]);
  let id = existing.rows[0]?.id;
  if (id) {
    await client.query(
      `update public.app_document_templates set establishment = $2, degree = $3, kind = $4, document_style = $5::jsonb, outline = $6::jsonb, updated_at = now() where id = $1`,
      [id, input.establishment, input.degree, input.kind, JSON.stringify(style), JSON.stringify(input.outline)],
    );
  } else {
    const created = await client.query(
      `insert into public.app_document_templates (name, establishment, degree, kind, document_style, outline, source_format)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'manual') returning id`,
      [input.name, input.establishment, input.degree, input.kind, JSON.stringify(style), JSON.stringify(input.outline)],
    );
    id = created.rows[0].id;
  }
  const crypto = await import('node:crypto');
  const asset = await client.query(
    `insert into public.app_template_assets (template_id, role, mime, bytes, data, sha256) values ($1, 'preview', 'image/jpeg', $2, $3, $4) returning id`,
    [id, preview.length, preview, crypto.createHash('sha256').update(preview).digest('hex')],
  );
  await client.query(
    `update public.app_document_templates set status = 'published', published_at = now(), preview_asset_id = $2, updated_at = now() where id = $1`,
    [id, asset.rows[0].id],
  );
  await client.query('commit');
  console.log(`[modèle] ${existing.rows[0] ? 'mis à jour' : 'créé'} et publié : ${id}`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
