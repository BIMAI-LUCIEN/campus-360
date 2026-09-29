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
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { TransactionRow } from '../GlassComponents';
import type { StudentProfile } from '../../features/auth/betterAuth';
import type { Transaction } from '../../types';
import { getSubscriptionPlan, type SubscriptionTier } from '../../features/subscriptions/plans';
import {
  fontFamilies,
  stitchColors,
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

function MenuCardGroup({ title, rows }: { title: string; rows: MenuRow[] }) {
  return (
    <View style={styles.menuGroup}>
      <Text style={styles.menuGroupTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            testID={`menu-${row.key}`}
            onPress={row.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              i > 0 && styles.menuItemDivider,
              pressed && { backgroundColor: 'rgba(124, 58, 237, 0.08)' },
            ]}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: row.danger ? 'rgba(239, 68, 68, 0.12)' : row.iconBg },
              ]}
            >
              <row.Icon
                size={16}
                color={row.danger ? '#EF4444' : row.iconColor}
                strokeWidth={1.9}
              />
            </View>
            <Text style={[styles.menuItemText, row.danger && { color: '#EF4444' }]}>
              {row.label}
            </Text>
            <ChevronRight
              size={16}
              color={row.danger ? '#EF4444' : '#64748B'}
              strokeWidth={1.8}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ProfileScreen({
  studentProfile,
  balance,
  subscriptionTier,
  transactions,
  purchasedDocumentsCount,
  syncingAccount,
  onOpenNotificationsSettings,
  onOpenSecuritySettings,
  onOpenSupport,
  onSync,
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

  const applicationsCount =
    transactions.filter((t) => t.type === 'stage_token').length || 4;

  const activityRows: MenuRow[] = [
    {
      key: 'applications',
      label: 'Mes candidatures & relances',
      Icon: TrendingUp,
      iconBg: 'rgba(124, 58, 237, 0.12)',
      iconColor: '#A78BFA',
      onPress: onApplications || onSync,
    },
    {
      key: 'documents',
      label: 'Mes documents & CV',
      Icon: FileText,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: '#60A5FA',
      onPress: onDocuments,
    },
    {
      key: 'library',
      label: 'Ma bibliothèque de cours PDF',
      Icon: BookOpen,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#34D399',
      onPress: onLibrary,
    },
  ];

  const settingsRows: MenuRow[] = [
    {
      key: 'security',
      label: 'Sécurité & mot de passe',
      Icon: Shield,
      iconBg: 'rgba(100, 116, 139, 0.12)',
      iconColor: '#94A3B8',
      onPress: onOpenSecuritySettings,
    },
    {
      key: 'notifications',
      label: 'Notifications',
      Icon: Bell,
      iconBg: 'rgba(100, 116, 139, 0.12)',
      iconColor: '#94A3B8',
      onPress: onOpenNotificationsSettings,
    },
  ];

  const accountRows: MenuRow[] = [
    {
      key: 'support',
      label: 'Support WhatsApp',
      Icon: MessageSquare,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#34D399',
      onPress: onOpenSupport,
    },
    ...(onSignInPress && !studentProfile?.email
      ? [
          {
            key: 'signin',
            label: 'Se connecter à un compte',
            Icon: LogIn,
            iconBg: 'rgba(124, 58, 237, 0.12)',
            iconColor: '#A78BFA',
            onPress: onSignInPress,
          },
        ]
      : []),
    {
      key: 'sync',
      label: syncingAccount ? 'Synchronisation…' : 'Synchroniser le compte',
      Icon: RefreshCw,
      iconBg: 'rgba(100, 116, 139, 0.12)',
      iconColor: '#94A3B8',
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
      {/* ── 1. En-tête Mon Profil ───────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <Pressable
          onPress={onOpenNotificationsSettings}
          style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.8 }]}
        >
          <Bell size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* ── 2. Carte d'Identité Étudiant ────────────────────────────── */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <Image
            source={{ uri: (studentProfile as any)?.avatarUrl || DEFAULT_AVATAR }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
          <View style={{ flex: 1, paddingLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.studentName} numberOfLines={1}>
                {studentProfile?.name || 'Lucien Miguel'}
              </Text>
              <Pressable
                onPress={onPremium}
                style={({ pressed }) => [styles.premiumBadge, pressed && { opacity: 0.85 }]}
              >
                <Crown size={11} color="#FBBF24" />
                <Text style={styles.premiumBadgeText}>
                  {isPremium ? tierLabel : 'Standard'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.studentHandle} numberOfLines={1}>
              {handle}
            </Text>
            <Text style={styles.studentSubline} numberOfLines={1}>
              {subline}
            </Text>
          </View>
        </View>

        {/* ── 3 Indicateurs Métier (Pas de jetons IA criards) ────────── */}
        <View style={styles.statsRow}>
          <Pressable
            testID="stat-applications"
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.8 }]}
            onPress={onApplications}
          >
            <Text style={styles.statNumber}>{applicationsCount}</Text>
            <Text style={styles.statLabel}>Candidatures</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.8 }]}
            onPress={onDocuments}
          >
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>Documents & CV</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.8 }]}
            onPress={onLibrary}
          >
            <Text style={styles.statNumber}>{purchasedDocumentsCount}</Text>
            <Text style={styles.statLabel}>PDF Débloqués</Text>
          </Pressable>
        </View>
      </View>

      {/* ── 3. Groupes de Menu Structurés ────────────────────────────── */}
      <MenuCardGroup title="ACTIVITÉ & OUTILS" rows={activityRows} />
      <MenuCardGroup title="PARAMÈTRES & SÉCURITÉ" rows={settingsRows} />
      <MenuCardGroup title="COMPTE & ASSISTANCE" rows={accountRows} />

      {/* ── 4. Transactions Récentes (si existantes) ─────────────────── */}
      {transactions.length > 0 && (
        <View style={styles.txSection}>
          <Text style={styles.menuGroupTitle}>TRANSACTIONS RÉCENTES</Text>
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

      {/* Espace bas pour laisser respirer au-dessus de la BottomNav */}
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090714',
  },
  scrollContent: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 40,
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Profile Card
  profileCard: {
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  studentName: {
    fontFamily: fontFamilies.outfit,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  studentHandle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  studentSubline: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  premiumBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FBBF24',
  },

  // 3 Stats Pills Row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statPill: {
    flex: 1,
    backgroundColor: '#0D0B18',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: fontFamilies.outfit,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },

  // Menu Groups
  menuGroup: {
    marginBottom: 16,
  },
  menuGroupTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemDivider: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontFamily: fontFamilies.inter,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#E2E8F0',
  },

  // Transactions Section
  txSection: {
    marginBottom: 16,
  },
  txCard: {
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
});
