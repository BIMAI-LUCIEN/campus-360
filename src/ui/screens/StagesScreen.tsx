import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
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
  Share2,
  Play,
  Trophy,
  Video,
  X,
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
  const [selectedDetailJob, setSelectedDetailJob] = useState<StageJob | null>(null);
  const [showTopThreeOnly, setShowTopThreeOnly] = useState(false);

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

  const handleShareReferral = (job: StageJob) => {
    Alert.alert(
      'Lien de Parrainage Copié ! 🎁',
      `Partage ce lien avec tes amis :\nhttps://campus360.app/stages/${job.id}?ref=${studentProfile.email || 'etudiant'}\n\nDès leur inscription, vous gagnez chacun 1 jeton IA gratuit !`
    );
  };

  const displayedJobs = showTopThreeOnly
    ? [...jobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 3)
    : jobs;

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

        {/* Sector Chips + Podium Top 3 Matches */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectorsScroll} contentContainerStyle={styles.sectorsContent}>
          <Pressable
            style={[styles.podiumChip, showTopThreeOnly && styles.podiumChipActive]}
            onPress={() => setShowTopThreeOnly(!showTopThreeOnly)}
          >
            <Trophy size={13} color={showTopThreeOnly ? '#FFFFFF' : '#F59E0B'} />
            <Text style={[styles.podiumChipText, showTopThreeOnly && styles.podiumChipTextActive]}>
              🏆 Top 3 Matches
            </Text>
          </Pressable>

          {SECTORS.map((sector) => {
            const isActive = activeSector === sector && !showTopThreeOnly;
            return (
              <Pressable
                key={sector}
                style={[styles.sectorChip, isActive && styles.sectorChipActive]}
                onPress={() => {
                  setShowTopThreeOnly(false);
                  setActiveSector(sector);
                }}
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
        ) : displayedJobs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Building2 size={42} color="#64748B" />
            <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
            <Text style={styles.emptySubtitle}>Essayez de modifier votre recherche ou vos filtres.</Text>
          </View>
        ) : (
          displayedJobs.map((job) => {
            const matchScore = job.matchScore || 75;
            const isHighMatch = matchScore >= 80;

            return (
              <Pressable
                key={job.id}
                style={styles.jobCard}
                onPress={() => setSelectedDetailJob(job)}
              >
                {/* Visual Flyer / Video Media Attachment if exists */}
                {job.flyerUrl && (
                  <View style={styles.cardMediaContainer}>
                    <Image source={{ uri: job.flyerUrl }} style={styles.cardFlyerImage} resizeMode="cover" />
                    <View style={styles.mediaBadge}>
                      <Text style={styles.mediaBadgeText}>Flyer d'annonce</Text>
                    </View>
                  </View>
                )}

                {job.videoUrl && (
                  <View style={styles.cardVideoContainer}>
                    <View style={styles.videoPlayOverlay}>
                      <Play size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.mediaBadge}>
                      <Video size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.mediaBadgeText}>Pitch Vidéo</Text>
                    </View>
                  </View>
                )}

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

                {/* Action CTA & Share Button */}
                <View style={styles.cardFooter}>
                  <Pressable
                    style={styles.shareBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShareReferral(job);
                    }}
                  >
                    <Share2 size={14} color="#94A3B8" />
                    <Text style={styles.shareBtnText}>Partager (+1 jeton)</Text>
                  </Pressable>

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

      {/* Full Job Detail Modal */}
      {selectedDetailJob && (
        <Modal visible={!!selectedDetailJob} animationType="slide" transparent onRequestClose={() => setSelectedDetailJob(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle} numberOfLines={2}>{selectedDetailJob.title}</Text>
                <Pressable onPress={() => setSelectedDetailJob(null)} hitSlop={12}>
                  <X size={22} color="#94A3B8" />
                </Pressable>
              </View>

              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {selectedDetailJob.flyerUrl && (
                  <Image source={{ uri: selectedDetailJob.flyerUrl }} style={styles.detailFlyerImage} resizeMode="contain" />
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Entreprise</Text>
                  <Text style={styles.detailBodyText}>{selectedDetailJob.company?.name} • {selectedDetailJob.location}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description du Poste</Text>
                  <Text style={styles.detailBodyText}>{selectedDetailJob.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Compétences Demandées</Text>
                  <View style={styles.skillsRow}>
                    {selectedDetailJob.requirements.map((req, i) => (
                      <View key={i} style={styles.skillPill}>
                        <Text style={styles.skillPillText}>{req}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.detailFooter}>
                <Pressable
                  style={styles.detailApplyBtn}
                  onPress={() => {
                    const j = selectedDetailJob;
                    setSelectedDetailJob(null);
                    setApplyingJob(j);
                  }}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.detailApplyBtnText}>Lancer la Candidature IA</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
  podiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginRight: 8,
  },
  podiumChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B',
  },
  podiumChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  podiumChipTextActive: {
    color: '#FFFFFF',
  },
  cardMediaContainer: {
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#020617',
  },
  cardFlyerImage: {
    width: '100%',
    height: '100%',
  },
  cardVideoContainer: {
    height: 120,
    borderRadius: 14,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  videoPlayOverlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 58, 237, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  shareBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  detailContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 0.9,
  },
  detailScroll: {
    marginBottom: 16,
  },
  detailFlyerImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 14,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailBodyText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },
  detailFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailApplyBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
