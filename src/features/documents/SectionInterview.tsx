import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ChevronLeft, CornerDownLeft, PenLine, RotateCcw, Sparkles } from 'lucide-react-native';

import { authFetchRawAt, mobileApiBaseUrl } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import { htmlToReadable, insertableHtml } from './aiHtml';
import type { DocumentFile, SourceCitation } from './documentFilesApi';
import { AppAlert } from '../../ui/AppAlert';

// "Rédiger avec moi": a short interview, one question at a time, then a draft
// written from the student's own answers (and ticked sources). Answers are
// saved on the server so the student can stop and come back later.

type Question = { id: string; question: string; hint: string };
type Answers = Record<string, string>;
type Draft = { html: string; citations?: SourceCitation[] };

type SectionInterviewProps = {
  documentId: string;
  sectionId: string;
  sectionTitle: string;
  selectedSources: DocumentFile[];
  onInsert: (html: string) => void;
  onReplaceSection?: (html: string) => void;
};

const request = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await authFetchRawAt(mobileApiBaseUrl, path, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Erreur serveur (${res.status}).`);
  return data;
};

const errorText = (err: unknown) =>
  err instanceof Error && err.message !== 'Network request failed'
    ? err.message
    : 'Connexion impossible. Vérifie ton réseau et réessaie.';

export function SectionInterview({
  documentId,
  sectionId,
  sectionTitle,
  selectedSources,
  onInsert,
  onReplaceSection,
}: SectionInterviewProps) {
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [answers, setAnswers] = React.useState<Answers>({});
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [drafting, setDrafting] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saved, setSaved] = React.useState(false);
  const answersRef = React.useRef<Answers>({});
  const dirtyRef = React.useRef(false);

  const base = `/api/mobile/documents/${documentId}/sections/${sectionId}/interview`;

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setDraft(null);
    try {
      const data = await request<{ questions: Question[]; answers: Answers }>(base);
      setQuestions(data.questions);
      setAnswers(data.answers);
      answersRef.current = data.answers;
      // Resume at the first unanswered question.
      const firstOpen = data.questions.findIndex((q) => !data.answers[q.id]);
      setStep(firstOpen === -1 ? data.questions.length : firstOpen);
    } catch (err) {
      setLoadError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [base]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = React.useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      await request(base, { method: 'PUT', body: JSON.stringify({ answers: answersRef.current }) });
      setSaved(true);
    } catch {
      // Kept locally: the next step or the draft request sends them again.
      dirtyRef.current = true;
    }
  }, [base]);

  // Save when leaving the section or the tab.
  React.useEffect(() => () => void save(), [save]);

  const setAnswer = (id: string, text: string) => {
    const next = { ...answersRef.current, [id]: text };
    answersRef.current = next;
    dirtyRef.current = true;
    setSaved(false);
    setAnswers(next);
  };

  const goTo = (target: number) => {
    void save();
    setStep(Math.max(0, Math.min(target, questions.length)));
  };

  const answeredCount = questions.filter((q) => (answers[q.id] || '').trim()).length;

  const writeDraft = async () => {
    if (drafting) return;
    setDrafting(true);
    try {
      dirtyRef.current = false;
      const data = await request<Draft>(base, {
        method: 'POST',
        body: JSON.stringify({ answers: answersRef.current, sourceIds: selectedSources.map((s) => s.id) }),
      });
      setDraft({ html: data.html, citations: data.citations });
    } catch (err) {
      AppAlert.alert('Rédaction impossible', errorText(err));
    } finally {
      setDrafting(false);
    }
  };

  const openCitation = (c: SourceCitation) => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' }[] = [{ text: 'Fermer', style: 'cancel' }];
    if (c.sourceUrl) buttons.push({ text: 'Ouvrir la page', onPress: () => Linking.openURL(c.sourceUrl!).catch(() => undefined) });
    AppAlert.alert(`[${c.label}] ${c.title}${c.page ? ` · page ${c.page}` : ''}`, `« ${c.excerpt.trim()} »`, buttons);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={stitchColors.sienna} />
        <Text style={styles.muted}>Préparation des questions…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable style={styles.secondaryBtn} onPress={() => void load()}>
          <RotateCcw size={14} color={stitchColors.inkSoft} />
          <Text style={styles.secondaryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  // ── Draft ready ─────────────────────────────────────────────────────────
  if (draft) {
    const cited = (draft.citations || []).filter((c) => c.cited);
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Premier jet · {sectionTitle}</Text>
        <View style={styles.draftCard}>
          <Text style={styles.draftText} selectable>
            {htmlToReadable(draft.html)}
          </Text>
        </View>
        <Text style={styles.muted}>
          Relis-le : c’est ton texte. Les passages entre [crochets] attendent une information que tu n’as pas encore donnée.
        </Text>
        {cited.length > 0 ? (
          <View style={styles.citations}>
            {cited.map((c) => (
              <Pressable key={`${c.sourceId}:${c.page ?? 0}`} style={styles.citationChip} onPress={() => openCitation(c)}>
                <Text style={styles.citationText} numberOfLines={1}>
                  [{c.label}] {c.title}
                  {c.page ? ` · p.${c.page}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.actions}>
          {onReplaceSection ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() =>
                AppAlert.alert('Remplacer la section', 'Le contenu actuel de la section sera remplacé par ce texte.', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Remplacer', style: 'destructive', onPress: () => onReplaceSection(insertableHtml(draft.html)) },
                ])
              }
            >
              <Check size={15} color={stitchColors.white} />
              <Text style={styles.primaryText}>Utiliser pour la section</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.secondaryBtn} onPress={() => onInsert(insertableHtml(draft.html))}>
            <CornerDownLeft size={14} color={stitchColors.emeraldDeep} />
            <Text style={[styles.secondaryText, { color: stitchColors.emeraldDeep }]}>Insérer au curseur</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => { setDraft(null); setStep(0); }}>
            <PenLine size={14} color={stitchColors.inkSoft} />
            <Text style={styles.secondaryText}>Compléter mes réponses</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => void writeDraft()} disabled={drafting}>
            {drafting ? <ActivityIndicator size="small" color={stitchColors.sienna} /> : <RotateCcw size={14} color={stitchColors.inkSoft} />}
            <Text style={styles.secondaryText}>Rédiger une autre version</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const progress = (
    <View style={styles.progress}>
      {questions.map((q, i) => (
        <Pressable
          key={q.id}
          onPress={() => goTo(i)}
          style={[
            styles.progressDot,
            (answers[q.id] || '').trim() ? styles.progressDone : null,
            i === step ? styles.progressCurrent : null,
          ]}
          accessibilityLabel={`Question ${i + 1}`}
        />
      ))}
    </View>
  );

  // ── Summary before drafting ─────────────────────────────────────────────
  if (step >= questions.length) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {progress}
        <Text style={styles.title}>
          {answeredCount} réponse{answeredCount > 1 ? 's' : ''} sur {questions.length}
        </Text>
        <Text style={styles.muted}>
          Je rédige « {sectionTitle} » uniquement à partir de tes réponses
          {selectedSources.length > 0 ? ' et de tes sources cochées' : ''}. Ce qui manque restera entre [crochets].
        </Text>
        {questions.map((q, i) => {
          const done = Boolean((answers[q.id] || '').trim());
          return (
            <Pressable key={q.id} style={styles.summaryRow} onPress={() => goTo(i)}>
              <View style={[styles.summaryMark, done && styles.summaryMarkDone]}>
                {done ? <Check size={12} color={stitchColors.white} /> : null}
              </View>
              <Text style={[styles.summaryText, !done && styles.summaryTextOpen]} numberOfLines={2}>
                {q.question}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.primaryBtn, styles.wide, (answeredCount === 0 || drafting) && styles.disabled]}
          onPress={() => void writeDraft()}
          disabled={answeredCount === 0 || drafting}
        >
          {drafting ? <ActivityIndicator size="small" color={stitchColors.white} /> : <Sparkles size={15} color={stitchColors.white} />}
          <Text style={styles.primaryText}>{drafting ? 'Rédaction en cours…' : 'Rédiger la section'}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── One question ────────────────────────────────────────────────────────
  const current = questions[step];
  const value = answers[current.id] || '';
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {progress}
      <Text style={styles.kicker}>
        Question {step + 1} sur {questions.length} · {sectionTitle}
      </Text>
      <Text style={styles.question}>{current.question}</Text>
      {current.hint ? <Text style={styles.muted}>{current.hint}</Text> : null}
      <TextInput
        key={current.id}
        style={styles.answer}
        value={value}
        onChangeText={(text) => setAnswer(current.id, text)}
        placeholder="Ta réponse, avec tes mots. Des notes en vrac suffisent."
        placeholderTextColor={stitchColors.inkSubtle}
        multiline
        textAlignVertical="top"
        maxLength={4000}
        autoFocus={false}
      />
      <Text style={styles.savedHint}>{saved ? 'Réponses enregistrées' : ' '}</Text>
      <View style={styles.navRow}>
        <Pressable style={[styles.ghostBtn, step === 0 && styles.disabled]} onPress={() => goTo(step - 1)} disabled={step === 0}>
          <ChevronLeft size={16} color={stitchColors.inkSoft} />
          <Text style={styles.ghostText}>Précédent</Text>
        </Pressable>
        <View style={styles.navRight}>
          {!value.trim() ? (
            <Pressable style={styles.ghostBtn} onPress={() => goTo(step + 1)}>
              <Text style={styles.ghostText}>Passer</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.primaryBtn, !value.trim() && styles.disabled]} onPress={() => goTo(step + 1)} disabled={!value.trim()}>
            <Text style={styles.primaryText}>{step === questions.length - 1 ? 'Terminer' : 'Suivant'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: stitchColors.inkMuted, fontSize: 13.5, lineHeight: 19 },
  errorText: { color: stitchColors.onErrorContainer, fontSize: 14, textAlign: 'center' },
  kicker: { color: stitchColors.inkMuted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { color: stitchColors.ink, fontSize: 18, fontWeight: '800' },
  question: { color: stitchColors.ink, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  answer: {
    minHeight: 140,
    maxHeight: 280,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 14,
    padding: 14,
    color: stitchColors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  savedHint: { color: stitchColors.emeraldDeep, fontSize: 12, marginTop: -4 },
  progress: { flexDirection: 'row', gap: 6 },
  progressDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: stitchColors.surfaceContainerHigh },
  progressDone: { backgroundColor: stitchColors.emerald },
  progressCurrent: { backgroundColor: stitchColors.sienna },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryText: { color: stitchColors.white, fontSize: 14, fontWeight: '700' },
  wide: { marginTop: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  secondaryText: { color: stitchColors.inkSoft, fontSize: 13.5, fontWeight: '600' },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8 },
  ghostText: { color: stitchColors.inkSoft, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  summaryMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: stitchColors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMarkDone: { backgroundColor: stitchColors.emerald, borderColor: stitchColors.emerald },
  summaryText: { flex: 1, color: stitchColors.ink, fontSize: 13.5, lineHeight: 19 },
  summaryTextOpen: { color: stitchColors.inkMuted },
  draftCard: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 14,
    padding: 16,
  },
  draftText: { color: stitchColors.ink, fontSize: 15, lineHeight: 23 },
  citations: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  citationChip: { backgroundColor: stitchColors.siennaBg, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, maxWidth: '100%' },
  citationText: { color: stitchColors.siennaDeep, fontSize: 12.5, fontWeight: '600' },
  actions: { gap: 8 },
});
