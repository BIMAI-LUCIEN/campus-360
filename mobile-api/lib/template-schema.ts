import { z } from 'zod';

import { resolveStyle } from './document-style';
import { documentStylePatchSchema } from './document-style-schema';

// Validation of a report template sent by the admin (Module 24). The style goes
// through the same strict schema as a student's style change, then is resolved
// into a complete style.

export const templateOutlineSchema = z
  .array(z.object({ title: z.string().trim().min(1).max(160), system: z.boolean().optional() }).strict())
  .max(40);

export const templateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    establishment: z.string().trim().max(120).default(''),
    degree: z.string().trim().max(120).default(''),
    kind: z.enum(['stage', 'memoire', 'both']),
    documentStyle: documentStylePatchSchema.transform((style) => resolveStyle(style)),
    outline: templateOutlineSchema,
  })
  .strict();

export type TemplateInput = z.infer<typeof templateInputSchema>;

// A change to an existing template: every key optional.
export const templatePatchSchema = templateInputSchema.partial().strict();
export type TemplatePatch = z.infer<typeof templatePatchSchema>;
