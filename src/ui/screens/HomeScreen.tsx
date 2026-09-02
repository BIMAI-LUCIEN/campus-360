import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, BookOpen, BriefcaseBusiness, FilePlus2, Sparkles, Wallet, type LucideIcon } from 'lucide-react-native';

import { authFetch } from '../../features/auth/betterAuth';
import { fetchStageJobs, fetchStudentApplications } from '../../features/stages/stagesApi';
import {
  resolveHomePriority,
  type HomeDestination,
  type HomePriority,
  type StudentDocumentSummary,
} from '../../features/home/homePriority';
import { TransactionRow } from '../GlassComponents';
import type { Transaction } from '../../types';
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
  Icon: LucideIcon;
  color: string;
  tint: string;
  onPress: () => void;
};

const initialPriority: HomePriority = {
  kind: 'resource',
  eyebrow: 'PROCHAINE ÉTAPE',
  title: 'Prépare ta prochaine réussite',
  description: 'Explore les ressources adaptées à ton parcours ou crée un document prêt à envoyer.',
  actionLabel: 'Explorer Campus 360',
  destination: 'resources',
};

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Pressable onPress={action.onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: action.tint }]}>
        <action.Icon size={21} color={action.color} strokeWidth={2.1} />
      </View>
      <View style={styles.quickCopy}>
        <Text style={styles.quickLabel}>{action.label}</Text>
        <Text style={styles.quickDetail} numberOfLines={1}>{action.detail}</Text>
      </View>
      <ArrowRight size={17} color={stitchColors.inkSubtle} />
    </Pressable>
  );
}

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
  const [priority, setPriority] = React.useState<HomePriority>(initialPriority);
  const [loadingPriority, setLoadingPriority] = React.useState(true);
  const firstName = studentName?.trim().split(/\s+/)[0] || 'Étudiant';

  React.useEffect(() => {
    let active = true;

    const loadPriority = async () => {
      setLoadingPriority(true);
      try {
        const [applicationsResult, jobsResult, documentsResult] = await Promise.allSettled([
          fetchStudentApplications(),
          fetchStageJobs({ userSkills: studentSkills }),
          authFetch('/api/mobile/documents'),
        ]);
        const documentResponse = documentsResult.status === 'fulfilled' ? documentsResult.value : null;
        const documentData = documentResponse?.ok
          ? await documentResponse.json() as { documents?: StudentDocumentSummary[] }
          : { documents: [] };

        if (active) {
          setPriority(resolveHomePriority({
            applications: applicationsResult.status === 'fulfilled' ? applicationsResult.value : [],
            jobs: jobsResult.status === 'fulfilled' ? jobsResult.value : [],
            documents: documentData.documents ?? [],
            profileComplete,
          }));
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
    return () => { active = false; };
  }, [profileComplete, studentSkills]);

  const destinations: Record<HomeDestination, () => void> = {
    applications: onApplications,
    stages: onStages,
    documents: onDocuments,
    account: onProfile,
    resources: onResources,
  };

  const actions: QuickAction[] = [
    {
      key: 'stages', label: 'Trouver un stage', detail: 'Offres selon ton profil', Icon: BriefcaseBusiness,
      color: '#60A5FA', tint: 'rgba(96,165,250,0.15)', onPress: onStages,
    },
    {
      key: 'documents', label: 'Créer un document', detail: 'CV, lettre, rapport, mémoire', Icon: FilePlus2,
      color: '#F472B6', tint: 'rgba(244,114,182,0.15)', onPress: onDocuments,
    },
    {
      key: 'resources', label: 'Voir les ressources', detail: 'Supports utiles et ciblés', Icon: BookOpen,
      color: '#C084FC', tint: 'rgba(192,132,252,0.15)', onPress: onResources,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Bonjour, {firstName}</Text>
        <Text style={styles.headline}>Avance sur ce qui compte.</Text>
      </View>

      <LinearGradient colors={brandGradient.colors} start={brandGradient.diagonal.start} end={brandGradient.diagonal.end} style={styles.priorityBorder}>
        <View style={styles.priorityCard}>
          <View style={styles.priorityTopline}>
            <View style={styles.priorityBadge}>
              <Sparkles size={14} color="#E9D5FF" />
              <Text style={styles.priorityEyebrow}>{priority.eyebrow}</Text>
            </View>
            {loadingPriority && <ActivityIndicator size="small" color={stitchColors.sienna} />}
          </View>

          <Text style={styles.priorityTitle}>{priority.title}</Text>
          <Text style={styles.priorityDescription}>{priority.description}</Text>

          {typeof priority.progress === 'number' && (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={brandGradient.colors}
                  start={brandGradient.horizontal.start}
                  end={brandGradient.horizontal.end}
                  style={[styles.progressFill, { width: `${Math.min(100, priority.progress)}%` }]}
                />
              </View>
              <Text style={styles.progressValue}>{priority.progress}%</Text>
            </View>
          )}

          <Pressable onPress={destinations[priority.destination]} style={({ pressed }) => [styles.priorityButton, pressed && styles.pressed]}>
            <Text style={styles.priorityButtonText}>{priority.actionLabel}</Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.walletRow}>
        <View style={styles.walletMetric}>
          <Wallet size={16} color={stitchColors.sienna} />
          <View>
            <Text style={styles.metricValue}>{formatCoins(balance)} C</Text>
            <Text style={styles.metricLabel}>Solde</Text>
          </View>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletMetric}>
          <Sparkles size={16} color="#38BDF8" />
          <View>
            <Text style={styles.metricValue}>{iaCredits}</Text>
            <Text style={styles.metricLabel}>Crédits IA</Text>
          </View>
        </View>
        <Pressable onPress={onRecharge} style={styles.rechargeButton}>
          <Text style={styles.rechargeLabel}>+</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accès rapides</Text>
        <View style={styles.quickList}>
          {actions.map((action) => <QuickActionCard key={action.key} action={action} />)}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
          <Pressable onPress={onProfile} hitSlop={8}><Text style={styles.seeAll}>Tout voir</Text></Pressable>
        </View>
        <View style={styles.activityCard}>
          {transactions.length > 0 ? transactions.slice(0, 3).map((transaction) => (
            <TransactionRow
              key={transaction.id}
              label={transaction.label}
              date={transaction.date}
              amount={transaction.amount}
              type={transaction.type}
              formatCoins={formatCoins}
            />
          )) : (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIcon}><Sparkles size={18} color={stitchColors.sienna} /></View>
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
    backgroundColor: stitchColors.background,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackMd,
    paddingBottom: 150,
  },
  hero: { marginBottom: 22 },
  greeting: { ...stitchTypography.bodyMd, color: stitchColors.inkMuted, marginBottom: 4 },
  headline: {
    fontFamily: fontFamilies.outfit, fontSize: 29, lineHeight: 35, fontWeight: '700',
    letterSpacing: -0.7, color: stitchColors.ink,
  },
  priorityBorder: { borderRadius: stitchRadius.xl + 2, padding: 1 },
  priorityCard: { backgroundColor: '#111622', borderRadius: stitchRadius.xl, padding: 20 },
  priorityTopline: {
    minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(99,102,241,0.14)',
    borderRadius: stitchRadius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  priorityEyebrow: {
    fontFamily: fontFamilies.inter, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, color: '#C7D2FE',
  },
  priorityTitle: {
    fontFamily: fontFamilies.outfit, fontSize: 23, lineHeight: 28, fontWeight: '700',
    letterSpacing: -0.4, color: stitchColors.ink, marginTop: 16,
  },
  priorityDescription: {
    ...stitchTypography.bodyMd, color: stitchColors.inkMuted, lineHeight: 21, marginTop: 8,
  },
  progressBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  progressTrack: {
    flex: 1, height: 5, borderRadius: stitchRadius.full, overflow: 'hidden',
    backgroundColor: '#1E283C',
  },
  progressFill: { height: '100%', borderRadius: stitchRadius.full },
  progressValue: {
    fontFamily: fontFamilies.inter, fontSize: 12, fontWeight: '700', color: stitchColors.inkSoft,
  },
  priorityButton: {
    minHeight: 46, borderRadius: stitchRadius.button, backgroundColor: '#4F46E5', paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18,
  },
  priorityButtonText: {
    fontFamily: fontFamilies.inter, fontSize: 13.5, fontWeight: '700', color: '#FFFFFF',
  },
  walletRow: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111622',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: stitchRadius.lg,
    paddingHorizontal: 16, marginTop: 14,
  },
  walletMetric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  walletDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  metricValue: {
    fontFamily: fontFamilies.outfit, fontSize: 15, fontWeight: '700', color: stitchColors.ink,
  },
  metricLabel: { fontFamily: fontFamilies.inter, fontSize: 10.5, color: stitchColors.inkMuted, marginTop: 1 },
  rechargeButton: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.14)',
  },
  rechargeLabel: { fontSize: 20, lineHeight: 22, color: '#818CF8', fontWeight: '600' },
  section: { marginTop: 26 },
  sectionKicker: {
    fontFamily: fontFamilies.inter, fontSize: 10, fontWeight: '700', letterSpacing: 1.1,
    color: '#818CF8', marginBottom: 5,
  },
  sectionTitle: {
    fontFamily: fontFamilies.outfit, fontSize: 19, lineHeight: 24, fontWeight: '700',
    letterSpacing: -0.3, color: stitchColors.ink,
  },
  quickList: { gap: 9, marginTop: 12 },
  quickAction: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: stitchRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#111622',
    paddingHorizontal: 14,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  quickCopy: { flex: 1 },
  quickLabel: {
    fontFamily: fontFamilies.inter, fontSize: 14, fontWeight: '700', color: stitchColors.ink,
  },
  quickDetail: {
    fontFamily: fontFamilies.inter, fontSize: 11, color: stitchColors.inkMuted, marginTop: 3,
  },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  seeAll: {
    fontFamily: fontFamilies.inter, fontSize: 12, fontWeight: '700', color: stitchColors.sienna,
    paddingVertical: 6,
  },
  activityCard: {
    borderRadius: stitchRadius.lg, borderWidth: 1, borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface, paddingHorizontal: 15, marginTop: 15,
  },
  emptyActivity: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 13 },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: stitchColors.primaryContainer,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: {
    fontFamily: fontFamilies.inter, fontSize: 13, fontWeight: '700', color: stitchColors.ink,
  },
  emptyText: {
    fontFamily: fontFamilies.inter, fontSize: 11, lineHeight: 16, color: stitchColors.inkMuted, marginTop: 4,
  },
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
  bottomSpace: { height: 24 },
});
