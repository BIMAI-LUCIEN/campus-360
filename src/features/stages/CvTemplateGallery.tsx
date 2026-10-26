import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Check } from 'lucide-react-native';
import { CV_TEMPLATES, type CvTemplateId } from './cvHtml';
import { fontFamilies, stitchColors, stitchRadius } from '../../theme/stitch';

// Pictures rendered from the real templates by mobile-api/scripts/render-cv-thumbnails.mjs.
const THUMBNAILS: Record<CvTemplateId, ImageSourcePropType> = {
  classic: require('../../../assets/cv-templates/classic.png'),
  prestige: require('../../../assets/cv-templates/prestige.png'),
  ingenieur: require('../../../assets/cv-templates/ingenieur.png'),
  etudiant: require('../../../assets/cv-templates/etudiant.png'),
};

interface CvTemplateGalleryProps {
  value: CvTemplateId;
  onChange: (template: CvTemplateId) => void;
  /** "grid": 2 columns of picture cards (first choice). "strip": one row of labels (switching later). */
  layout?: 'grid' | 'strip';
}

export function CvTemplateGallery({ value, onChange, layout = 'grid' }: CvTemplateGalleryProps) {
  const strip = layout === 'strip';
  return (
    <View style={strip ? styles.strip : styles.grid} accessibilityRole="radiogroup">
      {CV_TEMPLATES.map((t) => {
        const active = t.id === value;
        return (
          <Pressable
            key={t.id}
            testID={`cv-template-${t.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Modèle ${t.label} : ${t.description}`}
            onPress={() => onChange(t.id)}
            style={({ pressed }) => [
              strip ? styles.stripCard : styles.card,
              active && styles.cardActive,
              pressed && styles.cardPressed,
            ]}
          >
            {strip ? (
              <Text style={[styles.stripLabel, active && styles.labelActive]} numberOfLines={1}>{t.label}</Text>
            ) : (
              <>
                <View style={styles.thumbFrame}>
                  <Image source={THUMBNAILS[t.id]} style={styles.thumb} resizeMode="cover" />
                  {active && (
                    <View style={styles.checkBadge}>
                      <Check size={13} color={stitchColors.white} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{t.label}</Text>
                <Text style={styles.description} numberOfLines={2}>{t.description}</Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  strip: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    width: '48%',
    padding: 8,
    borderRadius: stitchRadius.md,
    borderWidth: 1.5,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.white,
  },
  stripCard: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: stitchRadius.full,
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
    backgroundColor: stitchColors.paperSoft,
  },
  thumb: {
    width: '100%',
    height: '100%',
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
  stripLabel: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 12,
    color: stitchColors.inkMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: stitchColors.primary,
  },
  description: {
    marginTop: 2,
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    lineHeight: 15,
    color: stitchColors.inkMuted,
    textAlign: 'center',
  },
});
