import JSZip from 'jszip';

import {
  presetStyle,
  resolveStyle,
  STYLE_FONTS,
  type CoverBlock,
  type CoverLogoSlot,
  type CoverTextStyle,
  type DocumentStyle,
  type StyleFont,
} from './document-style';
import { detectFileType } from './file-validation';
import { attr, attrOf, children, elements, has, rejectDtd, textOf } from './ooxml';
import { zipUncompressedTotal } from './source-extraction';

// Import of a Word template (Module 24): reads the layout of a .docx (styles,
// margins, header, footer, numbering, cover) and returns a document style with
// cover blocks, a section outline and the cover logos. Only the layout is copied:
// texts proper to a report (names, company, title, dates) become fields or are
// dropped, and only a closed list of generic labels is kept as written.

export class TemplateImportError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = 'TemplateImportError';
    this.status = status;
  }
}

export type ImportedLogo = { slot: CoverLogoSlot; mime: string; data: Buffer };
export type ImportReport = { sure: string[]; guessed: string[]; missing: string[] };
export type ImportedTemplate = { style: DocumentStyle; outline: { title: string }[]; logos: ImportedLogo[]; report: ImportReport };

export const MAX_TEMPLATE_FILE_BYTES = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_ENTRIES = 500;
const MAX_XML_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// Generic labels kept as written on a cover (anything else is the report's own text).
const GENERIC_LABELS = [
  'Rédigé et présenté par',
  'Présenté par',
  'Sous l’encadrement de',
  'Sous la direction de',
  'THÈME',
  'Année académique',
  'Encadreur académique',
  'Encadreur professionnel',
  'Matricule',
  'RAPPORT DE STAGE ACADÉMIQUE',
  'RAPPORT DE STAGE',
  'MÉMOIRE DE FIN D’ÉTUDES',
  'MÉMOIRE',
  'République du Cameroun',
  'Republic of Cameroon',
  'Paix – Travail – Patrie',
  'Peace – Work – Fatherland',
];

const fold = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '’').replace(/\s+/g, ' ').trim();
const genericLabel = (text: string) => GENERIC_LABELS.find((label) => fold(text).startsWith(fold(label))) ?? null;
const isGeneric = (text: string) => {
  const label = genericLabel(text);
  return label !== null && fold(text).replace(/[\s:]+$/, '') === fold(label);
};

const SERIF = /times|georgia|garamond|cambria|book|serif|roman|palatino|century/i;
const nearestFont = (name: string | null, report: ImportReport, what: string): StyleFont | null => {
  if (!name) return null;
  const exact = STYLE_FONTS.find((f) => f.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  const guess: StyleFont = SERIF.test(name) ? 'Times New Roman' : 'Arial';
  report.guessed.push(`${what} : « ${name} » remplacée par ${guess}`);
  return guess;
};

const hexOrNull = (value: string | null) => (value && /^[0-9A-Fa-f]{6}$/.test(value) ? `#${value.toUpperCase()}` : null);

// ── Run and paragraph properties ────────────────────────────────────────────

const runProps = (fragment: string) => {
  const rPr = elements(fragment, 'w:rPr')[0] ?? '';
  const size = attrOf(rPr, 'w:sz', 'w:val');
  const flag = (tag: string) => has(rPr, tag) && attrOf(rPr, tag, 'w:val') !== 'false' && attrOf(rPr, tag, 'w:val') !== '0';
  return {
    font: attrOf(rPr, 'w:rFonts', 'w:ascii'),
    size: size ? Number(size) / 2 : null,
    bold: flag('w:b'),
    italic: flag('w:i'),
    caps: flag('w:caps'),
    underline: has(rPr, 'w:u') && attrOf(rPr, 'w:u', 'w:val') !== 'none',
    color: hexOrNull(attrOf(rPr, 'w:color', 'w:val')),
  };
};

const firstRun = (paragraph: string) => elements(paragraph, 'w:r').find((r) => has(r, 'w:t')) ?? '';
const pPrOf = (paragraph: string) => elements(paragraph, 'w:pPr')[0] ?? '';
const alignOf = (paragraph: string): CoverTextStyle['align'] => {
  const jc = attrOf(pPrOf(paragraph), 'w:jc', 'w:val');
  return jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : 'left';
};
const shadingOf = (fragment: string) => {
  const fill = attrOf(fragment, 'w:shd', 'w:fill');
  return fill && fill !== 'auto' ? hexOrNull(fill) : null;
};

const textStyleOf = (paragraph: string, fallbackSize: number): CoverTextStyle => {
  const run = runProps(firstRun(paragraph));
  return {
    align: alignOf(paragraph),
    size: Math.min(28, Math.max(8, run.size ?? fallbackSize)),
    bold: run.bold,
    italic: run.italic,
    uppercase: run.caps,
    underline: run.underline,
    color: run.color,
  };
};

// ── Styles (word/styles.xml) ────────────────────────────────────────────────

const readStyles = (stylesXml: string, style: DocumentStyle, report: ImportReport) => {
  const defaults = elements(stylesXml, 'w:docDefaults')[0] ?? '';
  const styleById = (id: string) => elements(stylesXml, 'w:style').find((s) => attr(s, 'w:styleId') === id) ?? '';
  const styleByName = (pattern: RegExp) => elements(stylesXml, 'w:style').find((s) => pattern.test(attrOf(s, 'w:name', 'w:val') || ''));
  const normal = styleById('Normal');

  const defaultRun = runProps(elements(defaults, 'w:rPrDefault')[0] ?? '');
  const normalRun = runProps(normal);
  const bodyFont = nearestFont(normalRun.font ?? defaultRun.font, report, 'Police du texte');
  if (bodyFont) style.typography.bodyFont = bodyFont;
  const size = normalRun.size ?? defaultRun.size;
  if (size) style.typography.bodySize = size;
  const line = attrOf(normal, 'w:spacing', 'w:line') ?? attrOf(defaults, 'w:spacing', 'w:line');
  if (line) style.typography.lineSpacing = Math.round((Number(line) / 240) * 20) / 20;
  if (bodyFont || size) report.sure.push(`Police du texte : ${style.typography.bodyFont} ${style.typography.bodySize} pt, interligne ${style.typography.lineSpacing}`);
  else report.missing.push('Police du texte (style Normal absent)');

  const heading1 = styleById('Heading1') || styleByName(/^heading 1$/i) || '';
  if (heading1) {
    const run = runProps(heading1);
    const font = nearestFont(run.font, report, 'Police des titres');
    if (font) style.typography.headingFont = font;
    style.headings.uppercaseChapters = run.caps;
    if (run.color) style.headings.color = run.color;
    report.sure.push(`Titres de chapitre : ${style.typography.headingFont}${run.caps ? ', majuscules' : ''}${run.color ? `, couleur ${run.color}` : ''}`);
    if (has(heading1, 'w:pBdr')) style.headings.rule = true;
    if (attrOf(heading1, 'w:jc', 'w:val') === 'center') style.headings.titleAlign = 'center';
    const heading2 = styleById('Heading2') || styleByName(/^heading 2$/i) || '';
    if (heading2 && runProps(heading2).caps) style.headings.uppercaseSections = true;
  } else {
    report.missing.push('Style des titres (Titre 1)');
  }

  const caption = styleByName(/^(caption|légende( figure)?)$/i);
  if (caption) {
    const run = runProps(caption);
    const centered = attrOf(caption, 'w:jc', 'w:val') === 'center';
    style.captions.style = run.bold && !centered ? 'bold-left' : 'italic-center';
    report.sure.push(`Légendes : ${style.captions.style === 'bold-left' ? 'gras à gauche' : 'italique centrée'}`);
  }
};

// ── Sections, header, footer ───────────────────────────────────────────────

const relsMap = (relsXml: string) =>
  new Map(elements(relsXml, 'Relationship').map((r) => [attr(r, 'Id') || '', attr(r, 'Target') || '']));

const readPage = (documentXml: string, style: DocumentStyle, report: ImportReport) => {
  const sections = elements(documentXml, 'w:sectPr');
  const last = sections[sections.length - 1] ?? '';
  const left = Number(attrOf(last, 'w:pgMar', 'w:left') || 0);
  if (left) {
    const cm = left / 567;
    style.page.margins = cm < 2 ? 'narrow' : cm < 2.75 ? 'normal' : 'wide';
    report.sure.push(`Marges : ${cm.toFixed(1).replace('.', ',')} cm (${style.page.margins === 'narrow' ? 'étroites' : style.page.margins === 'wide' ? 'larges' : 'normales'})`);
  }
  const borderOf = (sectPr: string) => {
    const pgBorders = elements(sectPr, 'w:pgBorders')[0];
    if (!pgBorders) return null;
    return attrOf(pgBorders, 'w:top', 'w:val') === 'double' ? 'double' : 'single';
  };
  const bodyBorder = borderOf(last);
  const coverBorder = sections.length > 1 ? borderOf(sections[0]) : null;
  if (bodyBorder) style.page.border = bodyBorder;
  else if (coverBorder) style.page.border = 'cover-only';
  else style.page.border = 'none';
  if (bodyBorder || coverBorder) report.sure.push(`Bordure de page : ${style.page.border}`);
  return { sections, last };
};

type Slot = 'left' | 'center' | 'right';

const readFooter = (footerXml: string, style: DocumentStyle, report: ImportReport) => {
  const paragraph = elements(footerXml, 'w:p').find((p) => textOf(p).trim() || /PAGE/.test(p)) ?? '';
  if (!paragraph) return;
  // Split the runs on tabs: left \t centre \t right.
  const parts: string[] = ['', '', ''];
  let index = 0;
  for (const run of elements(paragraph, 'w:r').concat(elements(paragraph, 'w:fldSimple'))) {
    const text = textOf(run);
    const field = /<w:instrText[^>]*>\s*PAGE\b|w:instr="\s*PAGE\b/.test(run) ? '{PAGE}' : '';
    for (const piece of (text + field).split('\t').map((p, i) => [i, p] as const)) {
      if (piece[0] > 0) index = Math.min(2, index + 1);
      parts[index] += piece[1];
    }
  }
  const slots: Slot[] = ['left', 'center', 'right'];
  const hf = style.headerFooter;
  const set = (slot: Slot, value: DocumentStyle['headerFooter']['footerLeft']) => {
    if (slot === 'left') hf.footerLeft = value;
    else if (slot === 'center') hf.footerCenter = value;
    else hf.footerRight = value;
  };
  slots.forEach((slot) => set(slot, 'none'));
  parts.forEach((text, i) => {
    const slot = slots[i];
    if (text.includes('{PAGE}')) {
      set(slot, 'page');
      hf.numberFormat = /page\s*\{PAGE\}/i.test(text) ? 'page-n' : 'n';
      report.sure.push(`Numéro de page en pied (${slot === 'left' ? 'à gauche' : slot === 'center' ? 'au centre' : 'à droite'})`);
    } else if (text.trim()) {
      const label = genericLabel(text);
      if (label && /présenté par/i.test(label)) {
        hf.authorLabel = `${label} :`;
        set(slot, 'author');
        report.sure.push(`Pied : « ${hf.authorLabel} » suivi du nom de l’étudiant`);
      } else {
        set(slot, 'title');
        report.guessed.push('Texte de pied lu comme le titre du document');
      }
    }
  });
  if (/NUMPAGES|SECTIONPAGES/.test(footerXml)) hf.numberFormat = 'n-of-total';
  if (has(footerXml, 'w:bdr')) {
    hf.pageNumberFrame = 'box';
    report.sure.push('Numéro de page encadré');
  }
  if (attrOf(pPrOf(paragraph), 'w:top', 'w:val')) {
    hf.footerRule = true;
    report.sure.push('Filet au-dessus du pied');
  }
};

const readHeader = (headerXml: string, style: DocumentStyle, report: ImportReport) => {
  const paragraph = elements(headerXml, 'w:p').find((p) => textOf(p).trim() || has(p, 'w:fldSimple')) ?? '';
  if (!paragraph) {
    style.headerFooter.headerLeft = 'none';
    style.headerFooter.headerRight = 'none';
    return;
  }
  const fill = shadingOf(pPrOf(paragraph));
  const hf = style.headerFooter;
  if (fill) {
    hf.headerStyle = 'band';
    style.page.bandColor = fill;
    const color = runProps(firstRun(paragraph)).color;
    if (color) hf.headerTextColor = color;
    report.sure.push(`En-tête : bandeau ${fill}${color ? `, texte ${color}` : ''}, titre du document`);
    return;
  }
  hf.headerStyle = 'plain';
  const text = textOf(paragraph);
  const chapter = /STYLEREF/.test(paragraph);
  const [left, right = ''] = text.split('\t').filter((_, i, all) => i === 0 || i === all.length - 1);
  hf.headerLeft = left.trim() ? 'title' : 'none';
  hf.headerRight = chapter ? 'chapter' : right.trim() ? 'title' : 'none';
  hf.headerRule = Boolean(attrOf(pPrOf(paragraph), 'w:bottom', 'w:val'));
  if (left.trim() || right.trim()) report.guessed.push('Texte d’en-tête lu comme le titre du document');
  if (chapter) report.sure.push('En-tête : titre du chapitre en cours');
};

// ── Body: numbering scheme, captions, outline ──────────────────────────────

const OUTLINE = [
  'Dédicace', 'Remerciements', 'Sommaire', 'Résumé', 'Abstract', 'Liste des figures', 'Liste des tableaux',
  'Liste des abréviations', 'Introduction générale', 'Conclusion générale', 'Références bibliographiques',
  'Bibliographie', 'Table des matières', 'Annexes', 'Avant-propos',
];

const readBody = (bodyXml: string, style: DocumentStyle, report: ImportReport) => {
  const paragraphs = elements(bodyXml, 'w:p');
  const styleOf = (p: string) => attrOf(pPrOf(p), 'w:pStyle', 'w:val') || '';
  const outline: { title: string }[] = [];
  for (const p of paragraphs) {
    if (!/^(Heading1|Titre1|TitreHorsSommaire)$/i.test(styleOf(p))) continue;
    const text = textOf(p).trim();
    const chapter = fold(text).match(/^chapitre\s+(\d+|[ivxlc]+)\b/);
    if (chapter) outline.push({ title: `Chapitre ${outline.filter((o) => o.title.startsWith('Chapitre')).length + 1}` });
    else {
      const known = OUTLINE.find((title) => fold(text).startsWith(fold(title)));
      if (known) outline.push({ title: known });
    }
  }
  if (outline.length) report.sure.push(`Plan : ${outline.map((o) => o.title).join(', ')}`);
  else report.missing.push('Plan des sections (aucun titre de niveau 1 reconnu)');

  const subTitles = paragraphs.filter((p) => /^(Heading2|Titre2)$/i.test(styleOf(p))).map((p) => textOf(p).trim());
  if (subTitles.some((t) => /^SECTION\s+\d+\s*:/i.test(t))) style.headings.numbering = 'chapter-section-roman';
  else if (subTitles.some((t) => /^\d+\.\d+\s/.test(t))) style.headings.numbering = 'decimal';
  else if (subTitles.some((t) => /^[A-H]\.\s/.test(t))) style.headings.numbering = 'roman-alpha';
  if (subTitles.length) report.sure.push(`Numérotation des titres : ${style.headings.numbering}`);

  const captions = paragraphs.map(textOf).map((t) => t.trim().match(/^(Figure|Tableau)\s+([\dIVX]+(?:\.\d+)?)\s*:/)).filter(Boolean) as RegExpMatchArray[];
  if (captions.length) {
    style.captions.scope = captions.some((m) => m[2].includes('.')) ? 'chapter' : 'document';
    report.sure.push(`Légendes numérotées ${style.captions.scope === 'document' ? 'sur tout le document' : 'par chapitre'}`);
  }
  return outline;
};

// ── Cover (content before the first section or page break) ─────────────────

const coverPart = (bodyXml: string) => {
  const items = children(bodyXml, ['w:p', 'w:tbl']);
  const out: { tag: string; xml: string }[] = [];
  for (const item of items) {
    if (item.tag === 'w:p' && (has(pPrOf(item.xml), 'w:sectPr') || /<w:br [^>]*w:type="page"/.test(item.xml))) {
      if (textOf(item.xml).trim()) out.push(item);
      break;
    }
    out.push(item);
  }
  return out;
};

const FIELDS_BY_LINE = ['{university}', '{school}', '{faculty}'];

const readCover = async (
  bodyXml: string,
  zip: JSZip,
  rels: Map<string, string>,
  style: DocumentStyle,
  report: ImportReport,
): Promise<{ blocks: CoverBlock[]; logos: ImportedLogo[] }> => {
  const blocks: CoverBlock[] = [];
  const logos: ImportedLogo[] = [];
  const freeSlots: CoverLogoSlot[] = ['school', 'company', 'department'];
  let dropped = 0;
  let skipName = false;
  let pendingSupervisorLabel: string | null = null;
  const id = (base: string) => {
    let n = 1;
    while (blocks.some((b) => b.id === (n === 1 ? base : `${base}-${n}`))) n += 1;
    return n === 1 ? base : `${base}-${n}`;
  };
  const bodySize = style.typography.bodySize;

  const takeLogo = async (fragment: string, slot: CoverLogoSlot): Promise<boolean> => {
    const rid = attrOf(fragment, 'a:blip', 'r:embed');
    const target = rid ? rels.get(rid) : null;
    if (!target) return false;
    const file = zip.file(`word/${target.replace(/^\/?word\//, '').replace(/^\.\//, '')}`);
    if (!file) return false;
    const data = Buffer.from(await file.async('uint8array'));
    const type = detectFileType(data);
    if (!type || (type.mime !== 'image/png' && type.mime !== 'image/jpeg') || data.length > MAX_LOGO_BYTES) {
      report.missing.push('Un logo de la garde n’a pas été repris (format autre que PNG/JPEG ou plus de 2 Mo)');
      return false;
    }
    logos.push({ slot, mime: type.mime, data });
    return true;
  };
  const nextSlot = (preferred: CoverLogoSlot) => {
    const slot = freeSlots.includes(preferred) ? preferred : freeSlots[0];
    if (!slot) return null;
    freeSlots.splice(freeSlots.indexOf(slot), 1);
    return slot;
  };

  // Lines of a cell: generic labels kept, others become institution fields.
  const cellLines = (cell: string) => {
    let field = 0;
    return elements(cell, 'w:p')
      .map((p) => {
        const text = textOf(p).trim();
        if (!text) return null;
        const bold = runProps(firstRun(p)).bold;
        const italic = runProps(firstRun(p)).italic;
        const wrap = (t: string) => (bold ? `**${t}**` : italic ? `*${t}*` : t);
        if (isGeneric(text)) return wrap(text);
        const placeholder = FIELDS_BY_LINE[field];
        field += 1;
        return placeholder ?? null;
      })
      .filter((line): line is string => line !== null);
  };

  for (const item of coverPart(bodyXml)) {
    if (item.tag === 'w:tbl') {
      const cells = elements(item.xml, 'w:tc');
      const drawings = cells.map((c) => has(c, 'w:drawing'));
      const texts = cells.map((c) => textOf(c).trim());
      if (drawings.some(Boolean) && texts.every((t, i) => drawings[i] || !t || cells.length === 3)) {
        if (cells.length === 3 && texts[0] && texts[2] && drawings[1] && !drawings[0]) {
          // Bilingual header with a logo in the middle.
          const slot = nextSlot('school');
          const ok = slot ? await takeLogo(cells[1], slot) : false;
          blocks.push({ id: id('header'), type: 'bilingual-header', left: cellLines(cells[0]), right: cellLines(cells[2]), center: ok ? slot : null, style: textStyleOf(elements(cells[0], 'w:p')[0] ?? '', 8.5) });
          report.sure.push('Garde : en-tête bilingue sur deux colonnes, logo au centre');
          continue;
        }
        const preferred: CoverLogoSlot[] = cells.length === 3 ? ['department', 'school', 'company'] : ['school', 'company'];
        const placed: (CoverLogoSlot | null)[] = [];
        for (let i = 0; i < cells.length; i += 1) {
          const slot = drawings[i] ? nextSlot(preferred[i] ?? 'school') : null;
          placed.push(slot && (await takeLogo(cells[i], slot)) ? slot : null);
        }
        const [left, center, right] = cells.length === 3 ? placed : [placed[0], null, placed[1] ?? null];
        blocks.push({ id: id('logos'), type: 'logos', left, center, right, height: 60, centerText: '', rule: false, style: { ...textStyleOf('', bodySize), align: 'center' } });
        report.guessed.push(`Garde : ${placed.filter(Boolean).length} logo(s) ; emplacements supposés (département, établissement, entreprise)`);
        continue;
      }
      if (cells.length >= 2) {
        const lower = texts.map(fold);
        if (lower.some((t) => t.includes(fold('Présenté par')))) {
          blocks.push({
            id: id('supervisors'), type: 'supervisors', layout: 'author-left', label: 'Sous la direction de', authorLabel: 'Présenté par',
            matriculeLabel: 'Matricule :', specialtyLabel: 'Filière :', academicLabel: 'Encadreur académique :', corporateLabel: 'Encadreur professionnel :',
            style: { ...textStyleOf('', bodySize), align: 'left' },
          });
          report.sure.push('Garde : auteur et encadreurs sur deux colonnes');
          continue;
        }
        if (lower.some((t) => t.includes('encadreur')) || pendingSupervisorLabel) {
          const labelIn = (needle: string) => {
            const cell = cells.find((c) => fold(textOf(c)).includes(needle));
            const line = cell ? elements(cell, 'w:p').map((p) => textOf(p).trim()).find((t) => fold(t).includes(needle)) : null;
            return line && isGeneric(line) ? line : needle === 'academique' ? 'Encadreur académique' : 'Encadreur professionnel';
          };
          blocks.push({
            id: id('supervisors'), type: 'supervisors', layout: 'columns', label: pendingSupervisorLabel ?? '',
            academicLabel: labelIn('academique'), corporateLabel: labelIn('professionnel'), authorLabel: '', matriculeLabel: '', specialtyLabel: '',
            style: { ...textStyleOf('', bodySize), align: 'left' },
          });
          pendingSupervisorLabel = null;
          report.sure.push('Garde : encadreurs sur deux colonnes');
          continue;
        }
        if (lower[0] && (lower[0].includes('republique') || lower[0].includes('ministere') || lower[0].includes('universite') || blocks.length === 0)) {
          blocks.push({ id: id('header'), type: 'bilingual-header', left: cellLines(cells[0]), right: cellLines(cells[cells.length - 1]), center: null, style: textStyleOf(elements(cells[0], 'w:p')[0] ?? '', 8.5) });
          report.sure.push('Garde : en-tête bilingue sur deux colonnes');
          continue;
        }
      }
      dropped += 1;
      continue;
    }

    const p = item.xml;
    const text = textOf(p).trim();
    const textStyle = textStyleOf(p, bodySize);
    if (has(p, 'w:drawing') && !text) {
      const slot = nextSlot('school');
      if (slot && (await takeLogo(p, slot))) {
        blocks.push({ id: id('logo'), type: 'logos', left: null, center: slot, right: null, height: 60, centerText: '', rule: false, style: textStyle });
        report.guessed.push(`Garde : logo seul supposé être celui de ${slot === 'school' ? 'l’établissement' : slot === 'company' ? 'l’entreprise' : 'du département'}`);
      }
      continue;
    }
    if (!text) {
      const after = Number(attrOf(pPrOf(p), 'w:spacing', 'w:after') || 0) + Number(attrOf(pPrOf(p), 'w:spacing', 'w:before') || 0);
      if (after >= 240) blocks.push({ id: id('space'), type: 'spacer', height: Math.min(60, Math.max(2, Math.round(after / 56.7))), grow: after >= 800, style: textStyle });
      continue;
    }
    const label = genericLabel(text);
    const fill = shadingOf(pPrOf(p));
    if (fill || (label === 'THÈME')) {
      if (label === 'Année académique') {
        blocks.push({ id: id('year'), type: 'year-banner', template: 'Année académique {year}', variant: 'band', style: textStyle });
      } else {
        const prefix = label === 'THÈME' ? (text.match(/^th[eè]me\s*:?/i)?.[0].replace(/\s*:?$/, ' :').toUpperCase() ?? 'THÈME :') : '';
        blocks.push({ id: id('title'), type: 'title-banner', prefix, variant: fill ? 'band' : 'plain', style: textStyle });
      }
      if (fill) style.page.bandColor = fill;
      report.sure.push(`Garde : bandeau ${fill ?? ''} « ${label === 'Année académique' ? 'Année académique' : `${label === 'THÈME' ? 'THÈME : ' : ''}titre`} »`.trim());
      continue;
    }
    if (label && /présenté par/i.test(label)) {
      blocks.push({ id: id('author'), type: 'author', label: `${label} :`, matriculeLabel: 'Matricule :', style: textStyle });
      skipName = fold(text).replace(/[\s:]+$/, '') === fold(label);
      report.sure.push(`Garde : « ${label} : » suivi du nom`);
      continue;
    }
    if (label === 'Matricule') continue; // printed by the author block
    if (label === 'Sous l’encadrement de' || label === 'Sous la direction de') {
      pendingSupervisorLabel = `${label} :`;
      continue;
    }
    if (label === 'Année académique') {
      const rule = Boolean(attrOf(pPrOf(p), 'w:top', 'w:val'));
      blocks.push({ id: id('year'), type: 'year-banner', template: 'Année académique {year}', variant: rule ? 'rule' : 'plain', style: textStyle });
      continue;
    }
    if (label && isGeneric(text)) {
      blocks.push({ id: id('heading'), type: 'heading', text, style: textStyle });
      continue;
    }
    if (/^en vue de l.obtention/i.test(fold(text))) {
      blocks.push({ id: id('degree'), type: 'text', template: 'En vue de l’obtention du {degree}', style: textStyle });
      report.guessed.push('Garde : « En vue de l’obtention du … » avec le diplôme de l’étudiant');
      continue;
    }
    if (skipName) {
      skipName = false;
      continue; // the student's name, printed by the author block
    }
    dropped += 1;
  }
  if (pendingSupervisorLabel) {
    blocks.push({
      id: id('supervisors'), type: 'supervisors', layout: 'columns', label: pendingSupervisorLabel, academicLabel: 'Encadreur académique',
      corporateLabel: 'Encadreur professionnel', authorLabel: '', matriculeLabel: '', specialtyLabel: '', style: { ...textStyleOf('', bodySize), align: 'left' },
    });
  }
  if (dropped) report.missing.push(`${dropped} élément(s) de la garde propres au rapport n’ont pas été repris (texte libre)`);
  if (!blocks.length) report.missing.push('Page de garde (rien de reconnu)');
  return { blocks, logos };
};

// ── Entry point ─────────────────────────────────────────────────────────────

export const importDocxTemplate = async (data: Buffer): Promise<ImportedTemplate> => {
  if (data.length > MAX_TEMPLATE_FILE_BYTES) throw new TemplateImportError('Fichier trop volumineux (20 Mo maximum).', 413);
  if (detectFileType(data)?.extension !== 'docx') throw new TemplateImportError('Ce fichier n’est pas un document Word (.docx).', 415);
  let total: number;
  try {
    total = zipUncompressedTotal(data);
  } catch {
    throw new TemplateImportError('Ce fichier Word est endommagé.');
  }
  if (total > MAX_UNCOMPRESSED_BYTES) throw new TemplateImportError('Ce fichier Word est trop lourd une fois décompressé.', 413);
  const zip = await JSZip.loadAsync(data);
  if (Object.keys(zip.files).length > MAX_ENTRIES) throw new TemplateImportError('Ce fichier Word contient trop d’éléments.');

  const readXml = async (name: string): Promise<string> => {
    const file = zip.file(name);
    if (!file) return '';
    const xml = await file.async('string');
    if (xml.length > MAX_XML_BYTES) throw new TemplateImportError('Ce fichier Word contient un élément trop lourd.');
    return rejectDtd(xml);
  };

  const report: ImportReport = { sure: [], guessed: [], missing: [] };
  const style = presetStyle('classique');
  const documentXml = await readXml('word/document.xml');
  if (!documentXml) throw new TemplateImportError('Ce fichier n’est pas un document Word (.docx).', 415);
  const rels = relsMap(await readXml('word/_rels/document.xml.rels'));

  readStyles(await readXml('word/styles.xml'), style, report);
  const { last } = readPage(documentXml, style, report);

  const reference = (sectPr: string, kind: 'header' | 'footer') => {
    const refs = elements(sectPr, `w:${kind}Reference`);
    const ref = refs.find((r) => attr(r, 'w:type') === 'default') ?? refs[0];
    const target = ref ? rels.get(attr(ref, 'r:id') || '') : null;
    return target ? `word/${target.replace(/^\/?word\//, '')}` : null;
  };
  const headerName = reference(last, 'header');
  const footerName = reference(last, 'footer');
  if (headerName) readHeader(await readXml(headerName), style, report);
  else report.missing.push('En-tête du corps');
  if (footerName) readFooter(await readXml(footerName), style, report);
  else report.missing.push('Pied de page du corps');

  if (/w:val="❖"|w:val="v"/.test(await readXml('word/numbering.xml'))) {
    style.lists.bullet = 'diamond';
    report.sure.push('Puces en losange ❖');
  }

  const body = elements(documentXml, 'w:body')[0] ?? documentXml;
  const outline = readBody(body, style, report);
  const cover = await readCover(body, zip, rels, style, report);
  style.cover.blocks = cover.blocks.length ? cover.blocks : null;

  return { style: resolveStyle(style), outline, logos: cover.logos, report };
};
