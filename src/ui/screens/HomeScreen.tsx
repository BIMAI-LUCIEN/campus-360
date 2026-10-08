import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Sparkles,
  Star,
} from 'lucide-react-native';

import { type StudentProfile } from '../../features/auth/betterAuth';
import { fetchStageJobs, fetchStudentApplications } from '../../features/stages/stagesApi';
import { AiApplyModal } from '../../features/stages/AiApplyModal';
import type { StageApplication, StageJob, Transaction } from '../../types';
import {
  stitchColors,
  stitchRadius,
  stitchSpacing,
  stitchTypography,
  stitchShadows,
} from '../../theme/stitch';
import {
  CategoryGrid,
  SearchFilterBar,
  type CategoryItem,
} from '../GlassComponents';
import { getRotatingJobBanner } from './StagesScreen';

interface HomeScreenProps {
  studentProfile?: StudentProfile | null;
  studentName?: string;
  studentSkills?: string[];
  profileComplete: boolean;
  balance: number;
  iaCredits: number;
  transactions: Transaction[];
  onRecharge: () => void;
  onStages: () => void;
  onApplications: () => void;
  onDocuments: () => void;
  onResources: () => void;
  onProfile: () => void;
}

const HOME_CATEGORIES: CategoryItem[] = [
  { id: 'tech', label: 'Tech & Dév', icon: Briefcase, color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'finance', label: 'Finance & Audit', icon: BookOpen, color: '#2563EB', bg: '#EFF6FF' },
  { id: 'marketing', label: 'Marketing', icon: Sparkles, color: '#DB2777', bg: '#FDF2F8' },
  { id: 'btp', label: 'BTP & Génie', icon: Building2, color: '#D97706', bg: '#FFFBEB' },
  { id: 'droit', label: 'Droit & RH', icon: FileText, color: '#4F46E5', bg: '#EEF2FF' },
];

export function HomeScreen({
  studentProfile,
  studentName,
  studentSkills = [],
  balance: _balance,
  iaCredits,
  onRecharge: _onRecharge,
  onStages,
  onApplications,
  onDocuments,
  onResources,
  onProfile: _onProfile,
}: HomeScreenProps) {
  const [jobs, setJobs] = useState<StageJob[]>([]);
  const [_recentApp, setRecentApp] = useState<StageApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const effectiveSkills = useMemo(() => {
    if (studentSkills && studentSkills.length > 0) return studentSkills;
    if (studentProfile?.skills && studentProfile.skills.length > 0) return studentProfile.skills;
    return [];
  }, [studentSkills, studentProfile]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [jobsRes, appsRes] = await Promise.allSettled([
          fetchStageJobs({ userSkills: effectiveSkills }),
          fetchStudentApplications(),
        ]);

        if (active) {
          if (jobsRes.status === 'fulfilled') {
            setJobs(jobsRes.value);
          }
          if (appsRes.status === 'fulfilled' && appsRes.value.length > 0) {
            setRecentApp(appsRes.value[0]);
          }
        }
      } catch {
        // Fallback géré par stagesApi
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [effectiveSkills]);

  const recommendedJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    return jobs.slice(0, 6);
  }, [jobs]);

  const firstName = studentProfile?.name
    ? studentProfile.name.trim().split(' ')[0]
    : studentName
      ? studentName.trim().split(' ')[0]
      : 'Étudiant';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 1. Hero Banner Courbé Violet Royal ────────────────────────── */}
        <View style={styles.heroBannerWrap}>
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroGreetingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.heroGreetingText}>Bonjour, {firstName} 👋</Text>
                <Text style={styles.heroGreetingSub} numberOfLines={1}>
                  {studentProfile?.university || 'Université de Yaoundé I'} • {studentProfile?.faculty || 'Faculté des Sciences'}
                </Text>
              </View>
              <View style={styles.heroMatchBadge}>
                <Sparkles size={12} color="#FDE047" />
                <Text style={styles.heroMatchText}>Top Match</Text>
              </View>
            </View>

            <Text style={styles.heroCatchphrase}>
              Trouve ton stage professionnel certifié
            </Text>
          </LinearGradient>
        </View>

        {/* ── 2. Barre de Recherche Clean White ─────────────────────────── */}
        <View style={styles.searchSection}>
          <SearchFilterBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un stage, entreprise, ville..."
            onFilterPress={onStages}
            onSubmitEditing={onStages}
          />
        </View>

        {/* ── 3. Filières Circulaires (CategoryGrid) ───────────────────── */}
        <CategoryGrid
          categories={HOME_CATEGORIES}
          activeId={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id === selectedCategory ? undefined : id);
            onStages();
          }}
          title="Filières Populaires"
          seeAllLabel="Voir tout"
          onSeeAllPress={onStages}
          horizontal={true}
          style={styles.categorySection}
        />

        {/* ── 4. Raccourcis Outils (Mon CV, Cours PDF, Candidatures) ────── */}
        <View style={styles.quickToolsGrid}>
          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onDocuments}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#F5F3FF' }]}>
              <FileText size={18} color="#7C3AED" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Mon CV Officiel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onResources}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#EFF6FF' }]}>
              <BookOpen size={18} color="#2563EB" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Bibliothèque</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onApplications}
          >
            <View style={[styles.quickToolIcon, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={18} color="#059669" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Candidatures</Text>
          </Pressable>
        </View>

        {/* ── 5. Carrousel #RecommandéPourToi avec Bannières Photos ──────── */}
        {recommendedJobs.length > 0 && (
          <View style={styles.carouselSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>#RecommandéPourToi</Text>
                <View style={styles.sparklePill}>
                  <Sparkles size={11} color="#7C3AED" />
                  <Text style={styles.sparklePillText}>IA</Text>
                </View>
              </View>
              <Pressable onPress={onStages} hitSlop={8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={styles.seeAllText}>Explorer tout</Text>
                  <ChevronRight size={14} color="#7C3AED" />
                </View>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
            >
              {recommendedJobs.map((job, index) => (
                <Pressable
                  key={job.id}
                  style={({ pressed }) => [styles.carouselCard, pressed && { opacity: 0.94 }]}
                  onPress={() => setApplyingJob(job)}
                >
                  <View style={styles.carouselImageWrap}>
                    <Image
                      source={{ uri: getRotatingJobBanner(job, index) }}
                      style={styles.carouselImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(15, 23, 42, 0.72)']}
                      style={styles.carouselImageGradient}
                    />
                    <View style={styles.carouselBadgeTop}>
                      <Text style={styles.carouselBadgeTopText}>{job.contractType || 'Stage'}</Text>
                    </View>
                    <View style={styles.carouselMatchBadge}>
                      <Star size={10} color="#FDE047" fill="#FDE047" />
                      <Text style={styles.carouselMatchText}>95% Match</Text>
                    </View>
                  </View>

                  <View style={styles.carouselBody}>
                    <Text style={styles.carouselTitle} numberOfLines={1}>{job.title}</Text>
                    <View style={styles.carouselCompanyRow}>
                      <Text style={styles.carouselCompany} numberOfLines={1}>
                        {job.company?.name || 'Entreprise partenaire'}
                      </Text>
                      {job.company?.status === 'VERIFIED' && (
                        <CheckCircle2 size={12} color="#059669" />
                      )}
                    </View>
                    <View style={styles.carouselMetaRow}>
                      <View style={styles.carouselMetaItem}>
                        <MapPin size={11} color="#64748B" />
                        <Text style={styles.carouselMetaText} numberOfLines={1}>
                          {job.location || 'Douala'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.carouselFooter}>
                      <Text style={styles.carouselStipend}>
                        {job.stipend || '75 000 FCFA'}
                      </Text>
                      <View style={styles.carouselApplyBadge}>
                        <Text style={styles.carouselApplyText}>1-Clic</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 6. Feed des Meilleures Offres (Cartes Blanches Épurées) ───── */}
        <View style={styles.recommendedSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Toutes les opportunités</Text>
            <Pressable onPress={onStages} hitSlop={8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.seeAllText}>Voir tout</Text>
                <ChevronRight size={14} color="#7C3AED" />
              </View>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.loadingText}>Chargement des offres disponibles...</Text>
            </View>
          ) : recommendedJobs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aucune offre disponible pour le moment.</Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {recommendedJobs.map((job) => (
                <Pressable
                  key={job.id}
                  style={({ pressed }) => [styles.jobCard, pressed && { opacity: 0.92 }]}
                  onPress={() => setApplyingJob(job)}
                >
                  <View style={styles.jobCardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <View style={styles.companyRow}>
                        <Text style={styles.companyName} numberOfLines={1}>
                          {job.company?.name || 'Entreprise partenaire'}
                        </Text>
                        {job.company?.status === 'VERIFIED' && (
                          <CheckCircle2 size={12} color="#059669" />
                        )}
                      </View>
                    </View>
                    <View style={styles.contractBadge}>
                      <Text style={styles.contractBadgeText}>{job.contractType || 'Stage'}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color="#64748B" />
                      <Text style={styles.metaText}>{job.location || 'Douala / Yaoundé'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color="#64748B" />
                      <Text style={styles.metaText}>{job.duration || '3 à 6 mois'}</Text>
                    </View>
                  </View>

                  <View style={styles.jobCardFooter}>
                    <Text style={styles.stipendText}>
                      {job.stipend || 'Indemnité de stage'}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.88 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setApplyingJob(job);
                      }}
                    >
                      <Text style={styles.applyBtnText}>Postuler</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Espace bas pour laisser respirer au-dessus de la BottomNav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modale de Candidature 1-Clic ─────────────────────────────── */}
      {applyingJob && (
        <AiApplyModal
          visible={Boolean(applyingJob)}
          onClose={() => setApplyingJob(null)}
          job={applyingJob}
          studentProfile={{
            fullName: studentProfile?.name || studentName || 'Étudiant',
            email: studentProfile?.email || '',
            phoneWhatsapp: studentProfile?.whatsappPhone,
            major: studentProfile?.faculty || 'Informatique & Télécoms',
            educationLevel: studentProfile?.level || 'Licence 3 / Master 1',
            skills: effectiveSkills,
            tokens: iaCredits,
          }}
          onApplicationComplete={() => {
            setApplyingJob(null);
            onApplications();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background, // #F8FAFC
  },
  scrollContent: {
    paddingTop: 0,
  },

  // 1. Hero Banner Courbé Violet
  heroBannerWrap: {
    marginBottom: 12,
  },
  heroBanner: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroGreetingText: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroGreetingSub: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  heroMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  heroMatchText: {
    fontFamily: stitchTypography.labelSm.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroCatchphrase: {
    fontFamily: stitchTypography.bodyMd.fontFamily,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '500',
    marginTop: 4,
  },

  // 2. Recherche & Catégories
  searchSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  categorySection: {
    marginVertical: 4,
  },

  // 3. Raccourcis Outils
  quickToolsGrid: {
    flexDirection: 'row',
    paddingHorizontal: stitchSpacing.containerMargin,
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  quickToolCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: stitchRadius.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...stitchShadows.card,
  },
  quickToolIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToolLabel: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: stitchColors.ink,
    textAlign: 'center',
  },

  // 4. Carrousel #RecommandéPourToi
  carouselSection: {
    marginBottom: 24,
  },
  sparklePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sparklePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  carouselScroll: {
    paddingHorizontal: stitchSpacing.containerMargin,
    gap: 14,
  },
  carouselCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...stitchShadows.card,
  },
  carouselImageWrap: {
    width: '100%',
    height: 110,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  carouselBadgeTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  carouselBadgeTopText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  carouselMatchBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.88)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  carouselMatchText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  carouselBody: {
    padding: 12,
  },
  carouselTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 13.5,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  carouselCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  carouselCompany: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    flexShrink: 1,
  },
  carouselMetaRow: {
    marginTop: 6,
    marginBottom: 8,
  },
  carouselMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  carouselMetaText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11,
    color: stitchColors.inkMuted,
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  carouselStipend: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  carouselApplyBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  carouselApplyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // 5. Section Offres Recommandées (Feed vertical)
  recommendedSection: {
    paddingHorizontal: stitchSpacing.containerMargin,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },

  // Feed Jobs List & Cards
  jobsList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 18,
    padding: 16,
    ...stitchShadows.card,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  companyName: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  contractBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  contractBadgeText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
  },
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stipendText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  applyBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  applyBtnText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // États chargement & vide
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
  },
});
