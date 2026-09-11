import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  FilePlus2,
  MapPin,
  Sparkles,
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

  const effectiveSkills = useMemo(() => {
    if (studentSkills && studentSkills.length > 0) return studentSkills;
    if (studentProfile?.skills && studentProfile.skills.length > 0) return studentProfile.skills;
    return [];
  }, [studentSkills, studentProfile]);

  const firstName = useMemo(() => {
    const raw = studentProfile?.name || studentName;
    const trimmed = raw?.trim();
    if (!trimmed) return 'Étudiant';
    return trimmed.split(/\s+/)[0] ?? 'Étudiant';
  }, [studentProfile, studentName]);

  const initials = useMemo(() => {
    const raw = studentProfile?.name || studentName;
    const trimmed = raw?.trim();
    if (!trimmed) return 'ET';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [studentProfile, studentName]);

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
        // Fallback gracieux déjà géré par stagesApi
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [effectiveSkills]);

  // The single best matching offer for the student
  const topJob = useMemo(() => {
    if (!jobs || jobs.length === 0) return null;
    return jobs[0];
  }, [jobs]);

  const totalOtherCount = Math.max(0, jobs.length - 1);

  return (
    <View style={styles.container}>
      {/* ── 1. Header Sobre & Accueil Épuré ────────────────────────── */}
      <View style={styles.headerRow}>
        <Pressable onPress={onProfile} style={styles.userBlock}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userTextCol}>
            <Text style={styles.greetingText}>Bonjour, {firstName} 👋</Text>
            <Text style={styles.subGreetingText} numberOfLines={1}>
              {studentProfile?.faculty || studentProfile?.university || 'Prêt pour ton stage'}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={onRecharge} style={styles.tokenPill}>
          <Sparkles size={13} color={stitchColors.emerald} />
          <Text style={styles.tokenPillText}>
            {iaCredits > 0 ? `${iaCredits} Jeton${iaCredits > 1 ? 's' : ''} IA` : '1 Offert'}
          </Text>
        </Pressable>
      </View>

      {/* ── 2. Statut Candidature Récente (si existante) ─────────────── */}
      {recentApp && (
        <Pressable onPress={onApplications} style={styles.recentAppBanner}>
          <View style={styles.recentAppDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.recentAppTitle} numberOfLines={1}>
              Candidature chez {recentApp.job?.company?.name || 'Entreprise'}
            </Text>
            <Text style={styles.recentAppSub}>
              Statut : {recentApp.status === 'INTERVIEW' ? 'Entretien programmé 🎉' : 'En cours d\'examen'}
            </Text>
          </View>
          <ArrowRight size={14} color={stitchColors.emerald} />
        </Pressable>
      )}

      {/* ── 3. L'Offre Unique en Vedette ("Le Match Idéal pour Toi") ── */}
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionKicker}>⭐ TON MEILLEUR MATCH DU JOUR</Text>
          <Text style={styles.sectionSubKicker}>Recommandation IA</Text>
        </View>

        {loading ? (
          <View style={styles.loaderCard}>
            <ActivityIndicator size="small" color={stitchColors.sienna} />
            <Text style={styles.loaderCardText}>Analyse de ton profil & des offres...</Text>
          </View>
        ) : topJob ? (
          <View style={styles.singleHeroCard}>
            {/* Bannière / Flyer de l'offre si disponible */}
            {topJob.flyerUrl && (
              <View style={styles.mediaWrap}>
                <Image source={{ uri: topJob.flyerUrl }} style={styles.mediaImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(15, 23, 42, 0.85)']}
                  style={styles.mediaGradient}
                />
                {topJob.contractType && (
                  <View style={styles.contractBadge}>
                    <Text style={styles.contractBadgeText}>{topJob.contractType}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.cardBody}>
              {/* Entreprise, Titre & Badge de Match */}
              <View style={styles.jobTopRow}>
                <View style={styles.companyRow}>
                  {topJob.company?.logoUrl ? (
                    <Image source={{ uri: topJob.company.logoUrl }} style={styles.companyLogo} />
                  ) : (
                    <View style={styles.companyLogoPlaceholder}>
                      <Text style={styles.companyLogoText}>
                        {topJob.company?.name ? topJob.company.name.slice(0, 2).toUpperCase() : 'ST'}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={2}>
                      {topJob.title}
                    </Text>
                    <View style={styles.companySubtitleRow}>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {topJob.company?.name || "L'Entreprise"}
                      </Text>
                      {topJob.company?.status === 'VERIFIED' && (
                        <CheckCircle2 size={13} color={stitchColors.emerald} />
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.heroMatchBadge}>
                  <Sparkles size={11} color="#FFFFFF" />
                  <Text style={styles.heroMatchBadgeText}>
                    {topJob.matchScore || 96}% Match
                  </Text>
                </View>
              </View>

              {/* Métadonnées essentielles : Lieu, Durée, Indemnité */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={13} color={stitchColors.inkSubtle} />
                  <Text style={styles.metaItemText}>{topJob.location || 'Abidjan / Hybride'}</Text>
                </View>
                {topJob.duration && (
                  <View style={styles.metaItem}>
                    <Clock size={13} color={stitchColors.inkSubtle} />
                    <Text style={styles.metaItemText}>{topJob.duration}</Text>
                  </View>
                )}
                {topJob.stipend && (
                  <View style={[styles.metaItem, styles.stipendItem]}>
                    <Coins size={13} color={stitchColors.emerald} />
                    <Text style={styles.stipendItemText}>{topJob.stipend}</Text>
                  </View>
                )}
              </View>

              {/* Compétences clés alignées */}
              <View style={styles.skillsSection}>
                <Text style={styles.skillsHeading}>Tes compétences alignées avec cette offre :</Text>
                <View style={styles.skillsPillRow}>
                  {(topJob.matchingSkills && topJob.matchingSkills.length > 0
                    ? topJob.matchingSkills
                    : (topJob.requirements || []).slice(0, 3)
                  ).map((sk, idx) => (
                    <View key={idx} style={styles.skillPill}>
                      <Check size={11} color={stitchColors.emerald} strokeWidth={2.5} />
                      <Text style={styles.skillPillText}>{sk}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── LE BOUTON SIGNATURE IA : 1-CLIC ── */}
              <Pressable
                onPress={() => setApplyingJob(topJob)}
                style={({ pressed }) => [styles.applyAiButton, pressed && { opacity: 0.9 }]}
              >
                <LinearGradient
                  colors={brandGradient.colors}
                  start={brandGradient.horizontal.start}
                  end={brandGradient.horizontal.end}
                  style={styles.applyAiButtonGrad}
                >
                  <Sparkles size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.applyAiButtonText}>Postuler avec l'IA (1-Clic)</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={onStages} style={styles.detailsLink}>
                <Text style={styles.detailsLinkText}>Consulter les détails du poste →</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <BriefcaseBusiness size={24} color={stitchColors.inkSubtle} />
            <Text style={styles.emptyCardText}>Aucune offre disponible pour le moment.</Text>
          </View>
        )}
      </View>

      {/* ── 4. Lien Sobre Vers les Autres Offres ─────────────────────── */}
      <Pressable onPress={onStages} style={styles.allOffersLink}>
        <View style={{ flex: 1 }}>
          <Text style={styles.allOffersTitle}>Explorer les autres stages</Text>
          <Text style={styles.allOffersSub}>
            {totalOtherCount > 0
              ? `${totalOtherCount} autre${totalOtherCount > 1 ? 's' : ''} opportunité${totalOtherCount > 1 ? 's' : ''} disponible${totalOtherCount > 1 ? 's' : ''}`
              : 'Accéder à l\'ensemble du catalogue'}
          </Text>
        </View>
        <View style={styles.allOffersArrow}>
          <ArrowRight size={16} color="#FFFFFF" />
        </View>
      </Pressable>

      {/* ── 5. Raccourcis Métier Très Épurés (Atelier & Ressources) ──── */}
      <View style={styles.footerShortcutsRow}>
        <Pressable onPress={onDocuments} style={styles.shortcutTile}>
          <View style={[styles.shortcutIconWrap, { backgroundColor: '#FDF2F8' }]}>
            <FilePlus2 size={16} color="#DB2777" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTileTitle}>Atelier Rédaction</Text>
            <Text style={styles.shortcutTileSub}>CV, Rapport & Mémoire</Text>
          </View>
        </Pressable>

        <Pressable onPress={onResources} style={styles.shortcutTile}>
          <View style={[styles.shortcutIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <BookOpen size={16} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTileTitle}>Hub Académique</Text>
            <Text style={styles.shortcutTileSub}>Annales & PDF de cours</Text>
          </View>
        </Pressable>
      </View>

      {/* ── Modale IA de Postulation Directe ────────────────────────── */}
      <AiApplyModal
        visible={Boolean(applyingJob)}
        job={applyingJob}
        studentProfile={{
          fullName: studentProfile?.name || studentName || 'Étudiant',
          email: studentProfile?.email || 'etudiant@campus360.app',
          phoneWhatsapp: studentProfile?.whatsappPhone || studentProfile?.phone,
          major: studentProfile?.faculty || studentProfile?.university || 'Informatique & Télécoms',
          educationLevel: studentProfile?.level || 'Licence 2',
          skills: effectiveSkills,
          tokens: iaCredits > 0 ? iaCredits : 2,
        }}
        onClose={() => setApplyingJob(null)}
        onApplicationComplete={() => {
          setApplyingJob(null);
          onApplications();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: stitchColors.sienna,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  userTextCol: {
    flex: 1,
  },
  greetingText: {
    ...stitchTypography.headlineMd,
    fontSize: 18,
    color: stitchColors.ink,
    fontWeight: '700',
  },
  subGreetingText: {
    ...stitchTypography.bodySm,
    color: stitchColors.inkSubtle,
    marginTop: 1,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.emeraldBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: `${stitchColors.emerald}30`,
  },
  tokenPillText: {
    ...stitchTypography.labelSm,
    color: stitchColors.emeraldDeep,
    fontWeight: '700',
  },

  // Recent app alert
  recentAppBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: stitchColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: `${stitchColors.emerald}40`,
  },
  recentAppDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: stitchColors.emerald,
  },
  recentAppTitle: {
    ...stitchTypography.labelMd,
    color: stitchColors.ink,
    fontWeight: '700',
  },
  recentAppSub: {
    ...stitchTypography.bodySm,
    fontSize: 12,
    color: stitchColors.emeraldTone,
    marginTop: 2,
  },

  // Featured Section
  featuredSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionKicker: {
    ...stitchTypography.labelSm,
    fontWeight: '800',
    color: stitchColors.sienna,
    letterSpacing: 0.8,
  },
  sectionSubKicker: {
    ...stitchTypography.labelSm,
    color: stitchColors.inkSubtle,
    fontSize: 11,
  },

  // Hero Card (The Single Offer)
  singleHeroCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.xl,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    overflow: 'hidden',
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  mediaWrap: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  contractBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contractBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  cardBody: {
    padding: 20,
    gap: 16,
  },

  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  companyLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: stitchColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  companyLogoText: {
    fontWeight: '800',
    color: stitchColors.inkMuted,
    fontSize: 15,
  },
  jobTitle: {
    ...stitchTypography.headlineMd,
    fontSize: 17,
    fontWeight: '800',
    color: stitchColors.ink,
    lineHeight: 22,
  },
  companySubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  companyName: {
    ...stitchTypography.bodySm,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },

  heroMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: stitchColors.emerald,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: stitchRadius.full,
  },
  heroMatchBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaItemText: {
    ...stitchTypography.bodySm,
    color: stitchColors.inkMuted,
    fontSize: 13,
  },
  stipendItem: {
    backgroundColor: stitchColors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: stitchRadius.sm,
  },
  stipendItemText: {
    color: stitchColors.emeraldDeep,
    fontSize: 12,
    fontWeight: '700',
  },

  // Skills
  skillsSection: {
    backgroundColor: stitchColors.surfaceContainerLowest,
    padding: 12,
    borderRadius: stitchRadius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
  },
  skillsHeading: {
    ...stitchTypography.labelSm,
    color: stitchColors.inkSubtle,
    fontSize: 11,
    fontWeight: '600',
  },
  skillsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: `${stitchColors.emerald}40`,
  },
  skillPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkSoft,
  },

  // Signature IA Button
  applyAiButton: {
    width: '100%',
    borderRadius: stitchRadius.button,
    overflow: 'hidden',
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  applyAiButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  applyAiButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailsLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailsLinkText: {
    ...stitchTypography.labelSm,
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },

  // Loader & Empty
  loaderCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.xl,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  loaderCardText: {
    ...stitchTypography.bodySm,
    color: stitchColors.inkMuted,
  },
  emptyCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.xl,
    padding: 36,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  emptyCardText: {
    ...stitchTypography.bodyMd,
    color: stitchColors.inkMuted,
  },

  // All Offers Banner
  allOffersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.surface,
    padding: 16,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    gap: 12,
  },
  allOffersTitle: {
    ...stitchTypography.labelMd,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  allOffersSub: {
    ...stitchTypography.bodySm,
    fontSize: 12,
    color: stitchColors.inkSubtle,
    marginTop: 2,
  },
  allOffersArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: stitchColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shortcuts
  footerShortcutsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shortcutTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.surface,
    padding: 12,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  shortcutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTileTitle: {
    ...stitchTypography.labelSm,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  shortcutTileSub: {
    fontSize: 11,
    color: stitchColors.inkSubtle,
    marginTop: 1,
  },
});
