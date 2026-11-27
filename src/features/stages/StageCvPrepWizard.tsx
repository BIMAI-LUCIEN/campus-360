import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { OfficialCvData } from '../../types';
import { stitchColors } from '../../theme/stitch';
import type { CareerOffer } from '../documents/careerContextApi';
import { CvPrecisions } from '../documents/CvPrecisions';
import { applyPrecisionContacts, fetchPrecisions, type PrecisionQuestion } from '../documents/cvJuryApi';
import {
  backgroundToOfficialCv,
  emptyCvBackground,
  fetchCvBackground,
  importCvFromFile,
  importCvFromText,
  mergeCvBackground,
  saveCvBackground,
  type CvBackground,
} from '../profile/cvBackgroundApi';
import { CvTemplatePickerButton } from './CvTemplatePickerButton';
import type { CvTemplateId } from './cvHtml';

export type StageCvDraft = {
  currentCv: OfficialCvData;
  precisions: { question: string; reponse: string }[];
};

type Props = {
  offer: CareerOffer;
  base: () => Promise<OfficialCvData>;
  template: CvTemplateId;
  onTemplate: (value: CvTemplateId) => void;
  generateLabel: string;
  billing: React.ReactNode;
  onGenerate: (draft: StageCvDraft) => void;
};

/**
 * Étape 1 du parcours candidature (contexte.md §25, Module 39) :
 * 2 écrans rapides avant paiement :
 *   (1a) Parcours & import CV de référence pré-rempli
 *   (1b) Questions ciblées IA sur l'offre + bouton compact Design + Payer & générer
 * La correction détaillée (CvEditor) se fait à l'étape 3, juste après génération.
 */
export function StageCvPrepWizard({ offer, base, template, onTemplate, generateLabel, billing, onGenerate }: Props) {
  const [step, setStep] = useState<'reference' | 'precisions'>('reference');
  const [background, setBackground] = useState<CvBackground | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<PrecisionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fallback, setFallback] = useState(false);
  const [loadedQuestions, setLoadedQuestions] = useState(false);

  const loadReference = async () => {
    setBusy(true);
    setError('');
    try {
      const saved = await fetchCvBackground();
      setBackground(saved.background);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parcours indisponible.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void loadReference(); }, []);

  const addReference = async (fromText: boolean) => {
    if (!background || busy) return;
    setBusy(true);
    setError('');
    try {
      const imported = await (fromText ? importCvFromText(paste.trim()) : importCvFromFile());
      if (!imported) return;
      const merged = await saveCvBackground(mergeCvBackground(background, imported));
      setBackground(merged);
      setPaste('');
      setLoadedQuestions(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  const loadQuestions = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await fetchPrecisions({ offer, background });
      setQuestions(data.questions);
      setFallback(data.fallback);
      setLoadedQuestions(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Questions indisponibles.');
    } finally {
      setBusy(false);
    }
  };

  const launchGeneration = async (useAnswers: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const initial = backgroundToOfficialCv(await base(), background ?? emptyCvBackground());
      const currentCv = useAnswers ? applyPrecisionContacts(initial, questions, answers) : initial;
      const precisions = useAnswers
        ? questions
            .map((q) => ({ question: q.question, reponse: (answers[q.id] || '').trim() }))
            .filter((a) => a.reponse)
        : [];
      onGenerate({ currentCv, precisions });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de préparer ton dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  const subSteps = (
    <View style={styles.subStepRow}>
      {(['1a. Mon parcours', '1b. Infos pour l’offre'] as const).map((label, idx) => {
        const active = (idx === 0 && step === 'reference') || (idx === 1 && step === 'precisions');
        return (
          <View key={label} style={[styles.subStepPill, active && styles.subStepPillActive]}>
            <Text style={[styles.subStepText, active && styles.subStepTextActive]} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </View>
  );

  if (step === 'precisions') {
    return (
      <View style={styles.container} testID="prep-step-precisions">
        {subSteps}
        <Pressable
          testID="prep-back-reference"
          onPress={() => { setError(''); setStep('reference'); }}
          disabled={busy || submitting}
          style={styles.button}
        >
          <Text style={styles.link}>‹ Retour à mon parcours</Text>
        </Pressable>
        <CvPrecisions
          questions={questions}
          answers={answers}
          onChangeAnswer={(id, value) => setAnswers((old) => ({ ...old, [id]: value }))}
          loading={busy}
          error={error || null}
          fallback={fallback}
          onRetry={loadQuestions}
          onSkip={() => { if (!busy && !submitting) void launchGeneration(false); }}
          onSubmit={() => { if (!busy && !submitting) void launchGeneration(true); }}
          skipLabel="Passer et générer"
          submitLabel={submitting ? 'Préparation…' : generateLabel}
          allowEmptySubmit={true}
          footer={
            <View style={styles.footerExtras}>
              <CvTemplatePickerButton
                value={template}
                onChange={onTemplate}
                label="Design du CV (facultatif)"
              />
              {billing}
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {subSteps}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View testID="prep-step-reference" style={styles.section}>
          <Text style={styles.title}>Tes informations & CV de référence</Text>
          <Text style={styles.body}>
            {background?.experiences.length || background?.formations.length
              ? 'Ton parcours enregistré sert de base. Tu peux ajouter un CV de référence si tu veux l’enrichir.'
              : 'Importe un ancien CV (PDF, Word ou texte) ou continue directement avec ton profil étudiant.'}
          </Text>
          {background ? (
            <View testID="prep-bg-summary" style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Parcours prêt : {background.experiences.length} expérience(s), {background.formations.length} formation(s), {background.competences.length} compétence(s).
              </Text>
            </View>
          ) : null}
          {busy ? <ActivityIndicator color={stitchColors.primary} /> : null}
          {error ? (
            <View style={styles.errorBox}>
              <Text testID="prep-error" accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {background ? (
            <>
              <Pressable testID="prep-import-file" disabled={busy} onPress={() => void addReference(false)} style={styles.secondaryBtn}>
                <Text style={styles.link}>Importer un PDF, Word ou fichier texte</Text>
              </Pressable>
              <TextInput
                testID="prep-paste-input"
                style={styles.input}
                multiline
                maxLength={12000}
                value={paste}
                onChangeText={setPaste}
                placeholder="Ou colle le texte d’un ancien CV"
                placeholderTextColor={stitchColors.inkMuted}
              />
              {Boolean(paste.trim()) ? (
                <Pressable testID="prep-import-text" disabled={busy} onPress={() => void addReference(true)} style={styles.secondaryBtn}>
                  <Text style={styles.link}>Importer le texte</Text>
                </Pressable>
              ) : null}
            </>
          ) : !busy ? (
            <Pressable onPress={loadReference} style={styles.secondaryBtn}>
              <Text style={styles.link}>Recharger mon parcours</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="prep-next-precisions"
            disabled={busy}
            onPress={() => {
              setError('');
              setStep('precisions');
              if (!loadedQuestions) void loadQuestions();
            }}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Continuer vers les infos de l’offre</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  subStepRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  subStepPill: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 999, backgroundColor: stitchColors.paperSoft, alignItems: 'center' },
  subStepPillActive: { backgroundColor: stitchColors.siennaBg },
  subStepText: { fontSize: 11.5, fontWeight: '600', color: stitchColors.inkMuted },
  subStepTextActive: { color: stitchColors.primary, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  section: { gap: 12 },
  title: { color: stitchColors.ink, fontSize: 17, fontWeight: '700' },
  body: { color: stitchColors.inkMuted, fontSize: 13.5, lineHeight: 19 },
  summaryBox: { backgroundColor: stitchColors.paperSoft, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: stitchColors.glassBorder },
  summaryText: { color: stitchColors.inkSoft, fontSize: 13, fontWeight: '600' },
  errorBox: { backgroundColor: stitchColors.errorBg, borderRadius: 10, padding: 10 },
  errorText: { color: stitchColors.error, fontSize: 13, fontWeight: '600' },
  button: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryBtn: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: stitchColors.glassBorder, backgroundColor: stitchColors.paperSoft, alignItems: 'center' },
  link: { color: stitchColors.primary, fontWeight: '700' },
  primary: { backgroundColor: stitchColors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryText: { color: stitchColors.white, fontWeight: '700', textAlign: 'center' },
  input: { minHeight: 80, borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, borderRadius: 10, padding: 10, color: stitchColors.ink },
  footerExtras: { gap: 10, marginTop: 4 },
});
