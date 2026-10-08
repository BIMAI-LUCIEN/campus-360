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
  Linking,
  Share,
} from 'react-native';
import {
  MapPin,
  Clock,
  Coins,
  Building2,
  CheckCircle2,
  X,
  Briefcase,
  ChevronLeft,
  Share2,
  Heart,
  Sparkles,
  MessageCircle,
  Mail,
  Compass,
  Star,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { StageJob } from '../../types';
import { fetchStageJobs } from '../../features/stages/stagesApi';
import { AiApplyModal } from '../../features/stages/AiApplyModal';
import { analyzeJobMatch } from '../../features/stages/aiMatchEngine';
import { cleanPhoneNumber } from '../../features/whatsapp/whatsappService';
import { SearchFilterBar } from '../GlassComponents';
import {
  stitchColors,
  stitchRadius,
  stitchShadows,
} from '../../theme/stitch';

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

export const BANNER_POOLS: Record<string, string[]> = {
  tech: [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80',
  ],
  finance: [
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=900&auto=format&fit=crop&q=80',
  ],
  btp: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&auto=format&fit=crop&q=80',
  ],
  marketing: [
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&auto=format&fit=crop&q=80',
  ],
  logistique: [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=900&auto=format&fit=crop&q=80',
  ],
  sante: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=900&auto=format&fit=crop&q=80',
  ],
  droit: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?w=900&auto=format&fit=crop&q=80',
  ],
  admin: [
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&auto=format&fit=crop&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=80',
  ],
};

export function getRotatingJobBanner(job: StageJob, index: number = 0): string {
  if (job.flyerUrl && !job.flyerUrl.includes('placeholder')) {
    return job.flyerUrl;
  }

  const text = `${job.company?.industry || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase();
  let poolKey = 'default';
  if (/tech|développ|dev|informatique|software|web|mobile|télécom|cloud|réseau|cyber/.test(text)) {
    poolKey = 'tech';
  } else if (/financ|banque|audit|compta|cobac|cemac|bourse|trésor/.test(text)) {
    poolKey = 'finance';
  } else if (/btp|génie civil|bâtiment|travaux publics|architect|construction/.test(text)) {
    poolKey = 'btp';
  } else if (/market|com|vente|commercial|publicité|brand|événement|cosmét/.test(text)) {
    poolKey = 'marketing';
  } else if (/logist|transit|supply chain|douan|port|fret|stock/.test(text)) {
    poolKey = 'logistique';
  } else if (/santé|pharmac|médic|biolog|biochim|biomédic|laboratoire/.test(text)) {
    poolKey = 'sante';
  } else if (/droit|jurid|contentieux|légal|avocat|ohada/.test(text)) {
    poolKey = 'droit';
  } else if (/admin|secrétariat|gestion|organisation|service/.test(text)) {
    poolKey = 'admin';
  }

  const pool = BANNER_POOLS[poolKey] || BANNER_POOLS.default;
  let charSum = 0;
  for (let i = 0; i < job.id.length; i++) {
    charSum += job.id.charCodeAt(i) * (i + 1);
  }
  const chosenIndex = (charSum + index) % pool.length;
  return pool[chosenIndex];
}

export function getWorkspacePhotos(job: StageJob): string[] {
  if (job.workspacePhotos && job.workspacePhotos.length > 0) {
    return job.workspacePhotos;
  }
  const text = `${job.company?.industry || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase();
  let poolKey = 'default';
  if (/tech|développ|dev|informatique|software|web|mobile|télécom|cloud|réseau|cyber/.test(text)) {
    poolKey = 'tech';
  } else if (/financ|banque|audit|compta|cobac|cemac|bourse|trésor/.test(text)) {
    poolKey = 'finance';
  } else if (/btp|génie civil|bâtiment|travaux publics|architect|construction/.test(text)) {
    poolKey = 'btp';
  } else if (/market|com|vente|commercial|publicité|brand|événement|cosmét/.test(text)) {
    poolKey = 'marketing';
  } else if (/logist|transit|supply chain|douan|port|fret|stock/.test(text)) {
    poolKey = 'logistique';
  } else if (/santé|pharmac|médic|biolog|biochim|biomédic|laboratoire/.test(text)) {
    poolKey = 'sante';
  } else if (/droit|jurid|contentieux|légal|avocat|ohada/.test(text)) {
    poolKey = 'droit';
  } else if (/admin|secrétariat|gestion|organisation|service/.test(text)) {
    poolKey = 'admin';
  }

  const pool = BANNER_POOLS[poolKey] || BANNER_POOLS.default;
  return pool.slice(0, 5);
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
  const [activeDetailTab, setActiveDetailTab] = useState<'about' | 'company' | 'aiAdvice'>('about');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchStageJobs({
        query: searchQuery,
        sector: activeSector,
        contractType: activeContractType,
        userSkills: studentProfile.skills,
        studentProfile,
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

  const toggleFavorite = (jobId: string) => {
    setFavorites((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const handleShareJob = async (job?: StageJob | null) => {
    if (!job) return;
    try {
      await Share.share({
        title: job.title,
        message: `Découvre cette offre de stage sur Campus 360 : "${job.title}" chez ${job.company?.name || 'Entreprise'}.\nPostule en 1 clic : https://campus360.app/stages/${job.id}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDirections = (address?: string) => {
    const loc = address || selectedDetailJob?.location || selectedDetailJob?.company?.address || 'Douala, Cameroun';
    const query = encodeURIComponent(loc);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://maps.google.com/?q=${query}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {});
    });
  };

  const handleRecruiterWhatsapp = () => {
    if (!selectedDetailJob) return;
    const rawPhone = selectedDetailJob.company?.contactWhatsapp || '237690123456';
    const clean = cleanPhoneNumber(rawPhone);
    const textMsg = encodeURIComponent(
      `Bonjour, je suis candidat sur Campus 360 pour l'offre "${selectedDetailJob.title}" au sein de ${selectedDetailJob.company?.name || 'votre structure'}.`
    );
    const url = `https://wa.me/${clean}?text=${textMsg}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', 'Impossible d\'ouvrir WhatsApp. Vérifiez que l\'application est installée.');
    });
  };

  const handleRecruiterEmail = () => {
    if (!selectedDetailJob) return;
    const email = selectedDetailJob.company?.contactEmail || 'recrutement@campus360.app';
    const subject = encodeURIComponent(`Candidature Stage : ${selectedDetailJob.title}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite postuler au poste de ${selectedDetailJob.title} publié sur Campus 360.\n\nCordialement,\n${studentProfile.fullName}`
    );
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Email', 'Impossible d\'ouvrir votre client de messagerie.');
    });
  };

  const handleApplyFromDetail = () => {
    const job = selectedDetailJob;
    if (!job) return;
    if (Platform.OS === 'ios') {
      setSelectedDetailJob(null);
      setTimeout(() => {
        setApplyingJob(job);
      }, 350);
    } else {
      setSelectedDetailJob(null);
      setTimeout(() => {
        setApplyingJob(job);
      }, 200);
    }
  };

  const handleShareReferral = (job: StageJob) => {
    Alert.alert(
      'Lien de Partage Copié ! 🎁',
      `Partage cette offre avec tes contacts :\nhttps://campus360.app/stages/${job.id}?ref=${studentProfile.email || 'etudiant'}\n\nDès l'inscription d'un ami, vous gagnez chacun 1 jeton IA gratuit !`
    );
  };

  const enrichedJobs = useMemo(() => {
    return jobs.map((job) => {
      const match = analyzeJobMatch(job, studentProfile);
      return {
        ...job,
        matchScore: match.score,
        matchHeadline: match.headline,
        matchBadgeColor: match.badgeColor,
        matchReasons: match.matchedPoints,
        matchingSkills: match.keyStrengths.length > 0 ? match.keyStrengths : job.matchingSkills,
      };
    });
  }, [jobs, studentProfile]);

  const displayedJobs = useMemo(() => {
    if (showTopThreeOnly) {
      return [...enrichedJobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 3);
    }
    return enrichedJobs;
  }, [enrichedJobs, showTopThreeOnly]);

  const detailMatch = useMemo(() => {
    return selectedDetailJob ? analyzeJobMatch(selectedDetailJob, studentProfile) : null;
  }, [selectedDetailJob, studentProfile]);

  return (
    <View style={styles.container}>
      {/* ── Search & Header Bar ──────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle}>Stages &amp; Emplois</Text>
            <Text style={styles.greetingSubtitle} numberOfLines={1}>
              Opportunités adaptées à votre profil ({studentProfile.major || 'Étudiant'})
            </Text>
          </View>
        </View>

        {/* Search Input */}
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Poste, entreprise, compétences, ville..."
          onFilterPress={() => setShowTopThreeOnly(!showTopThreeOnly)}
          hasActiveFilters={showTopThreeOnly || activeSector !== 'Tous' || activeContractType !== 'Tous'}
          style={{ paddingHorizontal: 0, marginBottom: 12 }}
        />

        {/* Filter Scroll: Sectors */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <Pressable
            testID="filter-top3"
            style={[styles.podiumChip, showTopThreeOnly && styles.podiumChipActive]}
            onPress={() => setShowTopThreeOnly(!showTopThreeOnly)}
          >
            <Star
              size={12}
              color={showTopThreeOnly ? '#FFFFFF' : '#D97706'}
              fill={showTopThreeOnly ? '#FFFFFF' : '#D97706'}
            />
            <Text style={[styles.podiumChipText, showTopThreeOnly && styles.podiumChipTextActive]}>
              Top 3
            </Text>
          </Pressable>

          {SECTORS.map((sector) => {
            const isActive = activeSector === sector && !showTopThreeOnly;
            return (
              <Pressable
                key={sector}
                testID={`filter-sector-${sector}`}
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
                testID={`filter-contract-${contract}`}
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
            tintColor={stitchColors.sienna}
            colors={[stitchColors.sienna]}
          />
        }
      >
        {/* Results count bar */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            {displayedJobs.length} opportunité{displayedJobs.length > 1 ? 's' : ''} disponible{displayedJobs.length > 1 ? 's' : ''}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={stitchColors.sienna} />
            <Text style={styles.loadingText}>Calcul des meilleures affinités de stage...</Text>
          </View>
        ) : displayedJobs.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Building2 size={36} color={stitchColors.sienna} />
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
          displayedJobs.map((job, index) => {
            const matchScore = job.matchScore || 75;
            const companyInitials = job.company?.name
              ? job.company.name.slice(0, 2).toUpperCase()
              : 'CP';
            const cardBannerUri = getRotatingJobBanner(job, index);

            return (
              <Pressable
                key={job.id}
                testID={`card-job-${job.id}`}
                style={styles.jobCard}
                onPress={() => setSelectedDetailJob(job)}
              >
                {/* 1. Hero Image Cover */}
                <View style={styles.cardHeroImageContainer}>
                  <Image source={{ uri: cardBannerUri }} style={styles.cardHeroImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.20)']}
                    style={styles.cardHeroOverlay}
                  />

                  {/* Contract Badge on Left, AI Match Badge on Right */}
                  <View style={styles.floatingBadgesRow}>
                    <View style={styles.floatingContractBadge}>
                      <Text style={styles.floatingContractText}>{job.contractType || 'Stage'}</Text>
                    </View>

                    <View style={styles.floatingMatchBadge}>
                      <Star size={11} color={stitchColors.emeraldTone} fill={stitchColors.emeraldTone} />
                      <Text style={styles.floatingMatchText}>
                        ★ {matchScore}% Match
                      </Text>
                    </View>
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
                          <CheckCircle2 size={13} color={stitchColors.emeraldTone} />
                        )}
                      </View>
                      <Text style={styles.companyIndustry} numberOfLines={1}>
                        {job.company?.industry || 'Entreprise'}
                      </Text>
                    </View>
                  </View>

                  {/* Job Title */}
                  <Text style={styles.cardJobTitle} numberOfLines={2}>
                    {job.title}
                  </Text>

                  {/* Location & Duration & Meta */}
                  <View style={styles.metaRow}>
                    <MapPin size={12} color={stitchColors.inkMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>
                      {job.location || 'Douala'} · {job.duration || '3 à 6 mois'}
                    </Text>
                  </View>

                  {/* Skills Outline Tags */}
                  <View style={styles.skillsRow}>
                    {job.requirements.slice(0, 3).map((skill, sIdx) => (
                      <View key={sIdx} style={styles.skillTag}>
                        <Text style={styles.skillTagText}>{skill}</Text>
                      </View>
                    ))}
                    {job.requirements.length > 3 && (
                      <View style={styles.skillTag}>
                        <Text style={styles.skillTagText}>+{job.requirements.length - 3}</Text>
                      </View>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Bottom Row: Stipend & Single Direct CTA */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.stipendCol}>
                      <Text style={styles.stipendLabel}>Indemnité mensuelle</Text>
                      <Text style={styles.stipendAmount}>
                        {job.stipend ? job.stipend.replace(/\(.*\)/, '').trim() : 'Gratification'}
                      </Text>
                    </View>

                    <Pressable
                      testID={`btn-postuler-${job.id}`}
                      style={styles.applyBtn}
                      onPress={(e) => {
                        if (e && typeof e.stopPropagation === 'function') {
                          e.stopPropagation();
                        }
                        setApplyingJob(job);
                      }}
                    >
                      <Sparkles size={13} color="#FFFFFF" />
                      <Text style={styles.applyBtnText}>Postuler</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ── Immersive Stage Detail Screen (Screen 2 Reference) ──────── */}
      {selectedDetailJob && (
        <Modal
          visible={!!selectedDetailJob}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setSelectedDetailJob(null)}
        >
          <View style={styles.detailModalContainer}>
            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Feature 1: Full-Bleed Hero Image Header with Curved Bottom & Floating Action Buttons */}
              <View style={styles.detailHeroContainer}>
                <Image
                  source={{ uri: getRotatingJobBanner(selectedDetailJob) }}
                  style={styles.detailHeroImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(15, 23, 42, 0.50)', 'rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.40)']}
                  style={styles.detailHeroOverlay}
                />

                {/* Floating Circular Action Buttons: Back, Share, Favorite */}
                <View style={styles.detailFloatingHeader}>
                  <Pressable
                    testID="btn-detail-back"
                    style={styles.detailCircleBtn}
                    onPress={() => setSelectedDetailJob(null)}
                  >
                    <ChevronLeft size={22} color={stitchColors.ink} />
                  </Pressable>

                  <View style={styles.detailHeaderActions}>
                    <Pressable
                      testID="btn-detail-share"
                      style={styles.detailCircleBtn}
                      onPress={() => handleShareJob(selectedDetailJob)}
                    >
                      <Share2 size={19} color={stitchColors.ink} />
                    </Pressable>

                    <Pressable
                      testID="btn-detail-favorite"
                      style={styles.detailCircleBtn}
                      onPress={() => toggleFavorite(selectedDetailJob.id)}
                    >
                      <Heart
                        size={19}
                        color={favorites[selectedDetailJob.id] ? '#EF4444' : stitchColors.ink}
                        fill={favorites[selectedDetailJob.id] ? '#EF4444' : 'transparent'}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Detail Content Container */}
              <View style={styles.detailContent}>
                {/* Feature 2: Horizontal Workspace Photo Strip */}
                <View style={styles.workspaceSection}>
                  <Text style={styles.workspaceTitle}>Espaces de travail &amp; Locaux</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.workspaceRow}
                  >
                    {getWorkspacePhotos(selectedDetailJob).slice(0, 3).map((photoUri, pIdx) => (
                      <Pressable
                        key={pIdx}
                        testID={`workspace-photo-${pIdx}`}
                        style={styles.workspaceThumbBox}
                        onPress={() => setSelectedPreviewPhoto(photoUri)}
                      >
                        <Image source={{ uri: photoUri }} style={styles.workspaceThumbImg} resizeMode="cover" />
                      </Pressable>
                    ))}
                    {getWorkspacePhotos(selectedDetailJob).length >= 4 && (
                      <Pressable
                        testID="workspace-photo-more"
                        style={styles.workspaceThumbBox}
                        onPress={() => setSelectedPreviewPhoto(getWorkspacePhotos(selectedDetailJob)[3])}
                      >
                        <Image
                          source={{ uri: getWorkspacePhotos(selectedDetailJob)[3] }}
                          style={styles.workspaceThumbImg}
                          resizeMode="cover"
                        />
                        <View style={styles.workspaceOverlay}>
                          <Text style={styles.workspaceOverlayText}>
                            +{Math.max(1, getWorkspacePhotos(selectedDetailJob).length - 3)} photos
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </ScrollView>
                </View>

                {/* Feature 3: Domain Pill Badge & AI Match Rating Badge */}
                <View style={styles.detailBadgesRow}>
                  <View style={styles.domainPill}>
                    <Briefcase size={12} color={stitchColors.sienna} style={{ marginRight: 4 }} />
                    <Text style={styles.domainPillText}>
                      {selectedDetailJob.contractType || 'Stage Pré-embauche'} • {selectedDetailJob.company?.industry || 'Informatique'}
                    </Text>
                  </View>

                  <View style={styles.aiMatchPill}>
                    <Star size={12} color={stitchColors.emeraldTone} fill={stitchColors.emeraldTone} style={{ marginRight: 4 }} />
                    <Text style={styles.aiMatchPillText}>
                      ★ {selectedDetailJob.matchScore || detailMatch?.score || 95}% Match
                    </Text>
                  </View>
                </View>

                {/* Feature 4: Prominent Job Title & Company Location with Direction Action */}
                <Text style={styles.detailJobTitle}>{selectedDetailJob.title}</Text>

                <View style={styles.companyDirectionRow}>
                  <View style={styles.companyInfoLeft}>
                    <View style={styles.companyAvatarBox}>
                      {selectedDetailJob.company?.logoUrl ? (
                        <Image
                          source={{ uri: selectedDetailJob.company.logoUrl }}
                          style={styles.companyLogoImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.companyInitialsText}>
                          {selectedDetailJob.company?.name ? selectedDetailJob.company.name.slice(0, 2).toUpperCase() : 'CP'}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={styles.detailCompanyName} numberOfLines={1}>
                          {selectedDetailJob.company?.name || 'Entreprise Partenaire'}
                        </Text>
                        <CheckCircle2 size={14} color={stitchColors.emeraldTone} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} color={stitchColors.inkMuted} />
                        <Text style={styles.detailCompanyLocation} numberOfLines={1}>
                          {selectedDetailJob.location || selectedDetailJob.company?.address || 'Douala, Cameroun'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    testID="btn-detail-directions"
                    style={styles.directionBtn}
                    onPress={() => handleOpenDirections(selectedDetailJob.location || selectedDetailJob.company?.address)}
                  >
                    <Compass size={14} color={stitchColors.sienna} />
                    <Text style={styles.directionBtnText}>Itinéraire ↗</Text>
                  </Pressable>
                </View>

                {/* Feature 5: Segmented Tabs with Purple Underline Indicators */}
                <View style={styles.segmentedTabsContainer}>
                  <Pressable
                    testID="tab-about"
                    style={styles.segmentedTab}
                    onPress={() => setActiveDetailTab('about')}
                  >
                    <Text
                      style={[
                        styles.segmentedTabText,
                        activeDetailTab === 'about' && styles.segmentedTabTextActive,
                      ]}
                    >
                      À propos
                    </Text>
                    {activeDetailTab === 'about' && <View style={styles.activeTabUnderline} />}
                  </Pressable>

                  <Pressable
                    testID="tab-company"
                    style={styles.segmentedTab}
                    onPress={() => setActiveDetailTab('company')}
                  >
                    <Text
                      style={[
                        styles.segmentedTabText,
                        activeDetailTab === 'company' && styles.segmentedTabTextActive,
                      ]}
                    >
                      Entreprise
                    </Text>
                    {activeDetailTab === 'company' && <View style={styles.activeTabUnderline} />}
                  </Pressable>

                  <Pressable
                    testID="tab-aiAdvice"
                    style={styles.segmentedTab}
                    onPress={() => setActiveDetailTab('aiAdvice')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Sparkles
                        size={13}
                        color={activeDetailTab === 'aiAdvice' ? stitchColors.sienna : stitchColors.inkMuted}
                      />
                      <Text
                        style={[
                          styles.segmentedTabText,
                          activeDetailTab === 'aiAdvice' && styles.segmentedTabTextActive,
                        ]}
                      >
                        Conseils IA
                      </Text>
                    </View>
                    {activeDetailTab === 'aiAdvice' && <View style={styles.activeTabUnderline} />}
                  </Pressable>
                </View>

                {/* Feature 6: Quick Metadata Pill Row */}
                <View style={styles.metadataGridRow}>
                  <View style={styles.metadataCard}>
                    <Clock size={16} color={stitchColors.sienna} />
                    <Text style={styles.metadataCardLabel}>Durée</Text>
                    <Text style={styles.metadataCardValue} numberOfLines={1}>
                      🏃 {selectedDetailJob.duration || '3 à 6 mois'}
                    </Text>
                  </View>
                  <View style={styles.metadataCard}>
                    <MapPin size={16} color={stitchColors.sienna} />
                    <Text style={styles.metadataCardLabel}>Mode</Text>
                    <Text style={styles.metadataCardValue} numberOfLines={1}>
                      📍 {selectedDetailJob.location ? 'Présentiel' : 'Présentiel'}
                    </Text>
                  </View>
                  <View style={styles.metadataCard}>
                    <CheckCircle2 size={16} color={stitchColors.emeraldTone} />
                    <Text style={styles.metadataCardLabel}>Statut</Text>
                    <Text style={[styles.metadataCardValue, { color: stitchColors.emeraldTone }]} numberOfLines={1}>
                      🕒 Ouvert
                    </Text>
                  </View>
                </View>

                {/* Dynamic Tab Contents */}
                {/* ── Tab 1: À propos ── */}
                {activeDetailTab === 'about' && (
                  <View style={styles.tabContentBlock}>
                    {/* Feature 7: Rich Description Block with Expandable Toggle */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Description du poste</Text>
                      <Text
                        style={styles.detailDescriptionText}
                        numberOfLines={isDescExpanded ? undefined : 4}
                      >
                        {selectedDetailJob.description || "Aucune description détaillée n'a été fournie pour cette offre de stage."}
                      </Text>
                      {(selectedDetailJob.description?.length || 0) > 180 && (
                        <Pressable
                          testID="btn-toggle-description"
                          style={styles.expandToggleBtn}
                          onPress={() => setIsDescExpanded(!isDescExpanded)}
                        >
                          <Text style={styles.expandToggleText}>
                            {isDescExpanded ? 'Voir moins' : 'Voir plus'}
                          </Text>
                          {isDescExpanded ? (
                            <ChevronUp size={15} color={stitchColors.sienna} />
                          ) : (
                            <ChevronDown size={15} color={stitchColors.sienna} />
                          )}
                        </Pressable>
                      )}
                    </View>

                    {/* Feature 7: Required Skills Chips */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Compétences &amp; Technologies requises</Text>
                      <View style={styles.skillsTagWrap}>
                        {selectedDetailJob.requirements.map((req, rIdx) => {
                          const isUserSkill = studentProfile.skills?.some(
                            (s) => s.toLowerCase() === req.toLowerCase()
                          );
                          return (
                            <View
                              key={rIdx}
                              style={[
                                styles.detailSkillChip,
                                isUserSkill && styles.detailSkillChipMatched,
                              ]}
                            >
                              {isUserSkill && (
                                <CheckCircle2
                                  size={11}
                                  color={stitchColors.sienna}
                                  style={{ marginRight: 4 }}
                                />
                              )}
                              <Text
                                style={[
                                  styles.detailSkillChipText,
                                  isUserSkill && styles.detailSkillChipTextMatched,
                                ]}
                              >
                                {req}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}

                {/* ── Tab 2: Entreprise ── */}
                {activeDetailTab === 'company' && (
                  <View style={styles.tabContentBlock}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>À propos de l'entreprise</Text>
                      <Text style={styles.detailDescriptionText}>
                        {selectedDetailJob.company?.name || 'Entreprise'} est un employeur partenaire vérifié sur la plateforme Campus 360.
                        {selectedDetailJob.company?.industry ? ` Évoluant dans le secteur "${selectedDetailJob.company.industry}", cette organisation offre un environnement d'apprentissage dynamique et formateur.` : ''}
                      </Text>
                    </View>

                    <View style={styles.companyKybCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.kybIconCircle}>
                          <ShieldCheck size={20} color={stitchColors.emeraldTone} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.kybTitle}>Audit &amp; Fiabilité KYB</Text>
                          <Text style={styles.kybSubtitle}>
                            Score de conformité : {selectedDetailJob.company?.kybScore ?? 98}% · Entreprise validée
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Siège &amp; Coordonnées</Text>
                      <View style={styles.companyAddressRow}>
                        <MapPin size={15} color={stitchColors.inkMuted} />
                        <Text style={styles.companyAddressText}>
                          {selectedDetailJob.company?.address || selectedDetailJob.location || 'Douala, Cameroun'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* ── Tab 3: Conseils IA ── */}
                {activeDetailTab === 'aiAdvice' && (
                  <View style={styles.tabContentBlock}>
                    <View style={styles.aiAdviceBanner}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={16} color={stitchColors.emeraldTone} />
                          <Text style={styles.aiAdviceBannerTitle}>Analyse d'Affinité IA</Text>
                        </View>
                        <Text style={styles.aiAdviceScoreBadge}>
                          {detailMatch?.score || 95}% de compatibilité
                        </Text>
                      </View>
                      <Text style={styles.aiAdviceHeadline}>
                        {detailMatch?.headline || 'Profil hautement recommandé pour ce poste'}
                      </Text>
                    </View>

                    {detailMatch && detailMatch.matchedPoints.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Points clés de correspondance</Text>
                        <View style={{ gap: 8 }}>
                          {detailMatch.matchedPoints.map((pt, idx) => (
                            <View key={idx} style={styles.aiPointRow}>
                              <CheckCircle2 size={15} color={stitchColors.emeraldTone} style={{ marginTop: 2 }} />
                              <Text style={styles.aiPointText}>{pt}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {detailMatch?.strategicAdvice && (
                      <View style={styles.strategicAdviceBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Sparkles size={14} color={stitchColors.sienna} />
                          <Text style={styles.strategicAdviceTitle}>Conseil Stratégique Entretien</Text>
                        </View>
                        <Text style={styles.strategicAdviceText}>
                          {detailMatch.strategicAdvice}
                        </Text>
                      </View>
                    )}

                    <View style={styles.officialCvTipBox}>
                      <Text style={styles.officialCvTipTitle}>📄 Candidature Optimisée Campus 360</Text>
                      <Text style={styles.officialCvTipDesc}>
                        Postuler via le bouton « Postuler en 1 Clic » transmettra automatiquement votre CV officiel RH 2 colonnes avec lettre de motivation ciblée directement au recruteur.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Feature 8: Recruiter / Company Info Card */}
                <View style={styles.recruiterCard}>
                  <View style={styles.recruiterHeaderRow}>
                    <View style={styles.recruiterAvatarCircle}>
                      <Building2 size={20} color={stitchColors.sienna} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.recruiterTitle}>Service Recrutement &amp; RH</Text>
                        <CheckCircle2 size={13} color={stitchColors.emeraldTone} />
                      </View>
                      <Text style={styles.recruiterSubtitle}>
                        {selectedDetailJob.company?.name || 'Entreprise Partenaire'} · Réponse rapide garantie
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recruiterActionsRow}>
                    <Pressable
                      testID="btn-contact-whatsapp"
                      style={styles.recruiterWhatsAppBtn}
                      onPress={handleRecruiterWhatsapp}
                    >
                      <MessageCircle size={16} color="#059669" />
                      <Text style={styles.recruiterWhatsAppText}>WhatsApp RH</Text>
                    </Pressable>

                    <Pressable
                      testID="btn-contact-email"
                      style={styles.recruiterEmailBtn}
                      onPress={handleRecruiterEmail}
                    >
                      <Mail size={16} color={stitchColors.sienna} />
                      <Text style={styles.recruiterEmailText}>Email RH</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Bottom Spacing */}
                <View style={{ height: 30 }} />
              </View>
            </ScrollView>

            {/* Feature 9: Fixed Sticky Bottom Bar (Rendered Outside ScrollView) */}
            <View style={styles.stickyBottomBar}>
              <View style={styles.stipendCol}>
                <Text style={styles.stipendLabel}>INDEMNITÉ ESTIMÉE</Text>
                <View style={styles.stipendValueRow}>
                  <Text style={styles.stipendAmount}>
                    {selectedDetailJob.stipend ? selectedDetailJob.stipend.replace(/\(.*\)/, '').trim() : '75 000 FCFA'}
                  </Text>
                  <Text style={styles.stipendPeriod}> /mois</Text>
                </View>
              </View>

              <Pressable
                testID="btn-sticky-apply"
                style={styles.stickyApplyBtn}
                onPress={handleApplyFromDetail}
              >
                <Sparkles size={17} color="#FFFFFF" />
                <Text style={styles.stickyApplyBtnText}>Postuler en 1 Clic</Text>
              </Pressable>
            </View>
          </View>

          {/* Photo Preview Modal */}
          {selectedPreviewPhoto && (
            <Modal
              visible={!!selectedPreviewPhoto}
              transparent
              animationType="fade"
              onRequestClose={() => setSelectedPreviewPhoto(null)}
            >
              <Pressable
                style={styles.photoPreviewOverlay}
                onPress={() => setSelectedPreviewPhoto(null)}
              >
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: selectedPreviewPhoto }}
                    style={styles.photoPreviewImage}
                    resizeMode="contain"
                  />
                  <Pressable
                    style={styles.photoPreviewCloseBtn}
                    onPress={() => setSelectedPreviewPhoto(null)}
                  >
                    <X size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </Pressable>
            </Modal>
          )}
        </Modal>
      )}

      {/* AI Apply Modal (1-Click Background Dispatch Flow) */}
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
  // Root Screen
  container: {
    flex: 1,
    backgroundColor: stitchColors.paperDeep, // #F8FAFC
  },

  // Feed Header & Search Bar
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: stitchColors.paper, // #FFFFFF
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stitchColors.ink,
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    marginTop: 2,
  },
  filtersScroll: {
    marginTop: 6,
  },
  contractsScroll: {
    marginTop: 8,
  },
  filtersContent: {
    gap: 8,
    paddingRight: 16,
    alignItems: 'center',
  },
  podiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: stitchRadius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 5,
  },
  podiumChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  podiumChipText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
  },
  podiumChipTextActive: {
    color: '#FFFFFF',
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: stitchColors.sienna,
    borderColor: stitchColors.sienna,
    ...stitchShadows.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contractChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contractChipActive: {
    backgroundColor: stitchColors.siennaBg,
    borderColor: stitchColors.sienna,
  },
  contractChipText: {
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    fontWeight: '500',
  },
  contractChipTextActive: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },

  // Feed Scroll & Status
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  resultsCountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.inkMuted,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: stitchColors.inkMuted,
    fontSize: 13,
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.paper,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
    ...stitchShadows.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: stitchColors.siennaBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: stitchColors.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFiltersBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.button,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Clean White Feed Cards (§R4) ──────────────────────────────────────────
  jobCard: {
    backgroundColor: stitchColors.paper, // #FFFFFF
    borderRadius: stitchRadius.card, // 20
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...stitchShadows.card,
  },
  cardHeroImageContainer: {
    width: '100%',
    height: 155,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  cardHeroImage: {
    width: '100%',
    height: '100%',
  },
  cardHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  floatingContractText: {
    color: stitchColors.ink,
    fontSize: 11.5,
    fontWeight: '700',
  },
  floatingMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  floatingMatchText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: stitchColors.emeraldTone,
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
    borderRadius: 10,
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  companyLogoImg: {
    width: '100%',
    height: '100%',
  },
  companyInitialsText: {
    color: stitchColors.sienna,
    fontSize: 13,
    fontWeight: '700',
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardCompanyName: {
    fontSize: 13.5,
    color: stitchColors.ink,
    fontWeight: '700',
  },
  companyIndustry: {
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    marginTop: 1,
  },
  cardJobTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: stitchColors.ink,
    lineHeight: 23,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    fontWeight: '500',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  skillTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
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
    fontSize: 9.5,
    color: stitchColors.inkMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stipendAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: stitchColors.emeraldTone,
  },
  applyBtn: {
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.button, // 16
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...stitchShadows.primary,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Immersive Stage Detail Screen Styles (§R3) ─────────────────────────────
  detailModalContainer: {
    flex: 1,
    backgroundColor: stitchColors.paper, // #FFFFFF
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 110,
  },
  detailHeroContainer: {
    width: '100%',
    height: 290,
    position: 'relative',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  detailFloatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  detailCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...stitchShadows.md,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Feature 2: Workspace Photos
  workspaceSection: {
    marginBottom: 16,
  },
  workspaceTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  workspaceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  workspaceThumbBox: {
    width: 74,
    height: 74,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  workspaceThumbImg: {
    width: '100%',
    height: '100%',
  },
  workspaceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Feature 3: Badges
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  domainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.siennaBg,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: stitchRadius.full,
    flexShrink: 1,
  },
  domainPillText: {
    color: stitchColors.sienna,
    fontSize: 12,
    fontWeight: '700',
  },
  aiMatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: stitchRadius.full,
  },
  aiMatchPillText: {
    color: stitchColors.emeraldTone,
    fontSize: 12,
    fontWeight: '700',
  },

  // Feature 4: Title & Direction
  detailJobTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stitchColors.ink,
    lineHeight: 28,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  companyDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  companyInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  detailCompanyName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  detailCompanyLocation: {
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: stitchColors.siennaBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  directionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.sienna,
  },

  // Feature 5: Segmented Underline Tabs
  segmentedTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginTop: 14,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  segmentedTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  segmentedTabTextActive: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },
  activeTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: stitchColors.sienna,
    borderRadius: 2,
  },

  // Feature 6: Metadata Grid
  metadataGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 6,
  },
  metadataCard: {
    flex: 1,
    backgroundColor: stitchColors.paperSoft,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metadataCardLabel: {
    fontSize: 10.5,
    color: stitchColors.inkMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  metadataCardValue: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.ink,
    marginTop: 2,
    textAlign: 'center',
  },

  // Feature 7: Tab Content & Description
  tabContentBlock: {
    marginTop: 14,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 8,
  },
  detailDescriptionText: {
    fontSize: 13.5,
    color: stitchColors.inkSoft,
    lineHeight: 22,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  expandToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.sienna,
  },
  skillsTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  detailSkillChipMatched: {
    backgroundColor: stitchColors.siennaBg,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  detailSkillChipText: {
    fontSize: 12,
    color: stitchColors.inkSoft,
    fontWeight: '500',
  },
  detailSkillChipTextMatched: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },

  // Company Tab Elements
  companyKybCard: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kybIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kybTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  kybSubtitle: {
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    marginTop: 2,
  },
  companyAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stitchColors.paperSoft,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyAddressText: {
    fontSize: 12.5,
    color: stitchColors.inkSoft,
    flex: 1,
  },

  // AI Advice Tab Elements
  aiAdviceBanner: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    marginBottom: 16,
  },
  aiAdviceBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.sienna,
  },
  aiAdviceScoreBadge: {
    fontSize: 11.5,
    fontWeight: '700',
    color: stitchColors.emeraldTone,
  },
  aiAdviceHeadline: {
    fontSize: 13,
    fontWeight: '600',
    color: stitchColors.ink,
    lineHeight: 18,
  },
  aiPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiPointText: {
    fontSize: 12.5,
    color: stitchColors.inkSoft,
    lineHeight: 18,
    flex: 1,
  },
  strategicAdviceBox: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  strategicAdviceTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.sienna,
  },
  strategicAdviceText: {
    fontSize: 12.5,
    color: stitchColors.inkSoft,
    lineHeight: 18,
  },
  officialCvTipBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.07)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.20)',
    marginBottom: 16,
  },
  officialCvTipTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.emeraldTone,
    marginBottom: 4,
  },
  officialCvTipDesc: {
    fontSize: 12,
    color: stitchColors.inkSoft,
    lineHeight: 17,
  },

  // Feature 8: Recruiter Card
  recruiterCard: {
    backgroundColor: stitchColors.paper,
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...stitchShadows.card,
  },
  recruiterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recruiterAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: stitchColors.siennaBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
  },
  recruiterTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  recruiterSubtitle: {
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    marginTop: 1,
  },
  recruiterActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  recruiterWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recruiterWhatsAppText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  recruiterEmailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: stitchColors.siennaBg,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.20)',
  },
  recruiterEmailText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.sienna,
  },

  // Feature 9: Sticky Bottom Bar
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...stitchShadows.floating,
  },
  stipendValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stipendPeriod: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    fontWeight: '500',
  },
  stickyApplyBtn: {
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.button, // 16
    paddingVertical: 13,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...stitchShadows.primary,
  },
  stickyApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },

  // Photo Preview Modal
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  photoPreviewContainer: {
    width: '100%',
    height: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
