import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Search, Package } from 'lucide-react-native';
import {
  GlassInput,
  GlassPill,
  DocumentGridCard,
  PackCard,
  ScreenMasthead,
  EmptyState,
} from '../GlassComponents';
import type { CampusDocument, CampusPdfPack } from '../../types';
import {
  stitchColors,
  stitchSpacing,
  stitchRadius,
  stitchTypography,
} from '../../theme/stitch';

const formatCoins = (value: number) =>
  new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value);

const FILTER_PILLS = ['Tous', 'Informatique', 'Mathématiques', 'Droit', 'Sciences Eco', 'Médecine', 'Physique', 'Autre'];

interface ExploreScreenProps {
  documents: CampusDocument[];
  packs: CampusPdfPack[];
  purchasedDocumentIds: string[];
  loading: boolean;
  error: string;
  onBuyDocument: (doc: CampusDocument) => void;
  onBuyPack: (pack: CampusPdfPack) => void;
  purchasingDocumentId: string | null;
  purchasingPackId: string | null;
  onRefresh: () => void;
}

export function ExploreScreen({
  documents,
  packs,
  purchasedDocumentIds,
  loading,
  error,
  onBuyDocument,
  onBuyPack,
  onRefresh,
}: ExploreScreenProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredDocs = documents.filter((doc) => {
    const matchesQuery =
      !query ||
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.subject.toLowerCase().includes(query.toLowerCase()) ||
      doc.university.toLowerCase().includes(query.toLowerCase());

    const matchesFilter =
      activeFilter === 'Tous' ||
      doc.subject.toLowerCase().includes(activeFilter.toLowerCase()) ||
      doc.faculty.toLowerCase().includes(activeFilter.toLowerCase());

    return matchesQuery && matchesFilter;
  });

  const filteredPacks = packs.filter((pack) => {
    return (
      !query ||
      pack.title.toLowerCase().includes(query.toLowerCase()) ||
      pack.description?.toLowerCase().includes(query.toLowerCase())
    );
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={stitchColors.sienna} />
        <Text style={styles.loadingText}>Chargement du catalogue…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon={<Search size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Catalogue indisponible"
          body={error}
          ctaLabel="Réessayer"
          onCta={onRefresh}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerPad}>
        <ScreenMasthead
          kicker="Le Catalogue"
          title="Explorer"
          folio={`${documents.length} PDF`}
          subtitle="Cours, TD et annales d'examens."
        />
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <GlassInput
          value={query}
          onChangeText={setQuery}
          placeholder="Université, matière, niveau…"
          style={{ flex: 1 }}
          rightIcon={<Search size={18} color={stitchColors.inkSubtle} />}
        />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_PILLS.map((pill) => (
          <GlassPill
            key={pill}
            label={pill}
            active={activeFilter === pill}
            onPress={() => setActiveFilter(pill)}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>

      {/* Count + PDF/Pack toggle */}
      <View style={styles.viewToggle}>
        <Text style={styles.resultCount}>
          {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} · {filteredPacks.length} pack{filteredPacks.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.toggleBtns}>
          <Pressable
            onPress={() => setViewMode('grid')}
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, viewMode === 'grid' && styles.toggleBtnTextActive]}>PDF</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>Packs</Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'grid' ? (
        filteredDocs.length === 0 ? (
          <EmptyState
            icon={<Search size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
            title="Aucun résultat"
            body="Essaie d'autres mots-clés ou change de filtre."
          />
        ) : (
          <View style={styles.gridContent}>
            {filteredDocs.map((item) => {
              const isOwned = purchasedDocumentIds.includes(item.id);
              return (
                <View key={item.id} style={styles.gridItemWrapper}>
                  <DocumentGridCard
                    title={item.title}
                    subtitle={item.subject}
                    price={isOwned ? undefined : `${formatCoins(item.price)} C`}
                    isOwned={isOwned}
                    onPress={() => onBuyDocument(item)}
                  />
                </View>
              );
            })}
          </View>
        )
      ) : filteredPacks.length === 0 ? (
        <EmptyState
          icon={<Package size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Aucun pack"
          body="Les bundles à prix réduit apparaîtront ici."
        />
      ) : (
        <View style={styles.packListContent}>
          {filteredPacks.map((item) => (
            <View key={item.id} style={{ marginBottom: 16 }}>
              <PackCard
                title={item.title}
                description={item.description ?? ''}
                price={`${formatCoins(item.price)} C`}
                documentCount={item.documentCount}
                discountPercent={item.discountPercent}
                tag={item.packType === 'exam_prep' ? 'Examen' : 'Pack'}
                onPress={() => onBuyPack(item)}
                onBuy={() => onBuyPack(item)}
                style={{ width: '100%' }}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.background,
    gap: 12,
    paddingTop: 80,
  },
  loadingText: {
    ...stitchTypography.bodyMd,
    color: stitchColors.inkMuted,
  },
  headerPad: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackMd,
  },
  searchSection: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingBottom: stitchSpacing.stackSm,
  },
  filterRow: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingBottom: stitchSpacing.stackSm,
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingVertical: stitchSpacing.stackSm,
  },
  resultCount: {
    ...stitchTypography.labelSm,
    color: stitchColors.inkMuted,
  },
  toggleBtns: {
    flexDirection: 'row',
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  toggleBtnText: {
    ...stitchTypography.labelSm,
    color: '#94A3B8',
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
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
  packListContent: {
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: stitchSpacing.stackSm,
    paddingBottom: 160,
  },
});
