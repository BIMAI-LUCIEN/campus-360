'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { IconButton } from '../_components/ui';
import { COLORS, type CoverBlock, type CoverTextStyle } from './types';

const TYPE_LABELS: Record<CoverBlock['type'], string> = {
  'bilingual-header': 'En-tête bilingue',
  logos: 'Logos',
  'title-banner': 'Bandeau du thème',
  heading: 'Titre',
  text: 'Texte à trous',
  author: 'Auteur',
  supervisors: 'Encadreurs',
  'year-banner': 'Bandeau d’année',
  spacer: 'Espace',
  'extra-lines': 'Lignes libres',
};

const FIELDS = '{university} {school} {faculty} {kindLabel} {degree} {title} {subtitle} {studentName} {matricule} {specialty} {company} {period} {tutorCorporate} {tutorAcademic} {year}';

const DEFAULT_STYLE: CoverTextStyle = { align: 'center', size: 11, bold: false, italic: false, uppercase: false, underline: false, color: null };

const NEW_BLOCKS: Record<CoverBlock['type'], Omit<CoverBlock, 'id' | 'style'>> = {
  'bilingual-header': { type: 'bilingual-header', left: ['**RÉPUBLIQUE DU CAMEROUN**', '*Paix – Travail – Patrie*', '{university}'], right: ['**REPUBLIC OF CAMEROON**', '*Peace – Work – Fatherland*', '{university}'], center: null },
  logos: { type: 'logos', left: 'department', center: 'school', right: 'company', height: 60, centerText: '', rule: false },
  'title-banner': { type: 'title-banner', prefix: 'THÈME :', variant: 'band' },
  heading: { type: 'heading', text: 'RAPPORT DE STAGE ACADÉMIQUE' },
  text: { type: 'text', template: 'Stage effectué {period} en vue de l’obtention du {degree}' },
  author: { type: 'author', label: 'Rédigé et présenté par :', matriculeLabel: 'Matricule :' },
  supervisors: { type: 'supervisors', layout: 'columns', label: 'Sous l’encadrement de :', academicLabel: 'Encadreur académique', corporateLabel: 'Encadreur professionnel', authorLabel: '', matriculeLabel: '', specialtyLabel: '' },
  'year-banner': { type: 'year-banner', template: 'Année académique {year}', variant: 'band' },
  spacer: { type: 'spacer', height: 10, grow: false },
  'extra-lines': { type: 'extra-lines' },
};

// Two capitalised words that are not a known label look like a person's name.
const KNOWN = /RÉPUBLIQUE|REPUBLIC|CAMEROUN|CAMEROON|RAPPORT|STAGE|MÉMOIRE|THÈME|ANNÉE|ACADÉMIQUE|PAIX|TRAVAIL|PATRIE|PEACE|WORK|FATHERLAND|ENCADREUR|MATRICULE/;
export const looksLikeName = (text: string) =>
  /\b[A-ZÀ-Ý][A-ZÀ-Ý-]{2,}\s+[A-ZÀ-Ý][A-ZÀ-Ý-]{2,}\b/.test(text.replace(/\{[^}]+\}|\*+/g, '')) && !KNOWN.test(text);

const input = 'h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-fg';

export function CoverBlocksEditor({ blocks, onChange }: { blocks: CoverBlock[]; onChange: (blocks: CoverBlock[]) => void }) {
  const update = (index: number, patch: Partial<CoverBlock>) => onChange(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  const updateStyle = (index: number, patch: Partial<CoverTextStyle>) => update(index, { style: { ...blocks[index].style, ...patch } });
  const move = (index: number, delta: number) => {
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item);
    onChange(next);
  };
  const add = (type: CoverBlock['type']) => {
    let n = blocks.length + 1;
    while (blocks.some((b) => b.id === `bloc-${n}`)) n += 1;
    onChange([...blocks, { ...NEW_BLOCKS[type], id: `bloc-${n}`, style: { ...DEFAULT_STYLE } } as CoverBlock]);
  };

  const textField = (index: number, key: string, label: string, max = 160) => {
    const value = String(blocks[index][key] ?? '');
    return (
      <label className="block text-[12px] text-fg-subtle">
        {label}
        <input className={input} value={value} maxLength={max} onChange={(e) => update(index, { [key]: e.target.value })} />
        {looksLikeName(value) ? <span className="text-[12px] text-danger">Un modèle ne doit contenir aucun nom ni matricule.</span> : null}
      </label>
    );
  };
  const linesField = (index: number, key: string, label: string) => {
    const lines = (blocks[index][key] as string[] | undefined) ?? [];
    const joined = lines.join('\n');
    return (
      <label className="block text-[12px] text-fg-subtle">
        {label} (une ligne par ligne, 8 au plus)
        <textarea className={`${input} h-24 py-1`} value={joined} onChange={(e) => update(index, { [key]: e.target.value.split('\n').slice(0, 8).map((l) => l.slice(0, 120)) })} />
        {looksLikeName(joined) ? <span className="text-[12px] text-danger">Un modèle ne doit contenir aucun nom ni matricule.</span> : null}
      </label>
    );
  };
  const slotField = (index: number, key: string, label: string) => (
    <label className="block text-[12px] text-fg-subtle">
      {label}
      <select className={input} value={String(blocks[index][key] ?? '')} onChange={(e) => update(index, { [key]: e.target.value || null })}>
        <option value="">Aucun</option>
        <option value="school">Établissement</option>
        <option value="department">Département</option>
        <option value="company">Entreprise</option>
      </select>
    </label>
  );

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-fg-subtle">Champs disponibles dans les textes : {FIELDS}. « [ … ] » = partie facultative, **gras**, *italique*.</p>
      {blocks.map((block, index) => (
        <div key={block.id} className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-fg">{TYPE_LABELS[block.type]}</p>
            <div className="flex">
              <IconButton icon={ArrowUp} label="Monter" onClick={() => move(index, -1)} disabled={index === 0} />
              <IconButton icon={ArrowDown} label="Descendre" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} />
              <IconButton icon={Trash2} label="Supprimer" variant="danger" onClick={() => onChange(blocks.filter((_, i) => i !== index))} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {block.type === 'bilingual-header' ? (
              <>
                {linesField(index, 'left', 'Colonne de gauche')}
                {linesField(index, 'right', 'Colonne de droite')}
                {slotField(index, 'center', 'Logo au centre')}
              </>
            ) : null}
            {block.type === 'logos' ? (
              <>
                {slotField(index, 'left', 'À gauche')}
                {slotField(index, 'center', 'Au centre')}
                {slotField(index, 'right', 'À droite')}
                <label className="block text-[12px] text-fg-subtle">
                  Hauteur (pt)
                  <input type="number" min={20} max={120} className={input} value={Number(block.height ?? 60)} onChange={(e) => update(index, { height: Number(e.target.value) })} />
                </label>
              </>
            ) : null}
            {block.type === 'title-banner' ? (
              <>
                {textField(index, 'prefix', 'Préfixe (ex. THÈME :)', 60)}
                <label className="block text-[12px] text-fg-subtle">
                  Présentation
                  <select className={input} value={String(block.variant)} onChange={(e) => update(index, { variant: e.target.value })}>
                    <option value="band">Bandeau coloré</option>
                    <option value="frame">Filets dessus et dessous</option>
                    <option value="plain">Simple</option>
                  </select>
                </label>
              </>
            ) : null}
            {block.type === 'heading' ? textField(index, 'text', 'Texte') : null}
            {block.type === 'text' ? textField(index, 'template', 'Phrase à trous', 300) : null}
            {block.type === 'author' ? (
              <>
                {textField(index, 'label', 'Libellé', 60)}
                {textField(index, 'matriculeLabel', 'Libellé du matricule', 60)}
              </>
            ) : null}
            {block.type === 'supervisors' ? (
              <>
                {textField(index, 'label', 'Libellé', 60)}
                {textField(index, 'academicLabel', 'Encadreur académique', 60)}
                {textField(index, 'corporateLabel', 'Encadreur professionnel', 60)}
              </>
            ) : null}
            {block.type === 'year-banner' ? (
              <>
                {textField(index, 'template', 'Texte', 160)}
                <label className="block text-[12px] text-fg-subtle">
                  Présentation
                  <select className={input} value={String(block.variant)} onChange={(e) => update(index, { variant: e.target.value })}>
                    <option value="band">Bandeau coloré</option>
                    <option value="rule">Filet au-dessus</option>
                    <option value="plain">Simple</option>
                  </select>
                </label>
              </>
            ) : null}
            {block.type === 'spacer' ? (
              <label className="block text-[12px] text-fg-subtle">
                Hauteur (mm)
                <input type="number" min={2} max={60} className={input} value={Number(block.height ?? 10)} onChange={(e) => update(index, { height: Number(e.target.value) })} />
              </label>
            ) : null}
          </div>
          {block.type !== 'spacer' ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-fg-muted">
              <select className="h-8 rounded-md border border-border bg-surface px-2" value={block.style.align} onChange={(e) => updateStyle(index, { align: e.target.value as CoverTextStyle['align'] })}>
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
              </select>
              <label className="flex items-center gap-1">
                Taille
                <input type="number" min={8} max={28} step={0.5} className="h-8 w-16 rounded-md border border-border bg-surface px-2" value={block.style.size} onChange={(e) => updateStyle(index, { size: Number(e.target.value) })} />
              </label>
              {(['bold', 'italic', 'uppercase', 'underline'] as const).map((key) => (
                <label key={key} className="flex items-center gap-1">
                  <input type="checkbox" checked={block.style[key]} onChange={(e) => updateStyle(index, { [key]: e.target.checked })} />
                  {{ bold: 'Gras', italic: 'Italique', uppercase: 'Majuscules', underline: 'Souligné' }[key]}
                </label>
              ))}
              <select className="h-8 rounded-md border border-border bg-surface px-2" value={block.style.color ?? ''} onChange={(e) => updateStyle(index, { color: e.target.value || null })}>
                <option value="">Couleur par défaut</option>
                {COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Plus size={14} className="text-fg-subtle" />
        {(Object.keys(TYPE_LABELS) as CoverBlock['type'][]).map((type) => (
          <button key={type} type="button" className="cursor-pointer rounded-full border border-border px-3 py-1 text-[12px] text-fg-muted hover:bg-surface-2" onClick={() => add(type)} disabled={blocks.length >= 30}>
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
