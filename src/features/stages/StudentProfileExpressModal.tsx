import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  Check,
  School,
  BookOpen,
  Layers,
  User,
  Phone,
  Sparkles,
  GraduationCap,
} from 'lucide-react-native';
import { stitchColors, fontFamilies } from '../../theme/stitch';

export const SUGGESTED_UNIVERSITIES = [
  'Université de Yaoundé I (Cameroun)',
  'Université de Douala (Cameroun)',
  'INP-HB Yamoussoukro (CI)',
  'UFHB Abidjan (CI)',
  'ESATIC Abidjan (CI)',
  'ESTM Dakar (Sénégal)',
  'Université Virtuelle UVCI',
];

export const SUGGESTED_MAJORS: Record<
  string,
  { label: string; skills: string[] }
> = {
  informatique: {
    label: 'Informatique & Génie Logiciel',
    skills: [
      'React / React Native',
      'Node.js & APIs',
      'Python & Pandas',
      'SQL & PostgreSQL',
      'Docker & Cloud',
      'Git & CI/CD',
      'Cybersécurité',
    ],
  },
  finance: {
    label: 'Finance, Comptabilité SYSCOHADA',
    skills: [
      'Plan SYSCOHADA',
      'Excel Avancé & Macros',
      'Audit & Contrôle',
      'Analyse Financière',
      'Mobile Money & FinTech',
      'Fiscalité',
    ],
  },
  marketing: {
    label: 'Marketing Digital & E-Commerce',
    skills: [
      'Meta & Google Ads',
      'Copywriting & Vente',
      'Canva & Création Visuelle',
      'Social Media Growth',
      'Google Analytics 4',
      'SEO & Contenu',
    ],
  },
  droit: {
    label: 'Droit OHADA & Affaires',
    skills: [
      'Droit Commercial OHADA',
      'Rédaction de Contrats',
      'Droit du Travail & RH',
      'Conformité & RGPD',
      'Contentieux & Arbitrage',
    ],
  },
  genie_civil: {
    label: 'Génie Civil & BTP',
    skills: [
      'AutoCAD & BIM',
      'Calcul de Structures (RDM)',
      'Gestion de Chantier',
      'Topographie',
      'Sécurité & QHSE',
    ],
  },
};

export const EDUCATION_LEVELS_CHIPS = [
  'L1',
  'L2',
  'Licence 3',
  'Master 1',
  'Master 2 / Ingénieur',
  'BTS / DUT',
];

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

export function StudentProfileExpressModal({
  visible,
  initialFullName = '',
  initialPhoneWhatsapp = '',
  initialUniversity = 'Université de Yaoundé I (Cameroun)',
  initialMajor = 'Informatique & Génie Logiciel',
  initialLevel = 'Licence 3',
  initialSkills = [],
  onClose,
  onSaveAndContinue,
}: StudentProfileExpressModalProps) {
  const [fullName, setFullName] = useState(initialFullName || 'Dave Lionel Kameni');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(initialPhoneWhatsapp || '+237 690 00 00 00');
  const [university, setUniversity] = useState(initialUniversity);
  const [major, setMajor] = useState(initialMajor);
  const [level, setLevel] = useState(initialLevel);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialSkills.length > 0
      ? initialSkills
      : ['React / React Native', 'Node.js & APIs', 'SQL & PostgreSQL']
  );
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Suggested skills dynamically computed based on selected major
  const dynamicSkillSuggestions = useMemo(() => {
    const majorLower = major.toLowerCase();
    for (const key of Object.keys(SUGGESTED_MAJORS)) {
      if (
        majorLower.includes(key) ||
        majorLower.includes(SUGGESTED_MAJORS[key].label.toLowerCase().slice(0, 5))
      ) {
        return SUGGESTED_MAJORS[key].skills;
      }
    }
    return SUGGESTED_MAJORS.informatique.skills;
  }, [major]);

  if (!visible) return null;

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      if (selectedSkills.length > 1) {
        setSelectedSkills(selectedSkills.filter((s) => s !== skill));
      }
    } else {
      if (selectedSkills.length < 6) {
        setSelectedSkills([...selectedSkills, skill]);
      }
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed) && selectedSkills.length < 6) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setCustomSkillInput('');
    }
  };

  const handleSelectMajor = (majorObj: { label: string; skills: string[] }) => {
    setMajor(majorObj.label);
    // Pre-select first 3 skills of the new major if current skills don't belong
    setSelectedSkills(majorObj.skills.slice(0, 3));
  };

  const handleSave = () => {
    setSaving(true);
    onSaveAndContinue({
      fullName: fullName.trim() || 'Dave Lionel Kameni',
      phoneWhatsapp: phoneWhatsapp.trim() || '+237 690 00 00 00',
      university: university.trim() || 'Université Partenaire',
      major: major.trim() || 'Informatique & Génie Logiciel',
      level: level.trim() || 'Licence 3',
      skills: selectedSkills.length > 0 ? selectedSkills : ['React / React Native', 'Node.js & APIs'],
    });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.profileBadge}>
                <Sparkles size={13} color="#7C3AED" strokeWidth={2.4} />
                <Text style={styles.profileBadgeText}>Profil Étudiant Express</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.closeBtn}
                testID="btn-express-close"
                accessibilityLabel="Fermer"
              >
                <X size={18} color="#64748B" strokeWidth={2.2} />
              </Pressable>
            </View>
            <Text style={styles.title}>Inscrire mes informations</Text>
            <Text style={styles.subtitle}>
              Ces 6 informations alimentent automatiquement le Template CV Officiel et la lettre RH.
            </Text>
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              {/* Champ 1 : Nom Complet */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <User size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.label}>1. Nom &amp; Prénom</Text>
                </View>
                <TextInput
                  testID="input-express-fullname"
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Ex: Dave Lionel Kameni"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>

              {/* Champ 2 : Téléphone WhatsApp */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Phone size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.label}>2. Téléphone WhatsApp (Contact Recruteur)</Text>
                </View>
                <TextInput
                  testID="input-express-phone"
                  style={styles.input}
                  value={phoneWhatsapp}
                  onChangeText={setPhoneWhatsapp}
                  placeholder="Ex: +237 690 00 00 00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Champ 3 : Université & Ville */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <School size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.label}>3. Université &amp; Ville</Text>
                </View>
                <TextInput
                  testID="input-express-university"
                  style={styles.input}
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="Ex: Université de Yaoundé I (Cameroun)"
                  placeholderTextColor="#94A3B8"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionPillsRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {SUGGESTED_UNIVERSITIES.slice(0, 4).map((univ) => {
                    const active = university === univ;
                    return (
                      <Pressable
                        key={univ}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setUniversity(univ)}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {univ.split('(')[0].trim()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Champ 4 : Filière / Spécialité */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <BookOpen size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.label}>4. Filière / Spécialité</Text>
                </View>
                <TextInput
                  testID="input-express-major"
                  style={styles.input}
                  value={major}
                  onChangeText={setMajor}
                  placeholder="Ex: Informatique &amp; Génie Logiciel"
                  placeholderTextColor="#94A3B8"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionPillsRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {Object.entries(SUGGESTED_MAJORS).map(([key, item]) => {
                    const active = major === item.label;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => handleSelectMajor(item)}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {item.label.split(',')[0].split('&')[0].trim()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Champ 5 : Niveau d'études */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <GraduationCap size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.label}>5. Niveau d'études actuel</Text>
                </View>
                <View style={styles.chipsGrid}>
                  {EDUCATION_LEVELS_CHIPS.map((lvl) => {
                    const active = level === lvl;
                    return (
                      <Pressable
                        key={lvl}
                        style={[styles.levelChip, active && styles.levelChipActive]}
                        onPress={() => setLevel(lvl)}
                        testID={`btn-level-${lvl.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <Text style={[styles.levelChipText, active && styles.levelChipTextActive]}>
                          {lvl}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Champ 6 : 3 à 5 Compétences clés cliquables */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Layers size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.label}>
                    6. Compétences clés ({selectedSkills.length}/6 sélectionnées)
                  </Text>
                </View>
                <Text style={styles.hintText}>
                  Touchez 3 à 5 compétences pour booster votre CV officiel :
                </Text>
                <View style={styles.skillsChipsWrap}>
                  {dynamicSkillSuggestions.map((skill) => {
                    const active = selectedSkills.includes(skill);
                    return (
                      <Pressable
                        key={skill}
                        style={[styles.skillBadge, active && styles.skillBadgeActive]}
                        onPress={() => toggleSkill(skill)}
                        testID={`chip-skill-${skill.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                      >
                        {active && <Check size={12} color="#FFFFFF" strokeWidth={2.5} />}
                        <Text style={[styles.skillBadgeText, active && styles.skillBadgeTextActive]}>
                          {skill}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Ajout manuel optionnel */}
                <View style={styles.customSkillRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingVertical: 8 }]}
                    value={customSkillInput}
                    onChangeText={setCustomSkillInput}
                    placeholder="Autre compétence..."
                    placeholderTextColor="#94A3B8"
                    onSubmitEditing={handleAddCustomSkill}
                  />
                  <Pressable
                    style={[
                      styles.addSkillBtn,
                      (!customSkillInput.trim() || selectedSkills.length >= 6) && styles.addSkillBtnDisabled,
                    ]}
                    onPress={handleAddCustomSkill}
                    disabled={!customSkillInput.trim() || selectedSkills.length >= 6}
                  >
                    <Text style={styles.addSkillBtnText}>Ajouter</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.footer}>
            <Pressable
              testID="btn-express-save"
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.submitBtnText}>Inscrire mes informations (30s)</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 24 : 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '94%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  profileBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
  scrollArea: {
    flexGrow: 1,
    marginVertical: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  hintText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#0F172A',
    fontSize: 13.5,
    fontFamily: fontFamilies.inter,
  },
  suggestionPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pillText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  levelChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  levelChipText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#475569',
  },
  levelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skillsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skillBadgeActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  skillBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#334155',
  },
  skillBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addSkillBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSkillBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  addSkillBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
