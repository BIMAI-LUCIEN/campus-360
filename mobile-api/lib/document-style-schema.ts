import { z } from 'zod';

import { COVER_MAX_BLOCKS, STYLE_FONTS, STYLE_PRESETS } from './document-style';

// Strict validation of a style change sent by the app: unknown keys, fonts outside
// the list or malformed colours are rejected (400) instead of being stored.

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const slot = z.enum(['none', 'title', 'chapter', 'author', 'school', 'page']);
const fileId = z.string().uuid().nullable();

// Cover blocks: same bounds as resolveStyle (document-style.ts).
const logoSlot = z.enum(['school', 'company', 'department']).nullable();
const blockBase = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  style: z
    .object({
      align: z.enum(['left', 'center', 'right']),
      size: z.number().min(8).max(28),
      bold: z.boolean(),
      italic: z.boolean(),
      uppercase: z.boolean(),
      underline: z.boolean(),
      color: hex.nullable(),
    })
    .strict(),
});
const label = z.string().max(60);
const lines = z.array(z.string().max(120)).max(12);

export const coverBlockSchema = z.discriminatedUnion('type', [
  blockBase.extend({ type: z.literal('bilingual-header'), left: lines, right: lines, center: logoSlot }).strict(),
  blockBase
    .extend({
      type: z.literal('logos'),
      left: logoSlot,
      center: logoSlot,
      right: logoSlot,
      height: z.number().min(20).max(120),
      centerText: z.string().max(300),
      rule: z.boolean(),
    })
    .strict(),
  blockBase.extend({ type: z.literal('title-banner'), prefix: label, variant: z.enum(['band', 'frame', 'plain']), fill: hex.nullable().optional() }).strict(),
  blockBase.extend({ type: z.literal('heading'), text: z.string().max(160) }).strict(),
  blockBase.extend({ type: z.literal('text'), template: z.string().max(300) }).strict(),
  blockBase.extend({ type: z.literal('author'), label, matriculeLabel: label }).strict(),
  blockBase
    .extend({
      type: z.literal('supervisors'),
      layout: z.enum(['columns', 'author-left']),
      label,
      academicLabel: label,
      corporateLabel: label,
      authorLabel: label,
      matriculeLabel: label,
      specialtyLabel: label,
    })
    .strict(),
  blockBase.extend({ type: z.literal('year-banner'), template: z.string().max(160), variant: z.enum(['band', 'rule', 'plain']), fill: hex.nullable().optional() }).strict(),
  blockBase.extend({ type: z.literal('spacer'), height: z.number().min(2).max(60), grow: z.boolean() }).strict(),
  blockBase.extend({ type: z.literal('extra-lines') }).strict(),
]);

export const documentStylePatchSchema = z
  .object({
    preset: z.enum(STYLE_PRESETS).optional(),
    typography: z
      .object({
        headingFont: z.enum(STYLE_FONTS),
        bodyFont: z.enum(STYLE_FONTS),
        bodySize: z.number().min(10).max(14),
        lineSpacing: z.number().min(1).max(2.5),
        paragraphIndent: z.boolean(),
        paragraphSpacing: z.enum(['compact', 'airy']),
      })
      .partial()
      .strict()
      .optional(),
    headings: z
      .object({
        numbering: z.enum(['none', 'decimal', 'roman-alpha', 'chapter-section-roman']),
        uppercaseChapters: z.boolean(),
        color: hex,
        rule: z.boolean(),
        titleAlign: z.enum(['left', 'center']),
        uppercaseSections: z.boolean(),
        titleSize: z.enum(['large', 'normal']),
      })
      .partial()
      .strict()
      .optional(),
    page: z
      .object({
        margins: z.enum(['narrow', 'normal', 'wide']),
        border: z.enum(['none', 'single', 'double', 'cover-only']),
        accentColor: hex,
        bandColor: hex,
      })
      .partial()
      .strict()
      .optional(),
    headerFooter: z
      .object({
        headerLeft: slot,
        headerRight: slot,
        footerLeft: slot,
        footerCenter: slot,
        footerRight: slot,
        numberFormat: z.enum(['n', 'page-n', 'n-of-total']),
        logoInHeader: z.boolean(),
        headerRule: z.boolean(),
        headerStyle: z.enum(['plain', 'band']),
        headerTextColor: hex,
        authorLabel: z.string().max(60),
        footerRule: z.boolean(),
        pageNumberFrame: z.enum(['none', 'box']),
      })
      .partial()
      .strict()
      .optional(),
    cover: z
      .object({
        template: z.enum(['classic', 'modern', 'minimal', 'institutional']),
        schoolLogoFileId: fileId,
        companyLogoFileId: fileId,
        departmentLogoFileId: fileId,
        blocks: z.array(coverBlockSchema).max(COVER_MAX_BLOCKS).nullable(),
        extraLines: z
          .array(z.object({ label: z.string().max(60), value: z.string().max(160) }).strict())
          .max(6),
      })
      .partial()
      .strict()
      .optional(),
    tables: z
      .object({
        style: z.enum(['grid', 'striped', 'minimal']),
        headerColor: hex,
      })
      .partial()
      .strict()
      .optional(),
    captions: z
      .object({
        scope: z.enum(['chapter', 'document']),
        style: z.enum(['italic-center', 'bold-left']),
        boldLabel: z.boolean(),
      })
      .partial()
      .strict()
      .optional(),
    lists: z
      .object({
        bullet: z.enum(['disc', 'diamond']),
      })
      .partial()
      .strict()
      .optional(),
    dedication: z
      .object({
        frame: z.boolean(),
      })
      .partial()
      .strict()
      .optional(),
  })
  .strict();

export type DocumentStylePatchInput = z.infer<typeof documentStylePatchSchema>;
