import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Layers,
  Award,
} from 'lucide-react-native';
import { stitchColors, stitchRadius, stitchSpacing } from '../../theme/stitch';

const { width } = Dimensions.get('window');

const POPULAR_UNIVERSITIES = [
  'INP-HB Yamoussoukro',
  'Université Félix Houphouët-Boigny',
  'ESATIC Abidjan',
  'Université Virtuelle de Côte d\'Ivoire',
  'HEC Abidjan',
  'ESTM Dakar',
  'Institut National Polytechnique',
  'Autre Établissement',
];

const POPULAR_MAJORS = [
  'Informatique & Développement Web/Mobile',
  'Comptabilité, Contrôle & Audit (SYSCOHADA)',
  'Marketing Digital & Communication',
  'Design Graphique & UI/UX',
  'Banque, Finance & Assurance',
  'Logistique & Transport',
  'Ressources Humaines',
  'Génie Civil & BTP',
];

const POPULAR_SKILLS = [
  'React / React Native',
  'Python & Data',
  'Excel Avancé',
  'Comptabilité Générale',
  'Figma / UI Design',
  'Gestion de Projet',
  'SQL & Base de données',
  'Git & GitHub',
  'Rédaction & Synthèse',
  'Anglais Professionnel',
  'Vente & Prospection',
  'Canva & Social Media',
];

const EDUCATION_LEVELS = [
  'BTS 1ère Année',
  'BTS 2ème Année',
  'Licence 1',
  'Licence 2',
  'Licence 3',
  'Master 1',
  'Master 2 / Ingénieur',
];

interface OnboardingScreenProps {
  initialName?: string;
  onCompleteOnboarding: (data: {
    university: string;
    major: string;
    level: string;
    skills: string[];
  }) => void;
}

export function OnboardingScreen({
  initialName = 'Étudiant',
  onCompleteOnboarding,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [level, setLevel] = useState('Licence 2');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      if (selectedSkills.length < 5) {
        setSelectedSkills([...selectedSkills, skill]);
      }
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!university.trim()) return;
      setStep(2);
    } else if (step === 2) {
      if (!major.trim()) return;
      setStep(3);
    } else if (step === 3) {
      if (selectedSkills.length === 0) return;
      onCompleteOnboarding({
        university,
        major,
        level,
        skills: selectedSkills,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background glowing ambient circles */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Header with Progress Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Sparkles size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>Campus 360 • Profil Express</Text>
        </View>

        {/* 3-Step Progress Tracker */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.stepIndicator}>Étape {step} sur 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: ÉTABLISSEMENT */}
        {step === 1 && (
          <View style={styles.stepCard}>
            <View style={styles.iconCircle}>
              <GraduationCap size={28} color="#A855F7" />
            </View>
            <Text style={styles.stepTitle}>Bienvenue, {initialName} !</Text>
            <Text style={styles.stepSubtitle}>
              Quel est ton établissement ou ton université actuelle ?
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="ex: INP-HB, Université Félix H.B..."
              placeholderTextColor="#64748B"
              value={university}
              onChangeText={setUniversity}
            />

            <Text style={styles.sectionLabel}>Suggestions rapides :</Text>
            <View style={styles.chipGrid}>
              {POPULAR_UNIVERSITIES.map((univ) => (
                <Pressable
                  key={univ}
                  style={[styles.chip, university === univ && styles.chipSelected]}
                  onPress={() => setUniversity(univ)}
                >
                  <Text style={[styles.chipText, university === univ && styles.chipTextSelected]}>
                    {univ}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: FILIÈRE & NIVEAU */}
        {step === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.iconCircle}>
              <Briefcase size={28} color="#3B82F6" />
            </View>
            <Text style={styles.stepTitle}>Ton Domaine d'Études</Text>
            <Text style={styles.stepSubtitle}>
              Quelle est ta spécialité et ton niveau actuel ?
            </Text>

            <Text style={styles.sectionLabel}>Niveau d'études :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelRow}>
              {EDUCATION_LEVELS.map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[styles.levelChip, level === lvl && styles.levelChipSelected]}
                  onPress={() => setLevel(lvl)}
                >
                  <Text style={[styles.levelText, level === lvl && styles.levelTextSelected]}>
                    {lvl}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Spécialité / Filière :</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ex: Informatique, Gestion, Marketing..."
              placeholderTextColor="#64748B"
              value={major}
              onChangeText={setMajor}
            />

            <View style={styles.chipGrid}>
              {POPULAR_MAJORS.map((m) => (
                <Pressable
                  key={m}
                  style={[styles.chip, major === m && styles.chipSelected]}
                  onPress={() => setMajor(m)}
                >
                  <Text style={[styles.chipText, major === m && styles.chipTextSelected]}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* STEP 3: 3 COMPÉTENCES CLÉS */}
        {step === 3 && (
          <View style={styles.stepCard}>
            <View style={styles.iconCircle}>
              <Award size={28} color="#10B981" />
            </View>
            <Text style={styles.stepTitle}>Tes Super-Pouvoirs</Text>
            <Text style={styles.stepSubtitle}>
              Sélectionne entre 3 et 5 compétences clés que tu maîtrises (pour le calcul du % de match).
            </Text>

            <View style={styles.badgeCountContainer}>
              <Text style={styles.badgeCountText}>
                {selectedSkills.length} sélectionnée{selectedSkills.length > 1 ? 's' : ''} (min. 1)
              </Text>
            </View>

            <View style={styles.chipGrid}>
              {POPULAR_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                    onPress={() => toggleSkill(skill)}
                  >
                    {isSelected && (
                      <CheckCircle size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>
                      {skill}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.footer}>
        {step > 1 ? (
          <Pressable style={styles.backBtn} onPress={() => setStep((s) => (s - 1) as any)}>
            <Text style={styles.backBtnText}>Retour</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 0.3 }} />
        )}

        <Pressable
          style={[
            styles.continueBtn,
            ((step === 1 && !university.trim()) ||
              (step === 2 && !major.trim()) ||
              (step === 3 && selectedSkills.length === 0)) &&
              styles.continueBtnDisabled,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.continueText}>
            {step === 3 ? 'Découvrir mes stages ✨' : 'Continuer'}
          </Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 3,
  },
  stepIndicator: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 22,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 18,
  },
  sectionLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  levelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  levelChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  levelChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  levelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  levelTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badgeCountContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeCountText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  skillChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#34D399',
  },
  skillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  skillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  continueBtn: {
    flex: 0.7,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
