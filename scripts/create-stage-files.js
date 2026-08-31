const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

ensureDir(path.join(__dirname, '..', 'src', 'features', 'stages'));
ensureDir(path.join(__dirname, '..', 'src', 'ui', 'screens'));

// 1. AiApplyModal.tsx
const aiApplyModalCode = `import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (visible && job) {
      setStep('generating');
      setResult(null);

      const t1 = setTimeout(() => {
        setProgressMsg('Rédaction ciblée du CV et de la lettre de motivation...');
      }, 700);

      const t2 = setTimeout(() => {
        setProgressMsg('Mise en forme et génération du dossier haute définition...');
      }, 1400);

      generateIaApplication(job, studentProfile)
        .then((res) => {
          setResult(res);
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
    const mailto = \`mailto:\${result.recipientEmail}?subject=\${result.emailSubject}&body=\${result.emailBody}\`;
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
                <Pressable
                  style={[styles.tabBtn, activePreviewTab === 'letter' && styles.tabBtnActive]}
                  onPress={() => setActivePreviewTab('letter')}
                >
                  <FileText size={16} color={activePreviewTab === 'letter' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.tabBtnText, activePreviewTab === 'letter' && styles.tabBtnTextActive]}>
                    Lettre Ciblée
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabBtn, activePreviewTab === 'cv' && styles.tabBtnActive]}
                  onPress={() => setActivePreviewTab('cv')}
                >
                  <Building2 size={16} color={activePreviewTab === 'cv' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.tabBtnText, activePreviewTab === 'cv' && styles.tabBtnTextActive]}>
                    CV Optimisé
                  </Text>
                </Pressable>
              </View>

              <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
                <Text style={styles.previewText}>
                  {activePreviewTab === 'letter' ? result.letterText : result.cvText}
                </Text>
              </ScrollView>

              <View style={styles.actionsBox}>
                <Text style={styles.actionsTitle}>Canal d'envoi immédiat :</Text>
                <View style={styles.channelRow}>
                  <Pressable style={styles.channelBtnWhatsapp} onPress={handleOpenWhatsapp}>
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      style={styles.gradientBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Send size={18} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>Via WhatsApp</Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable style={styles.channelBtnEmail} onPress={handleOpenEmail}>
                    <Mail size={18} color="#FFFFFF" />
                    <Text style={styles.channelBtnText}>Par Email</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.downloadLink} onPress={handleDownloadPdf}>
                  <Download size={15} color="#94A3B8" />
                  <Text style={styles.downloadLinkText}>Télécharger le PDF (Impression / Dépôt)</Text>
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
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'features', 'stages', 'AiApplyModal.tsx'), aiApplyModalCode, 'utf8');
console.log('Created src/features/stages/AiApplyModal.tsx');

// 2. StagesScreen.tsx (Cœur Produit / Feed)
const stagesScreenCode = `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Sparkles,
  MapPin,
  Clock,
  Coins,
  Send,
  Building2,
  CheckCircle2,
  ChevronRight,
  Flame,
  Filter,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { StageJob } from '../../types';
import { fetchStageJobs } from '../../features/stages/stagesApi';
import { AiApplyModal } from '../../features/stages/AiApplyModal';

interface StagesScreenProps {
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
  onSelectJob?: (job: StageJob) => void;
  onOpenWallet?: () => void;
}

const SECTORS = ['Tous', 'Informatique', 'Finance', 'Design', 'Logistique'];

export function StagesScreen({
  studentProfile,
  onSelectJob,
  onOpenWallet,
}: StagesScreenProps) {
  const [jobs, setJobs] = useState<StageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSector, setActiveSector] = useState('Tous');
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchStageJobs({
        query: searchQuery,
        sector: activeSector,
        userSkills: studentProfile.skills,
      });
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, activeSector, studentProfile.skills]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.container}>
      {/* Search & Header Bar */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingTitle}>Opportunités de Stage</Text>
            <Text style={styles.greetingSubtitle}>
              Matching calibré pour : <Text style={styles.majorHighlight}>{studentProfile.major || 'Étudiant'}</Text>
            </Text>
          </View>
          <Pressable style={styles.tokensPill} onPress={onOpenWallet}>
            <Sparkles size={14} color="#FBBF24" />
            <Text style={styles.tokensText}>{studentProfile.tokens ?? 1} IA Jetons</Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par poste, mot-clé ou ville..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Sector Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectorsScroll} contentContainerStyle={styles.sectorsContent}>
          {SECTORS.map((sector) => {
            const isActive = activeSector === sector;
            return (
              <Pressable
                key={sector}
                style={[styles.sectorChip, isActive && styles.sectorChipActive]}
                onPress={() => setActiveSector(sector)}
              >
                <Text style={[styles.sectorChipText, isActive && styles.sectorChipTextActive]}>
                  {sector}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Job Feed */}
      <ScrollView
        style={styles.feedScroll}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Calcul des meilleures affinités...</Text>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Building2 size={42} color="#64748B" />
            <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
            <Text style={styles.emptySubtitle}>Essayez de modifier votre recherche ou vos filtres.</Text>
          </View>
        ) : (
          jobs.map((job) => {
            const matchScore = job.matchScore || 75;
            const isHighMatch = matchScore >= 80;

            return (
              <Pressable
                key={job.id}
                style={styles.jobCard}
                onPress={() => (onSelectJob ? onSelectJob(job) : setApplyingJob(job))}
              >
                {/* Card Top Row: Match % + Sponsored Badge */}
                <View style={styles.cardHeader}>
                  <View style={[styles.matchBadge, isHighMatch ? styles.matchBadgeHigh : styles.matchBadgeStandard]}>
                    <Sparkles size={12} color={isHighMatch ? '#34D399' : '#60A5FA'} />
                    <Text style={[styles.matchBadgeText, isHighMatch ? styles.matchTextHigh : styles.matchTextStandard]}>
                      Match à {matchScore}%
                    </Text>
                  </View>
                  {job.isSponsored && (
                    <View style={styles.sponsoredBadge}>
                      <Flame size={12} color="#F59E0B" />
                      <Text style={styles.sponsoredText}>URGENT</Text>
                    </View>
                  )}
                </View>

                {/* Job Title & Company */}
                <Text style={styles.cardJobTitle}>{job.title}</Text>
                <View style={styles.companyRow}>
                  <Building2 size={14} color="#94A3B8" />
                  <Text style={styles.cardCompanyName}>{job.company?.name}</Text>
                  {job.company?.status === 'VERIFIED' && (
                    <CheckCircle2 size={13} color="#10B981" style={{ marginLeft: 2 }} />
                  )}
                </View>

                {/* Location & Stipend & Duration Tags */}
                <View style={styles.tagsRow}>
                  <View style={styles.tagItem}>
                    <MapPin size={12} color="#94A3B8" />
                    <Text style={styles.tagText}>{job.location || 'Abidjan'}</Text>
                  </View>
                  <View style={styles.tagItem}>
                    <Clock size={12} color="#94A3B8" />
                    <Text style={styles.tagText}>{job.duration || '3-6 mois'}</Text>
                  </View>
                  {job.stipend && (
                    <View style={styles.tagItem}>
                      <Coins size={12} color="#10B981" />
                      <Text style={[styles.tagText, { color: '#34D399' }]}>{job.stipend}</Text>
                    </View>
                  )}
                </View>

                {/* Skills tags */}
                <View style={styles.skillsRow}>
                  {job.requirements.slice(0, 4).map((skill, index) => {
                    const isMatching = job.matchingSkills?.includes(skill);
                    return (
                      <View
                        key={index}
                        style={[styles.skillPill, isMatching && styles.skillPillMatching]}
                      >
                        <Text style={[styles.skillPillText, isMatching && styles.skillPillTextMatching]}>
                          {skill}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Action CTA */}
                <View style={styles.cardFooter}>
                  <Text style={styles.viewDetailText}>Voir le détail</Text>
                  <Pressable
                    style={styles.applyBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setApplyingJob(job);
                    }}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
                      style={styles.applyGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Sparkles size={14} color="#FFFFFF" />
                      <Text style={styles.applyBtnText}>L'IA postule</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* AI Apply Modal */}
      <AiApplyModal
        visible={!!applyingJob}
        job={applyingJob}
        studentProfile={studentProfile}
        onClose={() => setApplyingJob(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  majorHighlight: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  tokensPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  tokensText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  sectorsScroll: {
    marginTop: 10,
  },
  sectorsContent: {
    gap: 8,
    paddingRight: 10,
  },
  sectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectorChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  sectorChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sectorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  matchBadgeHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  matchBadgeStandard: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchTextHigh: {
    color: '#34D399',
  },
  matchTextStandard: {
    color: '#60A5FA',
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
  },
  cardJobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 22,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  cardCompanyName: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  skillPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  skillPillMatching: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  skillPillText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  skillPillTextMatching: {
    color: '#C084FC',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  viewDetailText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  applyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 6,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'ui', 'screens', 'StagesScreen.tsx'), stagesScreenCode, 'utf8');
console.log('Created src/ui/screens/StagesScreen.tsx');

// 3. ApplicationsTimelineScreen.tsx
const applicationsTimelineScreenCode = `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  Calendar,
  Send,
  Building2,
  HelpCircle,
  FileCheck,
} from 'lucide-react-native';
import type { StageApplication, AppStatus } from '../../types';
import {
  fetchStudentApplications,
  updateApplicationStatus,
  generateFollowupReminderMessage,
} from '../../features/stages/stagesApi';

interface ApplicationsTimelineProps {
  studentName: string;
}

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; bg: string; text: string; icon: any }
> = {
  PENDING: { label: 'En attente', bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24', icon: Clock },
  REVIEWING: { label: 'En revue', bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', icon: FileCheck },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC', icon: MessageSquare },
  ACCEPTED: { label: 'Accepté ! 🎉', bg: 'rgba(16, 185, 129, 0.18)', text: '#34D399', icon: CheckCircle2 },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', icon: XCircle },
};

export function ApplicationsTimelineScreen({ studentName }: ApplicationsTimelineProps) {
  const [applications, setApplications] = useState<StageApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const data = await fetchStudentApplications();
    setApplications(data);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStatusChange = async (appId: string, currentStatus: AppStatus) => {
    const options: AppStatus[] = ['PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
    const nextStatus = options[(options.indexOf(currentStatus) + 1) % options.length];
    await updateApplicationStatus(appId, nextStatus);
    if (nextStatus === 'ACCEPTED') {
      Alert.alert('Félicitations ! 🎓✨', 'Félicitations pour votre stage ! Nous célébrons votre réussite.');
    }
    loadData();
  };

  const handleSendReminder = (app: StageApplication) => {
    const reminderMsg = generateFollowupReminderMessage(app, studentName || 'Étudiant');
    const rawPhone = (app.job?.company?.contactWhatsapp || '').replace(/[^0-9]/g, '') || '2250708091011';
    const waUrl = \`https://wa.me/\${rawPhone}?text=\${encodeURIComponent(reminderMsg)}\`;
    Alert.alert(
      'Relance IA Préparée',
      reminderMsg,
      [
        { text: 'Envoyer via WhatsApp', onPress: () => Linking.openURL(waUrl) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suivi des Candidatures</Text>
        <Text style={styles.subtitle}>
          Historique, mises à jour et relances automatisées
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {applications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Clock size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>Aucune candidature envoyée</Text>
            <Text style={styles.emptySubtitle}>
              Utilisez le bouton "L'IA postule" depuis le flux de stages pour démarrer.
            </Text>
          </View>
        ) : (
          applications.map((app, index) => {
            const conf = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = conf.icon;
            const isPendingLong = app.status === 'PENDING';

            return (
              <View key={app.id} style={styles.appCard}>
                <View style={styles.cardTop}>
                  <Pressable
                    style={[styles.statusBadge, { backgroundColor: conf.bg }]}
                    onPress={() => handleStatusChange(app.id, app.status)}
                  >
                    <StatusIcon size={13} color={conf.text} />
                    <Text style={[styles.statusText, { color: conf.text }]}>{conf.label}</Text>
                  </Pressable>
                  <Text style={styles.dateText}>
                    {new Date(app.appliedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>

                <Text style={styles.jobTitle}>{app.job?.title}</Text>
                <View style={styles.companyRow}>
                  <Building2 size={14} color="#94A3B8" />
                  <Text style={styles.companyName}>{app.job?.company?.name}</Text>
                </View>

                {app.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{app.notes}</Text>
                  </View>
                )}

                {/* Footer with Actions */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.changeStatusBtn}
                    onPress={() => handleStatusChange(app.id, app.status)}
                  >
                    <Text style={styles.changeStatusText}>Changer le statut</Text>
                  </Pressable>

                  {isPendingLong && (
                    <Pressable
                      style={styles.reminderBtn}
                      onPress={() => handleSendReminder(app)}
                    >
                      <Sparkles size={13} color="#C084FC" />
                      <Text style={styles.reminderBtnText}>Relancer par IA</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  appCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 13,
    color: '#94A3B8',
  },
  notesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  changeStatusBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeStatusText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  reminderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C084FC',
  },
});
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'ui', 'screens', 'ApplicationsTimelineScreen.tsx'), applicationsTimelineScreenCode, 'utf8');
console.log('Created src/ui/screens/ApplicationsTimelineScreen.tsx');

// 4. ResourcesScreen.tsx (Hub secondaire regroupant PDF Académiques + Assistant IA Révision)
const resourcesScreenCode = `import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { BookOpen, Sparkles, FileText, Layers } from 'lucide-react-native';
import { ExploreScreen } from './ExploreScreen';
import { LibraryScreen } from './LibraryScreen';
import type { CampusDocument, CampusPdfPack } from '../../types';

interface ResourcesScreenProps {
  purchasedIds: string[];
  purchasedPackIds: string[];
  walletBalance: number;
  onOpenPdf: (doc: CampusDocument) => void;
  onOpenPack?: (pack: CampusPdfPack) => void;
  onOpenAssistant?: () => void;
}

export function ResourcesScreen({
  purchasedIds,
  purchasedPackIds,
  walletBalance,
  onOpenPdf,
  onOpenPack,
  onOpenAssistant,
}: ResourcesScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'catalogue' | 'library'>('catalogue');

  return (
    <View style={styles.container}>
      {/* Sub-tabs header for secondary features */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Ressources & Révisions</Text>
          {onOpenAssistant && (
            <Pressable style={styles.assistantBtn} onPress={onOpenAssistant}>
              <Sparkles size={14} color="#A855F7" />
              <Text style={styles.assistantBtnText}>Assistant IA</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTab, activeSubTab === 'catalogue' && styles.subTabActive]}
            onPress={() => setActiveSubTab('catalogue')}
          >
            <Layers size={14} color={activeSubTab === 'catalogue' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.subTabText, activeSubTab === 'catalogue' && styles.subTabTextActive]}>
              Catalogue d'Épreuves
            </Text>
          </Pressable>

          <Pressable
            style={[styles.subTab, activeSubTab === 'library' && styles.subTabActive]}
            onPress={() => setActiveSubTab('library')}
          >
            <BookOpen size={14} color={activeSubTab === 'library' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.subTabText, activeSubTab === 'library' && styles.subTabTextActive]}>
              Mes Documents ({purchasedIds.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content depending on sub-tab */}
      <View style={styles.body}>
        {activeSubTab === 'catalogue' ? (
          <ExploreScreen
            purchasedIds={purchasedIds}
            onOpenPdf={onOpenPdf}
            onOpenPack={onOpenPack}
          />
        ) : (
          <LibraryScreen
            purchasedIds={purchasedIds}
            purchasedPackIds={purchasedPackIds}
            onOpenPdf={onOpenPdf}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  assistantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  assistantBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C084FC',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: '#3B82F6',
  },
  subTabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
});
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'ui', 'screens', 'ResourcesScreen.tsx'), resourcesScreenCode, 'utf8');
console.log('Created src/ui/screens/ResourcesScreen.tsx');
