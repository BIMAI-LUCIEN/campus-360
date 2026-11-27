import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Info, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react-native';

import { updateStudentProfile, type StudentProfile } from '../auth/betterAuth';
import { MAX_SKILLS, suggestedSkillsFor } from '../onboarding/academicCatalog';
import { fontFamilies, stitchColors, stitchRadius } from '../../theme/stitch';
import { KeyboardSafeView } from '../../ui/KeyboardSafeView';

interface SkillsManagerModalProps {
  visible: boolean;
  profile: StudentProfile | null;
  onClose: () => void;
  onSaved: (updated: StudentProfile) => void;
}

const normalizeSkill = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * Full skills manager accessible from Profile -> Settings:
 * lets the student add, rename/edit, or remove their acquired skills
 * and sync them with their account and internship matching profile.
 */
export function SkillsManagerModal({ visible, profile, onClose, onSaved }: SkillsManagerModalProps) {
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSkills(Array.isArray(profile?.skills) ? [...profile.skills] : []);
    setNewSkill('');
    setEditingIndex(null);
    setEditingValue('');
    setError(null);
  }, [visible, profile]);

  const availableSuggestions = useMemo(() => {
    const selectedKeys = new Set(skills.map((item) => item.toLowerCase()));
    return suggestedSkillsFor(profile?.faculty || '').filter(
      (item) => !selectedKeys.has(item.toLowerCase()),
    );
  }, [profile?.faculty, skills]);

  const handleAddSkill = () => {
    const cleaned = normalizeSkill(newSkill);
    if (cleaned.length < 2) {
      setError('Entre au moins 2 caractères pour ajouter une compétence.');
      return;
    }
    if (cleaned.length > 60) {
      setError('Une compétence ne peut pas dépasser 60 caractères.');
      return;
    }
    if (skills.length >= MAX_SKILLS) {
      setError(`Tu as atteint la limite de ${MAX_SKILLS} compétences.`);
      return;
    }
    if (skills.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
      setError('Cette compétence est déjà dans ta liste.');
      return;
    }
    setSkills((prev) => [...prev, cleaned]);
    setNewSkill('');
    setError(null);
  };

  const handleAddSuggestion = (skill: string) => {
    if (skills.length >= MAX_SKILLS) {
      setError(`Tu as atteint la limite de ${MAX_SKILLS} compétences.`);
      return;
    }
    if (skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    setSkills((prev) => [...prev, skill]);
    setError(null);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(skills[index] ?? '');
    setError(null);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingValue('');
    setError(null);
  };

  const commitEditing = () => {
    if (editingIndex === null) return;
    const cleaned = normalizeSkill(editingValue);
    if (cleaned.length < 2) {
      setError('La compétence doit contenir au moins 2 caractères.');
      return;
    }
    if (cleaned.length > 60) {
      setError('Une compétence ne peut pas dépasser 60 caractères.');
      return;
    }
    const duplicate = skills.some(
      (item, idx) => idx !== editingIndex && item.toLowerCase() === cleaned.toLowerCase(),
    );
    if (duplicate) {
      setError('Cette compétence figure déjà dans ta liste.');
      return;
    }
    setSkills((prev) => prev.map((item, idx) => (idx === editingIndex ? cleaned : item)));
    setEditingIndex(null);
    setEditingValue('');
    setError(null);
  };

  const handleRemoveSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingValue('');
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    setError(null);
  };

  const handleSave = async () => {
    let finalSkills = skills;
    if (editingIndex !== null) {
      const cleaned = normalizeSkill(editingValue);
      if (cleaned.length < 2 || cleaned.length > 60) {
        setError('Valide ou annule la modification en cours avant d’enregistrer.');
        return;
      }
      const duplicate = skills.some(
        (item, idx) => idx !== editingIndex && item.toLowerCase() === cleaned.toLowerCase(),
      );
      if (duplicate) {
        setError('Cette compétence figure déjà dans ta liste.');
        return;
      }
      finalSkills = skills.map((item, idx) => (idx === editingIndex ? cleaned : item));
      setSkills(finalSkills);
      setEditingIndex(null);
      setEditingValue('');
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateStudentProfile({ skills: finalSkills });
      onSaved({ ...updated, skills: updated.skills ?? finalSkills });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer tes compétences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardSafeView style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Mes compétences</Text>
              <Text style={styles.subtitle}>
                Ajoute, modifie ou retire tes compétences acquises pour affiner ton matching et tes CV.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              style={styles.closeBtn}
            >
              <X size={20} color={stitchColors.ink} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tipBox}>
              <Info size={16} color={stitchColors.primary} />
              <Text style={styles.tipText}>
                Pense à lister toutes tes compétences acquises (outils, logiciels, langues, projets, stages…) jusqu’à {MAX_SKILLS}.
              </Text>
            </View>

            {/* Add new skill */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Ajouter une compétence</Text>
                <Text style={styles.counterText}>
                  {skills.length}/{MAX_SKILLS}
                </Text>
              </View>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newSkill}
                  onChangeText={(text) => {
                    setNewSkill(text);
                    if (error) setError(null);
                  }}
                  placeholder="Ex : Excel avancé, React, AutoCAD…"
                  placeholderTextColor={stitchColors.inkSubtle}
                  maxLength={60}
                  editable={!saving && skills.length < MAX_SKILLS}
                  onSubmitEditing={handleAddSkill}
                  returnKeyType="done"
                  testID="input-new-skill"
                />
                <Pressable
                  onPress={handleAddSkill}
                  disabled={saving || newSkill.trim().length < 2 || skills.length >= MAX_SKILLS}
                  style={({ pressed }) => [
                    styles.addBtn,
                    (saving || newSkill.trim().length < 2 || skills.length >= MAX_SKILLS) && styles.disabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityLabel="Ajouter la compétence"
                  testID="btn-add-skill"
                >
                  <Plus size={18} color={stitchColors.white} />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Active skills list with edit & remove */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Tes compétences actuelles ({skills.length})
              </Text>
              {skills.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Sparkles size={20} color={stitchColors.primary} />
                  <Text style={styles.emptyTitle}>Aucune compétence enregistrée</Text>
                  <Text style={styles.emptyText}>
                    Ajoute une compétence ci-dessus ou choisis parmi les suggestions ci-dessous.
                  </Text>
                </View>
              ) : (
                <View style={styles.skillList}>
                  {skills.map((skill, index) => {
                    const isEditing = editingIndex === index;
                    return (
                      <View key={`${skill}-${index}`} style={styles.skillRow}>
                        {isEditing ? (
                          <View style={styles.editRow}>
                            <TextInput
                              style={styles.editInput}
                              value={editingValue}
                              onChangeText={setEditingValue}
                              maxLength={60}
                              autoFocus
                              onSubmitEditing={commitEditing}
                              returnKeyType="done"
                              testID={`input-edit-skill-${index}`}
                            />
                            <Pressable
                              onPress={commitEditing}
                              style={styles.iconActionPrimary}
                              accessibilityLabel="Valider la modification"
                              testID={`btn-save-edit-skill-${index}`}
                            >
                              <Check size={16} color={stitchColors.white} />
                            </Pressable>
                            <Pressable
                              onPress={cancelEditing}
                              style={styles.iconActionNeutral}
                              accessibilityLabel="Annuler la modification"
                            >
                              <X size={16} color={stitchColors.inkMuted} />
                            </Pressable>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.skillName} numberOfLines={2}>
                              {skill}
                            </Text>
                            <View style={styles.rowActions}>
                              <Pressable
                                onPress={() => startEditing(index)}
                                disabled={saving}
                                hitSlop={8}
                                style={styles.iconActionNeutral}
                                accessibilityLabel={`Modifier ${skill}`}
                                testID={`btn-edit-skill-${index}`}
                              >
                                <Pencil size={15} color={stitchColors.primary} />
                              </Pressable>
                              <Pressable
                                onPress={() => handleRemoveSkill(index)}
                                disabled={saving}
                                hitSlop={8}
                                style={styles.iconActionDanger}
                                accessibilityLabel={`Retirer ${skill}`}
                                testID={`btn-remove-skill-${index}`}
                              >
                                <Trash2 size={15} color={stitchColors.error} />
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Quick suggestions */}
            {availableSuggestions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Suggestions rapides</Text>
                <View style={styles.chipsWrap}>
                  {availableSuggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => handleAddSuggestion(suggestion)}
                      disabled={saving || skills.length >= MAX_SKILLS}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        skills.length >= MAX_SKILLS && styles.disabled,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Plus size={13} color={stitchColors.primary} />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                saving && { opacity: 0.7 },
                pressed && !saving && { opacity: 0.88 },
              ]}
              testID="btn-save-skills"
            >
              {saving ? (
                <ActivityIndicator size="small" color={stitchColors.white} />
              ) : (
                <>
                  <Check size={16} color={stitchColors.white} strokeWidth={2.5} />
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardSafeView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontWeight: '800',
    color: stitchColors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.inkMuted,
    lineHeight: 18,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 18,
    paddingBottom: 32,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.siennaBg,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  tipText: {
    flex: 1,
    fontFamily: fontFamilies.interMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: stitchColors.primary,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: fontFamilies.displaySemi,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.inkSoft,
  },
  counterText: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamilies.inter,
    fontSize: 14.5,
    color: stitchColors.ink,
  },
  addBtn: {
    width: 48,
    borderRadius: stitchRadius.md,
    backgroundColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  errorBox: {
    backgroundColor: stitchColors.errorBg,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: stitchColors.error,
  },
  errorText: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 13,
    color: stitchColors.error,
  },
  emptyCard: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.md,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fontFamilies.displaySemi,
    fontSize: 14.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  emptyText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  skillList: {
    gap: 8,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.md,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
  },
  skillName: {
    flex: 1,
    fontFamily: fontFamilies.interMedium,
    fontSize: 14,
    color: stitchColors.ink,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editInput: {
    flex: 1,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
  },
  iconActionPrimary: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionNeutral: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionDanger: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: stitchColors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  suggestionText: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 13,
    color: stitchColors.inkSoft,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: stitchColors.surface,
    borderTopWidth: 1,
    borderTopColor: stitchColors.glassBorder,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fontFamilies.displaySemi,
    fontSize: 15,
    fontWeight: '600',
    color: stitchColors.inkSoft,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 13,
    borderRadius: stitchRadius.md,
    backgroundColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fontFamilies.display,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.white,
  },
});
