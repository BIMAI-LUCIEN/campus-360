import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamilies, stitchColors } from '../../theme/stitch';
import type { ContributionStatus } from './contributionsApi';

// Status chip shared by "Partager des PDF" and "Mes contributions" (Module 27).
const LOOK: Record<ContributionStatus, { label: string; bg: string; ink: string }> = {
  analyzing: { label: 'En analyse', bg: stitchColors.siennaBg, ink: stitchColors.sienna },
  ready: { label: 'En attente de validation', bg: stitchColors.warningBg, ink: stitchColors.warningDeep },
  pending_review: { label: 'En attente de validation', bg: stitchColors.warningBg, ink: stitchColors.warningDeep },
  probable_duplicate: { label: 'En attente de validation', bg: stitchColors.warningBg, ink: stitchColors.warningDeep },
  published: { label: 'Publié · +10 coins', bg: stitchColors.emeraldBg, ink: stitchColors.emeraldDeep },
  rejected: { label: 'Refusé', bg: stitchColors.errorBg, ink: stitchColors.error },
  duplicate: { label: 'Déjà disponible', bg: stitchColors.paperSoft, ink: stitchColors.inkMuted },
};

export function ContributionStatusChip({ status }: { status: ContributionStatus }) {
  const look = LOOK[status];
  return (
    <View style={[styles.chip, { backgroundColor: look.bg }]}>
      <Text style={[styles.text, { color: look.ink }]}>{look.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: fontFamilies.interSemi, fontSize: 12 },
});
