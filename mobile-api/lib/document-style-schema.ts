import { z } from 'zod';

import { STYLE_FONTS, STYLE_PRESETS } from './document-style';

// Strict validation of a style change sent by the app: unknown keys, fonts outside
// the list or malformed colours are rejected (400) instead of being stored.

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const slot = z.enum(['none', 'title', 'chapter', 'author', 'school', 'page']);
const fileId = z.string().uuid().nullable();

export const documentStylePatchSchema = z
  .object({
    preset: z.enum(STYLE_PRESETS).optional(),
    typography: z
      .object({
        headingFont: z.enum(STYLE_FONTS),
        bodyFont: z.enum(STYLE_FONTS),
        bodySize: z.number().min(10).max(14),
        lineSpacing: z.number().min(1).max(2.5),
      })
      .partial()
      .strict()
      .optional(),
    headings: z
      .object({
        numbering: z.enum(['none', 'decimal', 'roman-alpha']),
        uppercaseChapters: z.boolean(),
        color: hex,
        rule: z.boolean(),
      })
      .partial()
      .strict()
      .optional(),
    page: z
      .object({
        margins: z.enum(['narrow', 'normal', 'wide']),
        border: z.enum(['none', 'single', 'double', 'cover-only']),
        accentColor: hex,
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
      })
      .partial()
      .strict()
      .optional(),
    cover: z
      .object({
        template: z.enum(['classic', 'modern', 'minimal', 'institutional']),
        schoolLogoFileId: fileId,
        companyLogoFileId: fileId,
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
  })
  .strict();

export type DocumentStylePatchInput = z.infer<typeof documentStylePatchSchema>;
