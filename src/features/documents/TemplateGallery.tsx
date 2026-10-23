import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';

import { stitchColors, stitchRadius } from '../../theme/stitch';
import { listTemplates, type TemplateCard } from './templatesApi';

// Gallery of report templates (Module 24): pick the template of your school,
// or none (the ready styles). One column at phone width.

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (template: TemplateCard | null) => void;
  // Filters the gallery; prefilled with the student's university.
  establishment?: string;
  kind?: 'stage' | 'memoire';
  allowNone?: boolean;
};

export function TemplateGallery({ visible, onClose, onPick, establishment, kind, allowNone = true }: Props) {
  const [filter, setFilter] = useState(establishment ?? '');
  const [mineOnly, setMineOnly] = useState(Boolean(establishment));
  const [templates, setTemplates] = useState<TemplateCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setTemplates(null);
    try {
      const list = await listTemplates(mineOnly ? filter : undefined);
      setTemplates(kind ? list.filter((t) => t.kind === 'both' || t.kind === kind) : list);
    } catch {
      setError('Modèles indisponibles.');
    }
  }, [filter, kind, mineOnly]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Modèles de rapport</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
            <X size={18} color={stitchColors.ink} />
          </Pressable>
        </View>
        <View style={styles.filters}>
          <Pressable style={[styles.chip, mineOnly && styles.chipActive]} onPress={() => setMineOnly(!mineOnly)} accessibilityRole="switch" accessibilityState={{ checked: mineOnly }}>
            <Text style={[styles.chipText, mineOnly && styles.chipTextActive]}>Mon établissement</Text>
          </Pressable>
          {mineOnly ? (
            <TextInput style={styles.input} value={filter} onChangeText={setFilter} onEndEditing={load} placeholder="Nom de l’établissement" placeholderTextColor={stitchColors.inkMuted} maxLength={120} />
          ) : null}
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {allowNone ? (
            <Pressable style={styles.card} onPress={() => onPick(null)}>
              <View style={[styles.preview, styles.previewEmpty]}>
                <Text style={styles.previewEmptyText}>Styles prêts</Text>
              </View>
              <Text style={styles.cardName}>Sans modèle</Text>
              <Text style={styles.cardMeta}>Classique, moderne, sobre ou institutionnel.</Text>
            </Pressable>
          ) : null}
          {error ? (
            <View style={styles.state}>
              <Text style={styles.stateText}>{error}</Text>
              <Pressable style={styles.retry} onPress={load}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : templates === null ? (
            <ActivityIndicator style={styles.state} color={stitchColors.primary} />
          ) : templates.length === 0 ? (
            <Text style={[styles.stateText, styles.state]}>Aucun modèle publié pour le moment.</Text>
          ) : (
            templates.map((t) => (
              <Pressable key={t.id} style={styles.card} onPress={() => onPick(t)}>
                {t.previewDataUri ? (
                  <Image source={{ uri: t.previewDataUri }} style={styles.preview} resizeMode="contain" />
                ) : (
                  <View style={[styles.preview, styles.previewEmpty]}>
                    <Text style={styles.previewEmptyText}>Pas d’aperçu</Text>
                  </View>
                )}
                <Text style={styles.cardName}>{t.name}</Text>
                <Text style={styles.cardMeta}>{[t.establishment, t.degree].filter(Boolean).join(' · ')}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stitchColors.paperDeep },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: stitchColors.glassBorder, backgroundColor: stitchColors.surface },
  title: { fontSize: 17, fontWeight: '700', color: stitchColors.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { borderWidth: 1, borderColor: stitchColors.glassBorder, borderRadius: stitchRadius.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: stitchColors.surface },
  chipActive: { backgroundColor: stitchColors.siennaSoft, borderColor: stitchColors.primary },
  chipText: { fontSize: 13, color: stitchColors.inkSoft },
  chipTextActive: { color: stitchColors.primary, fontWeight: '600' },
  input: { flex: 1, minWidth: 160, borderWidth: 1, borderColor: stitchColors.glassBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: stitchColors.ink, backgroundColor: stitchColors.surface, fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: stitchColors.surface, borderRadius: stitchRadius.md, borderWidth: 1, borderColor: stitchColors.glassBorder, padding: 12 },
  preview: { width: '100%', height: 220, borderRadius: 8, backgroundColor: stitchColors.paperSoft, marginBottom: 10 },
  previewEmpty: { alignItems: 'center', justifyContent: 'center' },
  previewEmptyText: { color: stitchColors.inkMuted, fontSize: 13 },
  cardName: { fontSize: 15, fontWeight: '700', color: stitchColors.ink },
  cardMeta: { fontSize: 12, color: stitchColors.inkMuted, marginTop: 2 },
  state: { marginTop: 24, alignItems: 'center' },
  stateText: { color: stitchColors.inkMuted, fontSize: 14, textAlign: 'center' },
  retry: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: stitchRadius.full, backgroundColor: stitchColors.primary },
  retryText: { color: stitchColors.onPrimary, fontWeight: '600' },
});
