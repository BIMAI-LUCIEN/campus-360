import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { mergeAiCv, type CvTemplateId } from '../stages/cvHtml';
import { stitchColors } from '../../theme/stitch';
import type { OfficialCvData } from '../../types';
import type { CareerOffer } from './careerContextApi';
import { correctCvWithJury, judgeSnapshot, JuryApiError, offerFromTitle, reviewCv, type CvReview, type Gravite } from './cvJuryApi';

const GRAVITE_LABEL: Record<Gravite, string> = { bloquant: 'Bloquant', majeur: 'Majeur', mineur: 'Mineur' };
const KEYWORD_LABEL = { exact: 'présent', autre_forme: 'autre forme', absent: 'absent' } as const;
// ATS problems that a one-column layout removes.
const LAYOUT_PROBLEM = /colonnes|tableau|Frise/;

/** "1, 2 et 4" */
const joinNumbers = (n: number[]): string => (n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`);

/** « X/7 avant, Y/7 maintenant, jusqu’à Z/7 si tu réponds aux questions N, N et N. » */
export const juryFinalLine = (review: CvReview): string | null => {
  if (!review.potentiel) return null;
  const now = `${review.score}/${review.total} maintenant`;
  const parts = [review.avant ? `${review.avant.score}/${review.total} avant` : '', now].filter(Boolean).join(', ');
  const { score, questions } = review.potentiel;
  if (score <= review.score || !questions.length) return `${parts.charAt(0).toUpperCase()}${parts.slice(1)}.`;
  const which = questions.length === 1 ? `à la question ${questions[0]}` : `aux questions ${joinNumbers(questions)}`;
  return `${parts.charAt(0).toUpperCase()}${parts.slice(1)}, jusqu’à ${score}/${review.total} si tu réponds ${which}.`;
};

type Props = {
  cv: OfficialCvData;
  template: CvTemplateId;
  offer?: CareerOffer | null;
  sourceGenerationId?: string;
  review?: CvReview;
  previousScore?: number;
  student: { fullName?: string; university?: string; major?: string; educationLevel?: string; skills?: string[] };
  /** New verdict; `previousScore` is set after a correction. */
  onReviewed: (review: CvReview, previousScore?: number) => void;
  /** CV rewritten with the student's answers, and the generation it came from. */
  onCorrected: (cv: OfficialCvData, sourceGenerationId: string) => void;
  onSwitchToAts: () => void;
  onCreditsChange?: (credits: number) => void;
};

/**
 * The CV jury: 7 judges (the ATS computed by the server, six people read by the
 * AI), their reasons quoted from the CV, the errors by severity and the questions
 * whose answers let the AI correct the CV without inventing anything.
 */
export function CvJuryPanel({ cv, template, offer, sourceGenerationId, review, previousScore, student, onReviewed, onCorrected, onSwitchToAts, onCreditsChange }: Props) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<{ message: string; noCredits: boolean } | null>(null);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});

  React.useEffect(() => setAnswers({}), [review?.at]);

  const fail = (e: unknown) => {
    const status = e instanceof JuryApiError ? e.status : 0;
    setError({
      message: status === 402 ? 'Il te faut 2 crédits IA pour cette action. Recharge ton portefeuille puis réessaie.' : e instanceof Error ? e.message : 'Le jury n’a pas pu répondre.',
      noCredits: status === 402,
    });
  };

  const run = async (target: OfficialCvData, source: string | undefined, before?: CvReview) => {
    setError(null);
    setBusy('Le jury lit ton CV… (20 à 40 secondes)');
    try {
      const result = await reviewCv({ cv: target, template, offer, sourceGenerationId: source });
      onCreditsChange?.(result.remainingCredits);
      // The verdict before the correction travels with the new one: the table survives a reload.
      const next: CvReview = before ? { ...result.review, avant: { score: before.score, juges: judgeSnapshot(before) } } : result.review;
      onReviewed(next, before?.score);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const correct = async () => {
    if (!review) return;
    const given = review.jury.questions.map((question, i) => ({ question, reponse: (answers[i] || '').trim() })).filter((a) => a.reponse);
    if (!given.length) return;
    setError(null);
    setBusy('L’IA corrige ton CV avec tes réponses…');
    try {
      const target = offer && offer.title.trim().length >= 2 ? offer : offerFromTitle(cv.titrePoste || review.jury.posteVise || 'Stage');
      const fixed = await correctCvWithJury({ cv, offer: target, answers: given, student });
      if (fixed.remainingCredits !== undefined) onCreditsChange?.(fixed.remainingCredits);
      const merged = mergeAiCv(cv, fixed.cv);
      onCorrected(merged, fixed.generationId);
      await run(merged, fixed.generationId, review);
    } catch (e) {
      fail(e);
      setBusy(null);
    }
  };

  const layoutRisk = review?.ats.problemes.some((p) => LAYOUT_PROBLEM.test(p.message)) && template !== 'ats';
  const answered = review ? review.jury.questions.some((_, i) => (answers[i] || '').trim()) : false;

  return (
    <View style={styles.root} testID="jury-panel">
      {review ? (
        <View style={styles.scoreCard} testID="jury-score">
          <Text style={styles.score}>{review.score}/{review.total}</Text>
          <Text style={styles.scoreText}>juges retiennent ton CV</Text>
          {previousScore !== undefined ? (
            <Text testID="jury-before-after" style={styles.beforeAfter}>Avant correction : {previousScore}/7 · maintenant : {review.score}/7</Text>
          ) : null}
          {!offer && review.jury.posteVise ? <Text style={styles.hint}>Sans offre, poste visé supposé : {review.jury.posteVise}</Text> : null}
          {juryFinalLine(review) ? <Text testID="jury-final-line" style={styles.finalLine}>{juryFinalLine(review)}</Text> : null}
        </View>
      ) : (
        <Text style={styles.body}>
          Sept juges (logiciel de tri, recruteur, manager, autre candidat, patron, expert du métier, sceptique) cherchent chacun une raison de rejeter ton CV.
        </Text>
      )}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={stitchColors.primary} />
          <Text style={styles.body}>{busy}</Text>
        </View>
      ) : (
        <>
          <Pressable testID="jury-run" style={styles.primary} onPress={() => run(cv, sourceGenerationId)}>
            <Text style={styles.primaryText}>{review ? 'Refaire juger mon CV' : 'Faire juger mon CV'}</Text>
          </Pressable>
          <Text style={styles.hint}>La première relecture de chaque CV généré est gratuite, les suivantes coûtent 2 crédits IA.</Text>
        </>
      )}

      {error ? (
        <View testID="jury-error" style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          {!error.noCredits && !busy ? (
            <Pressable onPress={() => run(cv, sourceGenerationId)}><Text style={styles.link}>Réessayer</Text></Pressable>
          ) : null}
        </View>
      ) : null}

      {review?.avant ? (
        <View style={styles.card} testID="jury-before-after-table">
          <Text style={styles.judgeName}>Avant / après correction</Text>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.cellName, styles.headText]}>Juge</Text>
            <Text style={[styles.cell, styles.headText]}>Avant</Text>
            <Text style={[styles.cell, styles.headText]}>Après</Text>
            <Text style={[styles.cell, styles.headText]}>Potentiel</Text>
          </View>
          {judgeSnapshot(review).map((after) => {
            const before = review.avant?.juges.find((b) => b.id === after.id);
            const potential = review.jury.juges.find((j) => j.id === after.id)?.potentiel;
            return (
              <View key={after.id} style={styles.tableRow} testID={`jury-row-${after.id}`}>
                <Text style={styles.cellName} numberOfLines={2}>{after.nom}</Text>
                <Text style={[styles.cell, before?.verdict === 'RETENU' ? styles.okText : styles.koText]}>{before ? `${before.note}/10` : '—'}</Text>
                <Text style={[styles.cell, after.verdict === 'RETENU' ? styles.okText : styles.koText]}>{after.note}/10</Text>
                <Text style={styles.cell}>{potential !== undefined && potential > after.note ? `~${potential}` : '—'}</Text>
              </View>
            );
          })}
          <Text style={styles.hint}>Le potentiel est une estimation si tu réponds aux questions ; il ne compte pas dans le score.</Text>
        </View>
      ) : null}

      {review ? (
        <>
          <View style={styles.card} testID="jury-judge-ats">
            <View style={styles.judgeHead}>
              <Text style={styles.judgeName}>Le logiciel de tri (ATS)</Text>
              <Text style={[styles.badge, review.ats.verdict === 'PASSE LE FILTRE' ? styles.ok : styles.ko]}>{review.ats.verdict === 'PASSE LE FILTRE' ? 'Passe le filtre' : 'Filtré'} · {review.ats.note}/10</Text>
            </View>
            {review.ats.couverture !== null ? <Text style={styles.body}>Mots-clés de l’offre trouvés : {review.ats.couverture} %</Text> : null}
            {review.ats.motsCles.map((k) => (
              <Text key={k.motCle} style={styles.line}>
                {k.motCle} : <Text style={k.etat === 'absent' ? styles.koText : styles.okText}>{KEYWORD_LABEL[k.etat]}</Text>
                {k.etat === 'autre_forme' && k.trouve ? ` (« ${k.trouve} »)` : ''}
              </Text>
            ))}
            {review.ats.problemes.map((p, i) => <Text key={`p${i}`} style={styles.line}>{GRAVITE_LABEL[p.gravite]} : {p.message}</Text>)}
            {layoutRisk ? (
              <Pressable testID="jury-ats-switch" style={styles.secondary} onPress={onSwitchToAts}>
                <Text style={styles.secondaryText}>Passer en version ATS</Text>
              </Pressable>
            ) : null}
          </View>

          {review.jury.juges.map((j) => (
            <View key={j.id} style={styles.card} testID={`jury-judge-${j.id}`}>
              <View style={styles.judgeHead}>
                <Text style={styles.judgeName}>{j.nom}</Text>
                <Text style={[styles.badge, j.verdict === 'RETENU' ? styles.ok : styles.ko]}>{j.verdict === 'RETENU' ? 'Retenu' : 'Rejeté'} · {j.note}/10</Text>
              </View>
              {j.potentiel !== undefined && j.potentiel > j.note ? (
                <Text style={styles.hint}>Potentiel si tu réponds aux questions : ~{j.potentiel}/10</Text>
              ) : null}
              {j.raisons.map((r, i) => (
                <Text key={i} style={styles.line}>{r.citation ? <Text style={styles.quote}>« {r.citation} » : </Text> : null}{r.raison}</Text>
              ))}
            </View>
          ))}

          {review.jury.erreurs.length ? (
            <View style={styles.card}>
              <Text style={styles.judgeName}>À corriger, du plus grave au moins grave</Text>
              {review.jury.erreurs.map((e, i) => (
                <Text key={i} style={styles.line}>
                  <Text style={e.gravite === 'mineur' ? styles.minor : styles.koText}>{GRAVITE_LABEL[e.gravite]}</Text>
                  {e.citation ? ` — « ${e.citation} »` : ''} : {e.correction}
                </Text>
              ))}
            </View>
          ) : null}

          {review.jury.questions.length ? (
            <View style={styles.card} testID="jury-questions">
              <Text style={styles.judgeName}>Questions pour toi</Text>
              <Text style={styles.hint}>Réponds seulement ce qui est vrai : l’IA n’ajoute à ton CV que ce que tu écris ici. Les premières rapportent le plus.</Text>
              {review.jury.questions.map((q, i) => (
                <View key={i} style={styles.question}>
                  <Text style={styles.body}>{i + 1}. {q}</Text>
                  <TextInput
                    testID={`jury-question-${i}`}
                    style={styles.input}
                    value={answers[i] ?? ''}
                    onChangeText={(text) => setAnswers((prev) => ({ ...prev, [i]: text }))}
                    placeholder="Ta réponse (laisse vide si ça ne te concerne pas)"
                    placeholderTextColor={stitchColors.inkMuted}
                    multiline
                    maxLength={600}
                  />
                </View>
              ))}
              <Pressable testID="jury-correct" style={[styles.primary, (!answered || Boolean(busy)) && styles.disabled]} disabled={!answered || Boolean(busy)} onPress={correct}>
                <Text style={styles.primaryText}>Corriger avec le jury</Text>
              </Pressable>
              <Text style={styles.hint}>Correction : une nouvelle génération du CV (2 crédits IA), puis une relecture gratuite.</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  scoreCard: { alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: stitchColors.primaryContainer, gap: 4 },
  score: { fontSize: 34, fontWeight: '800', color: stitchColors.primary },
  scoreText: { fontSize: 14, color: stitchColors.ink, fontWeight: '600' },
  beforeAfter: { fontSize: 13, color: stitchColors.ink },
  finalLine: { fontSize: 13, color: stitchColors.ink, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: stitchColors.surfaceContainerHigh },
  tableHead: { borderBottomWidth: 1 },
  headText: { fontWeight: '700', color: stitchColors.inkMuted, fontSize: 12 },
  cellName: { flex: 2, fontSize: 13, color: stitchColors.ink },
  cell: { flex: 1, fontSize: 13, color: stitchColors.ink, textAlign: 'center' },
  body: { fontSize: 14, color: stitchColors.ink, lineHeight: 20 },
  hint: { fontSize: 12, color: stitchColors.inkMuted, lineHeight: 17 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  primary: { minHeight: 48, borderRadius: 12, backgroundColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { color: stitchColors.white, fontWeight: '700', fontSize: 15 },
  secondary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryText: { color: stitchColors.primary, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  errorBox: { padding: 12, borderRadius: 10, backgroundColor: stitchColors.paperSoft, gap: 6 },
  errorText: { color: stitchColors.error, fontSize: 14 },
  link: { color: stitchColors.primary, fontWeight: '700' },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, gap: 6 },
  judgeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  judgeName: { fontSize: 15, fontWeight: '700', color: stitchColors.ink, flexShrink: 1 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', color: stitchColors.white },
  ok: { backgroundColor: stitchColors.emerald },
  ko: { backgroundColor: stitchColors.error },
  okText: { color: stitchColors.emerald, fontWeight: '700' },
  koText: { color: stitchColors.error, fontWeight: '700' },
  minor: { color: stitchColors.warning, fontWeight: '700' },
  line: { fontSize: 13, color: stitchColors.ink, lineHeight: 19 },
  quote: { fontStyle: 'italic', color: stitchColors.inkMuted },
  question: { gap: 6 },
  input: { borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, borderRadius: 10, padding: 10, fontSize: 14, color: stitchColors.ink, minHeight: 44 },
});
