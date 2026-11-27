import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, LayoutTemplate } from 'lucide-react-native';
import { findCvTemplate, getRegisteredCvTemplates, type CvTemplateId } from './cvHtml';
import { CvTemplatePickerModal } from './CvTemplatePickerModal';
import { fontFamilies, stitchColors, stitchRadius } from '../../theme/stitch';

export interface CvTemplatePickerButtonProps {
  value: CvTemplateId;
  onChange: (templateId: CvTemplateId) => void;
  label?: string;
  compact?: boolean;
  testID?: string;
}

/**
 * Compact button replacing the inline CV template grid: shows the active design
 * and opens CvTemplatePickerModal with all 15+ DB-backed designs on tap.
 */
export function CvTemplatePickerButton({
  value,
  onChange,
  label = 'Design du CV',
  compact = false,
  testID = 'btn-open-cv-templates',
}: CvTemplatePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const active = findCvTemplate(value);
  const count = getRegisteredCvTemplates().length;

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${active.label}. Appuie pour voir les ${count} designs.`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          compact && styles.buttonCompact,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.iconBox}>
          <LayoutTemplate size={compact ? 16 : 18} color={stitchColors.primary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.caption} numberOfLines={1}>
            {label} · {count} modèles
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {active.label}
          </Text>
          {!compact ? (
            <Text style={styles.desc} numberOfLines={1}>
              {active.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.actionPill}>
          <Text style={styles.actionText}>Changer</Text>
          <ChevronRight size={14} color={stitchColors.primary} />
        </View>
      </Pressable>
      <CvTemplatePickerModal
        visible={open}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: stitchRadius.md,
    borderWidth: 1.5,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.white,
  },
  buttonCompact: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.86,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: stitchColors.siennaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  caption: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
  },
  value: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 14.5,
    color: stitchColors.ink,
    marginTop: 1,
  },
  desc: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    marginTop: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.siennaBg,
  },
  actionText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 12,
    color: stitchColors.primary,
  },
});
