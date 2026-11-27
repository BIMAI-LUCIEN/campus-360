import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Check, RefreshCw, X } from 'lucide-react-native';
import {
  CV_TEMPLATE_CATEGORIES,
  type CvTemplateCategory,
  type CvTemplateDefinition,
  type CvTemplateId,
} from './cvHtml';
import { fetchCvTemplatesCatalog, getCurrentCvTemplates } from './cvTemplatesApi';
import { fontFamilies, stitchColors, stitchRadius } from '../../theme/stitch';

const BUNDLED_THUMBNAILS: Record<string, ImageSourcePropType> = {
  classic: require('../../../assets/cv-templates/classic.png'),
  prestige: require('../../../assets/cv-templates/prestige.png'),
  ingenieur: require('../../../assets/cv-templates/ingenieur.png'),
  etudiant: require('../../../assets/cv-templates/etudiant.png'),
  ats: require('../../../assets/cv-templates/ats.png'),
};

const CATEGORY_LABELS: Record<CvTemplateCategory, string> = {
  classique: 'Classique',
  moderne: 'Moderne',
  ats: 'ATS',
  creatif: 'Créatif',
  tech: 'Tech',
  academique: 'Académique',
};

/** Schematic A4 preview rendered from layoutFamily + themeConfig for new / DB-added designs without a bundled PNG. */
function TemplateSchematicThumb({ template }: { template: CvTemplateDefinition }) {
  const accent = template.themeConfig.accent || stitchColors.primary;
  const headerBg = template.themeConfig.headerBg || stitchColors.paperSoft;
  const sidebarBg = template.themeConfig.sidebarBg || stitchColors.paperSoft;
  const family = template.layoutFamily;

  const lines = (count: number, light = false) =>
    Array.from({ length: count }).map((_, idx) => (
      <View
        key={idx}
        style={[
          styles.lineBar,
          {
            width: idx === 0 ? '68%' : idx % 2 === 0 ? '92%' : '78%',
            backgroundColor: light ? stitchColors.outlineVariant : stitchColors.surfaceContainerHigh,
            opacity: light ? 0.55 : 0.9,
          },
        ]}
      />
    ));

  if (family === 'sidebar-left') {
    return (
      <View style={[styles.miniSheet, styles.miniRow]}>
        <View style={[styles.miniSide, { backgroundColor: sidebarBg }]}>
          <View style={[styles.miniAvatar, { backgroundColor: accent }]} />
          {lines(4, true)}
        </View>
        <View style={styles.miniMain}>
          <View style={[styles.miniTitleBar, { backgroundColor: accent }]} />
          {lines(3)}
          <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
          {lines(4)}
        </View>
      </View>
    );
  }

  if (family === 'sidebar-right') {
    return (
      <View style={[styles.miniSheet, styles.miniRow]}>
        <View style={styles.miniMain}>
          <View style={[styles.miniTitleBar, { backgroundColor: accent }]} />
          {lines(3)}
          <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
          {lines(4)}
        </View>
        <View style={[styles.miniSide, { backgroundColor: sidebarBg, borderLeftWidth: 2, borderLeftColor: accent }]}>
          <View style={[styles.miniAvatarRound, { borderColor: accent }]} />
          {lines(4)}
        </View>
      </View>
    );
  }

  if (family === 'banner-top' || family === 'executive-split' || family === 'timeline') {
    return (
      <View style={styles.miniSheet}>
        <View style={[styles.miniBanner, { backgroundColor: headerBg, borderBottomWidth: 2, borderBottomColor: accent }]}>
          <View style={[styles.miniTitleBar, { backgroundColor: accent, width: '55%' }]} />
          <View style={[styles.lineBar, { width: '75%', backgroundColor: stitchColors.outlineVariant, opacity: 0.7 }]} />
        </View>
        <View style={styles.miniBodyPad}>
          <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
          {lines(4)}
          <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
          {lines(3)}
        </View>
      </View>
    );
  }

  if (family === 'editorial') {
    return (
      <View style={[styles.miniSheet, styles.miniRow]}>
        <View style={[styles.miniStripe, { backgroundColor: accent }]} />
        <View style={styles.miniMain}>
          <View style={[styles.miniSoftHead, { backgroundColor: headerBg }]}>
            <View style={[styles.miniTitleBar, { backgroundColor: accent }]} />
            {lines(1)}
          </View>
          <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
          {lines(4)}
          <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
          {lines(3)}
        </View>
      </View>
    );
  }

  if (family === 'minimal-swiss') {
    return (
      <View style={styles.miniSheet}>
        <View style={[styles.miniTopRule, { backgroundColor: accent }]} />
        <View style={styles.miniBodyPad}>
          <View style={[styles.miniTitleBar, { backgroundColor: stitchColors.ink, width: '60%' }]} />
          <View style={[styles.lineBar, { width: '40%', backgroundColor: accent }]} />
          <View style={styles.miniSwissCols}>
            <View style={styles.miniSwissLeft}>{lines(5)}</View>
            <View style={styles.miniSwissRight}>{lines(6)}</View>
          </View>
        </View>
      </View>
    );
  }

  // ats-clean / compact-grid / classic
  return (
    <View style={styles.miniSheet}>
      <View style={styles.miniBodyPad}>
        <View style={[styles.miniTitleBar, { backgroundColor: accent, width: '64%' }]} />
        {lines(2)}
        <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
        {lines(4)}
        <View style={[styles.miniSecBar, { backgroundColor: accent }]} />
        {lines(4)}
      </View>
    </View>
  );
}

export interface CvTemplatePickerModalProps {
  visible: boolean;
  value: CvTemplateId;
  onSelect: (templateId: CvTemplateId) => void;
  onClose: () => void;
}

export function CvTemplatePickerModal({ visible, value, onSelect, onClose }: CvTemplatePickerModalProps) {
  const [templates, setTemplates] = useState<CvTemplateDefinition[]>(() => getCurrentCvTemplates());
  const [category, setCategory] = useState<'tous' | CvTemplateCategory>('tous');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'db' | 'cache' | 'fallback'>('fallback');

  const refreshCatalog = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const result = await fetchCvTemplatesCatalog({ forceRefresh });
      setTemplates(result.templates);
      setSource(result.source);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void refreshCatalog(false);
  }, [visible]);

  const filtered = useMemo(
    () => (category === 'tous' ? templates : templates.filter((t) => t.category === category)),
    [templates, category],
  );

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet} testID="cv-template-picker-modal">
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Choisis ton design de CV</Text>
              <Text style={styles.subtitle}>
                {templates.length} modèles disponibles · modifiable avant l’envoi
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                testID="cv-template-picker-refresh"
                onPress={() => void refreshCatalog(true)}
                disabled={loading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Actualiser les modèles"
                style={styles.iconBtn}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={stitchColors.primary} />
                ) : (
                  <RefreshCw size={16} color={stitchColors.inkMuted} />
                )}
              </Pressable>
              <Pressable
                testID="cv-template-picker-close"
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fermer la galerie des designs"
                style={styles.iconBtn}
              >
                <X size={18} color={stitchColors.ink} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {CV_TEMPLATE_CATEGORIES.map((cat) => {
              const active = cat.id === category;
              return (
                <Pressable
                  key={cat.id}
                  testID={`cv-cat-${cat.id}`}
                  onPress={() => setCategory(cat.id)}
                  style={[styles.catChip, active && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {source !== 'db' && !loading ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                Catalogue intégré chargé ({templates.length} designs prêts hors ligne).
              </Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.gridWrap} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Aucun design dans cette catégorie pour l’instant.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filtered.map((t) => {
                  const active = t.id === value;
                  const bundled = BUNDLED_THUMBNAILS[t.id];
                  const remote = !bundled && t.thumbnailUrl ? { uri: t.thumbnailUrl } : null;
                  return (
                    <Pressable
                      key={t.id}
                      testID={`cv-template-${t.id}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Modèle ${t.label} : ${t.description}`}
                      onPress={() => {
                        onSelect(t.id);
                        onClose();
                      }}
                      style={({ pressed }) => [
                        styles.card,
                        active && styles.cardActive,
                        pressed && styles.cardPressed,
                      ]}
                    >
                      <View style={styles.thumbFrame}>
                        {bundled || remote ? (
                          <Image source={bundled ?? remote!} style={styles.thumb} resizeMode="cover" />
                        ) : (
                          <TemplateSchematicThumb template={t} />
                        )}
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{CATEGORY_LABELS[t.category]}</Text>
                        </View>
                        {active ? (
                          <View style={styles.checkBadge}>
                            <Check size={13} color={stitchColors.white} strokeWidth={3} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                        {t.label}
                      </Text>
                      <Text style={styles.description} numberOfLines={2}>
                        {t.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: stitchColors.glassOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '88%',
    backgroundColor: stitchColors.white,
    borderTopLeftRadius: stitchRadius.xl,
    borderTopRightRadius: stitchRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.outlineVariant,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 18,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.paperSoft,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.white,
  },
  catChipActive: {
    borderColor: stitchColors.primary,
    backgroundColor: stitchColors.siennaBg,
  },
  catChipText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
  },
  catChipTextActive: {
    color: stitchColors.primary,
  },
  offlineBanner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: stitchColors.paperSoft,
  },
  offlineText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
  },
  gridWrap: {
    padding: 16,
    paddingBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13.5,
    color: stitchColors.inkMuted,
  },
  card: {
    width: '48%',
    padding: 8,
    borderRadius: stitchRadius.md,
    borderWidth: 1.5,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.white,
  },
  cardActive: {
    borderColor: stitchColors.primary,
    backgroundColor: stitchColors.siennaBg,
  },
  cardPressed: {
    opacity: 0.85,
  },
  thumbFrame: {
    width: '100%',
    aspectRatio: 210 / 297,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.white,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  catBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: stitchColors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: stitchColors.outlineVariant,
  },
  catBadgeText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 9.5,
    color: stitchColors.inkSoft,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.primary,
  },
  label: {
    marginTop: 6,
    fontFamily: fontFamilies.interSemi,
    fontSize: 13,
    color: stitchColors.ink,
    textAlign: 'center',
  },
  labelActive: {
    color: stitchColors.primary,
  },
  description: {
    marginTop: 2,
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    lineHeight: 14.5,
    color: stitchColors.inkMuted,
    textAlign: 'center',
  },
  // Miniature schematic preview styles
  miniSheet: {
    flex: 1,
    backgroundColor: stitchColors.white,
  },
  miniRow: {
    flexDirection: 'row',
  },
  miniSide: {
    width: '34%',
    padding: 8,
    gap: 5,
  },
  miniMain: {
    flex: 1,
    padding: 8,
    gap: 4,
  },
  miniStripe: {
    width: 7,
  },
  miniTopRule: {
    height: 4,
    width: '100%',
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 4,
  },
  miniAvatarRound: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignSelf: 'center',
    marginBottom: 4,
    backgroundColor: stitchColors.paperSoft,
  },
  miniBanner: {
    padding: 9,
    gap: 4,
  },
  miniSoftHead: {
    padding: 6,
    borderRadius: 4,
    gap: 3,
    marginBottom: 4,
  },
  miniBodyPad: {
    flex: 1,
    padding: 8,
    gap: 4,
  },
  miniTitleBar: {
    height: 7,
    borderRadius: 3,
    width: '72%',
  },
  miniSecBar: {
    height: 4,
    borderRadius: 2,
    width: '44%',
    marginTop: 5,
    marginBottom: 2,
  },
  lineBar: {
    height: 3.5,
    borderRadius: 2,
  },
  miniSwissCols: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flex: 1,
  },
  miniSwissLeft: {
    width: '34%',
    gap: 4,
  },
  miniSwissRight: {
    flex: 1,
    gap: 4,
  },
});
