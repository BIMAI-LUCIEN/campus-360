import React from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Upload } from 'lucide-react-native';

import { EmptyState, SiennaButton } from '../../ui/GlassComponents';
import { fontFamilies, stitchColors, stitchRadius, stitchSpacing } from '../../theme/stitch';
import { ContributionStatusChip } from './ContributionStatus';
import { listContributions, type Contribution } from './contributionsApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  // Refreshes the wallet: a review may have credited coins meanwhile.
  onRefreshAccount?: () => void;
};

// "Mes contributions" (Module 27): the PDF the student shared and their status.
export function MyContributionsScreen({ visible, onClose, onShare, onRefreshAccount }: Props) {
  const [items, setItems] = React.useState<Contribution[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setItems(await listContributions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    }
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    setItems(null);
    void load();
    onRefreshAccount?.();
  }, [visible, load, onRefreshAccount]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    onRefreshAccount?.();
    setRefreshing(false);
  };

  const earned = (items ?? []).filter((i) => i.status === 'published').length * 10;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Retour">
            <ArrowLeft size={22} color={stitchColors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Mes contributions</Text>
            {items && items.length > 0 && <Text style={styles.subtitle}>{earned} coins gagnés grâce à tes PDF</Text>}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={stitchColors.sienna} />}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <SiennaButton label="Réessayer" onPress={() => void load()} />
            </View>
          ) : items === null ? (
            <ActivityIndicator color={stitchColors.sienna} style={{ marginTop: stitchSpacing.stackLg }} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Upload size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
              title="Aucune contribution"
              body="Partagez vos premiers PDF et gagnez 10 coins par document publié."
              ctaLabel="Partager des PDF"
              onCta={onShare}
            />
          ) : (
            <>
              <SiennaButton label="Partager d’autres PDF" icon={<Upload size={18} color={stitchColors.paper} />} onPress={onShare} fluid />
              {items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.sheet?.title || item.originalName}
                  </Text>
                  <ContributionStatusChip status={item.status} />
                  {item.status === 'duplicate' && item.duplicateOf?.title && (
                    <Text style={styles.note}>Déjà disponible : « {item.duplicateOf.title} ».</Text>
                  )}
                  {item.status === 'rejected' && item.rejectReason && <Text style={styles.note}>Motif : {item.rejectReason}</Text>}
                  <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('fr-FR')}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: stitchColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackLg,
    paddingBottom: stitchSpacing.stackMd,
  },
  title: { fontFamily: fontFamilies.display, fontSize: 22, color: stitchColors.ink },
  subtitle: { fontFamily: fontFamilies.interMedium, fontSize: 13, color: stitchColors.emeraldDeep, marginTop: 2 },
  body: { paddingHorizontal: stitchSpacing.containerMargin, paddingBottom: stitchSpacing.stackLg, gap: 12 },
  card: {
    gap: 8,
    padding: 14,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.paper,
  },
  cardTitle: { fontFamily: fontFamilies.interSemi, fontSize: 15, color: stitchColors.ink },
  note: { fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 19, color: stitchColors.inkMuted },
  date: { fontFamily: fontFamilies.inter, fontSize: 12, color: stitchColors.inkSubtle },
  errorBox: { gap: 12, padding: 16, borderRadius: stitchRadius.md, backgroundColor: stitchColors.errorBg },
  errorText: { fontFamily: fontFamilies.interMedium, fontSize: 14, color: stitchColors.error },
});
