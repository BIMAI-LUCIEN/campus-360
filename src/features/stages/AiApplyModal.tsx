import React, { useState, useEffect } from 'react';
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
  Download,
  X,
  Send,
  Building2,
  FileText,
  ShieldCheck,
  Wand2,
  Edit3,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { StageJob } from '../../types';
import { generateIaApplication, type GeneratedApplicationResult } from './stagesApi';

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
}

export function AiApplyModal({
  visible,
  job,
  studentProfile,
  onClose,
  onApplicationComplete,
}: AiApplyModalProps) {
  const [step, setStep] = useState<'generating' | 'preview' | 'sent'>('generating');
  const [progressMsg, setProgressMsg] = useState("Analyse de l'offre et de vos compétences...");
  const [result, setResult] = useState<GeneratedApplicationResult | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'cv' | 'letter'>('letter');
  const [isEditing, setIsEditing] = useState(false);
  const [editableLetter, setEditableLetter] = useState('');
  const [editableCv, setEditableCv] = useState('');

  useEffect(() => {
    if (visible && job) {
      setStep('generating');
      setResult(null);
      setIsEditing(false);

      const t1 = setTimeout(() => {
        setProgressMsg('Rédaction ciblée du CV et de la lettre de motivation...');
      }, 700);

      const t2 = setTimeout(() => {
        setProgressMsg('Mise en forme et génération du dossier haute définition...');
      }, 1400);

      generateIaApplication(job, studentProfile)
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
  }, [visible, job]);

  if (!visible || !job) return null;

  const handleReformulateTone = (tone: 'formal' | 'concise' | 'impact') => {
    if (tone === 'formal') {
      setEditableLetter((prev) =>
        prev
          .replace(/Bonjour,/g, 'Madame, Monsieur le Responsable du Recrutement,')
          .replace(/Cordialement,/g, 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.')
      );
      Alert.alert('Ton Formel Appliqué ✨', 'La lettre a été ajustée avec les formules de politesse de haut niveau.');
    } else if (tone === 'concise') {
      setEditableLetter((prev) =>
        prev.split('\n\n').slice(0, 3).join('\n\n') + '\n\nRestant à votre entière disposition pour un échange.'
      );
      Alert.alert('Version Concise ✂️', 'Le texte a été condensé pour une lecture ultra-rapide.');
    } else if (tone === 'impact') {
      const skillsHighlight = studentProfile.skills.slice(0, 3).join(', ');
      setEditableLetter((prev) =>
        prev + `\n\n🎯 Compétences clés directement opérationnelles : ${skillsHighlight}.`
      );
      Alert.alert('Impact Clé 🚀', 'Vos compétences principales ont été mises en exergue.');
    }
  };

  const handleInAppApply = async () => {
    try {
      setStep('sent');
      onApplicationComplete?.();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d’envoyer la candidature.');
    }
  };

  const handleOpenWhatsapp = async () => {
    if (!result?.whatsappUrl) return;
    try {
      await Linking.openURL(result.whatsappUrl);
      setStep('sent');
      onApplicationComplete?.();
    } catch (e) {
      Alert.alert('Info', 'Ouverture de WhatsApp...');
    }
  };

  const handleOpenEmail = async () => {
    if (!result) return;
    const mailto = `mailto:${result.recipientEmail}?subject=${result.emailSubject}&body=${encodeURIComponent(editableLetter)}`;
    try {
      await Linking.openURL(mailto);
      setStep('sent');
      onApplicationComplete?.();
    } catch (e) {
      Alert.alert('Info', 'Ouverture de votre messagerie...');
    }
  };

  const handleDownloadPdf = () => {
    Alert.alert(
      'Téléchargement Prêt',
      'Votre dossier PDF haute fidélité est prêt.',
      [
        {
          text: 'Ouvrir',
          onPress: () => {
            if (result?.pdfDownloadUrl) Linking.openURL(result.pdfDownloadUrl);
            setStep('sent');
            onApplicationComplete?.();
          },
        },
        { text: 'Fermer', style: 'cancel' },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.aiBadge}>
                <Sparkles size={16} color="#A855F7" />
                <Text style={styles.aiBadgeText}>Moteur IA Candidature</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <X size={20} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {job.title}
            </Text>
            <Text style={styles.companyName}>
              {job.company?.name} • {job.location || 'Abidjan / Hybride'}
            </Text>
          </View>

          {step === 'generating' && (
            <View style={styles.loadingContainer}>
              <View style={styles.sparkleOrb}>
                <ActivityIndicator size="large" color="#A855F7" />
              </View>
              <Text style={styles.loadingTitle}>Génération en cours...</Text>
              <Text style={styles.loadingSubtitle}>{progressMsg}</Text>
              <View style={styles.progressHint}>
                <ShieldCheck size={14} color="#10B981" />
                <Text style={styles.progressHintText}>
                  Aligné sur : {studentProfile.skills.slice(0, 3).join(', ') || 'Compétences clés'}
                </Text>
              </View>
            </View>
          )}

          {step === 'preview' && result && (
            <View style={styles.previewContainer}>
              <View style={styles.tabBar}>
                <View style={styles.tabGroup}>
                  <Pressable
                    style={[styles.tabBtn, activePreviewTab === 'letter' && styles.tabBtnActive]}
                    onPress={() => setActivePreviewTab('letter')}
                  >
                    <FileText size={15} color={activePreviewTab === 'letter' ? '#FFFFFF' : '#94A3B8'} />
                    <Text style={[styles.tabBtnText, activePreviewTab === 'letter' && styles.tabBtnTextActive]}>
                      Lettre Ciblée
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tabBtn, activePreviewTab === 'cv' && styles.tabBtnActive]}
                    onPress={() => setActivePreviewTab('cv')}
                  >
                    <Building2 size={15} color={activePreviewTab === 'cv' ? '#FFFFFF' : '#94A3B8'} />
                    <Text style={[styles.tabBtnText, activePreviewTab === 'cv' && styles.tabBtnTextActive]}>
                      CV Optimisé
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
                  onPress={() => setIsEditing(!isEditing)}
                >
                  <Edit3 size={13} color={isEditing ? '#FFFFFF' : '#A855F7'} />
                  <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                    {isEditing ? 'Terminer' : 'Modifier'}
                  </Text>
                </Pressable>
              </View>

              {/* AI Quick Reformulation Toolbar (Only on Letter) */}
              {activePreviewTab === 'letter' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aiToolbarScroll} contentContainerStyle={styles.aiToolbarContent}>
                  <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('formal')}>
                    <Wand2 size={12} color="#A855F7" />
                    <Text style={styles.aiPillText}>🎩 Plus Formel</Text>
                  </Pressable>
                  <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('concise')}>
                    <Wand2 size={12} color="#3B82F6" />
                    <Text style={styles.aiPillText}>✂️ Plus Concis</Text>
                  </Pressable>
                  <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('impact')}>
                    <Wand2 size={12} color="#10B981" />
                    <Text style={styles.aiPillText}>🎯 Mettre en valeur mes compétences</Text>
                  </Pressable>
                </ScrollView>
              )}

              <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
                {isEditing ? (
                  <TextInput
                    style={styles.editorTextInput}
                    multiline
                    value={activePreviewTab === 'letter' ? editableLetter : editableCv}
                    onChangeText={activePreviewTab === 'letter' ? setEditableLetter : setEditableCv}
                    placeholderTextColor="#64748B"
                  />
                ) : (
                  <Text style={styles.previewText}>
                    {activePreviewTab === 'letter' ? editableLetter : editableCv}
                  </Text>
                )}
              </ScrollView>

              <View style={styles.actionsBox}>
                <Text style={styles.actionsTitle}>Canal d'envoi immédiat :</Text>
                <View style={styles.channelRow}>
                  {/* Direct In-App Dispatch */}
                  <Pressable style={styles.channelBtnInApp} onPress={handleInAppApply}>
                    <Sparkles size={16} color="#FFFFFF" />
                    <Text style={styles.channelBtnText}>In-App Direct</Text>
                  </Pressable>

                  <Pressable style={styles.channelBtnWhatsapp} onPress={handleOpenWhatsapp}>
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      style={styles.gradientBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Send size={16} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>WhatsApp</Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable style={styles.channelBtnEmail} onPress={handleOpenEmail}>
                    <Mail size={16} color="#FFFFFF" />
                    <Text style={styles.channelBtnText}>Email</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.downloadLink} onPress={handleDownloadPdf}>
                  <Download size={14} color="#94A3B8" />
                  <Text style={styles.downloadLinkText}>Télécharger le PDF haute définition</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 'sent' && (
            <View style={styles.sentContainer}>
              <View style={styles.sentIconCircle}>
                <CheckCircle2 size={54} color="#10B981" />
              </View>
              <Text style={styles.sentTitle}>Candidature Transmise !</Text>
              <Text style={styles.sentDesc}>
                Votre dossier a été enregistré dans vos candidatures. Relance automatique prévue à J+7 si aucune réponse.
              </Text>
              <Pressable style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneBtnText}>Fermer et Suivre</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '92%',
    minHeight: 480,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C084FC',
  },
  closeBtn: {
    padding: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  companyName: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    minHeight: 300,
  },
  sparkleOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressHintText: {
    fontSize: 12,
    color: '#34D399',
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#3B82F6',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewScroll: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    maxHeight: 210,
  },
  previewScrollContent: {
    paddingBottom: 10,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#E2E8F0',
  },
  actionsBox: {
    marginTop: 14,
  },
  actionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  editToggleBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  editToggleText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '700',
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },
  aiToolbarScroll: {
    marginBottom: 10,
  },
  aiToolbarContent: {
    flexDirection: 'row',
    gap: 8,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiPillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  editorTextInput: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
    minHeight: 160,
  },
  channelBtnInApp: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  channelBtnWhatsapp: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  channelBtnEmail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  channelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  downloadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
    gap: 6,
  },
  downloadLinkText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
  sentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    minHeight: 300,
  },
  sentIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  sentDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
