import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  FilePlus2,
  Sparkles,
  Wallet,
  Compass,
  ArrowUpRight,
  MapPin,
  Coins,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react-native';

const ICON_STAGE_3D = require('../../assets/icon_stage_3d.jpg');
const ICON_DOCUMENTS_3D = require('../../assets/icon_documents_3d.jpg');
const ICON_ANNALES_3D = require('../../assets/icon_annales_3d.jpg');
const ICON_CANDIDATURES_3D = require('../../assets/icon_candidatures_3d.jpg');

import { authFetch } from '../../features/auth/betterAuth';
import { fetchStageJobs, fetchStudentApplications } from '../../features/stages/stagesApi';
import {
  resolveHomePriority,
  type HomeDestination,
  type HomePriority,
  type StudentDocumentSummary,
} from '../../features/home/homePriority';
import { TransactionRow } from '../GlassComponents';
import type { Transaction, StageJob } from '../../types';
import {
  brandGradient,
  fontFamilies,
  stitchColors,
  stitchRadius,
  stitchSpacing,
  stitchTypography,
} from '../../theme/stitch';

const formatCoins = (value: number) =>
  new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value);

interface HomeScreenProps {
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

type QuickAction = {
  key: string;
  label: string;
  detail: string;
  badge?: string;
  Icon: LucideIcon;
  image?: any;
  color: string;
  tint: string;
  onPress: () => void;
};

const initialPriority: HomePriority = {
  kind: 'resource',
  eyebrow: 'PROCHAINE ÉTAPE',
  title: 'Prépare ta réussite académique',
  description: 'Ressources ciblées, annales et documents officiels prêts.',
  actionLabel: 'Explorer les ressources',
  destination: 'resources',
};

export function HomeScreen({
  studentName,
  studentSkills = [],
  profileComplete,
  balance,
  iaCredits,
  transactions,
  onRecharge,
  onStages,
  onApplications,
  onDocuments,
  onResources,
  onProfile,
}: HomeScreenProps) {
  const [priority, setPriority] = useState<HomePriority>(initialPriority);
  const [topJobs, setTopJobs] = useState<StageJob[]>([]);
  const [loadingPriority, setLoadingPriority] = useState(false);

  const firstName = useMemo(() => {
    const trimmed = studentName?.trim();
    if (!trimmed) return 'Étudiant';
    return trimmed.split(/\s+/)[0] ?? 'Étudiant';
  }, [studentName]);

  const initials = useMemo(() => {
    const trimmed = studentName?.trim();
    if (!trimmed) return 'ET';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [studentName]);

  useEffect(() => {
    let active = true;

    const loadPriority = async () => {
      setLoadingPriority(true);
      try {
        const [applicationsResult, jobsResult, documentResponse] = await Promise.allSettled([
          fetchStudentApplications(),
          fetchStageJobs({ userSkills: studentSkills }),
          authFetch('/api/mobile/documents').catch(() => null),
        ]);

        const documentData =
          documentResponse.status === 'fulfilled' && documentResponse.value?.ok
            ? await (documentResponse.value.json() as Promise<{ documents?: StudentDocumentSummary[] }>)
            : { documents: [] };

        const fetchedJobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];

        if (active) {
          setTopJobs(fetchedJobs.slice(0, 2));
          setPriority(
            resolveHomePriority({
              applications: applicationsResult.status === 'fulfilled' ? applicationsResult.value : [],
              jobs: fetchedJobs,
              documents: documentData.documents ?? [],
              profileComplete,
            })
          );
        }
      } catch {
        if (active) {
          setPriority(resolveHomePriority({ applications: [], jobs: [], documents: [], profileComplete }));
        }
      } finally {
        if (active) setLoadingPriority(false);
      }
    };

    void loadPriority();
    return () => {
      active = false;
    };
  }, [profileComplete, studentSkills]);

  const destinations: Record<HomeDestination, () => void> = {
    applications: onApplications,
    stages: onStages,
    documents: onDocuments,
    account: onProfile,
    resources: onResources,
  };

  // 4 Featured Actions (Inspired by "Frequently Used" grid from Mockup 2)
  const quickGridActions: QuickAction[] = [
    {
      key: 'stages',
      label: 'Stages',
      detail: '12 offres actives',
      badge: 'Nouveau',
      Icon: BriefcaseBusiness,
      image: ICON_STAGE_3D,
      color: '#A78BFA',
      tint: 'rgba(167, 139, 250, 0.16)',
      onPress: onStages,
    },
    {
      key: 'documents',
      label: 'Rédiger',
      detail: 'Rapports & CV',
      badge: 'Word AI',
      Icon: FilePlus2,
      image: ICON_DOCUMENTS_3D,
      color: '#EC4899',
      tint: 'rgba(236, 72, 153, 0.16)',
      onPress: onDocuments,
    },
    {
      key: 'resources',
      label: 'Annales',
      detail: 'Examens & TD',
      Icon: BookOpen,
      image: ICON_ANNALES_3D,
      color: '#38BDF8',
      tint: 'rgba(56, 189, 248, 0.16)',
      onPress: onResources,
    },
    {
      key: 'applications',
      label: 'Candidatures',
      detail: 'Suivi en direct',
      Icon: Compass,
      image: ICON_CANDIDATURES_3D,
      color: '#34D399',
      tint: 'rgba(52, 211, 153, 0.16)',
      onPress: onApplications,
    },
  ];

  return (
    <View style={styles.container}>
      {/* ── Top Welcome Bar (Inspired by Mockup 2) ────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.topUserWrap}>
          <Pressable onPress={onProfile} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
          <View>
            <Text style={styles.welcomeEyebrow}>Welcome Back 👋</Text>
            <Text style={styles.welcomeName}>Hi, {firstName}</Text>
          </View>
        </View>

        <Pressable onPress={onProfile} style={styles.headerIconButton}>
          <Wallet size={18} color="#C4B5FD" />
        </Pressable>
      </View>

      {/* ── Hero Fintech Card (Inspired by Violet Credit Card in Mockup 2) ── */}
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={['#7C3AED', '#5B21B6', '#31105C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative geometric glassy overlay shapes */}
          <View style={styles.cardDecoShape1} />
          <View style={styles.cardDecoShape2} />

          <View style={styles.cardTopline}>
            <View>
              <Text style={styles.cardBalanceLabel}>Total Balance</Text>
              <Text style={styles.cardBalanceValue}>{formatCoins(balance)} C</Text>
            </View>
            <View style={styles.cardChipBadge}>
              <Text style={styles.cardChipText}>CAMPUS 360</Text>
            </View>
          </View>

          <View style={styles.cardBottomRow}>
            <View style={styles.cardCreditsBlock}>
              <Sparkles size={14} color="#FDE047" />
              <Text style={styles.cardCreditsLabel}>
                Crédits IA : <Text style={styles.cardCreditsBold}>{iaCredits}</Text>
              </Text>
            </View>

            <Pressable onPress={onRecharge} style={styles.cardRechargePill}>
              <Text style={styles.cardRechargeText}>+ Top Up</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {/* ── Frequently Used (2x2 Grid, Inspired by Mockup 2) ─────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Frequently Used</Text>
        <View style={styles.frequentlyGrid}>
          {quickGridActions.map((action) => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}
            >
              {action.image ? (
                <Image source={action.image} style={styles.gridImage3D} resizeMode="cover" />
              ) : (
                <View style={[styles.gridIconWrap, { backgroundColor: action.tint }]}>
                  <action.Icon size={20} color={action.color} strokeWidth={2.2} />
                </View>
              )}
              <View style={styles.gridCopy}>
                <View style={styles.gridLabelRow}>
                  <Text style={styles.gridLabel}>{action.label}</Text>
                  {action.badge && (
                    <View style={styles.gridBadge}>
                      <Text style={styles.gridBadgeText}>{action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gridDetail}>{action.detail}</Text>
              </View>
              <ArrowUpRight size={14} color="#6D28D9" style={styles.gridArrow} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Priority Action Card (Inspired by Mockup 1 & 2) ─────────── */}
      <View style={styles.section}>
        <LinearGradient
          colors={['#171131', '#110D25']}
          style={styles.priorityCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.priorityGlowOrb} />

          <View style={styles.priorityHeaderRow}>
            <View style={styles.priorityEyebrowPill}>
              <Sparkles size={11} color="#A78BFA" />
              <Text style={styles.priorityEyebrow}>{priority.eyebrow}</Text>
            </View>

            {loadingPriority && (
              <ActivityIndicator size="small" color="#A78BFA" style={{ transform: [{ scale: 0.8 }] }} />
            )}
          </View>

          <Text style={styles.priorityTitle}>{priority.title}</Text>
          <Text style={styles.priorityDesc}>{priority.description}</Text>

          <View style={styles.priorityFooter}>
            {typeof priority.progress === 'number' && (
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${priority.progress}%` }]} />
                </View>
                <Text style={styles.progressValue}>{priority.progress}%</Text>
              </View>
            )}

            <Pressable
              onPress={destinations[priority.destination]}
              style={({ pressed }) => [styles.priorityButton, pressed && styles.pressed]}
            >
              <Text style={styles.priorityButtonText}>{priority.actionLabel}</Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {/* ── Featured Internships Showcase (Stages & Emplois) ────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BriefcaseBusiness size={15} color="#A78BFA" />
            <Text style={styles.sectionHeading}>Stages Recommandés</Text>
          </View>
          <Pressable onPress={onStages} hitSlop={8}>
            <Text style={styles.seeAll}>Voir tout (12)</Text>
          </Pressable>
        </View>

        {topJobs.length > 0 ? (
          <View style={{ gap: 10 }}>
            {topJobs.map((job) => {
              const match = job.matchScore || 85;
              const compInitials = job.company?.name ? job.company.name.slice(0, 2).toUpperCase() : 'ST';
              return (
                <Pressable
                  key={job.id}
                  onPress={onStages}
                  style={({ pressed }) => [styles.homeJobCard, pressed && styles.pressed]}
                >
                  {job.flyerUrl && (
                    <View style={styles.homeJobMediaWrap}>
                      <Image
                        source={{ uri: job.flyerUrl }}
                        style={styles.homeJobMediaImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(19, 16, 36, 0.95)']}
                        style={styles.homeJobMediaOverlay}
                      />
                      {job.contractType && (
                        <View style={styles.homeJobOverlayContract}>
                          <Text style={styles.homeJobOverlayContractText}>{job.contractType}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.homeJobTopRow}>
                    <View style={styles.homeJobCompanyCol}>
                      {job.company?.logoUrl ? (
                        <Image
                          source={{ uri: job.company.logoUrl }}
                          style={styles.homeJobAvatarImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.homeJobAvatar}>
                          <Text style={styles.homeJobAvatarText}>{compInitials}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.homeJobTitle} numberOfLines={1}>
                          {job.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.homeJobCompanyText} numberOfLines={1}>
                            {job.company?.name}
                          </Text>
                          {job.company?.status === 'VERIFIED' && (
                            <CheckCircle2 size={12} color="#34D399" />
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.homeJobMatchBadge}>
                      <Sparkles size={10} color="#34D399" />
                      <Text style={styles.homeJobMatchText}>{match}% Match</Text>
                    </View>
                  </View>

                  <View style={styles.homeJobTagsRow}>
                    <View style={styles.homeJobTagItem}>
                      <MapPin size={10} color="#94A3B8" />
                      <Text style={styles.homeJobTagText}>{job.location || 'Abidjan'}</Text>
                    </View>
                    {job.stipend && (
                      <View style={styles.homeJobStipendTag}>
                        <Coins size={10} color="#34D399" />
                        <Text style={styles.homeJobStipendTagText}>{job.stipend}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* ── Recent Activity / Transactions ──────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Recent Statement</Text>
          <Pressable onPress={onProfile} hitSlop={8}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        </View>

        <View style={styles.activityCard}>
          {transactions.length > 0 ? (
            transactions.slice(0, 3).map((transaction) => (
              <TransactionRow
                key={transaction.id}
                label={transaction.label}
                date={transaction.date}
                amount={transaction.amount}
                type={transaction.type}
                formatCoins={formatCoins}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIcon}>
                <Sparkles size={18} color="#A78BFA" />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Aucune transaction récente</Text>
                <Text style={styles.emptyText}>Vos activités s'afficheront ici au fur et à mesure.</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090714', // Deep obsidian-violet
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 150,
  },

  // Top Welcome Bar
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  topUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1438',
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#DDD6FE',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fontFamilies.inter,
  },
  welcomeEyebrow: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '500',
    fontFamily: fontFamilies.inter,
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: fontFamilies.outfit,
    letterSpacing: -0.3,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131024',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Card
  cardContainer: {
    marginBottom: 24,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.28)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  heroCard: {
    padding: 22,
    minHeight: 165,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardDecoShape1: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardDecoShape2: {
    position: 'absolute',
    right: 35,
    bottom: -40,
    width: 120,
    height: 120,
    borderRadius: 40,
    transform: [{ rotate: '45deg' }],
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  cardTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBalanceLabel: {
    fontSize: 12.5,
    color: '#DDD6FE',
    fontWeight: '600',
    fontFamily: fontFamilies.inter,
    marginBottom: 4,
  },
  cardBalanceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: fontFamilies.outfit,
    letterSpacing: -0.5,
  },
  cardChipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  cardChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  cardCreditsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardCreditsLabel: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  cardCreditsBold: {
    fontWeight: '800',
    color: '#FDE047',
  },
  cardRechargePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cardRechargeText: {
    color: '#4C1D95',
    fontWeight: '800',
    fontSize: 12,
  },

  // Headings
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: fontFamilies.outfit,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#A78BFA',
  },

  // 2x2 Grid (Frequently Used)
  frequentlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#131024',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  gridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCopy: {
    flex: 1,
  },
  gridLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
    fontFamily: fontFamilies.inter,
  },
  gridBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gridBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#F472B6',
  },
  gridDetail: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: fontFamilies.inter,
  },
  gridArrow: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  // Priority Card
  priorityBorder: {
    borderRadius: 18,
    padding: 1,
  },
  priorityCard: {
    backgroundColor: '#131024',
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
  },
  priorityTopline: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityGlowOrb: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  priorityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priorityEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priorityEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#DDD6FE',
  },
  priorityDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 6,
  },
  priorityFooter: {
    marginTop: 14,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#1E1438',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  priorityTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#F8FAFC',
    marginTop: 12,
    fontFamily: fontFamilies.outfit,
  },
  priorityDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 6,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#1E1438',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  priorityButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Activity Card
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
    backgroundColor: '#131024',
    paddingHorizontal: 15,
  },
  emptyActivity: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
  },
  emptyCopy: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptyText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Home Job Card Showcase
  homeJobCard: {
    backgroundColor: '#131024',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
  },
  homeJobTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  homeJobCompanyCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  homeJobAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeJobAvatarText: {
    color: '#DDD6FE',
    fontSize: 12,
    fontWeight: '800',
  },
  homeJobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  homeJobCompanyText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  homeJobMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  homeJobMatchText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
  },
  homeJobTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  homeJobContractTag: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  homeJobContractTagText: {
    color: '#DDD6FE',
    fontSize: 10.5,
    fontWeight: '700',
  },
  homeJobTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  homeJobTagText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  homeJobStipendTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  homeJobStipendTagText: {
    fontSize: 10.5,
    color: '#34D399',
    fontWeight: '700',
  },
  // 3D Soft Claymorphism Grid Icons
  gridImage3D: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },

  // Home Job Media Wrap
  homeJobMediaWrap: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  homeJobMediaImage: {
    width: '100%',
    height: '100%',
  },
  homeJobMediaOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  homeJobOverlayContract: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(9, 7, 20, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  homeJobOverlayContractText: {
    color: '#DDD6FE',
    fontSize: 10,
    fontWeight: '700',
  },
  homeJobAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  bottomSpace: {
    height: 24,
  },
});
