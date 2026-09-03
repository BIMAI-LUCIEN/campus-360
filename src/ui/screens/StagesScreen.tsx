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

const DEFAULT_BANNERS: Record<string, string> = {
  'Tech & IA': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
  'Finance & Audit': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=900&auto=format&fit=crop&q=80',
  'Design UI/UX': 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=900&auto=format&fit=crop&q=80',
  'BTP & Génie Civil': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&auto=format&fit=crop&q=80',
  'Marketing & Com': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&auto=format&fit=crop&q=80',
  'Logistique': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
  'Santé': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=80',
  'Droit': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80',
};

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

        {/* ── Featured Popular Carousel (Inspired by Image 1) ────────────────── */}
        {!loading && jobs.length > 0 && !searchQuery && activeSector === 'Tous' && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredHeaderRow}>
              <Text style={styles.featuredSectionTitle}>En vedette &amp; Populaires</Text>
              <Pressable onPress={() => setShowTopThreeOnly(!showTopThreeOnly)}>
                <Text style={styles.seeAllText}>{showTopThreeOnly ? 'Voir tout' : 'Top Matches'}</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScrollContent}
            >
              {jobs.slice(0, 5).map((featuredJob) => {
                const bannerUri =
                  featuredJob.flyerUrl ||
                  DEFAULT_BANNERS[featuredJob.company?.industry || 'default'] ||
                  DEFAULT_BANNERS.default;
                return (
                  <Pressable
                    key={`featured-${featuredJob.id}`}
                    style={styles.featuredCard}
                    onPress={() => setSelectedDetailJob(featuredJob)}
                  >
                    <Image source={{ uri: bannerUri }} style={styles.featuredCardImg} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(9, 7, 20, 0.75)', '#090714']}
                      style={styles.featuredGradient}
                    >
                      <View style={styles.featuredBadge}>
                        <Sparkles size={11} color="#34D399" />
                        <Text style={styles.featuredBadgeText}>
                          {featuredJob.matchScore || 92}% Match
                        </Text>
                      </View>
                      <Text style={styles.featuredJobTitle} numberOfLines={1}>
                        {featuredJob.title}
                      </Text>
                      <Text style={styles.featuredCompanyText} numberOfLines={1}>
                        {featuredJob.company?.name} • {featuredJob.location || 'Abidjan'}
                      </Text>
                      <Text style={styles.featuredStipendText}>
                        {featuredJob.stipend ? featuredJob.stipend.replace(/\(.*\)/, '').trim() : 'Gratification'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

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
            const cardBannerUri =
              job.flyerUrl ||
              DEFAULT_BANNERS[job.company?.industry || 'default'] ||
              DEFAULT_BANNERS.default;

            return (
              <Pressable
                key={job.id}
                style={styles.jobCard}
                onPress={() => setSelectedDetailJob(job)}
              >
                {/* 1. Large Card Hero Image (Hotel / Flight Card Style) */}
                <View style={styles.cardHeroImageContainer}>
                  <Image source={{ uri: cardBannerUri }} style={styles.cardHeroImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'rgba(19, 16, 36, 0.92)']}
                    style={styles.cardHeroOverlay}
                  />

                  {/* Floating Top Badges */}
                  <View style={styles.floatingBadgesRow}>
                    <View style={styles.floatingContractBadge}>
                      <Text style={styles.floatingContractText}>{job.contractType || 'Stage'}</Text>
                    </View>

                    <View style={[styles.floatingMatchBadge, isHighMatch && styles.floatingMatchBadgeHigh]}>
                      <Sparkles size={11} color={isHighMatch ? '#34D399' : '#A78BFA'} />
                      <Text style={[styles.floatingMatchText, isHighMatch && styles.floatingMatchTextHigh]}>
                        {matchScore}% Match IA
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mediaBadge}>
                    <Sparkles size={10} color="#FDE047" />
                    <Text style={styles.mediaBadgeText}>Visuel Recruteur</Text>
                  </View>
                </View>
                {/* 2. Card Content Body */}
                <View style={styles.cardBody}>
                  {/* Company Info Row */}
                  <View style={styles.companyRow}>
                    <View style={styles.companyAvatarBox}>
                      {job.company?.logoUrl ? (
                        <Image source={{ uri: job.company.logoUrl }} style={styles.companyLogoImg} resizeMode="cover" />
                      ) : (
                        <Text style={styles.companyInitialsText}>{companyInitials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <View style={styles.companyNameRow}>
                        <Text style={styles.cardCompanyName} numberOfLines={1}>
                          {job.company?.name}
                        </Text>
                        {job.company?.status === 'VERIFIED' && (
                          <CheckCircle2 size={13} color="#34D399" />
                        )}
                      </View>
                      <Text style={styles.companyIndustry} numberOfLines={1}>
                        {job.company?.industry || 'Entreprise'}
                      </Text>
                    </View>

                    {job.isSponsored && (
                      <View style={styles.urgentBadge}>
                        <Flame size={11} color="#FBBF24" />
                        <Text style={styles.urgentText}>URGENT</Text>
                      </View>
                    )}
                  </View>

                  {/* Job Title */}
                  <Text style={styles.cardJobTitle} numberOfLines={2}>
                    {job.title}
                  </Text>

                  {/* Location & Duration Meta */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color="#94A3B8" />
                      <Text style={styles.metaItemText}>{job.location || 'Abidjan'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.metaItemText}>{job.duration || '3 à 6 mois'}</Text>
                    </View>
                  </View>

                  {/* Skills Pills */}
                  <View style={styles.skillsRow}>
                    {job.requirements.slice(0, 3).map((skill, index) => {
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
                    {job.requirements.length > 3 && (
                      <View style={styles.skillPill}>
                        <Text style={styles.skillPillText}>+{job.requirements.length - 3}</Text>
                      </View>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Bottom Row: Stipend on Left & Pill Button on Right */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.stipendCol}>
                      <Text style={styles.stipendLabel}>Indemnité mensuelle</Text>
                      <Text style={styles.stipendAmount}>
                        {job.stipend ? job.stipend.replace(/\(.*\)/, '').trim() : 'Gratification'}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.applyPillBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setApplyingJob(job);
                      }}
                    >
                      <LinearGradient
                        colors={['#8B5CF6', '#7C3AED']}
                        style={styles.applyPillGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.applyPillBtnText}>Postuler 1-clic</Text>
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

  // ── Featured Popular Carousel (Image 1 "Popular Destinations" style) ──────
  featuredSection: {
    marginBottom: 20,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  featuredSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#A78BFA',
  },
  featuredScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  featuredCard: {
    width: 220,
    height: 170,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#131024',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    position: 'relative',
  },
  featuredCardImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 12,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 7, 20, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  featuredJobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featuredCompanyText: {
    fontSize: 11,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  featuredStipendText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },

  // ── Main Job Card (Hotel / Offer Card Style with 20px Radius & Elevation) ──
  jobCard: {
    backgroundColor: '#131024',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeroImageContainer: {
    width: '100%',
    height: 155,
    position: 'relative',
    backgroundColor: '#090714',
  },
  cardHeroImage: {
    width: '100%',
    height: '100%',
  },
  cardHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 7, 20, 0.25)',
  },
  mediaBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 7, 20, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.35)',
  },
  mediaBadgeText: {
    color: '#DDD6FE',
    fontSize: 10,
    fontWeight: '700',
  },
  floatingBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingContractBadge: {
    backgroundColor: 'rgba(9, 7, 20, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  floatingContractText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 7, 20, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  floatingMatchBadgeHigh: {
    borderColor: 'rgba(52, 211, 153, 0.5)',
    backgroundColor: 'rgba(6, 44, 28, 0.85)',
  },
  floatingMatchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C4B5FD',
  },
  floatingMatchTextHigh: {
    color: '#34D399',
  },
  cardBody: {
    padding: 16,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  companyAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  companyLogoImg: {
    width: '100%',
    height: '100%',
  },
  companyInitialsText: {
    color: '#DDD6FE',
    fontSize: 13,
    fontWeight: '800',
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardCompanyName: {
    fontSize: 13.5,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  companyIndustry: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  urgentText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FBBF24',
  },
  cardJobTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  skillPillMatching: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  skillPillText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  skillPillTextMatching: {
    color: '#DDD6FE',
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stipendCol: {
    flex: 1,
  },
  stipendLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  stipendAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
  },
  applyPillBtn: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  applyPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  applyPillBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
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
