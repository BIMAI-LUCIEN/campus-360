// Cover page built from blocks (Module 24): the four ready covers expressed as
// blocks, and the HTML/CSS of any list of blocks. Pure code, no I/O, no colour
// literal (colours come from the style). This file exists twice, identical except
// for the import path below:
//   mobile-api/lib/document-cover.ts  and  src/features/documents/documentCover.ts
// A test fails if the two copies differ — edit both together.

import {
  DEFAULT_COVER_TEXT_STYLE,
  type CoverBlock,
  type CoverLogoSlot,
  type CoverTemplate,
  type CoverTextStyle,
  type DocumentStyle,
} from './documentStyle';

// The cover fields (same as CoverData in document-render.ts, declared here to
// avoid a circular import).
export type CoverFields = {
  university?: string;
  school?: string;
  faculty?: string;
  kindLabel: string;
  degree?: string;
  title: string;
  subtitle?: string;
  studentName?: string;
  matricule?: string;
  specialty?: string;
  company?: string;
  period?: string;
  tutorCorporate?: string;
  tutorAcademic?: string;
  year?: string;
  extraLines?: { label: string; value: string }[];
};

// Logo sources, already resolved: signed URL on screen, data URI in the PDF.
export type CoverBlockLogos = { school?: string | null; company?: string | null; department?: string | null };

export const COVER_TEMPLATE_FIELDS = [
  'university', 'school', 'faculty', 'kindLabel', 'degree', 'title', 'subtitle', 'studentName', 'matricule',
  'specialty', 'company', 'period', 'tutorCorporate', 'tutorAcademic', 'year', 'placeIntro',
] as const;
type TemplateField = (typeof COVER_TEMPLATE_FIELDS)[number];

const esc = (text: unknown): string =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isField = (key: string): key is TemplateField => (COVER_TEMPLATE_FIELDS as readonly string[]).includes(key);

const fieldValue = (data: CoverFields, key: TemplateField): string => {
  if (key === 'placeIntro') return data.kindLabel === 'Rapport de stage' ? 'Stage effectué à' : 'Réalisé au sein de';
  const value = data[key];
  return typeof value === 'string' ? value.trim() : '';
};

const FIELD = /\{([a-zA-Z]+)\}/g;
const usesEmptyField = (template: string, data: CoverFields) =>
  [...template.matchAll(FIELD)].some((m) => isField(m[1]) && !fieldValue(data, m[1]));

// Fills a one-line template: {field} → value (escaped), `[ … ]` = dropped when one
// of its fields is empty, `**bold**`, `*italic*`. Returns null when a field used
// outside an optional part is empty, so the line disappears.
export const fillTemplate = (template: string, data: CoverFields): string | null => {
  const resolved = template.replace(/\[([^[\]]*)\]/g, (_m, inner: string) => (usesEmptyField(inner, data) ? '' : inner));
  if (!resolved.trim() || usesEmptyField(resolved, data)) return null;
  let out = '';
  let last = 0;
  let bold = false;
  let italic = false;
  for (const m of resolved.matchAll(/\{([a-zA-Z]+)\}|\*\*|\*/g)) {
    out += esc(resolved.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    if (m[1] !== undefined) {
      out += isField(m[1]) ? esc(fieldValue(data, m[1])) : esc(m[0]);
    } else if (m[0] === '**') {
      out += bold ? '</strong>' : '<strong>';
      bold = !bold;
    } else {
      out += italic ? '</em>' : '<em>';
      italic = !italic;
    }
  }
  out += esc(resolved.slice(last));
  if (italic) out += '</em>';
  if (bold) out += '</strong>';
  return out.trim() ? out.trim() : null;
};

const fillLines = (template: string, data: CoverFields) =>
  template.split('\n').map((line) => fillTemplate(line, data)).filter((line): line is string => line !== null);

// ── The four ready covers, as blocks ────────────────────────────────────────

const st = (style: Partial<CoverTextStyle>): CoverTextStyle => ({ ...DEFAULT_COVER_TEXT_STYLE, ...style });
const grow = (id: string): CoverBlock => ({ id, type: 'spacer', height: 4, grow: true, style: st({}) });
const kind = (align: CoverTextStyle['align']): CoverBlock => ({ id: 'kind', type: 'heading', text: '{kindLabel}', style: st({ align, size: 11, bold: true, uppercase: true }) });
const subtitle = (align: CoverTextStyle['align']): CoverBlock => ({ id: 'subtitle', type: 'text', template: '{subtitle}', style: st({ align, size: 12, italic: true }) });
const degree = (align: CoverTextStyle['align']): CoverBlock => ({ id: 'degree', type: 'text', template: 'En vue de l’obtention du {degree}', style: st({ align, size: 10.5, italic: true }) });
const place = (align: CoverTextStyle['align']): CoverBlock => ({ id: 'place', type: 'text', template: '{placeIntro} **{company}**[ — {period}]', style: st({ align, size: 10.5 }) });
const institution = (style: CoverTextStyle): CoverBlock => ({ id: 'institution', type: 'text', template: '{university}\n{school}\n{faculty}', style });
const supervisors: CoverBlock = {
  id: 'supervisors',
  type: 'supervisors',
  layout: 'author-left',
  authorLabel: 'Présenté par',
  matriculeLabel: 'Matricule :',
  specialtyLabel: 'Filière :',
  label: 'Sous la direction de',
  corporateLabel: 'Encadreur professionnel :',
  academicLabel: 'Encadreur académique :',
  style: st({ align: 'left', size: 10.5 }),
};
const extra: CoverBlock = { id: 'extra', type: 'extra-lines', style: st({ align: 'left', size: 10.5 }) };
const year = (variant: 'rule' | 'plain', align: CoverTextStyle['align']): CoverBlock => ({
  id: 'year', type: 'year-banner', template: 'Année académique {year}', variant, style: st({ align, size: 11, bold: true }),
});

export const coverBlocksFor = (template: CoverTemplate, nationalHeader: boolean): CoverBlock[] => {
  if (template === 'modern') {
    return [
      { id: 'band', type: 'logos', left: 'school', center: null, right: 'company', height: 70, centerText: '{university}\n{school}\n{faculty}', rule: true, style: st({ align: 'left', size: 10, bold: true, uppercase: true }) },
      grow('space-1'),
      kind('left'),
      { id: 'title', type: 'title-banner', prefix: '', variant: 'plain', style: st({ align: 'left', size: 24, bold: true }) },
      subtitle('left'),
      degree('left'),
      place('left'),
      grow('space-2'),
      supervisors,
      grow('space-3'),
      extra,
      grow('space-4'),
      year('plain', 'right'),
    ];
  }
  if (template === 'minimal') {
    return [
      institution(st({ size: 9.5, uppercase: true })),
      grow('space-1'),
      kind('center'),
      { id: 'title', type: 'title-banner', prefix: '', variant: 'plain', style: st({ size: 22, bold: true }) },
      subtitle('center'),
      grow('space-2'),
      { id: 'name', type: 'text', template: '{studentName}', style: st({ size: 12, bold: true }) },
      place('center'),
      { id: 'tutor-academic', type: 'text', template: '**Encadreur académique :** {tutorAcademic}', style: st({ size: 10.5 }) },
      { id: 'tutor-corporate', type: 'text', template: '**Encadreur professionnel :** {tutorCorporate}', style: st({ size: 10.5 }) },
      extra,
      year('plain', 'center'),
    ];
  }
  const top: CoverBlock[] = nationalHeader
    ? [{
        id: 'national',
        type: 'bilingual-header',
        left: ['**RÉPUBLIQUE DU CAMEROUN**', '*Paix – Travail – Patrie*', '{university}', '{school}', '{faculty}'],
        right: ['**REPUBLIC OF CAMEROON**', '*Peace – Work – Fatherland*', '{university}', '{school}', '{faculty}'],
        center: 'school',
        style: st({ size: 8.5 }),
      }]
    : [
        { id: 'school-logo', type: 'logos', left: null, center: 'school', right: null, height: 70, centerText: '', rule: false, style: st({}) },
        institution(st({ size: 10.5, bold: true, uppercase: true })),
      ];
  return [
    ...top,
    grow('space-1'),
    kind('center'),
    degree('center'),
    { id: 'theme', type: 'heading', text: 'Thème', style: st({ size: 9.5, bold: true, uppercase: true }) },
    { id: 'title', type: 'title-banner', prefix: '', variant: template === 'institutional' ? 'frame' : 'plain', style: st({ size: 20, bold: true }) },
    subtitle('center'),
    place('center'),
    { id: 'company-logo', type: 'logos', left: null, center: 'company', right: null, height: 70, centerText: '', rule: false, style: st({}) },
    grow('space-2'),
    supervisors,
    grow('space-3'),
    extra,
    grow('space-4'),
    year('rule', 'center'),
  ];
};

// ── HTML ────────────────────────────────────────────────────────────────────

const inline = (s: CoverTextStyle) =>
  `text-align:${s.align};font-size:${s.size}pt;font-weight:${s.bold ? 700 : 400};font-style:${s.italic ? 'italic' : 'normal'};` +
  `text-transform:${s.uppercase ? 'uppercase' : 'none'};text-decoration:${s.underline ? 'underline' : 'none'};${s.color ? `color:${esc(s.color)};` : ''}`;

const open = (block: CoverBlock, classes: string, tag = 'div') =>
  `<${tag} class="cb cb-${block.type} cb-${esc(block.id)}${classes ? ` ${classes}` : ''}" style="${inline(block.style)}">`;

const logoImg = (src: string | null | undefined, height: number) =>
  src ? `<img class="cv-logo" src="${esc(src)}" alt="" style="max-height:${height}pt" />` : '';

const logoFor = (slot: CoverLogoSlot | null, logos: CoverBlockLogos, height: number) => (slot ? logoImg(logos[slot], height) : '');

const labelLine = (label: string, value?: string) =>
  value ? `<div class="cv-line">${label ? `<span class="cv-label">${esc(label)}</span> ` : ''}${esc(value)}</div>` : '';

const blockHtml = (block: CoverBlock, data: CoverFields, logos: CoverBlockLogos): string => {
  switch (block.type) {
    case 'bilingual-header': {
      const col = (lines: string[]) => lines.map((l) => fillTemplate(l, data)).filter((l): l is string => l !== null).join('<br>');
      const left = col(block.left);
      const right = col(block.right);
      const logo = logoFor(block.center, logos, 70);
      if (!left && !right && !logo) return '';
      return `${open(block, 'cv-national')}<div class="cv-nat-col">${left}</div>${block.center ? `<div class="cv-nat-logo">${logo}</div>` : ''}<div class="cv-nat-col">${right}</div></div>`;
    }
    case 'logos': {
      const left = logoFor(block.left, logos, block.height);
      const center = block.center ? logoFor(block.center, logos, block.height) : fillLines(block.centerText, data).map((l) => `<div>${l}</div>`).join('');
      const right = logoFor(block.right, logos, block.height);
      if (!left && !center && !right) return '';
      const cell = (html: string, cls: string) => `<div class="cb-cell ${cls}">${html}</div>`;
      return `${open(block, block.rule ? 'cb-rule' : '')}${block.left ? cell(left, 'cb-cell-side') : ''}${cell(center, 'cb-cell-mid')}${block.right ? cell(right, 'cb-cell-side') : ''}</div>`;
    }
    case 'title-banner': {
      const title = data.title?.trim() || 'Titre du document';
      const fill = block.variant === 'band' && block.fill ? ` data-fill style="background:${esc(block.fill)}"` : '';
      return `${open(block, `cv-title cb-title-${block.variant}`, 'h1')}<span class="cb-fill"${fill}></span>${block.prefix ? `${esc(block.prefix)} ` : ''}${esc(title)}</h1>`;
    }
    case 'heading': {
      const text = fillTemplate(block.text, data);
      return text ? `${open(block, '')}${text}</div>` : '';
    }
    case 'text': {
      const lines = fillLines(block.template, data);
      return lines.length ? `${open(block, '')}${lines.map((l) => `<div>${l}</div>`).join('')}</div>` : '';
    }
    case 'author': {
      if (!data.studentName && !data.matricule) return '';
      return `${open(block, '')}${block.label ? `<div class="cb-label">${esc(block.label)}</div>` : ''}${data.studentName ? `<div class="cv-name">${esc(data.studentName)}</div>` : ''}${labelLine(block.matriculeLabel, data.matricule)}</div>`;
    }
    case 'supervisors': {
      if (block.layout === 'author-left') {
        const left = [
          data.studentName ? `<div class="cv-name">${esc(data.studentName)}</div>` : '',
          labelLine(block.matriculeLabel, data.matricule),
          labelLine(block.specialtyLabel, data.specialty),
        ].join('');
        const right = [labelLine(block.corporateLabel, data.tutorCorporate), labelLine(block.academicLabel, data.tutorAcademic)].join('');
        if (!left && !right) return '';
        const head = (label: string) => (label ? `<div class="cv-sup-head">${esc(label)}</div>` : '');
        return `${open(block, 'cv-supervision')}${left ? `<div class="cv-sup-col">${head(block.authorLabel)}${left}</div>` : ''}${right ? `<div class="cv-sup-col">${head(block.label)}${right}</div>` : ''}</div>`;
      }
      const column = (label: string, value?: string) =>
        value ? `<div class="cv-sup-col">${label ? `<div class="cb-label">${esc(label)}</div>` : ''}<div class="cv-name">${esc(value)}</div></div>` : '';
      const columns = column(block.academicLabel, data.tutorAcademic) + column(block.corporateLabel, data.tutorCorporate);
      if (!columns) return '';
      return `${open(block, '')}${block.label ? `<div class="cb-label">${esc(block.label)}</div>` : ''}<div class="cv-supervision">${columns}</div></div>`;
    }
    case 'year-banner': {
      const text = fillTemplate(block.template, data);
      const fill = block.variant === 'band' && block.fill ? `<span class="cb-fill" style="background:${esc(block.fill)}"></span>` : '';
      return text ? `${open(block, `cv-year cb-year-${block.variant}`)}${fill}${text}</div>` : '';
    }
    case 'spacer':
      return `<div class="cb-spacer${block.grow ? ' cb-grow' : ''}" style="min-height:${block.height}mm"></div>`;
    case 'extra-lines': {
      const lines = (data.extraLines || []).map((l) => labelLine(l.label ? `${l.label} :` : '', l.value)).join('');
      return lines ? `${open(block, 'cv-extra')}${lines}</div>` : '';
    }
    default:
      return '';
  }
};

export const coverBlocksHtml = (blocks: CoverBlock[], data: CoverFields, _style: DocumentStyle, logos: CoverBlockLogos): string =>
  blocks.map((block) => blockHtml(block, data, logos)).join('');

// Rules for the block layout. Colours come from the style only.
export const coverBlocksCss = (style: DocumentStyle): string => {
  const accent = style.page.accentColor;
  const band = style.page.bandColor;
  const onBand = style.headerFooter.headerTextColor;
  return `
  .cover.cover-blocks { justify-content: flex-start; gap: 0; }
  .cover .cb { margin: 0 0 6pt; }
  .cover .cb-spacer { margin: 0; }
  .cover .cb-grow { flex: 1 1 auto; }
  .cover .cb-logos { display: flex; align-items: center; justify-content: center; gap: 12pt; }
  .cover .cb-logos .cb-cell-side { flex: 1 1 0; min-width: 0; display: flex; justify-content: center; }
  .cover .cb-logos .cb-cell-mid { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; }
  .cover .cb-logos .cv-logo { max-width: 100%; }
  .cover .cb-logos[style*="text-align:left"] .cb-cell-mid { align-items: flex-start; }
  .cover .cb-rule { border-bottom: 3pt solid ${accent}; padding-bottom: 10pt; }
  .cover .cv-title.cb-title-band, .cover .cv-year.cb-year-band { position: relative; z-index: 0; }
  .cover .cb-fill { position: absolute; inset: 0; z-index: -1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover .cb-fill:not([style]) { display: none; }
  .cover .cv-title.cb-title-band { background: ${band}; color: ${onBand}; padding: 8pt 12pt; }
  .cover .cv-title.cb-title-frame { border-top: 1.5pt solid ${accent}; border-bottom: 1.5pt solid ${accent}; padding: 8pt 0; }
  .cover .cv-year.cb-year-band { background: ${band}; color: ${onBand}; border-top: none; padding: 6pt; }
  .cover .cv-year.cb-year-plain { border-top: none; padding-top: 0; }
  .cover .cv-title.cb-title-band, .cover .cv-year.cb-year-band { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover .cb-label { font-weight: inherit; text-decoration: underline; margin-bottom: 3pt; }
  .cover .cb-supervisors .cv-name { font-weight: inherit; }
  .cover .cb-author .cv-name { font-weight: 700; }
  .cover .cb-author .cv-label, .cover .cb-supervisors .cv-label { font-weight: inherit; }
  .cover .cb-supervisors .cv-supervision { margin-top: 4pt; }
  `;
};
