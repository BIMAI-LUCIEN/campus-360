import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  Coins,
} from 'lucide-react-native';
import {
  DashboardGrid,
  TrustBadgeStrip,
} from '../GlassComponents';
import type { StudentProfile } from '../../features/auth/betterAuth';
import type { StageApplication } from '../../types';
import {
  fontFamilies,
  stitchColors,
  stitchSpacing,
} from '../../theme/stitch';

interface DashboardScreenProps {
  studentProfile?: StudentProfile | null;
  balance: number;
  iaCredits: number;
  recentApplication?: StageApplication | null;
  onApplyIa: () => void;
  onApplications: () => void;
  onDocuments: () => void;
  onStages: () => void;
  onRecharge: () => void;
  onProfile: () => void;
  onNotifications?: () => void;
}

export function DashboardScreen({
  studentProfile,
  balance,
  iaCredits,
  recentApplication,
  onApplyIa,
  onApplications,
  onDocuments,
  onStages,
  onRecharge,
  onProfile,
  onNotifications,
}: DashboardScreenProps) {
  const studentName = studentProfile?.name || 'Étudiant';
  const university = studentProfile?.university || 'Université de Yaoundé I';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. Top Header: Serif Title "Dashboard" + Quick Bell & Tokens ── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerKicker}>CAMPUS 360 HUB</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={onRecharge}
            style={({ pressed }) => [styles.tokenPill, pressed && { opacity: 0.85 }]}
          >
            <Coins size={14} color="#FBBF24" />
            <Text style={styles.tokenPillText}>{iaCredits} cr</Text>
          </Pressable>

          <Pressable
            onPress={onNotifications || onApplications}
            style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.8 }]}
          >
            <Bell size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* ── 2. Greeting & Profile Subline ───────────────────────────── */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText}>
          Bonjour, <Text style={styles.greetingName}>{studentName}</Text> 👋
        </Text>
        <Text style={styles.greetingSub}>{university}</Text>
      </View>

      {/* ── 3. The 2x2 Grid of 4 Large Frosted Cards (Mockup Left Screen) ── */}
      <View style={styles.gridSection}>
        <DashboardGrid
          onApplyIa={onApplyIa}
          onApplications={onApplications}
          onDocuments={onDocuments}
          onStages={onStages}
        />
      </View>

      {/* ── 4. Live Activity / Candidature en Cours ──────────────────── */}
      {recentApplication && (
        <View style={styles.activeAppCard}>
          <View style={styles.activeAppHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.activeAppKicker}>DERNIÈRE CANDIDATURE</Text>
            <View style={styles.activeAppBadge}>
              <Text style={styles.activeAppBadgeText}>{recentApplication.status}</Text>
            </View>
          </View>

          <Text style={styles.activeAppJobTitle} numberOfLines={1}>
            {recentApplication.job?.title || 'Stage en cours de revue'}
          </Text>
          <Text style={styles.activeAppCompany} numberOfLines={1}>
            {recentApplication.job?.company?.name || 'Entreprise Partenaire'}
          </Text>

          <Pressable
            onPress={onApplications}
            style={({ pressed }) => [styles.activeAppCta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.activeAppCtaText}>Voir la timeline et relancer J+7 →</Text>
          </Pressable>
        </View>
      )}

      {/* ── 5. Quick Wallet Banner ──────────────────────────────────── */}
      <View style={styles.walletQuickBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletKicker}>PORTEFEUILLE MOBILE MONEY</Text>
          <Text style={styles.walletBalanceText}>
            {new Intl.NumberFormat('fr-CM').format(balance)} FCFA
          </Text>
        </View>
        <Pressable
          onPress={onRecharge}
          style={({ pressed }) => [styles.walletRechargeBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.walletRechargeBtnText}>+ Recharger</Text>
        </Pressable>
      </View>

      {/* ── 6. Bandeau de Réassurance & Bottom Padding ──────────────── */}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerKicker: {
    fontFamily: fontFamilies.mono,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: '#A78BFA',
    fontWeight: '700',
  },
  headerTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.28)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tokenPillText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FBBF24',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: stitchColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  greetingRow: {
    marginBottom: 20,
  },
  greetingText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 16,
    color: stitchColors.inkSoft,
  },
  greetingName: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greetingSub: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#A78BFA',
    marginTop: 2,
  },
  gridSection: {
    marginBottom: 18,
  },
  activeAppCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  activeAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeAppKicker: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
    letterSpacing: 0.8,
    flex: 1,
  },
  activeAppBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeAppBadgeText: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  activeAppJobTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activeAppCompany: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    marginBottom: 12,
  },
  activeAppCta: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
    paddingTop: 10,
  },
  activeAppCtaText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.emerald,
  },
  walletQuickBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E143E',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  walletKicker: {
    fontFamily: fontFamilies.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#C4B5FD',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  walletBalanceText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  walletRechargeBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
  },
  walletRechargeBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
