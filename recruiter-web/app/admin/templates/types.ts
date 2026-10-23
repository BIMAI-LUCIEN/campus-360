// Shapes of the report templates sent by mobile-api (Module 24). The style is
// validated and completed by mobile-api; the admin screens edit it as plain data.

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type TemplateKind = 'stage' | 'memoire' | 'both';
export type LogoSlot = 'school' | 'company' | 'department';

export type CoverTextStyle = {
  align: 'left' | 'center' | 'right';
  size: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  underline: boolean;
  color: string | null;
};

// One cover block; type-specific fields are optional here (the server checks them).
export type CoverBlock = {
  id: string;
  type: 'bilingual-header' | 'logos' | 'title-banner' | 'heading' | 'text' | 'author' | 'supervisors' | 'year-banner' | 'spacer' | 'extra-lines';
  style: CoverTextStyle;
  [field: string]: unknown;
};

export type TemplateStyle = {
  preset: string;
  typography: { headingFont: string; bodyFont: string; bodySize: number; lineSpacing: number; paragraphIndent: boolean; paragraphSpacing: 'compact' | 'airy' };
  headings: { numbering: string; uppercaseChapters: boolean; color: string; rule: boolean; titleAlign: 'left' | 'center'; uppercaseSections: boolean; titleSize: 'large' | 'normal' };
  page: { margins: string; border: string; accentColor: string; bandColor: string };
  headerFooter: {
    headerLeft: string; headerRight: string; footerLeft: string; footerCenter: string; footerRight: string;
    numberFormat: string; logoInHeader: boolean; headerRule: boolean; headerStyle: 'plain' | 'band';
    headerTextColor: string; authorLabel: string; footerRule: boolean; pageNumberFrame: 'none' | 'box';
  };
  cover: { template: string; blocks: CoverBlock[] | null; extraLines: { label: string; value: string }[]; [k: string]: unknown };
  tables: { style: string; headerColor: string };
  captions: { scope: 'chapter' | 'document'; style: 'italic-center' | 'bold-left'; boldLabel: boolean };
  lists: { bullet: 'disc' | 'diamond' };
  dedication: { frame: boolean };
};

export type ImportReport = { sure: string[]; guessed: string[]; missing: string[]; confidence?: Record<string, number> };

export type Template = {
  id: string;
  name: string;
  establishment: string;
  degree: string;
  kind: TemplateKind;
  status: TemplateStatus;
  document_style: TemplateStyle;
  outline: { title: string; system?: boolean }[];
  logos: Partial<Record<LogoSlot, string | null>>;
  previewDataUri: string | null;
  source_format: 'docx' | 'pdf' | 'manual' | null;
  source_report: ImportReport | null;
  updated_at: string;
};

export type TemplateSummary = Omit<Template, 'document_style' | 'source_report' | 'logos'>;

export const STATUS_LABELS: Record<TemplateStatus, string> = { draft: 'Brouillon', published: 'Publié', archived: 'Archivé' };
export const KIND_LABELS: Record<TemplateKind, string> = { stage: 'Rapport de stage', memoire: 'Mémoire', both: 'Rapport et mémoire' };

// Same lists as mobile-api/lib/document-style.ts.
export const FONTS = ['Times New Roman', 'Georgia', 'Arial', 'Calibri', 'Garamond', 'Cambria'];
export const COLORS = ['#000000', '#111827', '#1F2937', '#1E3A8A', '#0F3D56', '#065F46', '#7C2D12', '#7C3AED', '#B91C1C', '#FFFFFF'];
export const TABLE_COLORS = ['#FFFFFF', '#F2F2F2', '#E0EAF1', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#EDE9FE', '#1E3A8A', '#0F3D56'];

export const readError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Erreur ${response.status}`;
  } catch {
    return `Erreur ${response.status}`;
  }
};
