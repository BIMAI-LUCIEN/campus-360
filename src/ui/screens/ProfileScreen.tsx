import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import {
  Bell,
  Shield,
  MessageSquare,
  Wallet,
  Crown,
  Sparkles,
  Flame,
  BookOpen,
  LogOut,
  RefreshCw,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import {
  GlassCard,
  GlassPill,
  TransactionRow,
  PrimaryButton,
  ScreenMasthead,
} from '../GlassComponents';
import type { StudentProfile } from '../../features/auth/betterAuth';
import type { Transaction } from '../../types';
import {
  stitchColors,
  stitchSpacing,
  stitchRadius,
  stitchTypography,
  fontFamilies,
} from '../../theme/stitch';

const formatCoins = (value: number) =>
  new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value);

interface ProfileScreenProps {
  studentProfile: StudentProfile | null;
  balance: number;
  iaCredits: number;
  subscriptionTier: 'free' | 'basic' | 'premium';
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
  onSignOut: () => void;
}

interface Row {
  key: string;
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  danger?: boolean;
}

function MenuList({ rows }: { rows: Row[] }) {
  return (
    <View style={styles.menuList}>
      {rows.map((row, i) => (
        <Pressable
          key={row.key}
          onPress={row.onPress}
          style={({ pressed }) => [
            styles.menuItem,
            i > 0 && styles.menuItemDivider,
            pressed && { backgroundColor: stitchColors.paperSoft },
          ]}
        >
          <row.Icon
            size={18}
            color={row.danger ? stitchColors.error : stitchColors.ink}
            strokeWidth={1.75}
          />
          <Text style={[styles.menuItemText, row.danger && { color: stitchColors.error }]}>
            {row.label}
          </Text>
          <ChevronRight
            size={17}
            color={row.danger ? stitchColors.error : stitchColors.inkSubtle}
            strokeWidth={1.75}
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
  onSignOut,
}: ProfileScreenProps) {
  const initials = studentProfile?.name?.slice(0, 2).toUpperCase() ?? 'CB';
  const email = studentProfile?.email ?? '—';
  const tierLabel =
    subscriptionTier === 'premium'
      ? 'Bibliothécaire'
      : subscriptionTier === 'basic'
        ? 'Étudiant'
        : 'Découverte';

  return (
    <View style={styles.container}>
      <ScreenMasthead
        kicker="Le Compte"
        title="Mon profil"
        folio={tierLabel.toUpperCase()}
      />

      {/* Identity hero */}
      <View style={styles.profileHero}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {studentProfile?.name ?? 'Étudiant Campus 360'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          {subscriptionTier !== 'free' && (
            <View style={styles.premiumBadge}>
              <Crown size={12} color="#FFFFFF" />
              <Text style={styles.premiumBadgeText}>{tierLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* University tags */}
      {studentProfile?.university ? (
        <View style={styles.tagsRow}>
          <GlassPill label={studentProfile.university} />
          {studentProfile.faculty ? <GlassPill label={studentProfile.faculty} /> : null}
          {studentProfile.level ? <GlassPill label={studentProfile.level} active /> : null}
        </View>
      ) : null}

      {/* Wallet mini card */}
      <GlassCard style={styles.walletMini}>
        <View style={styles.walletMiniRow}>
          <View style={styles.walletMiniLeft}>
            <Wallet size={17} color={stitchColors.ink} strokeWidth={1.75} />
            <Text style={styles.walletMiniLabel}>Solde</Text>
          </View>
          <Text style={styles.walletMiniValue}>{formatCoins(balance)} C</Text>
        </View>
        <View style={styles.walletMiniDivider} />
        <View style={styles.walletMiniRow}>
          <View style={styles.walletMiniLeft}>
            <Sparkles size={17} color={stitchColors.sienna} strokeWidth={1.75} />
            <Text style={styles.walletMiniLabel}>Crédits IA</Text>
          </View>
          <Text style={styles.walletMiniValue}>{iaCredits}</Text>
        </View>
        <View style={styles.walletMiniDivider} />
        <View style={styles.walletMiniRow}>
          <View style={styles.walletMiniLeft}>
            <BookOpen size={17} color={stitchColors.emerald} strokeWidth={1.75} />
            <Text style={styles.walletMiniLabel}>Documents</Text>
          </View>
          <Text style={styles.walletMiniValue}>{purchasedDocumentsCount}</Text>
        </View>
      </GlassCard>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
          onPress={onRecharge}
        >
          <Wallet size={19} color={stitchColors.ink} strokeWidth={1.75} />
          <Text style={styles.actionBtnText}>Recharger</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.9 }]}
          onPress={onPremium}
        >
          <Crown size={19} color="#FFFFFF" strokeWidth={1.75} />
          <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Premium</Text>
        </Pressable>
      </View>

      {/* Boost & Social Portfolio Hero Card */}
      <GlassCard style={styles.portfolioCard}>
        <View style={styles.portfolioHeader}>
          <View style={styles.portfolioBadge}>
            <Sparkles size={14} color="#F59E0B" />
            <Text style={styles.portfolioBadgeText}>Vitrine Sociale &amp; Portfolio</Text>
          </View>
          <Pressable style={styles.boostBtn} onPress={() => alert('Boost activé pour 3 jours ! Ton profil est épinglé en tête de liste des recruteurs.')}>
            <Flame size={13} color="#FFFFFF" />
            <Text style={styles.boostBtnText}>Booster (500 FCFA)</Text>
          </Pressable>
        </View>

        <Text style={styles.portfolioTitle}>Mes Réalisations &amp; Projets</Text>
        <Text style={styles.portfolioSubtitle}>
          Présente tes projets, vidéos de démo et réalisations pour convaincre les recruteurs.
        </Text>

        <View style={styles.projectsList}>
          <View style={styles.projectItem}>
            <View style={styles.projectDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName}>Application Mobile React Native</Text>
              <Text style={styles.projectDesc}>Projet de fin d'études • Vidéo de démo attachée (GCS)</Text>
            </View>
            <View style={styles.mediaPill}>
              <Text style={styles.mediaPillText}>Vidéo 45s</Text>
            </View>
          </View>

          <View style={styles.projectItem}>
            <View style={styles.projectDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName}>Modèle d'Analyse Financière SYSCOHADA</Text>
              <Text style={styles.projectDesc}>Tableau de bord Excel • Rapport PDF joint</Text>
            </View>
            <View style={styles.mediaPill}>
              <Text style={styles.mediaPillText}>PDF</Text>
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Subscription card */}
      {subscriptionTier !== 'free' && (
        <GlassCard style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Crown size={18} color={stitchColors.sienna} />
            <Text style={styles.subscriptionTitle}>Abonnement {tierLabel}</Text>
          </View>
          <Text style={styles.subscriptionDesc}>
            Accès illimité au catalogue et crédits IA inclus.
          </Text>
          <PrimaryButton label="Gérer l'abonnement" onPress={onPremium} />
        </GlassCard>
      )}

      {/* My content */}
      <Text style={styles.groupLabel}>Mon contenu</Text>
      <MenuList
        rows={[
          { key: 'library', label: 'Ma bibliothèque', Icon: BookOpen, onPress: onLibrary },
          { key: 'documents', label: 'Mes documents rédigés', Icon: Wallet, onPress: onDocuments },
        ]}
      />

      {/* Settings */}
      <Text style={styles.groupLabel}>Réglages &amp; sécurité</Text>
      <MenuList
        rows={[
          { key: 'notifications', label: 'Notifications', Icon: Bell, onPress: onOpenNotificationsSettings },
          { key: 'security', label: 'Sécurité & mot de passe', Icon: Shield, onPress: onOpenSecuritySettings },
          { key: 'support', label: 'Contacter le support', Icon: MessageSquare, onPress: onOpenSupport },
        ]}
      />

      {/* System */}
      <Text style={styles.groupLabel}>Système</Text>
      <MenuList
        rows={[
          {
            key: 'sync',
            label: syncingAccount ? 'Synchronisation…' : 'Synchroniser le compte',
            Icon: RefreshCw,
            onPress: onSync,
          },
          { key: 'signout', label: 'Déconnexion', Icon: LogOut, onPress: onSignOut, danger: true },
        ]}
      />

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <>
          <Text style={styles.groupLabel}>Historique récent</Text>
          <GlassCard style={{ padding: 16 }}>
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
          </GlassCard>
        </>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackMd,
    paddingBottom: 160,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: stitchSpacing.stackMd,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: stitchColors.siennaDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamilies.outfit,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontFamily: fontFamilies.outfit,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.4,
  },
  profileEmail: {
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    color: stitchColors.inkMuted,
    letterSpacing: 0.3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: stitchColors.sienna,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  premiumBadgeText: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: stitchSpacing.stackMd,
  },
  walletMini: {
    padding: 18,
    marginBottom: stitchSpacing.stackMd,
  },
  walletMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  walletMiniLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletMiniLabel: {
    ...stitchTypography.labelMd,
    color: stitchColors.inkMuted,
  },
  walletMiniValue: {
    fontFamily: fontFamilies.outfit,
    fontSize: 18,
    fontWeight: '800',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  walletMiniDivider: {
    height: 1,
    backgroundColor: stitchColors.inkFaint,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: stitchSpacing.stackMd,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    borderRadius: stitchRadius.sm,
    paddingVertical: 14,
  },
  actionBtnPrimary: {
    backgroundColor: stitchColors.siennaDeep,
    borderColor: stitchColors.siennaDeep,
  },
  actionBtnText: {
    ...stitchTypography.labelMd,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  subscriptionCard: {
    padding: 18,
    marginBottom: stitchSpacing.stackMd,
    backgroundColor: stitchColors.siennaBg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subscriptionTitle: {
    ...stitchTypography.labelMd,
    fontWeight: '700',
    color: stitchColors.siennaDeep,
  },
  subscriptionDesc: {
    ...stitchTypography.bodyMd,
    color: stitchColors.inkMuted,
    marginBottom: 14,
  },
  groupLabel: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    color: stitchColors.sienna,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  menuList: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.md,
    marginBottom: stitchSpacing.stackMd,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: stitchColors.paperDeep,
  },
  menuItemText: {
    ...stitchTypography.labelMd,
    flex: 1,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  portfolioCard: {
    padding: 16,
    marginBottom: stitchSpacing.stackMd,
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  portfolioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  portfolioBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  boostBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  portfolioTitle: {
    ...stitchTypography.displaySm,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  portfolioSubtitle: {
    ...stitchTypography.bodySm,
    color: '#94A3B8',
    marginBottom: 14,
  },
  projectsList: {
    gap: 10,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  projectName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  projectDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  mediaPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mediaPillText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
});
