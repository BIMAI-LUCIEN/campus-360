import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { stitchColors } from '../../theme/stitch';
import type { CvRubrique, CvRubriqueKind } from '../../types';
import { suggestMissions } from '../documents/cvJuryApi';
import { AddButton, Field, fieldStyles, ItemCard, linesToList } from '../profile/cvFields';
import { formatCvMonth, RUBRIQUE_TITRES } from './cvHtml';

const MONTH_LABELS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** Month + year picker ("2025-06"), with "ce jour" for an end date. */
export function MonthYearField({ label, value, onChange, allowPresent, testID }: {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  allowPresent?: boolean;
  testID?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 18 }, (_, i) => thisYear + 1 - i);
  const current = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  const [year, setYear] = React.useState<number>(current ? Number(current[1]) : thisYear);
  const shown = value === 'present' ? 'Ce jour' : formatCvMonth(value) || 'Choisir';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable testID={testID} style={styles.dateButton} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.dateText}>{shown}</Text>
      </Pressable>
      {open ? (
        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {years.map((y) => (
              <Pressable key={y} testID={testID ? `${testID}-y${y}` : undefined} style={[styles.chip, y === year && styles.chipOn]} onPress={() => setYear(y)}>
                <Text style={[styles.chipText, y === year && styles.chipTextOn]}>{y}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.months}>
            {MONTH_LABELS.map((m, i) => {
              const v = `${year}-${String(i + 1).padStart(2, '0')}`;
              return (
                <Pressable key={m} testID={testID ? `${testID}-m${i + 1}` : undefined} style={[styles.chip, v === value && styles.chipOn]} onPress={() => { onChange(v); setOpen(false); }}>
                  <Text style={[styles.chipText, v === value && styles.chipTextOn]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.chips}>
            {allowPresent ? (
              <Pressable testID={testID ? `${testID}-present` : undefined} style={[styles.chip, value === 'present' && styles.chipOn]} onPress={() => { onChange('present'); setOpen(false); }}>
                <Text style={[styles.chipText, value === 'present' && styles.chipTextOn]}>Ce jour</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.chip} onPress={() => { onChange(undefined); setOpen(false); }}>
              <Text style={styles.chipText}>Effacer</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Start and end of an experience or a training; they replace the free "Période" on the CV. */
export function DateRangeFields({ debut, fin, onChange, testID }: {
  debut?: string;
  fin?: string;
  onChange: (range: { debut?: string; fin?: string }) => void;
  testID?: string;
}) {
  return (
    <View style={fieldStyles.row}>
      <View style={fieldStyles.half}>
        <MonthYearField label="Début" value={debut} onChange={(v) => onChange({ debut: v, fin })} testID={testID ? `${testID}-debut` : undefined} />
      </View>
      <View style={fieldStyles.half}>
        <MonthYearField label="Fin" value={fin} allowPresent onChange={(v) => onChange({ debut, fin: v })} testID={testID ? `${testID}-fin` : undefined} />
      </View>
    </View>
  );
}

/** Mission bullets suggested for the job title; only those the student taps go into the CV. */
export function MissionSuggestions({ poste, missions, onAdd, testID }: {
  poste: string;
  missions: string[];
  onAdd: (mission: string) => void;
  testID?: string;
}) {
  const [items, setItems] = React.useState<string[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setItems(await suggestMissions(poste));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suggestions indisponibles.');
    } finally {
      setBusy(false);
    }
  };

  if (poste.trim().length < 2) return null;
  return (
    <View style={styles.suggest}>
      {items === null ? (
        <Pressable testID={testID} style={styles.suggestButton} onPress={load} disabled={busy}>
          {busy ? <ActivityIndicator color={stitchColors.primary} /> : <Text style={styles.suggestText}>Suggestions de missions</Text>}
        </Pressable>
      ) : (
        <>
          <Text style={styles.hint}>Ajoute seulement ce que tu as vraiment fait.</Text>
          {items.map((item, i) => {
            const added = missions.includes(item);
            return (
              <Pressable
                key={item}
                testID={testID ? `${testID}-item-${i}` : undefined}
                style={[styles.suggestion, added && styles.suggestionAdded]}
                disabled={added}
                onPress={() => onAdd(item)}
              >
                <Text style={styles.plus}>{added ? '✓' : '+'}</Text>
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            );
          })}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const ADDABLE: CvRubriqueKind[] = ['activites', 'certificats', 'realisations', 'personnalisee'];

/** Optional sections, in the printed order: add, rename, move up or down, remove. */
export function RubriquesEditor({ rubriques, onChange }: { rubriques: CvRubrique[]; onChange: (next: CvRubrique[]) => void }) {
  const move = (i: number, step: number) => {
    const j = i + step;
    if (j < 0 || j >= rubriques.length) return;
    const next = [...rubriques];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const update = (i: number, p: Partial<CvRubrique>) => onChange(rubriques.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const available = ADDABLE.filter((kind) => kind === 'personnalisee' || !rubriques.some((r) => r.kind === kind));

  return (
    <View>
      {rubriques.map((r, i) => (
        <ItemCard key={r.id} title={r.titre || RUBRIQUE_TITRES[r.kind]} onRemove={() => onChange(rubriques.filter((_, j) => j !== i))}>
          <View style={styles.moveRow}>
            <Pressable testID={`cv-rubrique-up-${i}`} style={[styles.chip, i === 0 && styles.disabled]} disabled={i === 0} onPress={() => move(i, -1)}>
              <Text style={styles.chipText}>Monter</Text>
            </Pressable>
            <Pressable testID={`cv-rubrique-down-${i}`} style={[styles.chip, i === rubriques.length - 1 && styles.disabled]} disabled={i === rubriques.length - 1} onPress={() => move(i, 1)}>
              <Text style={styles.chipText}>Descendre</Text>
            </Pressable>
          </View>
          <Field label="Titre de la rubrique" value={r.titre} onChangeText={(titre) => update(i, { titre })} />
          <Field
            label="Contenu"
            value={r.items.join('\n')}
            onChangeText={(v) => update(i, { items: linesToList(v) })}
            placeholder="Une ligne par élément"
            multiline
          />
        </ItemCard>
      ))}
      {available.map((kind) => (
        <AddButton
          key={kind}
          label={`Ajouter : ${RUBRIQUE_TITRES[kind]}`}
          onPress={() => onChange([...rubriques, { id: `${kind}-${Date.now()}`, kind, titre: kind === 'personnalisee' ? '' : RUBRIQUE_TITRES[kind], items: [] }])}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: stitchColors.ink, marginBottom: 6 },
  dateButton: { minHeight: 44, borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  dateText: { fontSize: 14, color: stitchColors.ink },
  panel: { marginTop: 6, gap: 8, padding: 8, borderRadius: 10, backgroundColor: stitchColors.paperSoft },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, minHeight: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, backgroundColor: stitchColors.white },
  chipOn: { borderColor: stitchColors.primary, backgroundColor: stitchColors.primaryContainer },
  chipText: { fontSize: 12, color: stitchColors.ink },
  chipTextOn: { color: stitchColors.primary, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  moveRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  suggest: { gap: 6, marginBottom: 12 },
  suggestButton: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center' },
  suggestText: { color: stitchColors.primary, fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 12, color: stitchColors.inkMuted },
  suggestion: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh },
  suggestionAdded: { borderColor: stitchColors.emerald, backgroundColor: stitchColors.paperSoft },
  plus: { fontSize: 16, fontWeight: '700', color: stitchColors.primary, width: 16 },
  suggestionText: { flex: 1, fontSize: 13, color: stitchColors.ink },
  error: { fontSize: 12, color: stitchColors.error },
});
