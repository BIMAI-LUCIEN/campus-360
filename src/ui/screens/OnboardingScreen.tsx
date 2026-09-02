import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Layers,
  Award,
  ChevronLeft,
  Check,
  Plus,
  Compass,
  Target,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ─── DOMAINES D'ÉTUDES CAPTIVANTS & MODERNES ─────────────────────────────────
export interface DomainItem {
  id: string;
  title: string;
  icon: string;
  badge: string;
  skills: string[];
}

export const DOMAINS: DomainItem[] = [
  {
    id: 'ai-data',
    title: 'Intelligence Artificielle & Data Science',
    icon: '💻',
    badge: 'Machine Learning, LLM & Data',
    skills: [
      'Python & Pandas',
      'Machine Learning',
      'Deep Learning & PyTorch',
      'SQL & Data Engineering',
      'Prompt Engineering & LLMs',
      'Data Visualization & Power BI',
      'Scikit-Learn',
      'Statistiques Appliquées',
    ],
  },
  {
    id: 'software-cloud',
    title: 'Ingénierie Logicielle, Web & Cloud',
    icon: '🚀',
    badge: 'Full-Stack, DevOps & Mobile',
    skills: [
      'React / React Native',
      'TypeScript & Modern JS',
      'Node.js & Backend APIs',
      'Docker & Cloud AWS/GCP',
      'Git & CI/CD Pipelines',
      'Bases de données SQL & NoSQL',
      'Architecture Microservices',
      'Cybersécurité & Auth',
    ],
  },
  {
    id: 'finance-syscohada',
    title: 'Finance, FinTech & Gestion SYSCOHADA',
    icon: '💳',
    badge: 'Comptabilité, Audit & FinTech',
    skills: [
      'Plan Comptable SYSCOHADA',
      'Analyse Financière & Ratios',
      'Excel Avancé & Modélisation',
      'Audit & Contrôle de Gestion',
      'FinTech & Mobile Money',
      'Fiscalité des Entreprises',
      'Trésorerie & Budget',
      'Évaluation d\'Entreprise',
    ],
  },
  {
    id: 'design-product',
    title: 'UI/UX Design & Conception Produit',
    icon: '🎨',
    badge: 'Figma, Design System & User Research',
    skills: [
      'Figma & Design Systems',
      'Wireframing & Prototypage',
      'Recherche Utilisateur (UX)',
      'Design Responsive Mobile',
      'Micro-interactions & Motion',
      'Design Thinking & Atelier',
      'Accessibilité Numérique',
      'Branding & Identité Visuelle',
    ],
  },
  {
    id: 'business-law',
    title: 'Droit des Affaires & Fiscalité Juridique',
    icon: '⚖️',
    badge: 'Droit OHADA, Contrats & Conseil',
    skills: [
      'Droit Commercial & Sociétés (OHADA)',
      'Rédaction de Contrats',
      'Droit du Travail & RH',
      'Contentieux & Arbitrage',
      'Conformité & RGPD',
      'Fiscalité Internationale',
      'Propriété Intellectuelle',
      'Veille Juridique',
    ],
  },
  {
    id: 'health-biotech',
    title: 'Santé, Pharmacie & Biotechnologies',
    icon: '🏥',
    badge: 'Sciences Médicales & Laboratoire',
    skills: [
      'Biologie Moléculaire',
      'Pharmacologie Clinique',
      'Santé Publique & Épidémiologie',
      'Bio-statistiques',
      'Gestion Hospitalière',
      'Contrôle Qualité & Normes',
      'Essais Cliniques',
      'Génétique Médicale',
    ],
  },
  {
    id: 'marketing-ecommerce',
    title: 'Marketing Digital, Com & E-Commerce',
    icon: '📣',
    badge: 'Growth, Ads, SEO & Social Media',
    skills: [
      'Stratégie de Contenu & SEO',
      'Facebook & Google Ads',
      'E-Commerce & Conversion',
      'Social Media Management',
      'Email Marketing & Automation',
      'Copywriting & Storytelling',
      'Google Analytics 4',
      'Relations Publiques & Presse',
    ],
  },
  {
    id: 'engineering-civil',
    title: 'Bâtiment, Énergie & Génie Civil',
    icon: '🏗️',
    badge: 'BTP, Énergies & Infrastructures',
    skills: [
      'AutoCAD & Plans BIM',
      'Calcul de Structures (RDM)',
      'Gestion de Chantiers BTP',
      'Énergies Renouvelables & Solaire',
      'Topographie & Géotechnique',
      'Devis Quantitatif Estimatif',
      'Sécurité & QHSE',
      'Matériaux de Construction',
    ],
  },
];

export const POPULAR_UNIVERSITIES = [
  'Université Félix Houphouët-Boigny (Abidjan)',
  'INP-HB Yamoussoukro',
  'ESATIC Abidjan',
  'Université de Douala',
  'Université de Yaoundé I',
  'HEC Abidjan',
  'ESTM Dakar',
  'Université Virtuelle UVCI',
  'Institut National Polytechnique',
  'Autre Établissement',
];

export const EDUCATION_LEVELS = [
  { id: 'bts-1', name: 'BTS 1ère Année', cycle: 'Bac+1 • Technicien', icon: '🎓' },
  { id: 'bts-2', name: 'BTS 2ème Année', cycle: 'Bac+2 • Examen d\'État', icon: '🎓' },
  { id: 'licence-1', name: 'Licence 1 (L1)', cycle: 'Bac+1 • Fondations', icon: '📜' },
  { id: 'licence-2', name: 'Licence 2 (L2)', cycle: 'Bac+2 • Approfondissement', icon: '📜' },
  { id: 'licence-3', name: 'Licence 3 (L3)', cycle: 'Bac+3 • Diplôme & Stage', icon: '📜' },
  { id: 'master-1', name: 'Master 1 (M1)', cycle: 'Bac+4 • Spécialisation', icon: '🚀' },
  { id: 'master-2', name: 'Master 2 / Ingénieur', cycle: 'Bac+5 • Fin d\'études', icon: '🏆' },
  { id: 'doctorat', name: 'Doctorat / PhD', cycle: 'Bac+8 • Recherche', icon: '🔬' },
];

export const OBJECTIVE_OPTIONS = [
  { id: 'internship', label: 'Trouver un stage ou une alternance', icon: '🎯' },
  { id: 'exams', label: 'Réussir mes examens et partiels', icon: '📚' },
  { id: 'skills', label: 'Valider mes compétences clés', icon: '💡' },
  { id: 'ai-assistant', label: 'Réviser et rédiger avec l\'IA Campus', icon: '🤖' },
];

export const GENERAL_SKILLS = [
  'Gestion de Projet Agile',
  'Communication & Pitch',
  'Anglais Professionnel',
  'Esprit d\'Analyse & Synthèse',
  'Résolution de Problèmes',
  'Leadership & Travail d\'équipe',
];

export interface OnboardingScreenProps {
  initialName?: string;
  onCompleteOnboarding: (data: {
    university: string;
    major: string;
    level: string;
    skills: string[];
  }) => void;
  onSkip?: () => void;
}

export function OnboardingScreen({
  initialName = 'Étudiant',
  onCompleteOnboarding,
  onSkip,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [university, setUniversity] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('ai-data');
  const [customMajor, setCustomMajor] = useState('');
  const [level, setLevel] = useState('Licence 3 (L3)');
  const [objective, setObjective] = useState('internship');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Python & Pandas',
    'Machine Learning',
    'SQL & Data Engineering',
  ]);

  const activeDomain = useMemo(() => {
    return DOMAINS.find((d) => d.id === selectedDomainId) || DOMAINS[0];
  }, [selectedDomainId]);

  const availableSkills = useMemo(() => {
    const domainSkills = activeDomain.skills;
    return Array.from(new Set([...domainSkills, ...GENERAL_SKILLS]));
  }, [activeDomain]);

  const handleSelectDomain = (domain: DomainItem) => {
    setSelectedDomainId(domain.id);
    // Pre-populate with first 3 skills from the domain
    setSelectedSkills(domain.skills.slice(0, 3));
  };

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

  const handleNext = () => {
    if (step === 1) {
      if (!university.trim()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      const finalMajor = customMajor.trim() || activeDomain.title;
      onCompleteOnboarding({
        university: university.trim(),
        major: finalMajor,
        level,
        skills: selectedSkills,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background glow effects */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandBadge}>
            <Sparkles size={14} color="#C4B5FD" />
            <Text style={styles.brandBadgeText}>CAMPUS 360</Text>
          </View>
          {onSkip && (
            <Pressable onPress={onSkip} style={styles.skipButton} hitSlop={12}>
              <Text style={styles.skipButtonText}>Passer</Text>
            </Pressable>
          )}
        </View>

        {/* 3-Step Neon Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]}
            />
          </View>
          <View style={styles.stepLabelsRow}>
            <Text style={styles.stepIndicatorText}>Étape {step} sur 3</Text>
            <Text style={styles.stepNameText}>
              {step === 1 ? 'Université & Domaine' : step === 2 ? 'Niveau & Objectif' : 'Tes Compétences'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable Step Content ────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STEP 1: ÉTABLISSEMENT & DOMAINE ────────────────────────── */}
        {step === 1 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepIconWrap}>
                <GraduationCap size={24} color="#DDD6FE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Bienvenue, {initialName} !</Text>
                <Text style={styles.stepSubtitle}>
                  Personnalisons ton espace selon ton université et tes ambitions.
                </Text>
              </View>
            </View>

            {/* University input */}
            <Text style={styles.fieldLabel}>Ton Université ou Établissement</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ex: INP-HB, Université Félix Houphouët-Boigny..."
              placeholderTextColor="#64748B"
              value={university}
              onChangeText={setUniversity}
            />

            {/* Quick university suggestions */}
            <Text style={styles.subFieldLabel}>Suggestions rapides :</Text>
            <View style={styles.chipGrid}>
              {POPULAR_UNIVERSITIES.slice(0, 6).map((univ) => {
                const isSelected = university === univ;
                return (
                  <Pressable
                    key={univ}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setUniversity(univ)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {univ}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Domain Selection */}
            <Text style={[styles.fieldLabel, { marginTop: 22 }]}>
              Choisis ton Domaine d'études principal
            </Text>
            <Text style={styles.fieldHint}>
              Ce choix adaptera directement tes recommandations de stages et de cours.
            </Text>

            <View style={styles.domainList}>
              {DOMAINS.map((domain) => {
                const isSelected = selectedDomainId === domain.id;
                return (
                  <Pressable
                    key={domain.id}
                    style={({ pressed }) => [
                      styles.domainCard,
                      isSelected && styles.domainCardSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleSelectDomain(domain)}
                  >
                    <Text style={styles.domainEmoji}>{domain.icon}</Text>
                    <View style={styles.domainContent}>
                      <Text style={[styles.domainTitle, isSelected && styles.domainTitleSelected]}>
                        {domain.title}
                      </Text>
                      <Text style={styles.domainBadge}>{domain.badge}</Text>
                    </View>
                    <View
                      style={[
                        styles.domainCheckCircle,
                        isSelected && styles.domainCheckCircleSelected,
                      ]}
                    >
                      {isSelected ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Plus size={14} color="#64748B" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── STEP 2: NIVEAU & OBJECTIF ──────────────────────────────── */}
        {step === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepIconWrap}>
                <Layers size={24} color="#DDD6FE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Niveau & Objectif</Text>
                <Text style={styles.stepSubtitle}>
                  Où en es-tu dans ton parcours universitaire actuel ?
                </Text>
              </View>
            </View>

            {/* Academic Level */}
            <Text style={styles.fieldLabel}>Niveau d'études actuel</Text>
            <View style={styles.levelsGrid}>
              {EDUCATION_LEVELS.map((lvl) => {
                const isSelected = level === lvl.name;
                return (
                  <Pressable
                    key={lvl.id}
                    style={({ pressed }) => [
                      styles.levelCard,
                      isSelected && styles.levelCardSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setLevel(lvl.name)}
                  >
                    <Text style={styles.levelEmoji}>{lvl.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.levelName, isSelected && styles.levelNameSelected]}>
                        {lvl.name}
                      </Text>
                      <Text style={styles.levelCycle}>{lvl.cycle}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#7C3AED" strokeWidth={2.8} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Objective */}
            <Text style={[styles.fieldLabel, { marginTop: 22 }]}>
              Quel est ton objectif prioritaire ce semestre ?
            </Text>
            <View style={styles.objectiveList}>
              {OBJECTIVE_OPTIONS.map((obj) => {
                const isSelected = objective === obj.id;
                return (
                  <Pressable
                    key={obj.id}
                    style={({ pressed }) => [
                      styles.objectiveCard,
                      isSelected && styles.objectiveCardSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setObjective(obj.id)}
                  >
                    <Text style={styles.objectiveEmoji}>{obj.icon}</Text>
                    <Text
                      style={[
                        styles.objectiveLabel,
                        isSelected && styles.objectiveLabelSelected,
                      ]}
                    >
                      {obj.label}
                    </Text>
                    {isSelected && <Check size={16} color="#8B5CF6" strokeWidth={2.8} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── STEP 3: COMPÉTENCES CLÉS ───────────────────────────────── */}
        {step === 3 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
              <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(52, 211, 153, 0.18)' }]}>
                <Award size={24} color="#34D399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Tes Super-Pouvoirs</Text>
                <Text style={styles.stepSubtitle}>
                  Sélectionne 2 à 5 compétences clés pour booster ton score de matching de stages.
                </Text>
              </View>
            </View>

            <View style={styles.skillsCountBadge}>
              <Text style={styles.skillsCountText}>
                {selectedSkills.length} sélectionnée{selectedSkills.length > 1 ? 's' : ''} (min. 1, max. 6)
              </Text>
            </View>

            <Text style={styles.subFieldLabel}>
              Compétences recommandées pour « {activeDomain.title} » :
            </Text>
            <View style={styles.skillsGrid}>
              {availableSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    style={({ pressed }) => [
                      styles.skillPill,
                      isSelected && styles.skillPillSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => toggleSkill(skill)}
                  >
                    {isSelected ? (
                      <CheckCircle size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    ) : (
                      <Plus size={14} color="#A78BFA" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.skillPillText,
                        isSelected && styles.skillPillTextSelected,
                      ]}
                    >
                      {skill}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Sticky Action Bar ───────────────────────────────── */}
      <View style={styles.footer}>
        {step > 1 ? (
          <Pressable
            style={styles.backButton}
            onPress={() => setStep((s) => (s - 1) as any)}
          >
            <ChevronLeft size={18} color="#C4B5FD" />
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            ((step === 1 && !university.trim()) ||
              (step === 3 && selectedSkills.length === 0)) &&
              styles.continueButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={handleNext}
          disabled={
            (step === 1 && !university.trim()) ||
            (step === 3 && selectedSkills.length === 0)
          }
        >
          <Text style={styles.continueButtonText}>
            {step === 3 ? 'Activer mon profil ✨' : 'Continuer'}
          </Text>
          <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090714', // Deep obsidian-violet
  },
  glowTop: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.12)',
    backgroundColor: 'rgba(9, 7, 20, 0.85)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  brandBadgeText: {
    color: '#DDD6FE',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skipButtonText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    gap: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepIndicatorText: {
    color: '#DDD6FE',
    fontSize: 12,
    fontWeight: '700',
  },
  stepNameText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },

  // Content
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  stepCard: {
    backgroundColor: '#131024',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    padding: 20,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 2,
  },

  // Inputs
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 16,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1A1435',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  chipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Domain Cards
  domainList: {
    gap: 10,
  },
  domainCard: {
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  domainCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
  },
  domainEmoji: {
    fontSize: 24,
  },
  domainContent: {
    flex: 1,
  },
  domainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  domainTitleSelected: {
    color: '#DDD6FE',
  },
  domainBadge: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  domainCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1A1435',
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainCheckCircleSelected: {
    backgroundColor: '#7C3AED',
  },

  // Level Cards
  levelsGrid: {
    gap: 8,
  },
  levelCard: {
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
  },
  levelEmoji: {
    fontSize: 20,
  },
  levelName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  levelNameSelected: {
    color: '#DDD6FE',
  },
  levelCycle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },

  // Objective Cards
  objectiveList: {
    gap: 8,
  },
  objectiveCard: {
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  objectiveCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
  },
  objectiveEmoji: {
    fontSize: 20,
  },
  objectiveLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  objectiveLabelSelected: {
    color: '#DDD6FE',
    fontWeight: '700',
  },

  // Skills
  skillsCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  skillsCountText: {
    color: '#34D399',
    fontSize: 11.5,
    fontWeight: '700',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  skillPillSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  skillPillText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  skillPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0A1C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.16)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
