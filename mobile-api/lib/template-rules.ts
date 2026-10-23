// Rules of report templates (Module 24) that need no database: allowed status
// changes and what a template needs before it can be published. No imports, so
// the tests load it directly.

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type TemplateKind = 'stage' | 'memoire' | 'both';

const TRANSITIONS: Record<TemplateStatus, readonly TemplateStatus[]> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: [],
};

export const canTransition = (current: TemplateStatus, next: TemplateStatus): boolean =>
  (TRANSITIONS[current] ?? []).includes(next);

// Reasons a template cannot be published yet (empty = it can).
export const publishProblems = (template: { name: string; outline: unknown[]; document_style: unknown }): string[] => {
  const problems: string[] = [];
  if (!template.name || !template.name.trim()) problems.push('Le modèle n’a pas de nom.');
  if (!template.document_style || typeof template.document_style !== 'object') problems.push('Le style du modèle est absent.');
  if (!Array.isArray(template.outline) || template.outline.length === 0) problems.push('Le plan du modèle doit contenir au moins une section.');
  return problems;
};
