import React, { useCallback, useMemo } from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BookOpen, Upload } from 'lucide-react-native';
import { DocumentGridCard, ScreenMasthead, EmptyState, SecondaryButton, SiennaButton } from '../GlassComponents';
import type { CampusDocument } from '../../types';
import { stitchColors, stitchSpacing } from '../../theme/stitch';

interface LibraryScreenProps {
  ownedDocuments: CampusDocument[];
  onOpenDocument: (doc: CampusDocument) => void;
  onExplore?: () => void;
  hideHeader?: boolean;
  // Module 27: share PDF (+10 coins each) and follow their review.
  onSharePdfs?: () => void;
  onOpenContributions?: () => void;
}

function LibraryScreenBase({
  ownedDocuments,
  onOpenDocument,
  onExplore,
  hideHeader = false,
  onSharePdfs,
  onOpenContributions,
}: LibraryScreenProps) {
  const count = ownedDocuments.length;
  const { width } = useWindowDimensions();
  const numColumns = width >= 960 ? 4 : width >= 640 ? 3 : 2;
  const horizontalPad = stitchSpacing.containerMargin;
  const columnGap = 12;
  const effectiveContainerWidth = Math.min(width, 1040);
  const gridItemWidth = Math.max(
    120,
    Math.floor((effectiveContainerWidth - horizontalPad * 2 - columnGap * (numColumns - 1)) / numColumns),
  );

  const listHeader = useMemo(
    () => (
      <>
        {!hideHeader && (
          <View style={styles.headerPad}>
            <ScreenMasthead
              kicker="Ma Bibliothèque"
              title="Mes lectures"
              folio={`${count} PDF`}
              subtitle={
                count === 0
                  ? 'Vos documents acquis vous attendront ici.'
                  : `${count} document${count !== 1 ? 's' : ''} acqui${count !== 1 ? 's' : ''}, prêt${count !== 1 ? 's' : ''} à relire.`
              }
            />
          </View>
        )}

        {/* Outside the header: also shown in the Resources tab (hideHeader). */}
        {(onSharePdfs || onOpenContributions) && (
          <View style={styles.actions}>
            {onSharePdfs && (
              <SiennaButton
                label="Partager des PDF"
                icon={<Upload size={16} color={stitchColors.paper} />}
                onPress={onSharePdfs}
                style={styles.actionButton}
              />
            )}
            {onOpenContributions && (
              <SecondaryButton label="Mes contributions" onPress={onOpenContributions} style={styles.actionButton} />
            )}
          </View>
        )}
      </>
    ),
    [hideHeader, count, onSharePdfs, onOpenContributions],
  );

  const renderItem = useCallback(
    ({ item }: { item: CampusDocument }) => (
      <View style={{ width: gridItemWidth, marginBottom: 12 }}>
        <DocumentGridCard
          title={item.title}
          subtitle={item.subject}
          isOwned
          onPress={() => onOpenDocument(item)}
        />
      </View>
    ),
    [gridItemWidth, onOpenDocument],
  );

  return (
    <FlatList
      key={`library-grid-${numColumns}`}
      data={ownedDocuments}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <EmptyState
          icon={<BookOpen size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Bibliothèque vide"
          body="Télécharge des annales gratuites ou débloque des PDF pour les retrouver ici."
          ctaLabel={onExplore ? 'Explorer le catalogue' : undefined}
          onCta={onExplore}
        />
      }
      columnWrapperStyle={styles.gridRow}
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  listContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    paddingBottom: 120,
  },
  headerPad: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackMd,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackSm,
    paddingBottom: stitchSpacing.stackSm,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 135,
  },
  gridRow: {
    gap: 12,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackSm,
  },
});

export const LibraryScreen = React.memo(LibraryScreenBase);
