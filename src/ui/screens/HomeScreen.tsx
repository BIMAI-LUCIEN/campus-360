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
  ArrowRight,
  Zap,
} from 'lucide-react-native';

import { type StudentProfile } from '../../features/auth/betterAuth';
import { fetchStageJobs, fetchStudentApplications } from '../../features/stages/stagesApi';
import { AiApplyModal, type ApplicationProfilePatch } from '../../features/stages/AiApplyModal';
import type { StageApplication, StageJob, Transaction } from '../../types';
import {
  stitchColors,
  stitchRadius,
  stitchSpacing,
  stitchTypography,
  stitchShadows,
  brandGradient,
} from '../../theme/stitch';
import {
  CategoryGrid,
  type CategoryItem,
} from '../GlassComponents';
import { getRotatingJobBanner } from './StagesScreen';
import { analyzeJobMatch } from '../../features/stages/aiMatchEngine';

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
  onProfileSaved?: (patch: ApplicationProfilePatch) => void;
}

const HOME_CATEGORIES: CategoryItem[] = [
  { id: 'tech', label: 'Tech & Dév', icon: Briefcase, color: stitchColors.primary, bg: '#F5F3FF' },
  { id: 'finance', label: 'Finance & Audit', icon: BookOpen, color: '#2563EB', bg: '#EFF6FF' },
  { id: 'marketing', label: 'Marketing', icon: Sparkles, color: '#DB2777', bg: '#FDF2F8' },
  { id: 'btp', label: 'BTP & Génie', icon: Building2, color: stitchColors.warning, bg: '#FFFBEB' },
  { id: 'droit', label: 'Droit & RH', icon: FileText, color: stitchColors.primary, bg: '#EEF2FF' },
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
  onProfileSaved,
}: HomeScreenProps) {
  const [jobs, setJobs] = useState<StageJob[]>([]);
  const [_recentApp, setRecentApp] = useState<StageApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
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

  // Same profile mapping as the Stages tab, so both screens show the same score.
  const matchProfile = useMemo(
    () => ({
      major: studentProfile?.faculty || '',
      educationLevel: studentProfile?.level || '',
      skills: effectiveSkills,
    }),
    [studentProfile?.faculty, studentProfile?.level, effectiveSkills],
  );
  // Real match score per offer (same engine as the Stages tab), best first.
  const recommendedJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    return jobs
      .map((job) => ({ ...job, matchScore: analyzeJobMatch(job, matchProfile).score }))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, 6);
  }, [jobs, matchProfile]);
  const recoReason = studentProfile?.faculty
    ? `Classées selon ta filière : ${studentProfile.faculty}`
    : 'Classées selon ton profil et tes compétences';
  const matchTone = (score: number) =>
    score >= 80 ? stitchColors.emeraldDeep : score >= 60 ? stitchColors.primary : stitchColors.warning;

  const firstName = studentProfile?.name
    ? studentProfile.name.trim().split(' ')[0]
    : studentName
      ? studentName.trim().split(' ')[0]
      : '';
  // Only real profile data: nothing is shown until the profile is loaded or filled in.
  const studiesLine = [studentProfile?.university, studentProfile?.faculty].filter(Boolean).join(' • ');

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 1. Hero Banner Courbé Violet Royal ────────────────────────── */}
        <View style={styles.heroBannerWrap}>
          <LinearGradient
            colors={[stitchColors.primary, stitchColors.siennaDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroGreetingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.heroGreetingText}>{firstName ? `Bonjour, ${firstName} 👋` : 'Bonjour 👋'}</Text>
                {studiesLine ? (
                  <Text style={styles.heroGreetingSub} numberOfLines={1}>
                    {studiesLine}
                  </Text>
                ) : null}
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

        {/* ── 2. Filières Circulaires (CategoryGrid) ───────────────────── */}
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
              <FileText size={18} color={stitchColors.primary} strokeWidth={2} />
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
              <CheckCircle2 size={18} color={stitchColors.emeraldDeep} strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Candidatures</Text>
          </Pressable>
        </View>

        {/* ── 5. Carrousel « Recommandé pour toi » (score réel) ──────────── */}
        {recommendedJobs.length > 0 && (
          <View style={styles.carouselSection}>
            <View style={styles.recoHeader}>
              <View style={styles.recoTitleRow}>
                <LinearGradient
                  colors={brandGradient.colors}
                  start={brandGradient.horizontal.start}
                  end={brandGradient.horizontal.end}
                  style={styles.recoKickerPill}
                >
                  <Sparkles size={11} color={stitchColors.white} />
                  <Text style={styles.recoKickerText}>SÉLECTION IA</Text>
                </LinearGradient>
                <Pressable onPress={onStages} hitSlop={8} style={styles.recoSeeAll}>
                  <Text style={styles.seeAllText}>Tout voir</Text>
                  <ChevronRight size={14} color={stitchColors.primary} />
                </Pressable>
              </View>
              <Text style={styles.recoTitle}>Recommandé pour toi</Text>
              <Text style={styles.recoSubtitle} numberOfLines={1}>{recoReason}</Text>
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
                      colors={['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.82)']}
                      style={styles.carouselImageGradient}
                    />
                    <View style={styles.carouselBadgeTop}>
                      <Text style={styles.carouselBadgeTopText}>{job.contractType || 'Stage'}</Text>
                    </View>
                    {index === 0 && (
                      <View style={styles.carouselTopPick}>
                        <Text style={styles.carouselTopPickText}>★ Meilleur choix</Text>
                      </View>
                    )}
                    <View style={[styles.carouselMatchBadge, { backgroundColor: matchTone(job.matchScore ?? 0) }]}>
                      <Zap size={10} color={stitchColors.white} fill={stitchColors.white} />
                      <Text style={styles.carouselMatchText}>{job.matchScore ?? 0}% de correspondance</Text>
                    </View>
                  </View>

                  <View style={styles.carouselBody}>
                    <Text style={styles.carouselTitle} numberOfLines={2}>
                      {job.title}
                    </Text>
                    <View style={styles.carouselCompanyRow}>
                      <Building2 size={12} color={stitchColors.inkMuted} />
                      <Text style={styles.carouselCompany} numberOfLines={1}>
                        {job.company?.name || 'Entreprise partenaire'}
                      </Text>
                      {job.company?.status === 'VERIFIED' && (
                        <CheckCircle2 size={12} color={stitchColors.emeraldDeep} />
                      )}
                    </View>
                    {job.location ? (
                      <View style={styles.carouselMetaRow}>
                        <View style={styles.carouselMetaItem}>
                          <MapPin size={11} color={stitchColors.inkMuted} />
                          <Text style={styles.carouselMetaText} numberOfLines={1}>
                            {job.location}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    <View style={styles.carouselFooter}>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.carouselStipendLabel}>Indemnité</Text>
                        <Text style={styles.carouselStipend} numberOfLines={1}>
                          {job.stipend || 'À préciser'}
                        </Text>
                      </View>
                      <View style={styles.carouselApplyBadge}>
                        <Text style={styles.carouselApplyText}>1-Clic</Text>
                        <ArrowRight size={11} color={stitchColors.primary} strokeWidth={2.5} />
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
                <ChevronRight size={14} color={stitchColors.primary} />
              </View>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={stitchColors.primary} />
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
                          <CheckCircle2 size={12} color={stitchColors.emeraldDeep} />
                        )}
                      </View>
                    </View>
                    <View style={styles.contractBadge}>
                      <Text style={styles.contractBadgeText}>{job.contractType || 'Stage'}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={stitchColors.inkMuted} />
                      <Text style={styles.metaText}>{job.location || 'Douala / Yaoundé'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={stitchColors.inkMuted} />
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
            phoneWhatsapp: studentProfile?.whatsappPhone || studentProfile?.phone,
            university: studentProfile?.university,
            // Empty values (not placeholders) so missing data is asked before applying.
            major: studentProfile?.faculty || '',
            educationLevel: studentProfile?.level || '',
            skills: effectiveSkills,
            tokens: iaCredits,
          }}
          onProfileSaved={onProfileSaved}
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
    color: stitchColors.white,
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
    color: stitchColors.white,
  },
  heroCatchphrase: {
    fontFamily: stitchTypography.bodyMd.fontFamily,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '500',
    marginTop: 4,
  },

  // 2. Catégories
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
    backgroundColor: stitchColors.white,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
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

  // 4. Carrousel « Recommandé pour toi »
  carouselSection: {
    marginBottom: 24,
  },
  recoHeader: {
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 14,
    gap: 8,
  },
  recoKickerPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recoKickerText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: stitchColors.white,
  },
  recoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 22,
    fontWeight: '800',
    color: stitchColors.ink,
    letterSpacing: -0.6,
  },
  recoSubtitle: {
    marginTop: -4,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
  },
  recoSeeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: stitchColors.primaryContainer,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  carouselTopPick: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: stitchColors.white,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  carouselTopPickText: {
    fontSize: 10,
    fontWeight: '800',
    color: stitchColors.primary,
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
    color: stitchColors.primary,
  },
  carouselScroll: {
    paddingHorizontal: stitchSpacing.containerMargin,
    gap: 14,
  },
  carouselCard: {
    width: 250,
    backgroundColor: stitchColors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    overflow: 'hidden',
    ...stitchShadows.card,
  },
  carouselImageWrap: {
    width: '100%',
    height: 125,
    backgroundColor: stitchColors.glassBorder,
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
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  carouselBadgeTopText: {
    fontSize: 10,
    fontWeight: '700',
    color: stitchColors.white,
    letterSpacing: 0.2,
  },
  carouselMatchBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: stitchColors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: stitchColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: stitchColors.white,
  },
  carouselBody: {
    padding: 14,
  },
  carouselTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
    lineHeight: 18,
    minHeight: 36,
  },
  carouselCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  carouselCompany: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: stitchColors.inkMuted,
    flexShrink: 1,
  },
  carouselMetaRow: {
    marginTop: 8,
    marginBottom: 10,
  },
  carouselMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carouselMetaText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: stitchColors.paperSoft,
  },
  carouselStipendLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: stitchColors.inkSubtle,
    marginBottom: 1,
  },
  carouselStipend: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12.5,
    fontWeight: '800',
    color: stitchColors.emeraldDeep,
  },
  carouselApplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  carouselApplyText: {
    fontSize: 11,
    fontWeight: '700',
    color: stitchColors.primary,
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
    color: stitchColors.primary,
  },

  // Feed Jobs List & Cards
  jobsList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: stitchColors.white,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
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
    color: stitchColors.primary,
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
    borderTopColor: stitchColors.paperSoft,
  },
  stipendText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.emeraldDeep,
  },
  applyBtn: {
    backgroundColor: stitchColors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  applyBtnText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.white,
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
