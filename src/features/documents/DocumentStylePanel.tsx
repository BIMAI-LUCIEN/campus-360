import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, ChevronRight, Minus, Plus, Trash2, X } from 'lucide-react-native';

import { stitchColors } from '../../theme/stitch';
import { pickImageFromPhone, resolveFileUrls, uploadDocumentFile } from './documentFilesApi';
import { FONT_STACKS } from './documentRender';
import {
  STYLE_COLOR_PALETTE,
  STYLE_FONTS,
  STYLE_PRESETS,
  STYLE_PRESET_LABELS,
  TABLE_HEADER_PALETTE,
  type DocumentStyle,
  type DocumentStylePatch,
  type HeaderFooterSlot,
  type HeadingNumbering,
} from './documentStyle';
import { buildStyleSampleHtml } from './editorTemplate';
import { TemplateGallery } from './TemplateGallery';
import { applyTemplate } from './templatesApi';
import { EditorSurface } from './EditorSurface';

// « Style du document » : pick one of the four ready styles, then adjust each
// part. Every change is applied and saved at once (the parent sends the patch).

type Props = {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  style: DocumentStyle;
  onChange: (patch: DocumentStylePatch) => void;
  // Module 24: after a template was applied (style, cover, sections changed on the server).
  onTemplateApplied?: () => void;
  establishment?: string;
};

const PRESET_HINTS: Record<(typeof STYLE_PRESETS)[number], string> = {
  classique: 'Times 12, interligne 1,5, titres 1. / 1.1',
  moderne: 'Titres Calibri en couleur, texte Georgia',
  sobre: 'Arial, sans décoration, marges larges',
  institutionnel: 'Cambria, I. / A., cadre et logo',
};

const SLOT_LABELS: [HeaderFooterSlot, string][] = [
  ['none', 'Rien'],
  ['title', 'Titre'],
  ['chapter', 'Chapitre'],
  ['author', 'Nom'],
  ['school', 'École'],
  ['page', 'N° page'],
];

type LogoWhich = 'school' | 'company' | 'department';
const LOGO_KEYS = { school: 'schoolLogoFileId', company: 'companyLogoFileId', department: 'departmentLogoFileId' } as const;
const LOGO_LABELS: Record<LogoWhich, string> = {
  school: 'Logo de l’établissement',
  department: 'Logo du département',
  company: 'Logo de l’entreprise',
};

const NUMBERING_LABELS: Record<HeadingNumbering, string> = {
  decimal: '1. / 1.1',
  'roman-alpha': 'I. / A.',
  'chapter-section-roman': 'CHAPITRE / SECTION / I.',
  none: 'Sans numéro',
};

type ChipOption<T extends string | number> = { value: T; label: string };

function Chips<T extends string | number>({ options, value, onSelect, fontFor }: {
  options: ChipOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  fontFor?: (value: T) => string | undefined;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive, fontFor ? { fontFamily: fontFor(option.value) } : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const Colors = ({ palette, value, onSelect }: { palette: readonly string[]; value: string; onSelect: (value: string) => void }) => (
  <View style={styles.chips}>
    {palette.map((color) => (
      <Pressable
        key={color}
        onPress={() => onSelect(color)}
        style={[styles.swatch, { backgroundColor: color }, value.toUpperCase() === color.toUpperCase() && styles.swatchActive]}
        accessibilityLabel={`Couleur ${color}`}
      />
    ))}
  </View>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    {children}
  </View>
);

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: stitchColors.siennaSoft, false: stitchColors.glassBorder }}
      thumbColor={value ? stitchColors.primary : stitchColors.surface}
    />
  </View>
);

const Section = ({ title, summary, open, onToggle, children }: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Pressable style={styles.sectionHeader} onPress={onToggle} accessibilityRole="button">
      {open ? <ChevronDown size={16} color={stitchColors.ink} /> : <ChevronRight size={16} color={stitchColors.ink} />}
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSummary} numberOfLines={1}>{summary}</Text>
    </Pressable>
    {open ? <View style={styles.sectionBody}>{children}</View> : null}
  </View>
);

export function DocumentStylePanel({ visible, onClose, documentId, style, onChange, onTemplateApplied, establishment }: Props) {
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  const pickTemplate = (template: { id: string; name: string } | null) => {
    setGalleryVisible(false);
    if (!template) return;
    Alert.alert(
      template.name,
      'Le style, la page de garde et les sections manquantes du modèle seront ajoutés. Ton texte ne change pas.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appliquer',
          onPress: async () => {
            setApplying(true);
            try {
              const { addedSections } = await applyTemplate(documentId, template.id);
              onTemplateApplied?.();
              Alert.alert('Modèle appliqué', addedSections ? `${addedSections} section(s) ajoutée(s), vides.` : 'Aucune section à ajouter.');
            } catch (error) {
              Alert.alert('Modèle', error instanceof Error ? error.message : 'Application impossible.');
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  };
  const [open, setOpen] = useState<string | null>('typo');
  const [logoUrls, setLogoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<LogoWhich | null>(null);
  const sampleHtml = useMemo(() => buildStyleSampleHtml(style), [style]);
  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  const logoIds = [style.cover.schoolLogoFileId, style.cover.companyLogoFileId, style.cover.departmentLogoFileId].filter((v): v is string => Boolean(v));
  useEffect(() => {
    if (!visible || logoIds.length === 0) return;
    resolveFileUrls(logoIds).then(setLogoUrls).catch(() => undefined);
    // Re-resolve only when the logo ids change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, logoIds.join(',')]);

  const pickLogo = async (which: LogoWhich) => {
    try {
      const picked = await pickImageFromPhone();
      if (!picked) return;
      setUploading(which);
      const file = await uploadDocumentFile(documentId, picked, 'image');
      onChange({ cover: { [LOGO_KEYS[which]]: file.id } });
    } catch (error) {
      Alert.alert('Logo', error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setUploading(null);
    }
  };

  const lines = style.cover.extraLines;
  const setLines = (next: { label: string; value: string }[]) => onChange({ cover: { extraLines: next } });
  const hf = style.headerFooter;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Style du document</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Fermer">
            <X size={18} color={stitchColors.ink} />
          </Pressable>
        </View>

        <View style={styles.sample}>
          <EditorSurface html={sampleHtml} onMessage={() => undefined} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.templateBtn} onPress={() => setGalleryVisible(true)} disabled={applying} accessibilityRole="button">
            {applying ? <ActivityIndicator size="small" color={stitchColors.primary} /> : <Text style={styles.templateBtnText}>Changer de modèle d’établissement</Text>}
          </Pressable>
          <TemplateGallery visible={galleryVisible} onClose={() => setGalleryVisible(false)} onPick={pickTemplate} establishment={establishment} allowNone={false} />
          <Text style={styles.hint}>Choisissez un style, puis ajustez ce que vous voulez. Tout s’applique à l’écran et aux exports PDF et Word.</Text>
          <View style={styles.presets}>
            {STYLE_PRESETS.map((preset) => {
              const active = style.preset === preset;
              return (
                <Pressable key={preset} style={[styles.preset, active && styles.presetActive]} onPress={() => onChange({ preset })}>
                  <Text style={[styles.presetName, active && styles.presetNameActive]}>{STYLE_PRESET_LABELS[preset]}</Text>
                  <Text style={styles.presetHint}>{PRESET_HINTS[preset]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Section title="Typographie" summary={`${style.typography.bodyFont} · ${String(style.typography.bodySize).replace('.', ',')} pt · ${String(style.typography.lineSpacing).replace('.', ',')}`} open={open === 'typo'} onToggle={() => toggle('typo')}>
            <Row label="Police du texte">
              <Chips options={STYLE_FONTS.map((f) => ({ value: f, label: f }))} value={style.typography.bodyFont} onSelect={(bodyFont) => onChange({ typography: { bodyFont } })} fontFor={(f) => FONT_STACKS[f].split(',')[0].replace(/'/g, '')} />
            </Row>
            <Row label="Police des titres">
              <Chips options={STYLE_FONTS.map((f) => ({ value: f, label: f }))} value={style.typography.headingFont} onSelect={(headingFont) => onChange({ typography: { headingFont } })} fontFor={(f) => FONT_STACKS[f].split(',')[0].replace(/'/g, '')} />
            </Row>
            <Row label="Taille du texte">
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => onChange({ typography: { bodySize: Math.max(10, style.typography.bodySize - 0.5) } })} accessibilityLabel="Réduire">
                  <Minus size={16} color={stitchColors.ink} />
                </Pressable>
                <Text style={styles.stepValue}>{String(style.typography.bodySize).replace('.', ',')} pt</Text>
                <Pressable style={styles.stepBtn} onPress={() => onChange({ typography: { bodySize: Math.min(14, style.typography.bodySize + 0.5) } })} accessibilityLabel="Agrandir">
                  <Plus size={16} color={stitchColors.ink} />
                </Pressable>
              </View>
            </Row>
            <Toggle label="Retrait en début de paragraphe" value={style.typography.paragraphIndent} onChange={(paragraphIndent) => onChange({ typography: { paragraphIndent } })} />
            <Row label="Espace entre les paragraphes">
              <Chips options={[{ value: 'compact', label: 'Serré' }, { value: 'airy', label: 'Une ligne' }]} value={style.typography.paragraphSpacing} onSelect={(paragraphSpacing) => onChange({ typography: { paragraphSpacing } })} />
            </Row>
            <Row label="Interligne">
              <Chips options={[1, 1.15, 1.5, 2].map((v) => ({ value: v, label: String(v).replace('.', ',') }))} value={style.typography.lineSpacing} onSelect={(lineSpacing) => onChange({ typography: { lineSpacing } })} />
            </Row>
          </Section>

          <Section title="Titres" summary={NUMBERING_LABELS[style.headings.numbering]} open={open === 'titles'} onToggle={() => toggle('titles')}>
            <Row label="Numérotation">
              <Chips options={(['decimal', 'roman-alpha', 'chapter-section-roman', 'none'] as const).map((value) => ({ value, label: value === 'none' ? 'Aucune' : NUMBERING_LABELS[value] }))} value={style.headings.numbering} onSelect={(numbering) => onChange({ headings: { numbering } })} />
            </Row>
            <Toggle label="Titres de chapitre en majuscules" value={style.headings.uppercaseChapters} onChange={(uppercaseChapters) => onChange({ headings: { uppercaseChapters } })} />
            <Row label="Titres des parties (Dédicace, Chapitre 1…)">
              <Chips options={[{ value: 'left', label: 'À gauche' }, { value: 'center', label: 'Centrés' }]} value={style.headings.titleAlign} onSelect={(titleAlign) => onChange({ headings: { titleAlign } })} />
            </Row>
            <Toggle label="SECTION et sous-titres en majuscules" value={style.headings.uppercaseSections} onChange={(uppercaseSections) => onChange({ headings: { uppercaseSections } })} />
            <Row label="Taille des titres">
              <Chips options={[{ value: 'large', label: 'Grands' }, { value: 'normal', label: 'Taille du texte' }]} value={style.headings.titleSize} onSelect={(titleSize) => onChange({ headings: { titleSize } })} />
            </Row>
            <Toggle label="Trait sous les titres de chapitre" value={style.headings.rule} onChange={(rule) => onChange({ headings: { rule } })} />
            <Row label="Couleur des titres">
              <Colors palette={STYLE_COLOR_PALETTE} value={style.headings.color} onSelect={(color) => onChange({ headings: { color } })} />
            </Row>
          </Section>

          <Section title="Page" summary={`Marges ${style.page.margins === 'narrow' ? 'étroites' : style.page.margins === 'wide' ? 'larges' : 'normales'} · bordure ${style.page.border === 'none' ? 'aucune' : style.page.border === 'cover-only' ? 'page de garde' : style.page.border === 'double' ? 'double' : 'simple'}`} open={open === 'page'} onToggle={() => toggle('page')}>
            <Row label="Marges">
              <Chips options={[{ value: 'narrow', label: 'Étroites (1,5 cm)' }, { value: 'normal', label: 'Normales (2,5 cm)' }, { value: 'wide', label: 'Larges (3 cm)' }]} value={style.page.margins} onSelect={(margins) => onChange({ page: { margins } })} />
            </Row>
            <Row label="Bordure de page">
              <Chips options={[{ value: 'none', label: 'Aucune' }, { value: 'single', label: 'Simple' }, { value: 'double', label: 'Double' }, { value: 'cover-only', label: 'Page de garde seule' }]} value={style.page.border} onSelect={(border) => onChange({ page: { border } })} />
            </Row>
            <Row label="Couleur d’accent (bordures, filets, encadrés)">
              <Colors palette={STYLE_COLOR_PALETTE} value={style.page.accentColor} onSelect={(accentColor) => onChange({ page: { accentColor } })} />
            </Row>
          </Section>

          <Section title="En-tête et pied de page" summary={hf.numberFormat === 'page-n' ? '« Page 3 »' : hf.numberFormat === 'n-of-total' ? '« 3 / 42 »' : '« 3 »'} open={open === 'hf'} onToggle={() => toggle('hf')}>
            <Text style={styles.subHint}>Les pages préliminaires (dédicace, remerciements, sommaire…) sont numérotées i, ii, iii ; le texte principal repart à 1. La page de garde n’a pas de numéro.</Text>
            <Row label="En-tête, à gauche">
              <Chips options={SLOT_LABELS.filter(([v]) => v !== 'page').map(([value, label]) => ({ value, label }))} value={hf.headerLeft} onSelect={(headerLeft) => onChange({ headerFooter: { headerLeft } })} />
            </Row>
            <Row label="En-tête, à droite">
              <Chips options={SLOT_LABELS.map(([value, label]) => ({ value, label }))} value={hf.headerRight} onSelect={(headerRight) => onChange({ headerFooter: { headerRight } })} />
            </Row>
            <Row label="Pied de page, à gauche">
              <Chips options={SLOT_LABELS.map(([value, label]) => ({ value, label }))} value={hf.footerLeft} onSelect={(footerLeft) => onChange({ headerFooter: { footerLeft } })} />
            </Row>
            <Row label="Pied de page, au centre">
              <Chips options={SLOT_LABELS.map(([value, label]) => ({ value, label }))} value={hf.footerCenter} onSelect={(footerCenter) => onChange({ headerFooter: { footerCenter } })} />
            </Row>
            <Row label="Pied de page, à droite">
              <Chips options={SLOT_LABELS.map(([value, label]) => ({ value, label }))} value={hf.footerRight} onSelect={(footerRight) => onChange({ headerFooter: { footerRight } })} />
            </Row>
            <Row label="Format du numéro">
              <Chips options={[{ value: 'n', label: '3' }, { value: 'page-n', label: 'Page 3' }, { value: 'n-of-total', label: '3 / 42' }]} value={hf.numberFormat} onSelect={(numberFormat) => onChange({ headerFooter: { numberFormat } })} />
            </Row>
            <Row label="Numéro de page">
              <Chips options={[{ value: 'none', label: 'Sans cadre' }, { value: 'box', label: 'Encadré' }]} value={hf.pageNumberFrame} onSelect={(pageNumberFrame) => onChange({ headerFooter: { pageNumberFrame } })} />
            </Row>
            <Row label="En-tête">
              <Chips options={[{ value: 'plain', label: 'En-tête simple' }, { value: 'band', label: 'Bandeau coloré' }]} value={hf.headerStyle} onSelect={(headerStyle) => onChange({ headerFooter: { headerStyle } })} />
            </Row>
            {hf.headerStyle === 'band' ? (
              <>
                <Row label="Couleur du bandeau">
                  <Colors palette={STYLE_COLOR_PALETTE} value={style.page.bandColor} onSelect={(bandColor) => onChange({ page: { bandColor } })} />
                </Row>
                <Row label="Couleur du texte sur le bandeau">
                  <Colors palette={STYLE_COLOR_PALETTE} value={hf.headerTextColor} onSelect={(headerTextColor) => onChange({ headerFooter: { headerTextColor } })} />
                </Row>
              </>
            ) : null}
            <Row label="Libellé avant le nom">
              <TextInput
                style={styles.input}
                defaultValue={hf.authorLabel}
                placeholder="Rédigé et présenté par :"
                placeholderTextColor={stitchColors.inkMuted}
                maxLength={60}
                onEndEditing={(e) => onChange({ headerFooter: { authorLabel: e.nativeEvent.text } })}
              />
            </Row>
            <Toggle label="Trait sous l’en-tête" value={hf.headerRule} onChange={(headerRule) => onChange({ headerFooter: { headerRule } })} />
            <Toggle label="Filet au-dessus du pied" value={hf.footerRule} onChange={(footerRule) => onChange({ headerFooter: { footerRule } })} />
            <Toggle label="Logo de l’établissement dans l’en-tête" value={hf.logoInHeader} onChange={(logoInHeader) => onChange({ headerFooter: { logoInHeader } })} />
          </Section>

          <Section title="Page de garde" summary={({ classic: 'Classique', modern: 'Moderne', minimal: 'Minimal', institutional: 'Institutionnel' } as const)[style.cover.template]} open={open === 'cover'} onToggle={() => toggle('cover')}>
            <Row label="Modèle">
              <Chips options={[{ value: 'classic', label: 'Classique' }, { value: 'modern', label: 'Moderne' }, { value: 'minimal', label: 'Minimal' }, { value: 'institutional', label: 'Institutionnel' }]} value={style.cover.template} onSelect={(template) => onChange({ cover: { template } })} />
            </Row>
            {(['school', 'department', 'company'] as const).map((which) => {
              const fileId = style.cover[LOGO_KEYS[which]];
              const url = fileId ? logoUrls[fileId] : undefined;
              return (
                <Row key={which} label={LOGO_LABELS[which]}>
                  <View style={styles.logoRow}>
                    {url ? <Image source={{ uri: url }} style={styles.logo} resizeMode="contain" /> : <View style={[styles.logo, styles.logoEmpty]} />}
                    <Pressable style={styles.smallBtn} onPress={() => pickLogo(which)} disabled={uploading !== null}>
                      {uploading === which ? <ActivityIndicator size="small" color={stitchColors.primary} /> : <Text style={styles.smallBtnText}>{fileId ? 'Changer' : 'Choisir'}</Text>}
                    </Pressable>
                    {fileId ? (
                      <Pressable onPress={() => onChange({ cover: { [LOGO_KEYS[which]]: null } })} hitSlop={8} accessibilityLabel="Retirer le logo">
                        <Trash2 size={16} color={stitchColors.error} />
                      </Pressable>
                    ) : null}
                  </View>
                </Row>
              );
            })}
            <Row label="Lignes libres (jury, date de soutenance…)">
              {lines.map((line, index) => (
                <View key={index} style={styles.lineRow}>
                  <TextInput
                    style={[styles.input, styles.lineLabel]}
                    defaultValue={line.label}
                    placeholder="Intitulé"
                    placeholderTextColor={stitchColors.inkMuted}
                    maxLength={60}
                    onEndEditing={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, label: e.nativeEvent.text } : l)))}
                  />
                  <TextInput
                    style={[styles.input, styles.lineValue]}
                    defaultValue={line.value}
                    placeholder="Valeur"
                    placeholderTextColor={stitchColors.inkMuted}
                    maxLength={160}
                    onEndEditing={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, value: e.nativeEvent.text } : l)))}
                  />
                  <Pressable onPress={() => setLines(lines.filter((_, i) => i !== index))} hitSlop={8} accessibilityLabel="Retirer la ligne">
                    <Trash2 size={16} color={stitchColors.error} />
                  </Pressable>
                </View>
              ))}
              {lines.length < 6 ? (
                <Pressable style={styles.smallBtn} onPress={() => setLines([...lines, { label: 'Jury', value: '' }])}>
                  <Text style={styles.smallBtnText}>+ Ajouter une ligne</Text>
                </Pressable>
              ) : null}
            </Row>
          </Section>

          <Section title="Tableaux" summary={style.tables.style === 'grid' ? 'Grille' : style.tables.style === 'striped' ? 'Lignes alternées' : 'Sobre'} open={open === 'tables'} onToggle={() => toggle('tables')}>
            <Row label="Style">
              <Chips options={[{ value: 'grid', label: 'Grille' }, { value: 'striped', label: 'Lignes alternées' }, { value: 'minimal', label: 'Sobre' }]} value={style.tables.style} onSelect={(tableStyle) => onChange({ tables: { style: tableStyle } })} />
            </Row>
            <Row label="Couleur de l’en-tête">
              <Colors palette={TABLE_HEADER_PALETTE} value={style.tables.headerColor} onSelect={(headerColor) => onChange({ tables: { headerColor } })} />
            </Row>
          </Section>

          <Section title="Légendes" summary={`${style.captions.scope === 'document' ? 'Figure 1, 2, 3…' : 'Figure 2.1'} · ${style.captions.style === 'bold-left' ? 'gras à gauche' : 'italique centrée'}`} open={open === 'captions'} onToggle={() => toggle('captions')}>
            <Row label="Numérotation des figures et tableaux">
              <Chips options={[{ value: 'chapter', label: 'Par chapitre (2.1)' }, { value: 'document', label: 'Sur tout le document (1, 2, 3)' }]} value={style.captions.scope} onSelect={(scope) => onChange({ captions: { scope } })} />
            </Row>
            <Row label="Présentation">
              <Chips options={[{ value: 'italic-center', label: 'Italique centrée' }, { value: 'bold-left', label: 'Gras à gauche' }]} value={style.captions.style} onSelect={(captionStyle) => onChange({ captions: { style: captionStyle } })} />
            </Row>
            <Toggle label="« Figure 1 : » en gras" value={style.captions.boldLabel} onChange={(boldLabel) => onChange({ captions: { boldLabel } })} />
          </Section>

          <Section title="Listes" summary={style.lists.bullet === 'diamond' ? 'Losange ❖' : 'Puce ronde •'} open={open === 'lists'} onToggle={() => toggle('lists')}>
            <Row label="Puce">
              <Chips options={[{ value: 'disc', label: 'Ronde •' }, { value: 'diamond', label: 'Losange ❖' }]} value={style.lists.bullet} onSelect={(bullet) => onChange({ lists: { bullet } })} />
            </Row>
          </Section>

          <Section title="Pages préliminaires" summary={style.dedication.frame ? 'Dédicace encadrée' : 'Dédicace sans cadre'} open={open === 'prelim'} onToggle={() => toggle('prelim')}>
            <Toggle label="Encadrer la dédicace" value={style.dedication.frame} onChange={(frame) => onChange({ dedication: { frame } })} />
          </Section>
        </ScrollView>

        <Pressable style={styles.done} onPress={onClose}>
          <Text style={styles.doneText}>Terminé</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stitchColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
  },
  headerTitle: { color: stitchColors.ink, fontSize: 17, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: stitchColors.paperSoft },
  sample: { height: 190, borderBottomWidth: 1, borderBottomColor: stitchColors.glassBorder },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12, paddingBottom: 32 },
  hint: { color: stitchColors.inkMuted, fontSize: 12.5, lineHeight: 18 },
  templateBtn: { borderWidth: 1, borderColor: stitchColors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 12, backgroundColor: stitchColors.siennaBg },
  templateBtnText: { color: stitchColors.primary, fontWeight: '700', fontSize: 14 },
  subHint: { color: stitchColors.inkMuted, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  presetActive: { borderColor: stitchColors.primary, backgroundColor: stitchColors.siennaBg },
  presetName: { color: stitchColors.ink, fontSize: 14, fontWeight: '800' },
  presetNameActive: { color: stitchColors.siennaDeep },
  presetHint: { color: stitchColors.inkMuted, fontSize: 11.5, lineHeight: 15 },
  section: { borderWidth: 1, borderColor: stitchColors.glassBorder, borderRadius: 12, backgroundColor: stitchColors.surface, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  sectionTitle: { color: stitchColors.ink, fontSize: 14, fontWeight: '700' },
  sectionSummary: { flex: 1, textAlign: 'right', color: stitchColors.inkMuted, fontSize: 12 },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  row: { gap: 6 },
  rowLabel: { color: stitchColors.inkSoft, fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: stitchColors.glassBorder, backgroundColor: stitchColors.paperDeep },
  chipActive: { borderColor: stitchColors.primary, backgroundColor: stitchColors.siennaBg },
  chipText: { color: stitchColors.inkSoft, fontSize: 13 },
  chipTextActive: { color: stitchColors.siennaDeep, fontWeight: '800' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: stitchColors.outline },
  swatchActive: { borderWidth: 3, borderColor: stitchColors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel: { flex: 1, color: stitchColors.inkSoft, fontSize: 13.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: stitchColors.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: stitchColors.paperDeep },
  stepValue: { color: stitchColors.ink, fontSize: 14, fontWeight: '700', minWidth: 56, textAlign: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 64, height: 44, borderRadius: 6, backgroundColor: stitchColors.paperDeep },
  logoEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: stitchColors.outline },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: stitchColors.siennaBg, alignSelf: 'flex-start', minWidth: 80, alignItems: 'center' },
  smallBtnText: { color: stitchColors.siennaDeep, fontWeight: '700', fontSize: 13 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { borderWidth: 1, borderColor: stitchColors.glassBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: stitchColors.ink, fontSize: 13, backgroundColor: stitchColors.paperDeep },
  lineLabel: { width: '34%' },
  lineValue: { flex: 1 },
  done: { margin: 16, backgroundColor: stitchColors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  doneText: { color: stitchColors.white, fontWeight: '800', fontSize: 14 },
});
