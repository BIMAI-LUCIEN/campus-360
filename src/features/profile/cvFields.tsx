import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';

import { stitchColors, stitchRadius } from '../../theme/stitch';

// Small form pieces shared by "Mon parcours" and the editable application CV.
// One column, large touch targets, labels above fields: built for phones first.

/** Comma-separated text <-> list of strings. */
export const listToText = (items: string[]) => items.join(', ');
export const textToList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

/** One item per line <-> list of strings (missions). */
export const linesToList = (value: string) =>
  value
    .split('\n')
    .map((v) => v.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={stitchColors.inkSubtle}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A list edited as comma-separated text, kept as typed until the field loses focus. */
export function ListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline, { minHeight: 64 }]}
        value={draft ?? listToText(items)}
        onChangeText={setDraft}
        onBlur={() => {
          if (draft !== null) onChange(textToList(draft));
          setDraft(null);
        }}
        placeholder={placeholder}
        placeholderTextColor={stitchColors.inkSubtle}
        multiline
        textAlignVertical="top"
      />
      <Text style={styles.hint}>Sépare par des virgules.</Text>
    </View>
  );
}

/** Collapsible card holding one part of the CV. */
export function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen(!open)} accessibilityRole="button">
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
          {count ? <Text style={styles.sectionCount}>{`  ${count}`}</Text> : null}
        </Text>
        {open ? <ChevronUp size={18} color={stitchColors.inkMuted} /> : <ChevronDown size={18} color={stitchColors.inkMuted} />}
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

/** Block for one experience / education entry, with a remove button. */
export function ItemCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="Supprimer" style={styles.itemRemove}>
          <Trash2 size={16} color={stitchColors.error} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.addBtn} onPress={onPress}>
      <Plus size={16} color={stitchColors.primary} />
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

export const fieldStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
  half: { flexGrow: 1, flexBasis: 140 },
});

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: stitchColors.ink, marginBottom: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: stitchColors.ink,
    backgroundColor: stitchColors.surface,
  },
  inputMultiline: { minHeight: 96 },
  hint: { marginTop: 4, fontSize: 12, color: stitchColors.inkMuted },
  section: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: stitchColors.ink },
  sectionCount: { fontSize: 13, fontWeight: '600', color: stitchColors.primary },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16 },
  item: {
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.md,
    padding: 12,
    marginBottom: 12,
    backgroundColor: stitchColors.paperSoft,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: stitchColors.ink },
  itemRemove: { padding: 4 },
  addBtn: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: stitchColors.primary,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: stitchColors.primary },
});
