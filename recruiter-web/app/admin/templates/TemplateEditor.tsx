'use client';

import { ArrowDown, ArrowUp, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Button, Card, IconButton, PageHeader, Pill, Skeleton } from '../_components/ui';
import { CoverBlocksEditor, looksLikeName } from './CoverBlocksEditor';
import { ExtractionReport } from './ExtractionReport';
import {
  COLORS,
  FONTS,
  KIND_LABELS,
  readError,
  STATUS_LABELS,
  TABLE_COLORS,
  type CoverBlock,
  type LogoSlot,
  type Template,
  type TemplateKind,
  type TemplateStyle,
} from './types';

const LOGO_LABELS: Record<LogoSlot, string> = { school: 'Établissement', department: 'Département', company: 'Entreprise' };
const field = 'h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-fg';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block text-[12px] text-fg-subtle">
    {label}
    <div className="mt-0.5">{children}</div>
  </label>
);

function Select<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  );
}

const Swatches = ({ value, palette, onChange }: { value: string; palette: string[]; onChange: (value: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {palette.map((color) => (
      <button
        key={color}
        type="button"
        aria-label={`Couleur ${color}`}
        onClick={() => onChange(color)}
        className={`h-6 w-6 cursor-pointer rounded-full border ${value.toUpperCase() === color ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
        style={{ background: color }}
      />
    ))}
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card className="space-y-3">
    <p className="font-semibold text-fg">{title}</p>
    {children}
  </Card>
);

// The style without the keys the server does not accept back.
const styleForServer = (style: TemplateStyle) => {
  const { version: _version, ...rest } = style as TemplateStyle & { version?: number };
  return rest;
};

// Workshop of one template: settings on the left, live preview on the right.
export function TemplateEditor({ id }: { id: string }) {
  const router = useRouter();
  const showReport = useSearchParams()?.get('import') === '1';
  const [template, setTemplate] = useState<Template | null>(null);
  const [draft, setDraft] = useState<Template | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/templates/${id}`, { cache: 'no-store' });
    if (!response.ok) return setError(await readError(response));
    const body = (await response.json()) as { template: Template };
    setTemplate(body.template);
    setDraft(body.template);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Preview refreshed 400 ms after the last change.
  useEffect(() => {
    if (!draft) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const response = await fetch('/api/admin/templates/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentStyle: styleForServer(draft.document_style), outline: draft.outline.length ? draft.outline : [{ title: 'Chapitre 1' }], templateId: id }),
      });
      if (response.ok) setPreview(((await response.json()) as { html: string }).html);
      else setNotice(`Aperçu : ${await readError(response)}`);
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, id]);

  if (error) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!draft || !template) return <Skeleton className="h-96" />;

  const style = draft.document_style;
  const setStyle = <K extends keyof TemplateStyle>(key: K, patch: Partial<TemplateStyle[K]>) =>
    setDraft({ ...draft, document_style: { ...style, [key]: { ...(style[key] as object), ...patch } } });
  const blocks: CoverBlock[] = style.cover.blocks ?? [];
  const dirty = JSON.stringify(draft) !== JSON.stringify(template);
  const archived = template.status === 'archived';

  const save = async () => {
    setBusy('save');
    setError(null);
    const response = await fetch(`/api/admin/templates/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: draft.name,
        establishment: draft.establishment,
        degree: draft.degree,
        kind: draft.kind,
        documentStyle: styleForServer(draft.document_style),
        outline: draft.outline,
      }),
    });
    setBusy(null);
    if (!response.ok) return setNotice(await readError(response));
    const body = (await response.json()) as { template: Template };
    setTemplate(body.template);
    setDraft(body.template);
    setNotice('Modèle enregistré.');
  };

  const setStatus = async (status: 'published' | 'draft' | 'archived') => {
    if (status === 'archived' && !window.confirm('Archiver ce modèle ? Il ne sera plus proposé aux étudiants ni modifiable.')) return;
    if (dirty) await save();
    setBusy(status);
    const response = await fetch(`/api/admin/templates/${id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    if (!response.ok) return setNotice(await readError(response));
    const body = (await response.json()) as { template: Template; previewError: string | null };
    setTemplate(body.template);
    setDraft(body.template);
    setNotice(body.previewError ?? `Statut : ${STATUS_LABELS[body.template.status]}.`);
  };

  const uploadLogo = async (slot: LogoSlot, file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('slot', slot);
    setBusy(`logo-${slot}`);
    const response = await fetch(`/api/admin/templates/${id}/assets`, { method: 'POST', body: form });
    setBusy(null);
    if (!response.ok) return setNotice(await readError(response));
    const body = (await response.json()) as { template: Template };
    setTemplate({ ...template, logos: body.template.logos });
    setDraft({ ...draft, logos: body.template.logos });
  };

  const removeLogo = async (slot: LogoSlot) => {
    const response = await fetch(`/api/admin/templates/${id}/assets?slot=${slot}`, { method: 'DELETE' });
    if (!response.ok) return setNotice(await readError(response));
    const body = (await response.json()) as { template: Template };
    setTemplate({ ...template, logos: body.template.logos });
    setDraft({ ...draft, logos: body.template.logos });
  };

  const outline = draft.outline;
  const setOutline = (next: Template['outline']) => setDraft({ ...draft, outline: next.slice(0, 40) });
  const moveSection = (index: number, delta: number) => {
    const next = [...outline];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item);
    setOutline(next);
  };
  const nameWarning = [draft.name, draft.establishment].some(looksLikeName);

  return (
    <div>
      <PageHeader
        title={draft.name || 'Modèle'}
        subtitle={[draft.establishment, draft.degree, KIND_LABELS[draft.kind]].filter(Boolean).join(' · ')}
        breadcrumb={{ parent: 'Modèles de rapport', current: 'Atelier' }}
        actions={
          <>
            <Pill tone={template.status === 'published' ? 'green' : template.status === 'draft' ? 'amber' : 'neutral'}>{STATUS_LABELS[template.status]}</Pill>
            <Button variant="secondary" onClick={() => router.push('/admin/templates')}>Retour</Button>
            <Button icon={Save} loading={busy === 'save'} disabled={!dirty || archived} onClick={save}>Enregistrer</Button>
            {template.status !== 'published' && !archived ? <Button loading={busy === 'published'} onClick={() => setStatus('published')}>Publier</Button> : null}
            {template.status === 'published' ? <Button variant="secondary" loading={busy === 'draft'} onClick={() => setStatus('draft')}>Repasser en brouillon</Button> : null}
            {!archived ? <Button variant="danger" loading={busy === 'archived'} onClick={() => setStatus('archived')}>Archiver</Button> : null}
          </>
        }
      />
      {notice ? <p className="mb-4 rounded-md bg-surface-2 px-4 py-3 text-sm text-fg">{notice}</p> : null}
      {template.source_report && (showReport || template.status === 'draft') ? (
        <div className="mb-6">
          <p className="mb-2 font-semibold text-fg">Ce que l’import a compris ({template.source_format === 'pdf' ? 'PDF, approché' : 'Word'})</p>
          <ExtractionReport report={template.source_report} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <fieldset disabled={archived} className="space-y-4">
          <Section title="Identité">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="Nom"><input className={field} value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Row>
              <Row label="Établissement"><input className={field} value={draft.establishment} maxLength={120} onChange={(e) => setDraft({ ...draft, establishment: e.target.value })} /></Row>
              <Row label="Diplôme"><input className={field} value={draft.degree} maxLength={120} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} /></Row>
              <Row label="Type">
                <Select<TemplateKind> value={draft.kind} options={(Object.keys(KIND_LABELS) as TemplateKind[]).map((k) => [k, KIND_LABELS[k]])} onChange={(kind) => setDraft({ ...draft, kind })} />
              </Row>
            </div>
            {nameWarning ? <p className="text-[12px] text-danger">Un modèle ne doit contenir aucun nom ni matricule.</p> : null}
          </Section>

          <Section title="Texte et titres">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="Police du texte"><Select value={style.typography.bodyFont} options={FONTS.map((f) => [f, f])} onChange={(bodyFont) => setStyle('typography', { bodyFont })} /></Row>
              <Row label="Police des titres"><Select value={style.typography.headingFont} options={FONTS.map((f) => [f, f])} onChange={(headingFont) => setStyle('typography', { headingFont })} /></Row>
              <Row label="Taille (pt)"><input type="number" min={10} max={14} step={0.5} className={field} value={style.typography.bodySize} onChange={(e) => setStyle('typography', { bodySize: Number(e.target.value) })} /></Row>
              <Row label="Interligne"><input type="number" min={1} max={2.5} step={0.05} className={field} value={style.typography.lineSpacing} onChange={(e) => setStyle('typography', { lineSpacing: Number(e.target.value) })} /></Row>
              <Row label="Numérotation des titres">
                <Select value={style.headings.numbering} options={[['decimal', '1. / 1.1'], ['roman-alpha', 'I. / A.'], ['chapter-section-roman', 'CHAPITRE / SECTION / I.'], ['none', 'Aucune']]} onChange={(numbering) => setStyle('headings', { numbering })} />
              </Row>
              <Row label="Marges">
                <Select value={style.page.margins} options={[['narrow', 'Étroites (1,5 cm)'], ['normal', 'Normales (2,5 cm)'], ['wide', 'Larges (3 cm)']]} onChange={(margins) => setStyle('page', { margins })} />
              </Row>
            </div>
            <label className="flex items-center gap-2 text-sm text-fg-muted"><input type="checkbox" checked={style.headings.uppercaseChapters} onChange={(e) => setStyle('headings', { uppercaseChapters: e.target.checked })} />Titres de chapitre en majuscules</label>
            <Row label="Couleur des titres"><Swatches value={style.headings.color} palette={COLORS} onChange={(color) => setStyle('headings', { color })} /></Row>
            <Row label="Couleur d’accent"><Swatches value={style.page.accentColor} palette={COLORS} onChange={(accentColor) => setStyle('page', { accentColor })} /></Row>
          </Section>

          <Section title="En-tête et pied de page">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="En-tête"><Select value={style.headerFooter.headerStyle} options={[['plain', 'Simple'], ['band', 'Bandeau coloré avec le titre']]} onChange={(headerStyle) => setStyle('headerFooter', { headerStyle })} /></Row>
              <Row label="Libellé avant le nom (pied)"><input className={field} value={style.headerFooter.authorLabel} maxLength={60} placeholder="Rédigé et présenté par :" onChange={(e) => setStyle('headerFooter', { authorLabel: e.target.value })} /></Row>
              <Row label="Pied, à gauche"><Select value={style.headerFooter.footerLeft} options={[['none', 'Rien'], ['author', 'Nom de l’étudiant'], ['title', 'Titre'], ['page', 'Numéro']]} onChange={(footerLeft) => setStyle('headerFooter', { footerLeft })} /></Row>
              <Row label="Pied, à droite"><Select value={style.headerFooter.footerRight} options={[['none', 'Rien'], ['page', 'Numéro'], ['author', 'Nom de l’étudiant'], ['title', 'Titre']]} onChange={(footerRight) => setStyle('headerFooter', { footerRight })} /></Row>
              <Row label="Numéro de page"><Select value={style.headerFooter.pageNumberFrame} options={[['none', 'Sans cadre'], ['box', 'Encadré']]} onChange={(pageNumberFrame) => setStyle('headerFooter', { pageNumberFrame })} /></Row>
              <Row label="Format du numéro"><Select value={style.headerFooter.numberFormat} options={[['n', '3'], ['page-n', 'Page 3'], ['n-of-total', '3 / 42']]} onChange={(numberFormat) => setStyle('headerFooter', { numberFormat })} /></Row>
            </div>
            {style.headerFooter.headerStyle === 'band' ? (
              <>
                <Row label="Couleur du bandeau"><Swatches value={style.page.bandColor} palette={COLORS} onChange={(bandColor) => setStyle('page', { bandColor })} /></Row>
                <Row label="Couleur du texte du bandeau"><Swatches value={style.headerFooter.headerTextColor} palette={COLORS} onChange={(headerTextColor) => setStyle('headerFooter', { headerTextColor })} /></Row>
              </>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-fg-muted"><input type="checkbox" checked={style.headerFooter.footerRule} onChange={(e) => setStyle('headerFooter', { footerRule: e.target.checked })} />Filet au-dessus du pied</label>
          </Section>

          <Section title="Légendes, listes, tableaux">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="Numérotation des légendes"><Select value={style.captions.scope} options={[['chapter', 'Par chapitre (2.1)'], ['document', 'Sur tout le document']]} onChange={(scope) => setStyle('captions', { scope })} /></Row>
              <Row label="Présentation des légendes"><Select value={style.captions.style} options={[['italic-center', 'Italique centrée'], ['bold-left', 'Gras à gauche']]} onChange={(captionStyle) => setStyle('captions', { style: captionStyle })} /></Row>
              <Row label="Puces"><Select value={style.lists.bullet} options={[['disc', 'Ronde •'], ['diamond', 'Losange ❖']]} onChange={(bullet) => setStyle('lists', { bullet })} /></Row>
              <Row label="Tableaux"><Select value={style.tables.style} options={[['grid', 'Grille'], ['striped', 'Lignes alternées'], ['minimal', 'Sobre']]} onChange={(tableStyle) => setStyle('tables', { style: tableStyle })} /></Row>
            </div>
            <Row label="En-tête des tableaux"><Swatches value={style.tables.headerColor} palette={TABLE_COLORS} onChange={(headerColor) => setStyle('tables', { headerColor })} /></Row>
            <label className="flex items-center gap-2 text-sm text-fg-muted"><input type="checkbox" checked={style.dedication.frame} onChange={(e) => setStyle('dedication', { frame: e.target.checked })} />Dédicace encadrée</label>
          </Section>

          <Section title="Logos (aperçu de l’atelier)">
            <p className="text-[12px] text-fg-subtle">Un modèle publié ne montre pas ces logos aux étudiants s’ils appartiennent à un établissement : chaque étudiant ajoute les siens.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['school', 'department', 'company'] as LogoSlot[]).map((slot) => (
                <div key={slot} className="rounded-md border border-border p-2 text-center">
                  <p className="mb-1 text-[12px] text-fg-subtle">{LOGO_LABELS[slot]}</p>
                  <div className="mb-2 flex h-16 items-center justify-center bg-surface-2">
                    {draft.logos[slot] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.logos[slot] as string} alt="" className="max-h-16 max-w-full object-contain" />
                    ) : (
                      <span className="text-[11px] text-fg-faint">Vide</span>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-[12px] text-primary">
                    <Upload size={13} /> {busy === `logo-${slot}` ? 'Envoi…' : 'Choisir'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadLogo(slot, e.target.files?.[0])} />
                  </label>
                  {draft.logos[slot] ? <IconButton icon={Trash2} label="Retirer" variant="danger" onClick={() => removeLogo(slot)} /> : null}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Page de garde (blocs)">
            {blocks.length === 0 ? <p className="text-[13px] text-fg-subtle">Garde du style prêt « {style.cover.template} ». Ajoutez des blocs pour la décrire vous-même.</p> : null}
            <CoverBlocksEditor blocks={blocks} onChange={(next) => setStyle('cover', { blocks: next.length ? next : null })} />
          </Section>

          <Section title="Plan des sections">
            {outline.map((section, index) => (
              <div key={index} className="flex items-center gap-1">
                <input className={field} value={section.title} maxLength={160} onChange={(e) => setOutline(outline.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))} />
                <IconButton icon={ArrowUp} label="Monter" onClick={() => moveSection(index, -1)} disabled={index === 0} />
                <IconButton icon={ArrowDown} label="Descendre" onClick={() => moveSection(index, 1)} disabled={index === outline.length - 1} />
                <IconButton icon={Trash2} label="Supprimer" variant="danger" onClick={() => setOutline(outline.filter((_, i) => i !== index))} />
              </div>
            ))}
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setOutline([...outline, { title: 'Nouvelle section' }])}>Ajouter une section</Button>
          </Section>
        </fieldset>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card padded={false} className="overflow-hidden">
            <p className="border-b border-border px-4 py-2 text-[13px] font-semibold text-fg">Aperçu (données fictives)</p>
            <iframe title="Aperçu du modèle" sandbox="" srcDoc={preview} className="h-[80vh] w-full bg-surface-2" />
          </Card>
        </div>
      </div>
    </div>
  );
}
