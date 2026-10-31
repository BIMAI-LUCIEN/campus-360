import React from 'react';
import { StyleSheet, View } from 'react-native';
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

export function LibraryScreen({
  ownedDocuments,
  onOpenDocument,
  onExplore,
  hideHeader = false,
  onSharePdfs,
  onOpenContributions,
}: LibraryScreenProps) {
  const count = ownedDocuments.length;

  return (
    <View style={styles.container}>
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

      {count === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Bibliothèque vide"
          body="Télécharge des annales gratuites ou débloque des PDF pour les retrouver ici."
          ctaLabel={onExplore ? 'Explorer le catalogue' : undefined}
          onCta={onExplore}
        />
      ) : (
        <View style={styles.gridContent}>
          {ownedDocuments.map((item) => (
            <View key={item.id} style={styles.gridItemWrapper}>
              <DocumentGridCard
                title={item.title}
                subtitle={item.subject}
                isOwned
                onPress={() => onOpenDocument(item)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
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
  },
  actionButton: {
    flexGrow: 1,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackSm,
    paddingBottom: 24,
  },
  gridItemWrapper: {
    width: '47.8%',
  },
});
