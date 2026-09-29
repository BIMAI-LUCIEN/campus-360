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
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.profileBadge}>
                <Sparkles size={13} color="#A78BFA" />
                <Text style={styles.profileBadgeText}>Onboarding Express 30s</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.closeBtn}
                testID="btn-express-close"
                accessibilityLabel="Fermer"
              >
                <X size={18} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.title}>Complétez votre profil en 6 champs</Text>
            <Text style={styles.subtitle}>
              Ces 6 informations alimentent automatiquement le Template CV Officiel et la lettre RH.
            </Text>
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              {/* Champ 1 : Nom Complet */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <User size={13} color="#A78BFA" />
                  <Text style={styles.label}>1. Nom & Prénom</Text>
                </View>
                <TextInput
                  testID="input-express-fullname"
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Ex: Dave Lionel Kameni"
                  placeholderTextColor="#64748B"
                />
              </View>

              {/* Champ 2 : Téléphone WhatsApp */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Phone size={13} color="#A78BFA" />
                  <Text style={styles.label}>2. Téléphone WhatsApp (Contact Recruteur)</Text>
                </View>
                <TextInput
                  testID="input-express-phone"
                  style={styles.input}
                  value={phoneWhatsapp}
                  onChangeText={setPhoneWhatsapp}
                  placeholder="Ex: +237 690 00 00 00"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Champ 3 : Université & Ville */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <School size={13} color="#A78BFA" />
                  <Text style={styles.label}>3. Université & Ville</Text>
                </View>
                <TextInput
                  testID="input-express-university"
                  style={styles.input}
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="Ex: Université de Yaoundé I (Cameroun)"
                  placeholderTextColor="#64748B"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionPillsRow}
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
                  <BookOpen size={13} color="#A78BFA" />
                  <Text style={styles.label}>4. Filière / Spécialité</Text>
                </View>
                <TextInput
                  testID="input-express-major"
                  style={styles.input}
                  value={major}
                  onChangeText={setMajor}
                  placeholder="Ex: Informatique & Génie Logiciel"
                  placeholderTextColor="#64748B"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionPillsRow}
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
                  <GraduationCap size={13} color="#A78BFA" />
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
                  <Layers size={13} color="#A78BFA" />
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
                    style={[styles.input, { flex: 1, height: 38 }]}
                    value={customSkillInput}
                    onChangeText={setCustomSkillInput}
                    placeholder="Autre compétence..."
                    placeholderTextColor="#64748B"
                    onSubmitEditing={handleAddCustomSkill}
                  />
                  <Pressable
                    style={styles.addSkillBtn}
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
                  <Text style={styles.submitBtnText}>Enregistrer et continuer (30s)</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: '#120E22',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
    elevation: 6,
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
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  profileBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '600',
    color: '#DDD6FE',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 16,
    color: stitchColors.inkMuted,
  },
  scrollArea: {
    flexGrow: 1,
    marginVertical: 4,
  },
  form: {
    gap: 14,
    paddingBottom: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#DDD6FE',
  },
  hintText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#090714',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamilies.inter,
  },
  suggestionPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: '#8B5CF6',
  },
  pillText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#94A3B8',
  },
  pillTextActive: {
    color: '#DDD6FE',
    fontWeight: '600',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  levelChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  levelChipText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
  },
  levelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  skillBadgeActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderColor: '#8B5CF6',
  },
  skillBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#CBD5E1',
  },
  skillBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addSkillBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSkillBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: '#DDD6FE',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
