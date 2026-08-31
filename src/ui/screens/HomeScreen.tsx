import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Search, FileText, Sparkles, Wallet, BookOpen, Crown, type LucideIcon } from 'lucide-react-native';
import {
  WalletCard,
  PackCard,
  TransactionRow,
  GlassCard,
  SectionHeading,
  GradientText,
} from '../GlassComponents';
import type { CampusPdfPack, Transaction, CampusDocument } from '../../types';
import {
  stitchColors,
  stitchSpacing,
  stitchTypography,
  fontFamilies,
} from '../../theme/stitch';

const formatCoins = (value: number) =>
  new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value);

interface HomeScreenProps {
  studentName: string | undefined;
  balance: number;
  iaCredits: number;
  transactions: Transaction[];
  homePacks: CampusPdfPack[];
  ownedDocuments: CampusDocument[];
  onRecharge: () => void;
  onExplore: () => void;
  onBuyPack: (pack: CampusPdfPack) => void;
  purchasingPackId: string | null;
  onDocuments?: () => void;
  onLibrary?: () => void;
  onPremium?: () => void;
}

interface QuickAction {
  key: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  tint: string;
  onPress?: () => void;
}

function QuickTile({ action }: { action: QuickAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={[styles.tileIcon, { backgroundColor: action.tint }]}>
        <action.Icon size={20} color={action.color} strokeWidth={2} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>{action.label}</Text>
    </Pressable>
  );
}

export function HomeScreen({
  studentName,
  balance,
  iaCredits,
  transactions,
  homePacks,
  ownedDocuments,
  onRecharge,
  onExplore,
  onBuyPack,
  onDocuments,
  onLibrary,
  onPremium,
}: HomeScreenProps) {
  const firstName = studentName?.split(' ')[0] ?? 'Étudiant';

  const actions: QuickAction[] = [
    { key: 'explore', label: 'Explorer', Icon: Search, color: '#60A5FA', tint: 'rgba(96,165,250,0.16)', onPress: onExplore },
    { key: 'write', label: 'Rédiger', Icon: FileText, color: '#F472B6', tint: 'rgba(244,114,182,0.16)', onPress: onDocuments },
    { key: 'ia', label: 'Assistant IA', Icon: Sparkles, color: '#A855F7', tint: 'rgba(168,85,247,0.16)', onPress: onExplore },
    { key: 'recharge', label: 'Recharger', Icon: Wallet, color: '#FBBF24', tint: 'rgba(251,191,36,0.16)', onPress: onRecharge },
    { key: 'library', label: 'Mes PDF', Icon: BookOpen, color: '#34D399', tint: 'rgba(52,211,153,0.16)', onPress: onLibrary },
    { key: 'premium', label: 'Premium', Icon: Crown, color: '#38BDF8', tint: 'rgba(56,189,248,0.16)', onPress: onPremium },
  ];

  return (
    <View style={styles.container}>
      {/* Greeting */}
      <View style={styles.hero}>
        <Text style={styles.heroGreeting}>Bonjour, {firstName}</Text>
        <GradientText text="Que veux-tu apprendre ?" size={27} weight="700" style={styles.heroQuestion} />
      </View>

      {/* Wallet */}
      <WalletCard
        balance={balance}
        iaCredits={iaCredits}
        formatCoins={formatCoins}
        onRecharge={onRecharge}
      />

      {/* Quick actions — icon tile grid (reference layout) */}
      <View style={styles.section}>
        <Text style={styles.blockTitle}>Actions rapides</Text>
        <View style={styles.tileGrid}>
          {actions.map((a) => (
            <QuickTile key={a.key} action={a} />
          ))}
        </View>
      </View>

      {/* Pour toi — horizontal packs */}
      <View style={styles.section}>
        <SectionHeading kicker="Sélection" title="Pour toi" actionLabel="Tout voir" onAction={onExplore} />
        {homePacks.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packScrollContent}>
            {homePacks.slice(0, 5).map((pack) => (
              <PackCard
                key={pack.id}
                title={pack.title}
                description={pack.description ?? ''}
                price={`${formatCoins(pack.price)} C`}
                documentCount={pack.documentCount}
                discountPercent={pack.discountPercent}
                tag={pack.packType === 'exam_prep' ? 'Examen' : pack.packType === 'semester' ? 'Semestre' : 'Pack'}
                onPress={onExplore}
                onBuy={() => onBuyPack(pack)}
                style={{ marginRight: 12 }}
              />
            ))}
          </ScrollView>
        ) : (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyInline}>Aucun pack disponible pour le moment.</Text>
          </GlassCard>
        )}
      </View>

      {/* Récemment — activity */}
      <View style={styles.section}>
        <SectionHeading kicker="Activité" title="Récemment" />
        <GlassCard style={{ padding: 8, paddingHorizontal: 16 }}>
          {transactions.length > 0 ? (
            transactions.slice(0, 4).map((tx) => (
              <TransactionRow
                key={tx.id}
                label={tx.label}
                date={tx.date}
                amount={tx.amount}
                type={tx.type}
                formatCoins={formatCoins}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyInline}>Aucune activité récente.</Text>
              <Text style={styles.emptySubtext}>Tes achats et recharges apparaîtront ici.</Text>
            </View>
          )}
        </GlassCard>
      </View>

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
  hero: {
    marginBottom: 24,
  },
  heroGreeting: {
    fontFamily: fontFamilies.inter,
    fontSize: 15,
    color: stitchColors.inkMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  heroQuestion: {
    height: 38,
  },
  section: {
    marginTop: 28,
  },
  blockTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 18,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  // Quick-action tiles
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '31%',
    backgroundColor: stitchColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 10,
  },
  tilePressed: {
    backgroundColor: stitchColors.surfaceContainerHigh,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.ink,
    textAlign: 'center',
  },
  packScrollContent: {
    paddingRight: stitchSpacing.containerMargin,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyInline: {
    ...stitchTypography.bodyMd,
    color: stitchColors.inkMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    ...stitchTypography.labelSm,
    color: stitchColors.inkSubtle,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyActivity: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
});
