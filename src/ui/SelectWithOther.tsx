import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronDown, PenLine, Search, X } from 'lucide-react-native';

import { fontFamilies, stitchColors } from '../theme/stitch';

const OTHER_LABEL = 'Autre…';

export interface SelectWithOtherProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Title of the picker sheet (defaults to the label). */
  title?: string;
  /** Placeholder of the free-text field shown after "Autre…". */
  otherPlaceholder?: string;
}

/**
 * Dropdown with a searchable list and a final "Autre…" option that lets the student type
 * a value missing from the list. A value not present in `options` is displayed as-is.
 */
export function SelectWithOther({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choisir…',
  title,
  otherPlaceholder = 'Saisis ta réponse',
}: SelectWithOtherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [otherMode, setOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle ? options.filter((option) => option.toLowerCase().includes(needle)) : [...options];
    return [...base, OTHER_LABEL];
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setOtherMode(false);
  };

  const openPicker = () => {
    // Pre-fill the free-text field when the current value is a custom one.
    setOtherText(value && !options.includes(value) ? value : '');
    setOpen(true);
  };

  const pick = (option: string) => {
    if (option === OTHER_LABEL) {
      setOtherMode(true);
      return;
    }
    onChange(option);
    close();
  };

  const confirmOther = () => {
    const custom = otherText.trim();
    if (custom.length < 2) return;
    onChange(custom);
    close();
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value || placeholder}`}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <ChevronDown size={16} color={stitchColors.inkMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title ?? label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Fermer">
                <X size={20} color={stitchColors.inkMuted} />
              </Pressable>
            </View>

            {otherMode ? (
              <View style={styles.otherBox}>
                <Text style={styles.otherHint}>Ta réponse n’est pas dans la liste ? Écris-la ici.</Text>
                <View style={styles.inputRow}>
                  <PenLine size={16} color={stitchColors.primary} />
                  <TextInput
                    value={otherText}
                    onChangeText={setOtherText}
                    placeholder={otherPlaceholder}
                    placeholderTextColor={stitchColors.inkSubtle}
                    style={styles.input}
                    autoFocus
                    maxLength={120}
                    onSubmitEditing={confirmOther}
                    returnKeyType="done"
                  />
                </View>
                <View style={styles.otherActions}>
                  <Pressable onPress={() => setOtherMode(false)} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Retour à la liste</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmOther}
                    disabled={otherText.trim().length < 2}
                    style={[styles.primaryBtn, otherText.trim().length < 2 && styles.primaryBtnDisabled]}
                  >
                    <Text style={styles.primaryBtnText}>Valider</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.inputRow}>
                  <Search size={16} color={stitchColors.inkMuted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Rechercher…"
                    placeholderTextColor={stitchColors.inkSubtle}
                    style={styles.input}
                  />
                </View>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  renderItem={({ item }) => {
                    const isOther = item === OTHER_LABEL;
                    const selected = !isOther && item === value;
                    return (
                      <Pressable
                        onPress={() => pick(item)}
                        style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                      >
                        <Text style={[styles.optionText, isOther && styles.otherText, selected && styles.optionSelected]}>
                          {item}
                        </Text>
                        {selected ? <Check size={16} color={stitchColors.primary} /> : null}
                      </Pressable>
                    );
                  }}
                />
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: stitchColors.inkSoft,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  triggerPressed: { borderColor: stitchColors.primary },
  triggerText: { flex: 1, marginRight: 8, fontFamily: fontFamilies.inter, fontSize: 14, color: stitchColors.ink },
  placeholder: { color: stitchColors.inkSubtle },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: stitchColors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: fontFamilies.outfit, fontSize: 17, fontWeight: '700', color: stitchColors.ink },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 11, fontFamily: fontFamilies.inter, fontSize: 14, color: stitchColors.ink },
  list: { maxHeight: 340 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.paperSoft,
  },
  optionPressed: { backgroundColor: 'rgba(124, 58, 237, 0.08)' },
  optionText: { flex: 1, fontFamily: fontFamilies.inter, fontSize: 14, color: stitchColors.ink },
  optionSelected: { color: stitchColors.primary, fontWeight: '700' },
  otherText: { color: stitchColors.primary, fontWeight: '700' },
  otherBox: { gap: 12 },
  otherHint: { fontFamily: fontFamilies.inter, fontSize: 13, color: stitchColors.inkMuted },
  otherActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondaryBtn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12 },
  secondaryBtnText: { fontFamily: fontFamilies.inter, fontSize: 14, fontWeight: '600', color: stitchColors.inkMuted },
  primaryBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: stitchColors.primary,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontFamily: fontFamilies.inter, fontSize: 14, fontWeight: '700', color: stitchColors.surface },
});
