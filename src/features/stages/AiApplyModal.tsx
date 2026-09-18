import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import {
  Sparkles,
  CheckCircle2,
  Mail,
  X,
  Send,
  Building2,
  FileText,
  ShieldCheck,
  Edit3,
  Check,
  Copy,
  Download,
  Coins,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { StageJob } from '../../types';
import { generateIaApplication, submitStageApplication, type GeneratedApplicationResult } from './stagesApi';
import { analyzeJobMatch, type MatchAnalysis } from './aiMatchEngine';
import { exportApplicationPdf, buildWhatsAppPitch } from './pdfExportService';
import { StudentProfileExpressModal } from './StudentProfileExpressModal';
import { stitchColors, fontFamilies, stitchRadius } from '../../theme/stitch';

interface AiApplyModalProps {
  visible: boolean;
  job: StageJob | null;
  studentProfile: {
    fullName: string;
    email: string;
    phoneWhatsapp?: string;
    major: string;
    educationLevel: string;
    skills: string[];
    portfolioUrl?: string;
    tokens?: number;
  };
  onClose: () => void;
  onApplicationComplete?: () => void;
  onRecharge?: () => void;
}

export function AiApplyModal({
  visible,
  job,
  studentProfile,
  onClose,
  onApplicationComplete,
  onRecharge,
}: AiApplyModalProps) {
  const [step, setStep] = useState<'generating' | 'preview' | 'sent'>('generating');
  const [progressMsg, setProgressMsg] = useState("Agent Matcher : Analyse de l'offre et de vos compétences...");
  const [result, setResult] = useState<GeneratedApplicationResult | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'letter' | 'cv' | 'match'>('letter');
  const [isEditing, setIsEditing] = useState(false);
  const [editableLetter, setEditableLetter] = useState('');
  const [editableCv, setEditableCv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Dynamic state for student profile if completed via express modal
  const [currentProfile, setCurrentProfile] = useState(studentProfile);
  const [showExpressModal, setShowExpressModal] = useState(false);

  useEffect(() => {
    setCurrentProfile(studentProfile);
  }, [studentProfile]);

  // Compute Match Analysis
  const matchAnalysis: MatchAnalysis | null = useMemo(() => {
    if (!job) return null;
    return analyzeJobMatch(job, currentProfile);
  }, [job, currentProfile]);

  // Check if profile is missing essentials
  const isProfileIncomplete = useMemo(() => {
    return (
      !currentProfile.major ||
      currentProfile.major === 'Non renseigné' ||
      !currentProfile.skills ||
      currentProfile.skills.length === 0
    );
  }, [currentProfile]);

  const persistApplication = async () => {
    if (!result || !job) throw new Error('Candidature non générée.');
    setSubmitting(true);
    try {
      const applicationId = await submitStageApplication(job.id, editableCv, editableLetter);
      setResult((current) => (current ? { ...current, applicationId } : current));
      return applicationId;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (visible && job) {
      // If student has incomplete profile, prompt express modal first
      if (isProfileIncomplete) {
        setShowExpressModal(true);
        return;
      }

      setStep('generating');
      setResult(null);
      setIsEditing(false);
      setCopiedPitch(false);

      const t1 = setTimeout(() => {
        setProgressMsg('Agent Rédacteur : Conception du CV et de la lettre de motivation...');
      }, 700);

      const t2 = setTimeout(() => {
        setProgressMsg('Formatage haute fidélité & alignement mots-clés RH...');
      }, 1400);

      generateIaApplication(job, currentProfile)
        .then((res) => {
          setResult(res);
          setEditableLetter(res.letterText);
          setEditableCv(res.cvText);
          setStep('preview');
        })
        .catch(() => {
          Alert.alert('Erreur', 'Impossible de générer la candidature. Réessayez.');
          onClose();
        });

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [visible, job, currentProfile, isProfileIncomplete]);

  if (!visible || !job) return null;

  const handleExpressProfileSaved = (data: {
    university: string;
    major: string;
    level: string;
    skills: string[];
  }) => {
    setShowExpressModal(false);
    setCurrentProfile((prev) => ({
      ...prev,
      major: data.major,
      educationLevel: data.level,
      skills: data.skills,
    }));
  };

  const handleReformulateTone = (tone: 'formal' | 'concise' | 'impact') => {
    if (tone === 'formal') {
      setEditableLetter((prev) =>
        prev
          .replace(/Bonjour,/g, 'Madame, Monsieur le Responsable du Recrutement,')
          .replace(
            /Cordialement,/g,
            'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.'
          )
      );
      Alert.alert('Ton formel appliqué', 'Formules protocolaires professionnelles insérées.');
    } else if (tone === 'concise') {
      setEditableLetter((prev) =>
        prev.split('\n\n').slice(0, 3).join('\n\n') +
        '\n\nRestant à votre entière disposition pour échanger lors d’un entretien.'
      );
      Alert.alert('Version concise', 'Format direct en 3 paragraphes opérationnels.');
    } else if (tone === 'impact') {
      const skillsHighlight = currentProfile.skills.slice(0, 3).join(', ');
      setEditableLetter((prev) =>
        prev + `\n\nCompétences clés directement opérationnelles : ${skillsHighlight}.`
      );
      Alert.alert('Compétences mises en avant', 'Compétences clés insérées dans le corps du texte.');
    }
  };

  // 1. Action: Copier le message WhatsApp d'accroche direct
  const handleCopyPitchForWhatsapp = async () => {
    const pitch = buildWhatsAppPitch({
      studentName: currentProfile.fullName,
      major: currentProfile.major,
      jobTitle: job.title,
      companyName: job.company?.name || "L'Entreprise",
      letterSummary: editableLetter,
    });

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(pitch);
    }
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 3000);
  };

  // 2. Action: Télécharger le PDF mis en page
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await exportApplicationPdf({
        studentName: currentProfile.fullName,
        studentEmail: currentProfile.email,
        studentPhone: currentProfile.phoneWhatsapp,
        major: currentProfile.major,
        educationLevel: currentProfile.educationLevel,
        jobTitle: job.title,
        companyName: job.company?.name || "L'Entreprise",
        letterText: editableLetter,
        cvText: editableCv,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 3. Action: Dispatch In-App
  const handleInAppApply = async () => {
    try {
      await persistApplication();
      setStep('sent');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d’enregistrer la candidature.');
    }
  };

  // 4. Action: Dispatch WhatsApp
  const handleOpenWhatsapp = async () => {
    if (!result?.whatsappUrl) return;
    try {
      await persistApplication();
      await Linking.openURL(result.whatsappUrl);
      setStep('sent');
    } catch (e) {
      Alert.alert('Info', 'Ouverture de WhatsApp...');
    }
  };

  // 5. Action: Dispatch Email
  const handleOpenEmail = async () => {
    if (!result) return;
    const mailto = `mailto:${result.recipientEmail}?subject=${result.emailSubject}&body=${encodeURIComponent(
      editableLetter
    )}`;
    try {
      await persistApplication();
      await Linking.openURL(mailto);
      setStep('sent');
    } catch (e) {
      Alert.alert('Info', 'Ouverture de votre messagerie...');
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.aiBadge}>
                  <FileText size={13} color="#A78BFA" />
                  <Text style={styles.aiBadgeText}>Dossier de candidature</Text>
                </View>

                {matchAnalysis && (
                  <View style={styles.matchBadgeTop}>
                    <Text style={styles.matchBadgeTopText}>{matchAnalysis.score}% de correspondance</Text>
                  </View>
                )}

                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={styles.closeBtn}
                  testID="ai-modal-close"
                  accessibilityLabel="Fermer"
                >
                  <X size={18} color="#94A3B8" />
                </Pressable>
              </View>

              <Text style={styles.jobTitle} numberOfLines={1}>
                {job.title}
              </Text>
              <Text style={styles.companyName}>
                {job.company?.name} • {job.location || 'Hybride / Présentiel'}
              </Text>
            </View>

            {/* Étape 1 : Génération & Analyse de correspondance */}
            {step === 'generating' && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingOrb}>
                  <ActivityIndicator size="large" color="#7C3AED" />
                </View>
                <Text style={styles.loadingTitle}>Préparation de votre dossier</Text>
                <Text style={styles.loadingSubtitle}>{progressMsg}</Text>

                {matchAnalysis && (
                  <View style={styles.matchBriefCard}>
                    <View style={styles.matchBriefHeader}>
                      <Text style={styles.matchBriefTitle}>
                        Correspondance de profil : {matchAnalysis.score}%
                      </Text>
                    </View>
                    {matchAnalysis.matchedPoints.slice(0, 2).map((point, idx) => (
                      <View key={idx} style={styles.matchPointRow}>
                        <CheckCircle2 size={13} color="#34D399" />
                        <Text style={styles.matchPointText}>{point}</Text>
                      </View>
                    ))}
                    <Text style={styles.matchAdviceText}>
                      Conseil : {matchAnalysis.strategicAdvice}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Étape 2 : Prévisualisation, Onglets, Édition & Sorties */}
            {step === 'preview' && result && (
              <View style={styles.previewContainer}>
                {/* Tab Bar */}
                <View style={styles.tabBar}>
                  <View style={styles.tabGroup}>
                    <Pressable
                      testID="tab-letter"
                      style={[styles.tabBtn, activePreviewTab === 'letter' && styles.tabBtnActive]}
                      onPress={() => setActivePreviewTab('letter')}
                    >
                      <FileText
                        size={14}
                        color={activePreviewTab === 'letter' ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activePreviewTab === 'letter' && styles.tabBtnTextActive,
                        ]}
                      >
                        Lettre
                      </Text>
                    </Pressable>

                    <Pressable
                      testID="tab-cv"
                      style={[styles.tabBtn, activePreviewTab === 'cv' && styles.tabBtnActive]}
                      onPress={() => setActivePreviewTab('cv')}
                    >
                      <Building2
                        size={14}
                        color={activePreviewTab === 'cv' ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activePreviewTab === 'cv' && styles.tabBtnTextActive,
                        ]}
                      >
                        CV
                      </Text>
                    </Pressable>

                    <Pressable
                      testID="tab-match"
                      style={[styles.tabBtn, activePreviewTab === 'match' && styles.tabBtnActive]}
                      onPress={() => setActivePreviewTab('match')}
                    >
                      <ShieldCheck
                        size={14}
                        color={activePreviewTab === 'match' ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activePreviewTab === 'match' && styles.tabBtnTextActive,
                        ]}
                      >
                        Correspondance
                      </Text>
                    </Pressable>
                  </View>

                  {activePreviewTab !== 'match' && (
                    <Pressable
                      style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
                      onPress={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 size={13} color={isEditing ? '#FFFFFF' : '#A78BFA'} />
                      <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                        {isEditing ? 'Terminer' : 'Modifier'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* AI Quick Reformulation Toolbar (Lettre) */}
                {activePreviewTab === 'letter' && !isEditing && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.aiToolbarScroll}
                    contentContainerStyle={styles.aiToolbarContent}
                  >
                    <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('formal')}>
                      <Text style={styles.aiPillText}>Plus formel</Text>
                    </Pressable>
                    <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('concise')}>
                      <Text style={styles.aiPillText}>Plus concis</Text>
                    </Pressable>
                    <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('impact')}>
                      <Text style={styles.aiPillText}>Compétences clés</Text>
                    </Pressable>
                  </ScrollView>
                )}

                {/* Main Content Area */}
                <ScrollView
                  style={styles.previewScroll}
                  contentContainerStyle={styles.previewScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {activePreviewTab === 'match' && matchAnalysis ? (
                    <View style={styles.matchTabCard}>
                      <View style={styles.matchHeaderScore}>
                        <Text style={styles.matchScoreBig}>{matchAnalysis.score}%</Text>
                        <Text style={styles.matchScoreHeadline}>{matchAnalysis.headline}</Text>
                      </View>

                      <View style={styles.divider} />

                      <Text style={styles.matchSectionTitle}>Points forts du profil :</Text>
                      {matchAnalysis.matchedPoints.map((p, i) => (
                        <View key={i} style={styles.matchPointItem}>
                          <CheckCircle2 size={15} color="#34D399" />
                          <Text style={styles.matchPointItemText}>{p}</Text>
                        </View>
                      ))}

                      <View style={styles.strategicBox}>
                        <Text style={styles.strategicTitle}>Stratégie recommandée</Text>
                        <Text style={styles.strategicText}>{matchAnalysis.strategicAdvice}</Text>
                      </View>
                    </View>
                  ) : isEditing ? (
                    <TextInput
                      style={styles.editorTextInput}
                      multiline
                      value={activePreviewTab === 'letter' ? editableLetter : editableCv}
                      onChangeText={
                        activePreviewTab === 'letter' ? setEditableLetter : setEditableCv
                      }
                      placeholderTextColor="#64748B"
                    />
                  ) : (
                    <Text style={styles.previewText}>
                      {activePreviewTab === 'letter' ? editableLetter : editableCv}
                    </Text>
                  )}
                </ScrollView>

                {/* Quick Utility Actions Row: Copier WhatsApp & Télécharger PDF */}
                <View style={styles.utilRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.utilBtn,
                      copiedPitch && styles.utilBtnSuccess,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={handleCopyPitchForWhatsapp}
                  >
                    {copiedPitch ? (
                      <Check size={14} color="#10B981" />
                    ) : (
                      <Copy size={14} color="#A78BFA" />
                    )}
                    <Text style={[styles.utilBtnText, copiedPitch && { color: '#10B981' }]}>
                      {copiedPitch ? 'Texte copié' : 'Copier le texte'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.utilBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? (
                      <ActivityIndicator size="small" color="#A78BFA" />
                    ) : (
                      <Download size={14} color="#A78BFA" />
                    )}
                    <Text style={styles.utilBtnText}>Télécharger le PDF</Text>
                  </Pressable>
                </View>

                {/* Actions Box: Canaux d'envoi immédiat */}
                <View style={styles.actionsBox}>
                  <Text style={styles.actionsTitle}>Canal d'envoi :</Text>
                  <View style={styles.channelRow}>
                    {/* Direct In-App */}
                    <Pressable
                      testID="btn-apply-inapp"
                      style={({ pressed }) => [styles.channelBtnInApp, pressed && { opacity: 0.85 }]}
                      onPress={handleInAppApply}
                      disabled={submitting}
                    >
                      <Send size={14} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>In-App</Text>
                    </Pressable>

                    {/* WhatsApp */}
                    <Pressable
                      style={({ pressed }) => [styles.channelBtnWhatsapp, pressed && { opacity: 0.85 }]}
                      onPress={handleOpenWhatsapp}
                      disabled={submitting}
                    >
                      <Send size={14} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>WhatsApp RH</Text>
                    </Pressable>

                    {/* Email */}
                    <Pressable
                      style={({ pressed }) => [styles.channelBtnEmail, pressed && { opacity: 0.85 }]}
                      onPress={handleOpenEmail}
                      disabled={submitting}
                    >
                      <Mail size={14} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>Email RH</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.savedHint}>
                    {submitting
                      ? 'Enregistrement en cours…'
                      : 'Candidature enregistrée dans le suivi · Rappel de relance à J+7'}
                  </Text>
                </View>
              </View>
            )}

            {/* Étape 3 : Confirmation & Suivi */}
            {step === 'sent' && (
              <View style={styles.sentContainer}>
                <View style={styles.sentIconCircle}>
                  <CheckCircle2 size={48} color="#10B981" />
                </View>
                <Text style={styles.sentTitle}>Candidature transmise</Text>
                <Text style={styles.sentDesc}>
                  Votre dossier a été enregistré dans votre espace. En l'absence de réponse sous 7 jours, vous pourrez envoyer une relance en 1 clic.
                </Text>
                <Pressable
                  style={styles.doneBtn}
                  onPress={() => {
                    onClose();
                    onApplicationComplete?.();
                  }}
                  testID="ai-modal-done"
                >
                  <Text style={styles.doneBtnText}>Fermer et consulter le suivi</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Express si profil incomplet */}
      <StudentProfileExpressModal
        visible={showExpressModal}
        initialUniversity="Université de Yaoundé I"
        initialMajor={currentProfile.major}
        initialLevel={currentProfile.educationLevel}
        initialSkills={currentProfile.skills}
        onClose={() => {
          setShowExpressModal(false);
          onClose();
        }}
        onSaveAndContinue={handleExpressProfileSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#120E22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '92%',
    minHeight: 520,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  aiBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '500',
    color: '#A78BFA',
  },
  matchBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeTopText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  companyName: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Loading Screen
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  loadingOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  matchBriefCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  matchBriefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  matchBriefTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  matchPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchPointText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#F8FAFC',
    flex: 1,
  },
  matchAdviceText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: '#A78BFA',
    marginTop: 4,
  },

  // Preview Container
  previewContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  tabBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  editToggleBtnActive: {
    backgroundColor: '#7C3AED',
  },
  editToggleText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#A78BFA',
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },

  // AI Toolbar
  aiToolbarScroll: {
    maxHeight: 36,
    marginBottom: 6,
  },
  aiToolbarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  aiPillText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '400',
    color: '#CBD5E1',
  },

  // Text Content
  previewScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewScrollContent: {
    paddingVertical: 8,
  },
  previewText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 20,
    color: '#E2E8F0',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  editorTextInput: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 20,
    color: '#FFFFFF',
    backgroundColor: '#131024',
    padding: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#7C3AED',
    minHeight: 220,
    textAlignVertical: 'top',
  },

  // Match Tab
  matchTabCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  matchHeaderScore: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 10,
  },
  matchScoreBig: {
    fontFamily: fontFamilies.serif,
    fontSize: 28,
    fontWeight: '700',
    color: '#A78BFA',
  },
  matchScoreHeadline: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  matchSectionTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  matchPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  matchPointItemText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 17,
    color: '#CBD5E1',
    flex: 1,
  },
  strategicBox: {
    marginTop: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 8,
    padding: 10,
  },
  strategicTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 3,
  },
  strategicText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    lineHeight: 16,
    color: '#DDD6FE',
  },

  // Utility row (Copier WhatsApp & Télécharger PDF)
  utilRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  utilBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  utilBtnSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  utilBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#CBD5E1',
  },

  // Actions Box
  actionsBox: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionsTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  channelBtnInApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelBtnWhatsapp: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelBtnEmail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  channelBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savedHint: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },

  // Sent Confirmation
  sentContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  sentIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sentTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  sentDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  doneBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
