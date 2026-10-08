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
import { LinearGradient } from 'expo-linear-gradient';
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
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { TransactionRow } from '../GlassComponents';
import type { StudentProfile } from '../../features/auth/betterAuth';
import type { Transaction } from '../../types';
import { getSubscriptionPlan, type SubscriptionTier } from '../../features/subscriptions/plans';
import {
  brandGradient,
  fontFamilies,
  stitchColors,
  stitchRadius,
  stitchShadows,
  stitchSpacing,
  stitchTypography,
} from '../../theme/stitch';
import { WhatsAppPairingModal } from '../../features/whatsapp/WhatsAppPairingModal';
import { getStoredWhatsAppStatus } from '../../features/whatsapp/whatsappService';

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
  testID?: string;
  badge?: React.ReactNode;
}

function MenuCardGroup({ title, rows }: { title: string; rows: MenuRow[] }) {
  return (
    <View style={styles.menuGroup}>
      <Text style={styles.menuGroupTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            testID={row.testID || `menu-${row.key}`}
            onPress={row.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              i > 0 && styles.menuItemDivider,
              pressed && { backgroundColor: 'rgba(124, 58, 237, 0.05)' },
            ]}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: row.danger ? 'rgba(239, 68, 68, 0.1)' : row.iconBg },
              ]}
            >
              <row.Icon
                size={16}
                color={row.danger ? '#DC2626' : row.iconColor}
                strokeWidth={1.9}
              />
            </View>
            <Text style={[styles.menuItemText, row.danger && { color: '#DC2626' }]}>
              {row.label}
            </Text>
            {row.badge}
            <ChevronRight
              size={16}
              color={row.danger ? '#DC2626' : '#94A3B8'}
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
  balance = 0,
  iaCredits = 0,
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

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = React.useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    getStoredWhatsAppStatus().then((status) => {
      if (isMounted) {
        setIsWhatsAppConnected(Boolean(status.connected));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [studentProfile]);

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
      iconBg: 'rgba(124, 58, 237, 0.1)',
      iconColor: '#7C3AED',
      onPress: onApplications || onSync,
    },
    {
      key: 'documents',
      label: 'Mes documents & CV officiel RH',
      Icon: FileText,
      iconBg: 'rgba(37, 99, 235, 0.1)',
      iconColor: '#2563EB',
      onPress: onDocuments,
    },
    {
      key: 'library',
      label: 'Ma bibliothèque de cours PDF',
      Icon: BookOpen,
      iconBg: 'rgba(5, 150, 105, 0.1)',
      iconColor: '#059669',
      onPress: onLibrary,
    },
  ];

  const settingsRows: MenuRow[] = [
    {
      key: 'whatsapp_link',
      testID: 'menu-whatsapp-settings',
      label: 'Liaison WhatsApp (Candidatures 1-Clic)',
      Icon: MessageSquare,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#059669',
      badge: (
        <View
          style={
            isWhatsAppConnected
              ? styles.whatsappConnectedBadge
              : styles.whatsappDisconnectedBadge
          }
        >
          <Text
            style={
              isWhatsAppConnected
                ? styles.whatsappConnectedBadgeText
                : styles.whatsappDisconnectedBadgeText
            }
          >
            {isWhatsAppConnected ? '✅ WhatsApp connecté' : 'Non associé'}
          </Text>
        </View>
      ),
      onPress: () => setIsWhatsAppModalOpen(true),
    },
    {
      key: 'security',
      label: 'Sécurité & mot de passe',
      Icon: Shield,
      iconBg: 'rgba(100, 116, 139, 0.1)',
      iconColor: '#64748B',
      onPress: onOpenSecuritySettings,
    },
    {
      key: 'notifications',
      label: 'Notifications',
      Icon: Bell,
      iconBg: 'rgba(100, 116, 139, 0.1)',
      iconColor: '#64748B',
      onPress: onOpenNotificationsSettings,
    },
  ];

  const accountRows: MenuRow[] = [
    {
      key: 'support',
      label: 'Support WhatsApp Campus 360',
      Icon: MessageSquare,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#059669',
      onPress: onOpenSupport,
    },
    ...(onSignInPress && !studentProfile?.email
      ? [
          {
            key: 'signin',
            label: 'Se connecter à un compte',
            Icon: LogIn,
            iconBg: 'rgba(124, 58, 237, 0.1)',
            iconColor: '#7C3AED',
            onPress: onSignInPress,
          },
        ]
      : []),
    {
      key: 'sync',
      label: syncingAccount ? 'Synchronisation…' : 'Synchroniser le compte',
      Icon: RefreshCw,
      iconBg: 'rgba(100, 116, 139, 0.1)',
      iconColor: '#64748B',
      onPress: onSync,
    },
    {
      key: 'signout',
      label: 'Déconnexion',
      Icon: LogOut,
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#DC2626',
      onPress: onSignOut,
      danger: true,
    },
  ];

  return (
    <>
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
            <Bell size={18} color="#0F172A" strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── 2. Carte d'Identité Étudiant Clean White ─────────────────── */}
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
                <View style={styles.premiumBadge}>
                  <Shield size={11} color="#7C3AED" />
                  <Text style={[styles.premiumBadgeText, { color: '#7C3AED' }]}>
                    Étudiant Vérifié
                  </Text>
                </View>
              </View>
              <Text style={styles.studentHandle} numberOfLines={1}>
                {handle}
              </Text>
              <Text style={styles.studentSubline} numberOfLines={1}>
                {subline}
              </Text>
            </View>
          </View>

          {/* Indicateurs Métier */}
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
              <Text style={styles.statLabel}>CV Officiel RH</Text>
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

        {/* ── 3. Carte Portefeuille Néobanque Dégradé Violet Royal ──────── */}
        <View style={styles.neobankSection}>
          <LinearGradient
            colors={brandGradient.colors}
            start={brandGradient.horizontal.start}
            end={brandGradient.horizontal.end}
            style={styles.neobankCard}
          >
            <View style={styles.neobankTopRow}>
              <View>
                <Text style={styles.neobankLabel}>CAMPUS 360 PAY</Text>
                <Text style={styles.neobankHolder}>{studentProfile?.name || 'Étudiant Certifié'}</Text>
              </View>
              <View style={styles.neobankIaPill}>
                <Sparkles size={11} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.neobankIaText}>{iaCredits} CRÉDITS IA</Text>
              </View>
            </View>

            <View style={styles.neobankBalanceRow}>
              <Text style={styles.neobankBalance}>{formatCoins(balance)}</Text>
              <Text style={styles.neobankCurrency}> FCFA</Text>
            </View>

            <View style={styles.neobankBottomRow}>
              <Text style={styles.neobankHint}>MoMo • Orange Money</Text>
              <Pressable
                style={({ pressed }) => [styles.neobankRechargeBtn, pressed && { opacity: 0.88 }]}
                onPress={onRecharge}
              >
                <Text style={styles.neobankRechargeText}>Recharger</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* ── 4. Groupes de Menu Structurés Clean White ────────────────── */}
        <MenuCardGroup title="ACTIVITÉ & OUTILS" rows={activityRows} />
        <MenuCardGroup title="PARAMÈTRES & SÉCURITÉ" rows={settingsRows} />
        <MenuCardGroup title="COMPTE & ASSISTANCE" rows={accountRows} />

        {/* ── 5. Transactions Récentes ─────────────────────────────────── */}
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
        <View style={{ height: 100 }} />
      </ScrollView>

      <WhatsAppPairingModal
        visible={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        initialPhone={studentProfile?.whatsappPhone || studentProfile?.phone || ''}
        onStatusChange={(connected) => setIsWhatsAppConnected(connected)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background, // #F8FAFC
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
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 26,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.4,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...stitchShadows.card,
  },

  // 2. Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...stitchShadows.card,
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
    borderWidth: 2,
    borderColor: '#EDE9FE',
  },
  studentName: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 16.5,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  studentHandle: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    color: stitchColors.inkMuted,
    marginTop: 2,
  },
  studentSubline: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    color: stitchColors.inkSoft,
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
    fontWeight: '700',
    color: '#D97706',
  },

  // Stats Pills Row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: stitchTypography.labelSm.fontFamily,
    fontSize: 10.5,
    fontWeight: '600',
    color: stitchColors.inkMuted,
    marginTop: 2,
  },

  // 3. Virtual Neobank Wallet Card
  neobankSection: {
    marginBottom: 20,
  },
  neobankCard: {
    borderRadius: 22,
    padding: 18,
    ...stitchShadows.card,
  },
  neobankTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  neobankLabel: {
    fontFamily: fontFamilies.outfit,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  neobankHolder: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  neobankIaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  neobankIaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  neobankBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  neobankBalance: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  neobankCurrency: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 4,
  },
  neobankBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  neobankHint: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  neobankRechargeBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  neobankRechargeText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // 4. Menu Groups
  menuGroup: {
    marginBottom: 18,
  },
  menuGroupTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: stitchColors.inkMuted,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    overflow: 'hidden',
    ...stitchShadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontFamily: stitchTypography.bodyMd.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: stitchColors.ink,
  },

  // 5. Transactions Section
  txSection: {
    marginBottom: 18,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 14,
    ...stitchShadows.card,
  },

  // WhatsApp Status Badges
  whatsappConnectedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginRight: 6,
  },
  whatsappConnectedBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  whatsappDisconnectedBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.22)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginRight: 6,
  },
  whatsappDisconnectedBadgeText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
});
