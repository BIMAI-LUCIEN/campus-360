import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { DocumentGridCard, ScreenMasthead, EmptyState } from '../GlassComponents';
import type { CampusDocument } from '../../types';
import { stitchColors, stitchSpacing } from '../../theme/stitch';

interface LibraryScreenProps {
  ownedDocuments: CampusDocument[];
  onOpenDocument: (doc: CampusDocument) => void;
  onExplore?: () => void;
  hideHeader?: boolean;
}

export function LibraryScreen({
  ownedDocuments,
  onOpenDocument,
  onExplore,
  hideHeader = false,
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

      {count === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Bibliothèque vide"
          body="Achète des PDF ou souscris à un abonnement pour les retrouver ici."
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
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackSm,
    paddingBottom: 160,
  },
  gridItemWrapper: {
    width: '31%',
  },
});
