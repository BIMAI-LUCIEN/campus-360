import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, MessageCircle, Plus, X } from 'lucide-react-native';

import { FACULTY_NAMES, LEVELS, MAX_SKILLS, suggestedSkillsFor } from '../onboarding/academicCatalog';
import { fontFamilies, stitchColors } from '../../theme/stitch';
import { SelectWithOther } from '../../ui/SelectWithOther';

export interface StudentProfileExpressData {
  fullName: string;
  phoneWhatsapp: string;
  university: string;
  major: string;
  level: string;
  skills: string[];
}

export interface StudentProfileExpressModalProps {
  visible: boolean;
  initialFullName?: string;
  initialPhoneWhatsapp?: string;
  initialUniversity?: string;
  initialMajor?: string;
  initialLevel?: string;
  initialSkills?: string[];
  onClose: () => void;
  onSaveAndContinue: (data: StudentProfileExpressData) => void;
}

// Same rule as the server-side profile schema (mobile-api account route).
const isValidPhone = (value: string) => value.length >= 6 && value.length <= 20 && /^[+0-9 ()\-]+$/.test(value);

/**
 * Short sheet shown at the first application: it only asks for what the profile is missing
 * (WhatsApp first, then studies/skills if the onboarding was skipped). Nothing is pre-filled
 * with fake values.
 */
export function StudentProfileExpressModal({
  visible,
  initialFullName = '',
  initialPhoneWhatsapp = '',
  initialUniversity = '',
  initialMajor = '',
  initialLevel = '',
  initialSkills = [],
  onClose,
  onSaveAndContinue,
}: StudentProfileExpressModalProps) {
  const [phone, setPhone] = useState(initialPhoneWhatsapp);
  const [major, setMajor] = useState(initialMajor);
  const [level, setLevel] = useState(initialLevel);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [customSkill, setCustomSkill] = useState('');

  // Decide once per opening which blocks are needed, so a block does not vanish while typing.
  const [needs, setNeeds] = useState({ phone: false, studies: false, skills: false });
  useEffect(() => {
    if (!visible) return;
    setPhone(initialPhoneWhatsapp);
    setMajor(initialMajor);
    setLevel(initialLevel);
    setSkills(initialSkills);
    setNeeds({
      phone: !isValidPhone(initialPhoneWhatsapp.trim()),
      studies: !initialMajor.trim() || !initialLevel.trim(),
      skills: initialSkills.length === 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const suggestions = useMemo(
    () => Array.from(new Set([...suggestedSkillsFor(major), ...skills])),
    [major, skills],
  );

  if (!visible) return null;

  const phoneOk = !needs.phone || isValidPhone(phone.trim());
  const studiesOk = !needs.studies || (major.trim().length >= 2 && level.trim().length >= 2);
  const skillsOk = !needs.skills || skills.length > 0;
  const canSave = phoneOk && studiesOk && skillsOk;

  const toggleSkill = (skill: string) => {
    setSkills((current) => {
      if (current.includes(skill)) return current.filter((item) => item !== skill);
      if (current.length >= MAX_SKILLS) return current;
      return [...current, skill];
    });
  };

  const addCustomSkill = () => {
    const value = customSkill.trim();
    if (value.length < 2 || skills.length >= MAX_SKILLS) return;
    if (!skills.some((item) => item.toLowerCase() === value.toLowerCase())) setSkills([...skills, value]);
    setCustomSkill('');
  };

  const save = () => {
    if (!canSave) return;
    onSaveAndContinue({
      fullName: initialFullName.trim(),
      phoneWhatsapp: phone.trim(),
      university: initialUniversity.trim(),
      major: major.trim(),
      level: level.trim(),
      skills,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Avant ta candidature</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fermer" testID="btn-express-close">
              <X size={20} color={stitchColors.inkMuted} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Il nous manque quelques informations pour envoyer ton dossier au recruteur.
          </Text>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {needs.phone ? (
              <View style={styles.block}>
                <Text style={styles.label}>Ton numéro WhatsApp</Text>
                <View style={styles.inputRow}>
                  <MessageCircle size={16} color={stitchColors.primary} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+237 6XX XX XX XX"
                    placeholderTextColor={stitchColors.inkSubtle}
                    keyboardType="phone-pad"
                    style={styles.input}
                    maxLength={20}
                  />
                </View>
                <Text style={styles.help}>Les recruteurs te répondent et tes relances partent sur ce numéro.</Text>
                {phone.trim().length > 0 && !isValidPhone(phone.trim()) ? (
                  <Text style={styles.error}>Numéro invalide : chiffres, espaces et « + » uniquement.</Text>
                ) : null}
              </View>
            ) : null}

            {needs.studies ? (
              <View style={styles.block}>
                <SelectWithOther label="Filière" value={major} options={FACULTY_NAMES} onChange={setMajor} placeholder="Choisir ma filière…" />
                <SelectWithOther label="Niveau d’études" value={level} options={LEVELS} onChange={setLevel} placeholder="Choisir mon niveau…" />
              </View>
            ) : null}

            {needs.skills ? (
              <View style={styles.block}>
                <Text style={styles.label}>Tes compétences</Text>
                <View style={styles.chips}>
                  {suggestions.map((skill) => {
                    const selected = skills.includes(skill);
                    return (
                      <Pressable key={skill} onPress={() => toggleSkill(skill)} style={[styles.chip, selected && styles.chipSelected]}>
                        {selected ? <Check size={13} color={stitchColors.surface} /> : null}
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{skill}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    value={customSkill}
                    onChangeText={setCustomSkill}
                    placeholder="Autre compétence…"
                    placeholderTextColor={stitchColors.inkSubtle}
                    style={styles.input}
                    maxLength={60}
                    onSubmitEditing={addCustomSkill}
                  />
                  <Pressable onPress={addCustomSkill} hitSlop={8} accessibilityLabel="Ajouter la compétence">
                    <Plus size={18} color={stitchColors.primary} />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <Pressable onPress={save} disabled={!canSave} style={[styles.cta, !canSave && styles.ctaDisabled]} testID="btn-express-save">
            <Text style={styles.ctaText}>Enregistrer et continuer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: stitchColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fontFamilies.outfit, fontSize: 20, fontWeight: '800', color: stitchColors.ink },
  subtitle: { fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 18, color: stitchColors.inkMuted },
  body: { gap: 18, paddingVertical: 8 },
  block: { gap: 10 },
  label: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: stitchColors.inkSoft,
  },
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
  input: { flex: 1, paddingVertical: 12, fontFamily: fontFamilies.inter, fontSize: 14, color: stitchColors.ink },
  help: { fontFamily: fontFamilies.inter, fontSize: 12, color: stitchColors.inkMuted },
  error: { fontFamily: fontFamilies.inter, fontSize: 12, color: stitchColors.error },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  chipSelected: { backgroundColor: stitchColors.primary, borderColor: stitchColors.primary },
  chipText: { fontFamily: fontFamilies.inter, fontSize: 13, color: stitchColors.inkSoft },
  chipTextSelected: { color: stitchColors.surface, fontWeight: '600' },
  cta: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: stitchColors.primary,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontFamily: fontFamilies.inter, fontSize: 15, fontWeight: '700', color: stitchColors.surface },
});
