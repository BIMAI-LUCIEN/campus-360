import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, RotateCcw, Sparkles, XCircle } from 'lucide-react-native';

import { FormattedMarkdown } from '../../components/FormattedMarkdown';
import type { CampusDocument } from '../../types';
import { stitchColors } from '../../theme/stitch';
import { PassRequiredError } from './pdfAssistant';
import { generatePdfStudy, type StudyKind, type StudyQuizQuestion } from './pdfStudy';

type QuizRun = { number: number; questions: StudyQuizQuestion[]; answers: Record<number, number> };

type StudyState = {
  summary?: string;
  plan?: string[];
  quiz?: QuizRun;
  /** Every question already asked on this PDF, so a new quiz asks something else. */
  asked: string[];
};

// Kept while the app runs: switching tab or closing the reader does not lose a quiz in progress.
const studyCache = new Map<string, StudyState>();
const readState = (id: string): StudyState => studyCache.get(id) ?? { asked: [] };

type Props = {
  document: CampusDocument;
  kind: StudyKind;
  /** Free AI actions left today, or 'pass' when a Revision Pass is active. */
  onAllowance?: (value: number | 'pass') => void;
  onPassRequired?: (message: string) => void;
};

const KIND_LABEL: Record<StudyKind, { cta: string; loading: string; intro: string }> = {
  summary: {
    cta: 'Générer le résumé',
    loading: 'L’IA lit le cours et rédige le résumé…',
    intro: 'L’IA lit le PDF et en tire les notions clés à retenir.',
  },
  plan: {
    cta: 'Générer le plan de révision',
    loading: 'L’IA prépare ton plan de révision…',
    intro: 'Un parcours étape par étape, construit à partir du contenu réel du cours.',
  },
  quiz: {
    cta: 'Générer un quiz',
    loading: 'L’IA prépare tes questions…',
    intro: 'Un QCM de 8 questions sur ce cours, corrigé et expliqué. Tu peux en générer un nouveau dès que tu as fini.',
  },
};

export function PdfStudyPanel({ document, kind, onAllowance, onPassRequired }: Props) {
  const [state, setState] = useState<StudyState>(() => readState(document.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setState(readState(document.id));
    setError('');
  }, [document.id]);

  const update = (next: StudyState) => {
    studyCache.set(document.id, next);
    setState(next);
  };

  const summary = state.summary || document.aiSummary || '';
  const plan = state.plan?.length ? state.plan : document.studyPlan ?? [];

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await generatePdfStudy({ documentId: document.id, kind, avoid: state.asked });
      if (typeof result.freeActionsLeft === 'number' || result.passActive) {
        onAllowance?.(result.passActive ? 'pass' : (result.freeActionsLeft as number));
      }
      const current = readState(document.id);
      if (kind === 'summary' && result.summary) update({ ...current, summary: result.summary });
      else if (kind === 'plan' && result.plan?.length) update({ ...current, plan: result.plan });
      else if (kind === 'quiz' && result.quiz?.length) {
        update({
          ...current,
          quiz: { number: (current.quiz?.number ?? 0) + 1, questions: result.quiz, answers: {} },
          asked: [...current.asked, ...result.quiz.map((q) => q.question)].slice(-40),
        });
      } else {
        setError("L'IA n'a pas pu préparer ce contenu. Réessaie dans un instant.");
      }
    } catch (err) {
      if (err instanceof PassRequiredError) {
        onAllowance?.(0);
        onPassRequired?.(err.message);
      }
      setError(err instanceof Error ? err.message : "L'IA n'a pas pu préparer ce contenu.");
    } finally {
      setLoading(false);
    }
  };

  const generateButton = (label = KIND_LABEL[kind].cta, secondary = false) => (
    <Pressable
      style={[styles.button, secondary && styles.buttonSecondary, loading && styles.buttonDisabled]}
      onPress={() => void generate()}
      disabled={loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={secondary ? stitchColors.sienna : stitchColors.white} />
      ) : (
        <Sparkles size={16} color={secondary ? stitchColors.sienna : stitchColors.white} />
      )}
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{loading ? 'Génération…' : label}</Text>
    </Pressable>
  );

  const emptyState = (
    <View style={styles.card}>
      <Text style={styles.body}>{KIND_LABEL[kind].intro}</Text>
      <Text style={styles.meta}>Compte pour 1 action IA (3 gratuites par jour, illimité avec le Pass Révision).</Text>
      {generateButton()}
      {loading ? <Text style={styles.meta}>{KIND_LABEL[kind].loading}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  if (kind === 'summary') {
    if (!summary) return emptyState;
    return (
      <View style={styles.card}>
        <FormattedMarkdown content={summary} baseTextColor={stitchColors.ink} />
      </View>
    );
  }

  if (kind === 'plan') {
    if (!plan.length) return emptyState;
    return (
      <View style={styles.list}>
        {plan.map((step, index) => (
          <View key={`plan-${index}`} style={styles.planRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <View style={[styles.card, styles.planCard]}>
              <Text style={styles.body}>{step}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  const run = state.quiz;
  if (!run) return emptyState;

  const answeredCount = Object.keys(run.answers).length;
  const finished = answeredCount === run.questions.length;
  const score = run.questions.reduce((sum, q, i) => sum + (run.answers[i] === q.correctIndex ? 1 : 0), 0);

  const choose = (questionIndex: number, optionIndex: number) => {
    if (run.answers[questionIndex] !== undefined) return;
    update({ ...state, quiz: { ...run, answers: { ...run.answers, [questionIndex]: optionIndex } } });
  };

  return (
    <View style={styles.list}>
      <View style={styles.quizHeader}>
        <Text style={styles.quizTitle}>Quiz n°{run.number}</Text>
        <Text style={styles.meta}>
          {answeredCount}/{run.questions.length} répondues
        </Text>
      </View>

      {run.questions.map((q, qi) => {
        const picked = run.answers[qi];
        const answered = picked !== undefined;
        return (
          <View key={`${run.number}-${qi}`} style={styles.card}>
            <Text style={styles.question}>
              {qi + 1}. {q.question}
            </Text>
            {q.options.map((option, oi) => {
              const isCorrect = oi === q.correctIndex;
              const isPicked = oi === picked;
              return (
                <Pressable
                  key={oi}
                  onPress={() => choose(qi, oi)}
                  disabled={answered}
                  style={[
                    styles.option,
                    answered && isCorrect && styles.optionCorrect,
                    answered && isPicked && !isCorrect && styles.optionWrong,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + oi)}</Text>
                  <Text style={styles.optionText}>{option}</Text>
                  {answered && isCorrect ? <CheckCircle2 size={16} color={stitchColors.emeraldDeep} /> : null}
                  {answered && isPicked && !isCorrect ? <XCircle size={16} color={stitchColors.error} /> : null}
                </Pressable>
              );
            })}
            {answered && q.explanation ? <Text style={styles.explanation}>{q.explanation}</Text> : null}
          </View>
        );
      })}

      {finished ? (
        <View style={[styles.card, styles.scoreCard]}>
          <Text style={styles.score}>
            Score : {score}/{run.questions.length}
          </Text>
          <Text style={styles.body}>
            {score === run.questions.length
              ? 'Parfait ! Passe à un nouveau quiz pour aller plus loin.'
              : score >= run.questions.length / 2
                ? 'Bien joué. Un nouveau quiz t’aidera à consolider.'
                : 'Relis les explications, puis retente avec un nouveau quiz.'}
          </Text>
          {generateButton('Générer un nouveau quiz')}
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => update({ ...state, quiz: { ...run, answers: {} } })}
            accessibilityRole="button"
          >
            <RotateCcw size={16} color={stitchColors.sienna} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Refaire ce quiz</Text>
          </Pressable>
          {loading ? <Text style={styles.meta}>{KIND_LABEL.quiz.loading}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    backgroundColor: stitchColors.paper,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  body: { fontSize: 14, lineHeight: 21, color: stitchColors.ink },
  meta: { fontSize: 12, color: stitchColors.inkMuted },
  error: { fontSize: 13, color: stitchColors.error },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.sienna,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonSecondary: { backgroundColor: stitchColors.siennaBg },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: stitchColors.white, fontWeight: '700', fontSize: 14 },
  buttonTextSecondary: { color: stitchColors.sienna },
  planRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  planCard: { flex: 1 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: stitchColors.siennaBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  badgeText: { color: stitchColors.sienna, fontWeight: '700', fontSize: 12 },
  quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quizTitle: { fontSize: 15, fontWeight: '700', color: stitchColors.ink },
  question: { fontSize: 14, fontWeight: '600', color: stitchColors.ink, lineHeight: 20 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    backgroundColor: stitchColors.paperDeep,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionCorrect: { borderColor: stitchColors.emerald, backgroundColor: stitchColors.emeraldBg },
  optionWrong: { borderColor: stitchColors.error, backgroundColor: stitchColors.errorBg },
  optionLetter: { fontWeight: '700', color: stitchColors.sienna, width: 16 },
  optionText: { flex: 1, fontSize: 13, color: stitchColors.ink, lineHeight: 18 },
  explanation: { fontSize: 13, color: stitchColors.inkSoft, lineHeight: 19, fontStyle: 'italic' },
  scoreCard: { borderColor: stitchColors.siennaSoft },
  score: { fontSize: 18, fontWeight: '800', color: stitchColors.sienna },
});
