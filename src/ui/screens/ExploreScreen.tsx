import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  SearchFilterBar,
  TrustBadgeStrip,
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
  purchasingDocumentId?: string | null;
  purchasingPackId?: string | null;
  onRefresh: () => void;
  hideHeader?: boolean;
}

function ExploreScreenBase({
  documents,
  packs,
  purchasedDocumentIds,
  loading,
  error,
  onBuyDocument,
  onBuyPack,
  onRefresh,
  hideHeader = false,
}: ExploreScreenProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { width } = useWindowDimensions();

  const numColumns = width >= 960 ? 4 : width >= 640 ? 3 : 2;
  const horizontalPad = stitchSpacing.containerMargin;
  const columnGap = 12;
  const effectiveContainerWidth = Math.min(width, 1040);
  const gridItemWidth = Math.max(
    120,
    Math.floor((effectiveContainerWidth - horizontalPad * 2 - columnGap * (numColumns - 1)) / numColumns),
  );

  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) => {
        const q = query.toLowerCase();
        const matchesQuery =
          !q ||
          doc.title.toLowerCase().includes(q) ||
          doc.subject.toLowerCase().includes(q) ||
          doc.university.toLowerCase().includes(q);

        const matchesFilter =
          activeFilter === 'Tous' ||
          doc.subject.toLowerCase().includes(activeFilter.toLowerCase()) ||
          doc.faculty.toLowerCase().includes(activeFilter.toLowerCase());

        return matchesQuery && matchesFilter;
      }),
    [documents, query, activeFilter],
  );

  const filteredPacks = useMemo(
    () =>
      packs.filter((pack) => {
        const q = query.toLowerCase();
        return (
          !q ||
          pack.title.toLowerCase().includes(q) ||
          pack.description?.toLowerCase().includes(q)
        );
      }),
    [packs, query],
  );

  const ownedSet = useMemo(() => new Set(purchasedDocumentIds), [purchasedDocumentIds]);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeaderWrap}>
        {!hideHeader && (
          <View style={styles.headerPad}>
            <ScreenMasthead
              kicker="Le Catalogue"
              title="Explorer"
              folio={`${documents.length} PDF`}
              subtitle="Cours, TD et annales d'examens."
            />
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchSection, hideHeader && { paddingTop: 12 }]}>
          <SearchFilterBar
            value={query}
            onChangeText={setQuery}
            placeholder="Université, matière, niveau…"
            style={{ paddingHorizontal: 0, marginBottom: 0 }}
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
      </View>
    ),
    [hideHeader, documents.length, query, activeFilter, filteredDocs.length, filteredPacks.length, viewMode],
  );

  const renderDocItem = useCallback(
    ({ item }: { item: CampusDocument }) => {
      const isOwned = ownedSet.has(item.id);
      return (
        <View style={{ width: gridItemWidth, marginBottom: 12 }}>
          <DocumentGridCard
            title={item.title}
            subtitle={item.subject}
            price={isOwned ? undefined : `${formatCoins(item.price)} C`}
            isOwned={isOwned}
            onPress={() => onBuyDocument(item)}
          />
        </View>
      );
    },
    [gridItemWidth, ownedSet, onBuyDocument],
  );

  const renderPackItem = useCallback(
    ({ item }: { item: CampusPdfPack }) => (
      <View style={styles.packItemWrap}>
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
    ),
    [onBuyPack],
  );

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

  if (viewMode === 'grid') {
    return (
      <FlatList
        key={`explore-grid-${numColumns}`}
        data={filteredDocs}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={renderDocItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Search size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
            title="Aucun résultat"
            body="Essaie d'autres mots-clés ou change de filtre."
          />
        }
        columnWrapperStyle={styles.gridRow}
        style={styles.container}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[stitchColors.primary]} />
        }
      />
    );
  }

  return (
    <FlatList
      key="explore-packs"
      data={filteredPacks}
      keyExtractor={(item) => item.id}
      renderItem={renderPackItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <EmptyState
          icon={<Package size={26} color={stitchColors.inkSubtle} strokeWidth={1.5} />}
          title="Aucun pack"
          body="Les bundles à prix réduit apparaîtront ici."
        />
      }
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[stitchColors.primary]} />
      }
    />
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
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: stitchColors.primary,
  },
  toggleBtnText: {
    ...stitchTypography.labelSm,
    color: stitchColors.inkMuted,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: stitchColors.white,
  },
  listHeaderWrap: {
    width: '100%',
  },
  listContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    paddingBottom: 120,
  },
  gridRow: {
    gap: 12,
    paddingHorizontal: stitchSpacing.containerMargin,
  },
  packItemWrap: {
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 16,
  },
});

export const ExploreScreen = React.memo(ExploreScreenBase);
