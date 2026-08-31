import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Plus, FileText } from 'lucide-react-native';
import { DocumentGridCard, ScreenMasthead, EmptyState } from '../GlassComponents';
import type { CampusDocument } from '../../types';
import {
  stitchColors,
  stitchSpacing,
  stitchTypography,
} from '../../theme/stitch';

interface DocumentsScreenProps {
  documents: CampusDocument[];
  loading: boolean;
  onEditDocument: (id: string) => void;
  onNewDocument: () => void;
}

export function DocumentsScreen({
  documents,
  loading,
  onEditDocument,
  onNewDocument,
}: DocumentsScreenProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={stitchColors.sienna} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  const count = documents.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerPad}>
        <ScreenMasthead
          kicker="L'Atelier"
          title="Mes documents"
          folio={`${count} rédigé${count !== 1 ? 's' : ''}`}
          subtitle="CV, lettres, rapports et mémoires — rédigés et mis en forme ici."
        />
      </View>

      {count === 0 ? (
        <EmptyState
          icon={<FileText size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Le tiroir est vide"
          body="Rédige ton premier document — CV, lettre ou rapport — pour le retrouver ici."
          ctaLabel="Nouveau document"
          onCta={onNewDocument}
        />
      ) : (
        <View style={styles.gridContent}>
          {documents.map((item) => (
            <View key={item.id} style={styles.gridItemWrapper}>
              <DocumentGridCard
                title={item.title}
                subtitle={`${item.pageCount} page${item.pageCount !== 1 ? 's' : ''}`}
                isOwned
                onPress={() => onEditDocument(item.id)}
              />
            </View>
          ))}
        </View>
      )}

      {/* FAB — solid ink, no colored glow (respects the no-shadow system) */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
        ]}
        onPress={onNewDocument}
        accessibilityLabel="Nouveau document"
      >
        <Plus size={24} color={stitchColors.paper} strokeWidth={2.25} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.background,
    gap: 12,
  },
  loadingText: {
    ...stitchTypography.bodyMd,
    color: stitchColors.inkMuted,
  },
  headerPad: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackMd,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackSm,
    paddingBottom: 160,
  },
  gridItemWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    right: stitchSpacing.containerMargin,
    bottom: stitchSpacing.containerMargin + 60,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: stitchColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});
