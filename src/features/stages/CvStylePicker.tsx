import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { stitchColors } from '../../theme/stitch';
import { CV_ACCENTS, CV_FONTS, CV_SPACINGS, type CvStyle } from './cvHtml';

type Option = { id: string; label: string };

function Row({ title, options, value, onPick, testPrefix }: { title: string; options: readonly Option[]; value: string; onPick: (id: string) => void; testPrefix: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((o) => (
          <Pressable
            key={o.id}
            testID={`${testPrefix}-${o.id}`}
            accessibilityState={{ selected: o.id === value }}
            onPress={() => onPick(o.id)}
            style={[styles.chip, o.id === value && styles.chipOn]}
          >
            <Text style={[styles.chipText, o.id === value && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Accent colour, font and line spacing of the CV, applied to the preview and the PDF. */
export function CvStylePicker({ value, onChange }: { value: CvStyle; onChange: (style: CvStyle) => void }) {
  return (
    <View style={styles.root}>
      <Row title="Couleur" testPrefix="cv-style-accent" options={CV_ACCENTS} value={value.accent ?? 'modele'} onPick={(id) => onChange({ ...value, accent: id as CvStyle['accent'] })} />
      <Row title="Police" testPrefix="cv-style-font" options={CV_FONTS} value={value.police ?? 'modele'} onPick={(id) => onChange({ ...value, police: id as CvStyle['police'] })} />
      <Row title="Interligne" testPrefix="cv-style-spacing" options={CV_SPACINGS} value={value.interligne ?? 'normal'} onPick={(id) => onChange({ ...value, interligne: id as CvStyle['interligne'] })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingHorizontal: 16, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { width: 70, fontSize: 12, fontWeight: '700', color: stitchColors.inkMuted },
  chips: { gap: 6 },
  chip: { paddingHorizontal: 10, minHeight: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh },
  chipOn: { borderColor: stitchColors.primary, backgroundColor: stitchColors.primaryContainer },
  chipText: { fontSize: 12, color: stitchColors.ink },
  chipTextOn: { color: stitchColors.primary, fontWeight: '700' },
});
