import { legacyColumnsFromStyle, type DocumentStyle } from './document-style';
import { mergeOutline, styleFromTemplate, type OutlineEntry } from './template-apply';

// Applies a published template to an existing document, in one transaction:
// adds the missing sections (empty), reorders, and replaces the style. Section
// contents are never updated and nothing is deleted.

type Queryable = { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };

export class ApplyTemplateError extends Error {
  status: number;
  constructor(message: string, status = 404) {
    super(message);
    this.name = 'ApplyTemplateError';
    this.status = status;
  }
}

export const applyTemplateToDocument = async (
  client: Queryable,
  input: { documentId: string; userId: string; template: { id: string; outline: OutlineEntry[]; style: DocumentStyle } },
) => {
  await client.query('begin');
  try {
    const doc = await client.query('select id, document_style from public.app_documents where id = $1 and user_id = $2 for update', [input.documentId, input.userId]);
    if (!doc.rows[0]) throw new ApplyTemplateError('Document introuvable.');
    const sections = await client.query('select id, title, sort_order from public.app_document_sections where document_id = $1 order by sort_order asc', [input.documentId]);
    const existing = sections.rows.map((s: { title: string; sort_order: number }) => ({ title: s.title, position: Number(s.sort_order) }));
    const { order, added } = mergeOutline(existing, input.template.outline);

    for (let position = 0; position < order.length; position += 1) {
      const item = order[position];
      if (item.kind === 'new') {
        await client.query(
          'insert into public.app_document_sections (document_id, title, sort_order, is_system) values ($1, $2, $3, $4)',
          [input.documentId, item.title.slice(0, 160), position, item.system],
        );
      } else {
        const section = sections.rows[item.index];
        if (Number(section.sort_order) !== position) {
          await client.query('update public.app_document_sections set sort_order = $1 where id = $2 and document_id = $3', [position, section.id, input.documentId]);
        }
      }
    }

    const style = styleFromTemplate(input.template.style, doc.rows[0].document_style);
    const legacy = legacyColumnsFromStyle(style);
    const updated = await client.query(
      `update public.app_documents
          set document_style = $3::jsonb, font_family = $4, line_spacing = $5, margins = $6, cover_template = $7, template_id = $8, updated_at = now()
        where id = $1 and user_id = $2
        returning *`,
      [input.documentId, input.userId, JSON.stringify(style), legacy.font_family, legacy.line_spacing, legacy.margins, legacy.cover_template, input.template.id],
    );
    await client.query('commit');
    return { document: updated.rows[0], addedSections: added.length };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
};
