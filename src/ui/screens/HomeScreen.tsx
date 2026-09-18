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
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  HeartPulse,
  Laptop,
  LayoutGrid,
  MapPin,
  Megaphone,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

import { authFetch, type StudentProfile } from '../../features/auth/betterAuth';
import { fetchStageJobs, fetchStudentApplications } from '../../features/stages/stagesApi';
import { AiApplyModal } from '../../features/stages/AiApplyModal';
import type { StageApplication, StageJob, Transaction } from '../../types';
import {
  brandGradient,
  stitchColors,
  stitchRadius,
  stitchSpacing,
  stitchTypography,
} from '../../theme/stitch';
import {
  LocationHeader,
  SearchFilterBar,
  CategoryGrid,
  TrustBadgeStrip,
  type CategoryItem,
} from '../GlassComponents';

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

const POPULAR_CATEGORIES: CategoryItem[] = [
  { id: 'tech', label: 'Informatique\n& IA', icon: Laptop, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.14)' },
  { id: 'finance', label: 'Finance\n& Audit', icon: TrendingUp, color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)' },
  { id: 'btp', label: 'Génie Civil\n& BTP', icon: Building2, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)' },
  { id: 'elec', label: 'Électricité\n& Réseaux', icon: Zap, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.14)' },
  { id: 'marketing', label: 'Marketing\n& Com', icon: Megaphone, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.14)' },
  { id: 'droit', label: 'Droit\n& RH', icon: Scale, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.14)' },
  { id: 'sante', label: 'Santé\n& Bio', icon: HeartPulse, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.14)' },
  { id: 'all', label: 'Toutes les\nfilières', icon: LayoutGrid, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.14)' },
];

const DEFAULT_COVERS: string[] = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
];

export function HomeScreen({
  studentProfile,
  studentName,
  studentSkills = [],
  balance,
  iaCredits,
  onRecharge,
  onStages,
  onApplications,
  onDocuments,
  onResources,
  onProfile,
}: HomeScreenProps) {
  const [jobs, setJobs] = useState<StageJob[]>([]);
  const [recentApp, setRecentApp] = useState<StageApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('tech');

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

  const topJob = useMemo(() => {
    if (!jobs || jobs.length === 0) return null;
    return jobs[0];
  }, [jobs]);

  const recommendedJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    return jobs.slice(0, 6);
  }, [jobs]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 1. En-tête Localisation & Actions Rapides ───────────────── */}
        <LocationHeader
          universityName={studentProfile?.university || 'Université de Yaoundé I'}
          facultyOrCity={studentProfile?.faculty || 'Cameroun • Faculté des Sciences'}
          onLocationPress={onProfile}
          onBellPress={onApplications}
          hasUnread={Boolean(recentApp)}
          iaCredits={iaCredits}
          onWalletPress={onRecharge}
        />

        {/* ── 2. Barre de Recherche Flottante avec Filtres ────────────── */}
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un stage, entreprise, filière..."
          onFilterPress={onStages}
          onSubmitEditing={onStages}
        />

        {/* ── 3. Hero Banner ("Stages & Emplois vérifiés") ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroBannerCard}>
            <View style={styles.heroContentRow}>
              {/* Left Column: Headlines & Actions */}
              <View style={styles.heroLeftCol}>
                <Text style={styles.heroSubtitle}>Stages &amp; Emplois vérifiés</Text>
                <Text style={styles.heroHeadline}>Postulez plus vite avec des dossiers sur-mesure.</Text>

                {/* Bullets with icons */}
                <View style={styles.heroBullets}>
                  <View style={styles.heroBulletRow}>
                    <CheckCircle2 size={13} color="#34D399" />
                    <Text style={styles.heroBulletText}>Candidatures adaptées à chaque offre</Text>
                  </View>
                  <View style={styles.heroBulletRow}>
                    <ShieldCheck size={13} color="#34D399" />
                    <Text style={styles.heroBulletText}>Entreprises partenaires vérifiées</Text>
                  </View>
                </View>

                {/* Dual CTA Buttons */}
                <View style={styles.heroActionsRow}>
                  <Pressable
                    onPress={() => {
                      if (topJob) setApplyingJob(topJob);
                      else onStages();
                    }}
                    style={({ pressed }) => [styles.heroPrimaryBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={styles.heroPrimaryBtnText}>Postuler</Text>
                  </Pressable>

                  <Pressable
                    onPress={onStages}
                    style={({ pressed }) => [styles.heroSecondaryBtn, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.heroSecondaryBtnText}>Toutes les offres</Text>
                  </Pressable>
                </View>
              </View>

              {/* Right Column: Clean Visual Icon Box */}
              <View style={styles.heroRightCol}>
                <View style={styles.heroIllustrationCircle}>
                  <Briefcase size={26} color="#A78BFA" strokeWidth={1.8} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── 4. Filières & Services Populaires (Grille 4x2) ─────────── */}
        <CategoryGrid
          categories={POPULAR_CATEGORIES}
          activeId={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id);
            onStages();
          }}
          onSeeAllPress={onStages}
          title="Filières Populaires"
          seeAllLabel="Voir tout"
        />

        {/* ── 5. Recommandés pour Toi (Carrousel Horizontal) ─────────── */}
        <View style={styles.recommendedSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommandés pour toi</Text>
            <Pressable onPress={onStages} hitSlop={8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.seeAllText}>Voir tout</Text>
                <ChevronRight size={14} color={stitchColors.emerald} />
              </View>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.recommendedLoadingWrap}>
              <ActivityIndicator size="small" color={stitchColors.primary} />
              <Text style={styles.loadingText}>Recherche des meilleurs stages...</Text>
            </View>
          ) : recommendedJobs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aucune offre pour le moment.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedScroll}
            >
              {recommendedJobs.map((job, idx) => {
                const cover = job.flyerUrl || DEFAULT_COVERS[idx % DEFAULT_COVERS.length];
                const matchScore = job.matchScore ?? (90 + (idx % 8));
                return (
                  <Pressable
                    key={job.id}
                    style={styles.recCard}
                    onPress={() => setApplyingJob(job)}
                  >
                    {/* Media image header with single functional badge */}
                    <View style={styles.recCardImageWrap}>
                      <Image source={{ uri: cover }} style={styles.recCardImage} resizeMode="cover" />
                      <View style={styles.recContractBadge}>
                        <Text style={styles.recContractText}>{job.contractType || 'Stage'}</Text>
                      </View>
                    </View>

                    {/* Card Content */}
                    <View style={styles.recCardBody}>
                      <Text style={styles.recJobTitle} numberOfLines={1}>
                        {job.title}
                      </Text>

                      {/* Company Name & Verification */}
                      <View style={styles.recCompanyRow}>
                        <Text style={styles.recCompanyName} numberOfLines={1}>
                          {job.company?.name || 'Entreprise Partenaire'}
                        </Text>
                        {job.company?.status === 'VERIFIED' && (
                          <CheckCircle2 size={12} color="#34D399" />
                        )}
                      </View>

                      {/* Location · Duration · Discreet match mention */}
                      <Text style={styles.recMetaText} numberOfLines={1}>
                        {job.location || 'Abidjan'} · {job.duration || '6 mois'} · {matchScore}% de correspondance
                      </Text>

                      {/* Footer Row: Stipend + Action CTA */}
                      <View style={styles.recFooterRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recStipendText} numberOfLines={1}>
                            {job.stipend || '65 000 FCFA'}
                          </Text>
                          <Text style={styles.recStipendSub}>/mois</Text>
                        </View>

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setApplyingJob(job);
                          }}
                          style={({ pressed }) => [styles.recApplyBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={styles.recApplyBtnText}>Postuler</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── 6. Bandeau de Réassurance & Confiance ───────────────────── */}
        <TrustBadgeStrip />

        {/* Espace bas pour laisser respirer au-dessus de la BottomNav */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Modale de Candidature IA 1-Clic ──────────────────────────── */}
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
    backgroundColor: stitchColors.background,
  },
  scrollContent: {
    paddingTop: 8,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 20,
  },
  heroBannerCard: {
    backgroundColor: '#120E22',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  heroSubtitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: '#A78BFA',
    marginBottom: 2,
  },
  heroHeadline: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  heroBullets: {
    gap: 4,
    marginBottom: 14,
  },
  heroBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBulletText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '400',
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPrimaryBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  heroPrimaryBtnText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  heroSecondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  heroSecondaryBtnText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  heroRightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIllustrationCircle: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recommended Section
  recommendedSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: stitchTypography.headlineMd.fontFamily,
    fontSize: 17,
    fontWeight: '600',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#A78BFA',
  },
  recommendedLoadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  emptyWrap: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingVertical: 24,
  },
  emptyText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 13,
    color: stitchColors.inkMuted,
  },
  recommendedScroll: {
    paddingHorizontal: stitchSpacing.containerMargin,
    gap: 14,
  },
  recCard: {
    width: 250,
    backgroundColor: '#120E22',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  recCardImageWrap: {
    height: 110,
    position: 'relative',
    backgroundColor: '#090714',
  },
  recCardImage: {
    width: '100%',
    height: '100%',
  },
  recContractBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(9, 7, 20, 0.75)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  recContractText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#F8FAFC',
  },
  recCardBody: {
    padding: 12,
  },
  recJobTitle: {
    fontFamily: stitchTypography.headlineMd.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  recCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  recCompanyName: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
  recMetaText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '400',
    marginBottom: 10,
  },
  recFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  recStipendText: {
    fontFamily: stitchTypography.headlineMd.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#34D399',
  },
  recStipendSub: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 9.5,
    color: '#94A3B8',
  },
  recApplyBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  recApplyBtnText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
