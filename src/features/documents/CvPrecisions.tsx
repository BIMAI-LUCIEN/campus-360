import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { stitchColors } from '../../theme/stitch';
import type { PrecisionQuestion } from './cvJuryApi';

const PLACEHOLDERS: Record<PrecisionQuestion['cible'], string> = {
  experience: 'Ex. 40 factures par semaine, pendant 3 mois',
  disponibilite: 'Ex. dès juin 2026, 3 mois, temps plein',
  langue: 'Ex. anglais B2, français C1',
  ville: 'Ex. Douala, mobile à Yaoundé',
  lien: 'https://linkedin.com/in/ton-profil',
  autre: 'Ta réponse',
};

/**
 * Step "Précisions" before the CV is written (module 36): questions written by
 * the AI from the reference CV and the offer, all optional. What the student
 * types is his own words: numbers only come from here, never from the AI.
 */
export function CvPrecisions({
  questions,
  answers,
  onChangeAnswer,
  loading,
  error,
  fallback,
  onRetry,
  onSkip,
  onSubmit,
}: {
  questions: PrecisionQuestion[];
  answers: Record<string, string>;
  onChangeAnswer: (id: string, value: string) => void;
  loading: boolean;
  error: string | null;
  fallback: boolean;
  onRetry: () => void;
  onSkip: () => void;
  onSubmit: () => void;
}) {
  const answered = questions.some((q) => (answers[q.id] || '').trim());
  return (
    <ScrollView testID="cv-precisions" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Quelques précisions avant de rédiger</Text>
      <Text style={styles.hint}>
        Le jury rejette un CV sans chiffres, sans résultat ni disponibilité. Réponds avec tes mots à ce que tu sais, laisse vide le reste : rien n’est inventé à ta place.
      </Text>

      {loading ? (
        <View style={styles.center} testID="cv-precisions-loading">
          <ActivityIndicator color={stitchColors.primary} />
          <Text style={styles.hint}>L’IA relit ton CV et l’offre…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox} testID="cv-precisions-error">
          <Text style={styles.errorText}>{error}</Text>
          <Pressable testID="cv-precisions-retry" style={styles.secondary} onPress={onRetry}>
            <Text style={styles.secondaryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && fallback && questions.length ? (
        <Text style={styles.hint} testID="cv-precisions-fallback">Questions générales : l’IA n’a pas pu lire ton CV de référence.</Text>
      ) : null}

      {!loading
        ? questions.map((q, i) => (
          <View key={q.id} style={styles.card}>
            <Text style={styles.question}>{i + 1}. {q.question}</Text>
            {q.appui ? <Text style={styles.anchor}>À propos de : « {q.appui} »</Text> : null}
            <TextInput
              testID={`cv-precisions-answer-${i}`}
              style={styles.input}
              value={answers[q.id] || ''}
              onChangeText={(value) => onChangeAnswer(q.id, value)}
              placeholder={PLACEHOLDERS[q.cible] || PLACEHOLDERS.autre}
              placeholderTextColor={stitchColors.inkMuted}
              maxLength={600}
              multiline
            />
          </View>
        ))
        : null}

      <View style={styles.row}>
        <Pressable testID="cv-precisions-skip" style={[styles.secondary, styles.grow]} onPress={onSkip}>
          <Text style={styles.secondaryText}>Passer</Text>
        </Pressable>
        <Pressable
          testID="cv-precisions-submit"
          style={[styles.primary, styles.grow, (loading || !answered) && styles.disabled]}
          onPress={onSubmit}
          disabled={loading || !answered}
        >
          <Text style={styles.primaryText}>Générer avec mes réponses</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 32 },
  label: { fontSize: 15, fontWeight: '700', color: stitchColors.ink },
  hint: { fontSize: 12, color: stitchColors.inkMuted },
  center: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  card: { gap: 6, padding: 12, borderRadius: 10, backgroundColor: stitchColors.paperSoft },
  question: { fontSize: 14, fontWeight: '600', color: stitchColors.ink },
  anchor: { fontSize: 12, color: stitchColors.inkMuted, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, borderRadius: 10, padding: 10, fontSize: 14, color: stitchColors.ink, backgroundColor: stitchColors.white, minHeight: 44, textAlignVertical: 'top' },
  errorBox: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: stitchColors.paperSoft },
  errorText: { fontSize: 13, color: stitchColors.ink },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  grow: { flex: 1 },
  secondary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '600', color: stitchColors.primary, textAlign: 'center' },
  primary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '700', color: stitchColors.white, textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
