import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import {
  Search,
  Sparkles,
  MapPin,
  Clock,
  Coins,
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
  Briefcase,
  Layers,
  ArrowUpRight,
  Check,
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

const SECTORS = [
  'Tous',
  'Tech & IA',
  'Finance & Audit',
  'Design UI/UX',
  'BTP & Génie Civil',
  'Marketing & Com',
  'Logistique',
  'Droit',
  'Santé',
];

const CONTRACT_TYPES = [
  'Tous',
  'Stage PFE',
  'Stage Académique',
  'Premier Emploi',
  'Alternance',
];

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
  const [activeContractType, setActiveContractType] = useState('Tous');
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<StageJob | null>(null);
  const [showTopThreeOnly, setShowTopThreeOnly] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchStageJobs({
        query: searchQuery,
        sector: activeSector,
        contractType: activeContractType,
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
  }, [searchQuery, activeSector, activeContractType, studentProfile.skills]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleShareReferral = (job: StageJob) => {
    Alert.alert(
      'Lien de Partage Copié ! 🎁',
      `Partage cette offre avec tes contacts :\nhttps://campus360.app/stages/${job.id}?ref=${studentProfile.email || 'etudiant'}\n\nDès l'inscription d'un ami, vous gagnez chacun 1 jeton IA gratuit !`
    );
  };

  const displayedJobs = useMemo(() => {
    if (showTopThreeOnly) {
      return [...jobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 3);
    }
    return jobs;
  }, [jobs, showTopThreeOnly]);

  return (
    <View style={styles.container}>
      {/* Background ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* ── Search & Header Bar ──────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle}>Stages &amp; Emplois</Text>
            <Text style={styles.greetingSubtitle} numberOfLines={1}>
              Matching intelligent pour :{' '}
              <Text style={styles.majorHighlight}>{studentProfile.major || 'Étudiant'}</Text>
            </Text>
          </View>
          <Pressable style={styles.tokensPill} onPress={onOpenWallet}>
            <Sparkles size={13} color="#FDE047" />
            <Text style={styles.tokensText}>{studentProfile.tokens ?? 1} Jetons IA</Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={17} color="#A78BFA" />
          <TextInput
            style={styles.searchInput}
            placeholder="Poste, entreprise, compétences, ville..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Filter Scroll: Sectors */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <Pressable
            style={[styles.podiumChip, showTopThreeOnly && styles.podiumChipActive]}
            onPress={() => setShowTopThreeOnly(!showTopThreeOnly)}
          >
            <Trophy size={13} color={showTopThreeOnly ? '#FFFFFF' : '#F59E0B'} />
            <Text style={[styles.podiumChipText, showTopThreeOnly && styles.podiumChipTextActive]}>
              Top 3 Matches
            </Text>
          </Pressable>

          {SECTORS.map((sector) => {
            const isActive = activeSector === sector && !showTopThreeOnly;
            return (
              <Pressable
                key={sector}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  setShowTopThreeOnly(false);
                  setActiveSector(sector);
                }}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {sector}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filter Scroll: Contract Types */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.contractsScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {CONTRACT_TYPES.map((contract) => {
            const isActive = activeContractType === contract;
            return (
              <Pressable
                key={contract}
                style={[styles.contractChip, isActive && styles.contractChipActive]}
                onPress={() => setActiveContractType(contract)}
              >
                <Text style={[styles.contractChipText, isActive && styles.contractChipTextActive]}>
                  {contract}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Main Job Feed ────────────────────────────────────────── */}
      <ScrollView
        style={styles.feedScroll}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {/* Results count bar */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            {displayedJobs.length} opportunité{displayedJobs.length > 1 ? 's' : ''} disponible{displayedJobs.length > 1 ? 's' : ''}
          </Text>
          <View style={styles.verifiedBadge}>
            <CheckCircle2 size={12} color="#34D399" />
            <Text style={styles.verifiedBadgeText}>Entreprises Vérifiées KYB</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Calcul des meilleures affinités de stage...</Text>
          </View>
        ) : displayedJobs.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Building2 size={36} color="#A78BFA" />
            </View>
            <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Essaie de réinitialiser la recherche ou de changer les filtres de secteur.
            </Text>
            <Pressable
              style={styles.resetFiltersBtn}
              onPress={() => {
                setSearchQuery('');
                setActiveSector('Tous');
                setActiveContractType('Tous');
                setShowTopThreeOnly(false);
              }}
            >
              <Text style={styles.resetFiltersBtnText}>Réinitialiser les filtres</Text>
            </Pressable>
          </View>
        ) : (
          displayedJobs.map((job) => {
            const matchScore = job.matchScore || 75;
            const isHighMatch = matchScore >= 80;
            const companyInitials = job.company?.name
              ? job.company.name.slice(0, 2).toUpperCase()
              : 'CP';

            return (
              <Pressable
                key={job.id}
                style={styles.jobCard}
                onPress={() => setSelectedDetailJob(job)}
              >
                {/* Visual Flyer Attachment if exists */}
                {job.flyerUrl && (
                  <View style={styles.cardMediaContainer}>
                    <Image
                      source={{ uri: job.flyerUrl }}
                      style={styles.cardFlyerImage}
                      resizeMode="cover"
                    />
                    <View style={styles.mediaBadge}>
                      <Text style={styles.mediaBadgeText}>Flyer Recruteur</Text>
                    </View>
                  </View>
                )}

                {/* Card Top Row: Company Avatar + Match Score + Urgent */}
                <View style={styles.cardHeader}>
                  <View style={styles.companyLeftCol}>
                    <View style={styles.companyAvatarCircle}>
                      <Text style={styles.companyAvatarText}>{companyInitials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.companyNameRow}>
                        <Text style={styles.cardCompanyName} numberOfLines={1}>
                          {job.company?.name}
                        </Text>
                        {job.company?.status === 'VERIFIED' && (
                          <CheckCircle2 size={13} color="#34D399" />
                        )}
                      </View>
                      <Text style={styles.companyIndustry} numberOfLines={1}>
                        {job.company?.industry}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBadgesCol}>
                    <View
                      style={[
                        styles.matchBadge,
                        isHighMatch ? styles.matchBadgeHigh : styles.matchBadgeStandard,
                      ]}
                    >
                      <Sparkles size={11} color={isHighMatch ? '#34D399' : '#A78BFA'} />
                      <Text
                        style={[
                          styles.matchBadgeText,
                          isHighMatch ? styles.matchTextHigh : styles.matchTextStandard,
                        ]}
                      >
                        {matchScore}% Match
                      </Text>
                    </View>

                    {job.isSponsored && (
                      <View style={styles.sponsoredBadge}>
                        <Flame size={10} color="#FBBF24" />
                        <Text style={styles.sponsoredText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Job Title */}
                <Text style={styles.cardJobTitle}>{job.title}</Text>

                {/* Tags Row (Contract, Location, Duration, Stipend) */}
                <View style={styles.tagsRow}>
                  {job.contractType && (
                    <View style={styles.contractTag}>
                      <Briefcase size={11} color="#C4B5FD" />
                      <Text style={styles.contractTagText}>{job.contractType}</Text>
                    </View>
                  )}
                  <View style={styles.tagItem}>
                    <MapPin size={11} color="#94A3B8" />
                    <Text style={styles.tagText}>{job.location || 'Abidjan'}</Text>
                  </View>
                  <View style={styles.tagItem}>
                    <Clock size={11} color="#94A3B8" />
                    <Text style={styles.tagText}>{job.duration || '3-6 mois'}</Text>
                  </View>
                  {job.stipend && (
                    <View style={styles.stipendTag}>
                      <Coins size={11} color="#34D399" />
                      <Text style={styles.stipendTagText}>{job.stipend}</Text>
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
                        {isMatching && (
                          <Check size={10} color="#DDD6FE" style={{ marginRight: 3 }} />
                        )}
                        <Text
                          style={[
                            styles.skillPillText,
                            isMatching && styles.skillPillTextMatching,
                          ]}
                        >
                          {skill}
                        </Text>
                      </View>
                    );
                  })}
                  {job.requirements.length > 4 && (
                    <View style={styles.skillPill}>
                      <Text style={styles.skillPillText}>+{job.requirements.length - 4}</Text>
                    </View>
                  )}
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
                    <Share2 size={13} color="#A78BFA" />
                    <Text style={styles.shareBtnText}>Partager</Text>
                  </Pressable>

                  <View style={styles.cardFooterRight}>
                    <Pressable
                      style={styles.detailBtn}
                      onPress={() => setSelectedDetailJob(job)}
                    >
                      <Text style={styles.detailBtnText}>Détails</Text>
                    </Pressable>

                    <Pressable
                      style={styles.applyBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setApplyingJob(job);
                      }}
                    >
                      <LinearGradient
                        colors={['#8B5CF6', '#7C3AED']}
                        style={styles.applyGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.applyBtnText}>Postuler avec l'IA</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ── Full Job Detail Modal ─────────────────────────────────── */}
      {selectedDetailJob && (
        <Modal
          visible={!!selectedDetailJob}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedDetailJob(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailCompany}>{selectedDetailJob.company?.name}</Text>
                  <Text style={styles.detailTitle} numberOfLines={2}>
                    {selectedDetailJob.title}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedDetailJob(null)}
                  hitSlop={12}
                  style={styles.detailCloseBtn}
                >
                  <X size={18} color="#C4B5FD" />
                </Pressable>
              </View>

              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {selectedDetailJob.flyerUrl && (
                  <Image
                    source={{ uri: selectedDetailJob.flyerUrl }}
                    style={styles.detailFlyerImage}
                    resizeMode="contain"
                  />
                )}

                {/* Key metadata pills */}
                <View style={styles.detailMetaGrid}>
                  <View style={styles.detailMetaItem}>
                    <Briefcase size={14} color="#A78BFA" />
                    <Text style={styles.detailMetaLabel}>Contrat</Text>
                    <Text style={styles.detailMetaValue}>
                      {selectedDetailJob.contractType || 'Stage'}
                    </Text>
                  </View>
                  <View style={styles.detailMetaItem}>
                    <MapPin size={14} color="#A78BFA" />
                    <Text style={styles.detailMetaLabel}>Localisation</Text>
                    <Text style={styles.detailMetaValue}>
                      {selectedDetailJob.location || 'Abidjan'}
                    </Text>
                  </View>
                  <View style={styles.detailMetaItem}>
                    <Coins size={14} color="#34D399" />
                    <Text style={styles.detailMetaLabel}>Rémunération</Text>
                    <Text style={[styles.detailMetaValue, { color: '#34D399' }]}>
                      {selectedDetailJob.stipend || 'Indemnité'}
                    </Text>
                  </View>
                  <View style={styles.detailMetaItem}>
                    <Clock size={14} color="#A78BFA" />
                    <Text style={styles.detailMetaLabel}>Durée</Text>
                    <Text style={styles.detailMetaValue}>
                      {selectedDetailJob.duration || '3 à 6 mois'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description de la Mission</Text>
                  <Text style={styles.detailBodyText}>{selectedDetailJob.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Compétences &amp; Prérequis</Text>
                  <View style={styles.skillsRow}>
                    {selectedDetailJob.requirements.map((req, i) => (
                      <View key={i} style={styles.skillPillMatching}>
                        <Check size={11} color="#DDD6FE" style={{ marginRight: 4 }} />
                        <Text style={styles.skillPillTextMatching}>{req}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>À propos de l'Entreprise</Text>
                  <Text style={styles.detailBodyText}>
                    {selectedDetailJob.company?.name} est une entreprise vérifiée par Campus 360 (Score KYB : {selectedDetailJob.company?.kybScore ?? 95}%). Adresse : {selectedDetailJob.company?.address}.
                  </Text>
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
                  <Text style={styles.detailApplyBtnText}>Lancer ma Candidature IA ✨</Text>
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
    backgroundColor: '#090714', // Deep obsidian violet
  },
  glowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(9, 7, 20, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.14)',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  majorHighlight: {
    color: '#C4B5FD',
    fontWeight: '700',
  },
  tokensPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  tokensText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DDD6FE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0B1F',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13.5,
  },

  // Filter scrolls
  filtersScroll: {
    marginTop: 10,
  },
  contractsScroll: {
    marginTop: 6,
  },
  filtersContent: {
    gap: 6,
    paddingRight: 10,
  },
  podiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 5,
  },
  podiumChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B',
  },
  podiumChipText: {
    fontSize: 11.5,
    color: '#FBBF24',
    fontWeight: '700',
  },
  podiumChipTextActive: {
    color: '#FFFFFF',
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#131024',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  filterChipText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contractChip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contractChipActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.28)',
    borderColor: '#8B5CF6',
  },
  contractChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  contractChipTextActive: {
    color: '#DDD6FE',
    fontWeight: '700',
  },

  // Feed
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
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
    padding: 36,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#131024',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFiltersBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Job Card
  jobCard: {
    backgroundColor: '#131024',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
  },
  cardMediaContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  cardFlyerImage: {
    width: '100%',
    height: '100%',
  },
  mediaBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  companyLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  companyAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyAvatarText: {
    color: '#DDD6FE',
    fontSize: 13,
    fontWeight: '800',
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCompanyName: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  companyIndustry: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  cardBadgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  matchBadgeHigh: {
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  matchBadgeStandard: {
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  matchBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  matchTextHigh: {
    color: '#34D399',
  },
  matchTextStandard: {
    color: '#C4B5FD',
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  sponsoredText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
  },
  cardJobTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  contractTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contractTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DDD6FE',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  stipendTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stipendTagText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  skillPill: {
    backgroundColor: '#0E0B1F',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
  },
  skillPillMatching: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  skillPillText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  skillPillTextMatching: {
    color: '#DDD6FE',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.12)',
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  shareBtnText: {
    fontSize: 11.5,
    color: '#A78BFA',
    fontWeight: '600',
  },
  detailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  detailBtnText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  applyBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    gap: 5,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  detailContainer: {
    backgroundColor: '#131024',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.24)',
    borderBottomWidth: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.14)',
  },
  detailCompany: {
    fontSize: 12.5,
    color: '#A78BFA',
    fontWeight: '700',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  detailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E0B1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  detailScroll: {
    padding: 20,
  },
  detailFlyerImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 16,
  },
  detailMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  detailMetaItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    borderRadius: 12,
    padding: 12,
  },
  detailMetaLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  detailMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 18,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E2E8F0',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  detailBodyText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  detailFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.14)',
    backgroundColor: '#0E0B1F',
  },
  detailApplyBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  detailApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
