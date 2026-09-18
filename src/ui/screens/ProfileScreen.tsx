import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Crown,
  FileText,
  LogIn,
  LogOut,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import {
  GlassCard,
  TransactionRow,
  TrustBadgeStrip,
} from '../GlassComponents';
import type { StudentProfile } from '../../features/auth/betterAuth';
import type { Transaction } from '../../types';
import { getSubscriptionPlan, type SubscriptionTier } from '../../features/subscriptions/plans';
import {
  fontFamilies,
  stitchColors,
  stitchRadius,
  stitchSpacing,
} from '../../theme/stitch';

const formatCoins = (value: number) =>
  new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

interface ProfileScreenProps {
  studentProfile: StudentProfile | null;
  balance: number;
  iaCredits: number;
  subscriptionTier: SubscriptionTier;
  transactions: Transaction[];
  purchasedDocumentsCount: number;
  syncingAccount: boolean;
  notifNewPdf: boolean;
  notifPromos: boolean;
  notifAlerts: boolean;
  onToggleNotifNewPdf: (v: boolean) => void;
  onToggleNotifPromos: (v: boolean) => void;
  onToggleNotifAlerts: (v: boolean) => void;
  onOpenNotificationsSettings: () => void;
  onOpenSecuritySettings: () => void;
  onOpenSupport: () => void;
  onSync: () => void;
  onRecharge: () => void;
  onPremium: () => void;
  onLibrary: () => void;
  onDocuments: () => void;
  onApplications?: () => void;
  onSignInPress?: () => void;
  onSignOut: () => void;
}

interface MenuRow {
  key: string;
  label: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  danger?: boolean;
}

function ProfileMenuList({ rows }: { rows: MenuRow[] }) {
  return (
    <View style={styles.menuCard}>
      {rows.map((row, i) => (
        <Pressable
          key={row.key}
          testID={`menu-${row.key}`}
          onPress={row.onPress}
          style={({ pressed }) => [
            styles.menuItem,
            i > 0 && styles.menuItemDivider,
            pressed && { backgroundColor: 'rgba(139, 92, 246, 0.12)' },
          ]}
        >
          <View
            style={[
              styles.menuIconCircle,
              { backgroundColor: row.danger ? 'rgba(239, 68, 68, 0.14)' : row.iconBg },
            ]}
          >
            <row.Icon
              size={17}
              color={row.danger ? '#EF4444' : row.iconColor}
              strokeWidth={1.9}
            />
          </View>
          <Text style={[styles.menuItemText, row.danger && { color: '#EF4444' }]}>
            {row.label}
          </Text>
          <ChevronRight
            size={17}
            color={row.danger ? '#EF4444' : '#A78BFA'}
            strokeWidth={1.8}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function ProfileScreen({
  studentProfile,
  balance,
  iaCredits,
  subscriptionTier,
  transactions,
  purchasedDocumentsCount,
  syncingAccount,
  onOpenNotificationsSettings,
  onOpenSecuritySettings,
  onOpenSupport,
  onSync,
  onRecharge,
  onPremium,
  onLibrary,
  onDocuments,
  onApplications,
  onSignInPress,
  onSignOut,
}: ProfileScreenProps) {
  const isPremium = subscriptionTier !== 'free';
  const tierPlan = getSubscriptionPlan(subscriptionTier);
  const tierLabel = tierPlan.name;

  const handle = studentProfile?.email
    ? `@${studentProfile.email.split('@')[0]}`
    : '@campus360';
  const subline = studentProfile?.university || 'Université de Yaoundé I';

  // Count candidatures (either from transactions or mock baseline)
  const applicationsCount =
    transactions.filter((t) => t.type === 'stage_token').length || 4;

  const menuRows: MenuRow[] = [
    {
      key: 'documents',
      label: 'Mes Documents & CV',
      Icon: FileText,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: '#7C3AED',
      onPress: onDocuments,
    },
    {
      key: 'subscription',
      label: 'Abonnement & Jetons',
      Icon: Star,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: '#D97706',
      onPress: onPremium,
    },
    {
      key: 'stats',
      label: 'Statistiques & Candidatures',
      Icon: TrendingUp,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#059669',
      onPress: onApplications || onSync,
    },
    {
      key: 'library',
      label: 'Ma Bibliothèque PDF',
      Icon: BookOpen,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: '#2563EB',
      onPress: onLibrary,
    },
    {
      key: 'security',
      label: 'Paramètres & Sécurité',
      Icon: Shield,
      iconBg: 'rgba(100, 116, 139, 0.12)',
      iconColor: '#475569',
      onPress: onOpenSecuritySettings,
    },
    {
      key: 'support',
      label: 'Contacter le support WhatsApp',
      Icon: MessageSquare,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#059669',
      onPress: onOpenSupport,
    },
    ...(onSignInPress && !studentProfile?.email
      ? [
          {
            key: 'signin',
            label: 'Se connecter à un compte existant',
            Icon: LogIn,
            iconBg: 'rgba(139, 92, 246, 0.12)',
            iconColor: '#7C3AED',
            onPress: onSignInPress,
          },
        ]
      : []),
    {
      key: 'sync',
      label: syncingAccount ? 'Synchronisation en cours…' : 'Synchroniser le compte',
      Icon: RefreshCw,
      iconBg: 'rgba(100, 116, 139, 0.12)',
      iconColor: '#475569',
      onPress: onSync,
    },
    {
      key: 'signout',
      label: 'Déconnexion',
      Icon: LogOut,
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconColor: '#EF4444',
      onPress: onSignOut,
      danger: true,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. Top Header: Serif Title + Bell Button ─────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable
          onPress={onOpenNotificationsSettings}
          style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.8 }]}
        >
          <Bell size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* ── 2. Centered Avatar with Glowing Halo Ring ────────────────── */}
      <View style={styles.avatarHaloWrapper}>
        <View style={styles.avatarHaloOuter}>
          <Image
            source={{ uri: (studentProfile as any)?.avatarUrl || DEFAULT_AVATAR }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* ── 3. Profile Info Card (Exact Replica of Right Screen) ──────── */}
      <View style={styles.profileCard}>
        {/* Top: Name, Handle & Premium Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.studentName} numberOfLines={1}>
              {studentProfile?.name || 'Lucien Miguel'}
            </Text>
            <Text style={styles.studentHandle} numberOfLines={1}>
              {handle} • {subline}
            </Text>
          </View>

          {/* Dark Premium Pill Badge */}
          <Pressable
            onPress={onPremium}
            style={({ pressed }) => [
              styles.premiumBadge,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Crown size={12} color="#FDE047" strokeWidth={2.4} />
            <Text style={styles.premiumBadgeText}>
              {isPremium ? tierLabel : 'Premium'}
            </Text>
          </Pressable>
        </View>

        {/* Middle: 3 Stats Pills Row (Candidatures, Jetons IA, PDF Débloqués) */}
        <View style={styles.statsRow}>
          <Pressable
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.8 }]}
            onPress={onApplications}
          >
            <Text style={styles.statNumber}>{applicationsCount}</Text>
            <Text style={styles.statLabel}>Candidatures</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.8 }]}
            onPress={onRecharge}
          >
            <Text style={styles.statNumber}>{iaCredits}</Text>
            <Text style={styles.statLabel}>Jetons IA</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.8 }]}
            onPress={onLibrary}
          >
            <Text style={styles.statNumber}>{purchasedDocumentsCount}</Text>
            <Text style={styles.statLabel}>PDF Débloqués</Text>
          </Pressable>
        </View>

        {/* Bottom: Dark Token Replenish Banner */}
        <View style={styles.replenishBanner}>
          <View style={styles.replenishLeft}>
            <View style={styles.starCircle}>
              <Star size={13} color="#FDE047" fill="#FDE047" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.replenishTitle}>Besoin de jetons ?</Text>
              <Text style={styles.replenishSub} numberOfLines={1}>
                Recharge pour postuler en illimité.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onRecharge}
            style={({ pressed }) => [
              styles.replenishBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.replenishBtnText}>Recharger</Text>
          </Pressable>
        </View>
      </View>

      {/* ── 4. Menu List Group Card with Chevrons ────────────────────── */}
      <ProfileMenuList rows={menuRows} />

      {/* ── 5. Solde & Historique Récent (Optionnel si transactions) ── */}
      {transactions.length > 0 && (
        <View style={styles.txSection}>
          <Text style={styles.sectionTitle}>Transactions Récentes</Text>
          <View style={styles.txCard}>
            {transactions.slice(0, 3).map((tx) => (
              <TransactionRow
                key={tx.id}
                label={tx.label}
                date={tx.date}
                amount={tx.amount}
                type={tx.type}
                formatCoins={formatCoins}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── 6. Bandeau de Réassurance & Safe Padding ────────────────── */}
      <TrustBadgeStrip style={{ marginHorizontal: 0, marginTop: 22, marginBottom: 12 }} />
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  scrollContent: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 160,
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: stitchColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  // 2. Avatar with glowing halo ring
  avatarHaloWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: -22,
    zIndex: 10,
  },
  avatarHaloOuter: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 3,
    borderColor: 'rgba(167, 139, 250, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1E1642',
  },

  // 3. Profile Card
  profileCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 28,
    paddingTop: 34,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  studentName: {
    fontFamily: fontFamilies.serif,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  studentHandle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#A78BFA',
    marginTop: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  premiumBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE047',
    letterSpacing: 0.4,
  },

  // Stats Pills Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: stitchColors.surfaceContainerHigh,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
  },
  statNumber: {
    fontFamily: fontFamilies.serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#A78BFA',
    marginTop: 2,
  },

  // Dark Replenish Banner
  replenishBanner: {
    backgroundColor: '#1E143E',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  replenishLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  starCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(253, 224, 71, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replenishTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  replenishSub: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    color: '#C4B5FD',
    marginTop: 1,
  },
  replenishBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
  },
  replenishBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 4. Menu Card
  menuCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontFamily: fontFamilies.inter,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#F8FAFC',
  },

  // 5. Recent Transactions
  txSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  txCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
});
