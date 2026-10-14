import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check, GraduationCap, Layers, Plus, Sparkles } from 'lucide-react-native';

import {
  FACULTY_NAMES,
  LEVELS,
  MAX_SKILLS,
  UNIVERSITIES,
  suggestedSkillsFor,
} from '../../features/onboarding/academicCatalog';
import { fontFamilies, stitchColors } from '../../theme/stitch';
import { SelectWithOther } from '../SelectWithOther';

export interface OnboardingData {
  university: string;
  faculty: string;
  level: string;
  skills: string[];
}

export interface OnboardingScreenProps {
  /** Used only for the greeting: the name was already given at sign-up. */
  initialName?: string;
  initialUniversity?: string;
  initialFaculty?: string;
  initialLevel?: string;
  onCompleteOnboarding: (data: OnboardingData) => void;
  onSkip?: () => void;
}

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Ton établissement',
  2: 'Ta filière et ton niveau',
  3: 'Tes compétences',
};

const STEP_HINTS: Record<Step, string> = {
  1: 'Elle nous sert à te proposer les stages et documents de ton campus.',
  2: 'On l’utilise pour trier les offres et pré-remplir ton CV.',
  3: 'Choisis jusqu’à 8 compétences : ton score de correspondance en dépend.',
};

export function OnboardingScreen({
  initialName,
  initialUniversity = '',
  initialFaculty = '',
  initialLevel = '',
  onCompleteOnboarding,
  onSkip,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [university, setUniversity] = useState(initialUniversity);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [level, setLevel] = useState(initialLevel);

  // The profile can arrive after the first render: fill fields the student has not touched yet.
  useEffect(() => {
    if (initialUniversity) setUniversity((current) => current || initialUniversity);
  }, [initialUniversity]);
  useEffect(() => {
    if (initialFaculty) setFaculty((current) => current || initialFaculty);
  }, [initialFaculty]);
  useEffect(() => {
    if (initialLevel) setLevel((current) => current || initialLevel);
  }, [initialLevel]);
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const suggestions = useMemo(() => {
    // Keep custom skills visible next to the suggestions so they can be removed.
    return Array.from(new Set([...suggestedSkillsFor(faculty), ...skills]));
  }, [faculty, skills]);

  const canContinue =
    step === 1 ? university.trim().length >= 2 : step === 2 ? faculty.trim().length >= 2 && level.trim().length >= 2 : skills.length > 0;

  const firstName = initialName?.trim().split(/\s+/)[0];

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

  const next = () => {
    if (!canContinue) return;
    if (step < 3) {
      setStep((step + 1) as Step);
      return;
    }
    onCompleteOnboarding({
      university: university.trim(),
      faculty: faculty.trim(),
      level: level.trim(),
      skills,
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandBadge}>
            <Sparkles size={13} color={stitchColors.primary} />
            <Text style={styles.brandText}>CAMPUS 360</Text>
          </View>
          {onSkip ? (
            <Pressable onPress={onSkip} hitSlop={12}>
              <Text style={styles.skip}>Plus tard</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>Étape {step} sur 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <Text style={styles.greeting}>{firstName ? `Bienvenue, ${firstName} !` : 'Bienvenue !'}</Text>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.iconBubble}>
              {step === 1 ? (
                <GraduationCap size={20} color={stitchColors.primary} />
              ) : step === 2 ? (
                <Layers size={20} color={stitchColors.primary} />
              ) : (
                <Sparkles size={20} color={stitchColors.primary} />
              )}
            </View>
            <View style={styles.cardTitleText}>
              <Text style={styles.cardTitle}>{STEP_TITLES[step]}</Text>
              <Text style={styles.cardHint}>{STEP_HINTS[step]}</Text>
            </View>
          </View>

          {step === 1 ? (
            <SelectWithOther
              label="Université ou école"
              value={university}
              options={UNIVERSITIES}
              onChange={setUniversity}
              placeholder="Choisir mon établissement…"
              otherPlaceholder="Nom de ton établissement"
            />
          ) : null}

          {step === 2 ? (
            <View style={styles.fields}>
              <SelectWithOther
                label="Filière"
                value={faculty}
                options={FACULTY_NAMES}
                onChange={setFaculty}
                placeholder="Choisir ma filière…"
                otherPlaceholder="Nom de ta filière"
              />
              <SelectWithOther
                label="Niveau d’études"
                value={level}
                options={LEVELS}
                onChange={setLevel}
                placeholder="Choisir mon niveau…"
                otherPlaceholder="Ton niveau"
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.fields}>
              <View style={styles.chips}>
                {suggestions.map((skill) => {
                  const selected = skills.includes(skill);
                  return (
                    <Pressable
                      key={skill}
                      onPress={() => toggleSkill(skill)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityState={{ selected }}
                    >
                      {selected ? <Check size={13} color={stitchColors.surface} /> : null}
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{skill}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.counter}>
                {skills.length}/{MAX_SKILLS} sélectionnée{skills.length > 1 ? 's' : ''}
              </Text>
              <View style={styles.addRow}>
                <TextInput
                  value={customSkill}
                  onChangeText={setCustomSkill}
                  placeholder="Autre compétence…"
                  placeholderTextColor={stitchColors.inkSubtle}
                  style={styles.addInput}
                  maxLength={60}
                  onSubmitEditing={addCustomSkill}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addCustomSkill}
                  style={[styles.addBtn, (customSkill.trim().length < 2 || skills.length >= MAX_SKILLS) && styles.disabled]}
                  disabled={customSkill.trim().length < 2 || skills.length >= MAX_SKILLS}
                  accessibilityLabel="Ajouter la compétence"
                >
                  <Plus size={18} color={stitchColors.surface} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <Pressable onPress={() => setStep((step - 1) as Step)} style={styles.backBtn} accessibilityLabel="Étape précédente">
            <ArrowLeft size={18} color={stitchColors.inkSoft} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={next}
          disabled={!canContinue}
          style={[styles.nextBtn, !canContinue && styles.disabled]}
        >
          <Text style={styles.nextText}>{step < 3 ? 'Continuer' : 'Découvrir mes stages'}</Text>
          <ArrowRight size={18} color={stitchColors.surface} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stitchColors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  brandText: { fontFamily: fontFamilies.inter, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: stitchColors.primary },
  skip: { fontFamily: fontFamilies.inter, fontSize: 14, fontWeight: '600', color: stitchColors.primary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: stitchColors.paperSoft, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: stitchColors.primary },
  stepLabel: { fontFamily: fontFamilies.inter, fontSize: 12, fontWeight: '600', color: stitchColors.inkMuted },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  greeting: { fontFamily: fontFamilies.outfit, fontSize: 24, fontWeight: '800', color: stitchColors.ink },
  card: {
    backgroundColor: stitchColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 18,
    gap: 18,
  },
  cardTitleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  cardTitleText: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: fontFamilies.outfit, fontSize: 18, fontWeight: '700', color: stitchColors.ink },
  cardHint: { fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 18, color: stitchColors.inkMuted },
  fields: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
  },
  chipSelected: { backgroundColor: stitchColors.primary, borderColor: stitchColors.primary },
  chipText: { fontFamily: fontFamilies.inter, fontSize: 13, color: stitchColors.inkSoft },
  chipTextSelected: { color: stitchColors.surface, fontWeight: '600' },
  counter: { fontFamily: fontFamilies.inter, fontSize: 12, color: stitchColors.inkMuted },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
  },
  addBtn: {
    width: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: stitchColors.surface,
    borderTopWidth: 1,
    borderTopColor: stitchColors.glassBorder,
  },
  backBtn: {
    width: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: stitchColors.primary,
  },
  nextText: { fontFamily: fontFamilies.inter, fontSize: 15, fontWeight: '700', color: stitchColors.surface },
  disabled: { opacity: 0.4 },
});
