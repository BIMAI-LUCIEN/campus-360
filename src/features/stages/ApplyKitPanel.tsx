import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';

import { fontFamilies, stitchColors, stitchRadius } from '../../theme/stitch';
import type { StageApplicationKit, StageJob } from '../../types';
import { APPLY_LINK_NO_REFUND_NOTICE } from './applyTarget';
import { askKitQuestion, fetchStageKit, generateKitAnswers } from './stagesApi';

export interface ApplyKitPanelProps {
  job: StageJob;
  letterText: string;
  studentContext?: {
    fullName?: string;
    university?: string;
    major?: string;
    educationLevel?: string;
    skills?: string[];
  };
  notes?: string;
  initialKit?: StageApplicationKit | null;
  /** When true, only loads existing kit via GET /stages/kit before offering generation (used from follow-up timeline). */
  readFirst?: boolean;
  downloadingPdf?: boolean;
  onDownloadPdf?: () => void;
  onOpenSite: (job: StageJob) => void;
  onRecharge?: () => void;
}

const copyToClipboard = async (value: string): Promise<boolean> => {
  const text = value.trim();
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  } catch {
    // Fallback below
  }
  return false;
};

const READY_LABELS: Array<{
  key: 'presentation' | 'whyThisRole' | 'availability' | 'keySkills';
  title: string;
}> = [
  { key: 'presentation', title: 'Présentation (3 lignes)' },
  { key: 'whyThisRole', title: 'Pourquoi ce poste ?' },
  { key: 'availability', title: 'Disponibilité' },
  { key: 'keySkills', title: 'Compétences clés' },
];

export function ApplyKitPanel({
  job,
  letterText,
  studentContext,
  notes,
  initialKit = null,
  readFirst = false,
  downloadingPdf = false,
  onDownloadPdf,
  onOpenSite,
  onRecharge,
}: ApplyKitPanelProps) {
  const [kit, setKit] = useState<StageApplicationKit | null>(initialKit);
  const [loadingReady, setLoadingReady] = useState<boolean>(!initialKit?.answers?.ready);
  const [readyError, setReadyError] = useState<{ status: number; message: string } | null>(null);

  const [questionInput, setQuestionInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<{ status: number; message: string } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2200);
  };

  const loadOrGenerateReady = async (forceGenerate = false) => {
    setLoadingReady(true);
    setReadyError(null);
    try {
      if (readFirst && !forceGenerate) {
        const fetched = await fetchStageKit(job.id);
        if (fetched.ok) {
          setKit(fetched.kit);
          if (fetched.kit.answers.ready) {
            setLoadingReady(false);
            return;
          }
        } else if (fetched.status !== 404) {
          setReadyError({ status: fetched.status, message: fetched.error });
          setLoadingReady(false);
          return;
        }
      }

      const generated = await generateKitAnswers(job.id, {
        student: studentContext,
        notes,
      });
      if (!generated.ok) {
        setReadyError({ status: generated.status, message: generated.error });
      } else {
        setKit(generated.kit);
      }
    } finally {
      setLoadingReady(false);
    }
  };

  useEffect(() => {
    if (initialKit?.answers?.ready) {
      setKit(initialKit);
      setLoadingReady(false);
      return;
    }
    void loadOrGenerateReady(false);
  }, [job.id]);

  const handleAskQuestion = async () => {
    const trimmed = questionInput.trim();
    if (!trimmed || askingQuestion) return;
    setAskingQuestion(true);
    setQuestionError(null);
    try {
      const res = await askKitQuestion(job.id, trimmed, {
        student: studentContext,
        notes,
      });
      if (!res.ok) {
        setQuestionError({ status: res.status, message: res.error });
        return;
      }
      setKit(res.kit);
      setQuestionInput('');
    } finally {
      setAskingQuestion(false);
    }
  };

  const effectiveLetter = (letterText || kit?.letter || '').trim();
  const questionsRemaining = kit ? kit.questionsRemaining : 5;
  const questionsExhausted = questionsRemaining <= 0;

  return (
    <View style={styles.root} testID="apply-kit-panel">
      {/* 1. Bandeau d'introduction & non-remboursement */}
      <View style={styles.introBanner}>
        <Text style={styles.introTitle}>Ton dossier pour postuler sur le site</Text>
        <Text style={styles.introSub}>
          Télécharge ton CV adapté, copie tes réponses prêtes ou colle les questions du formulaire avant d'ouvrir le site de l'offre.
        </Text>
        <Text style={styles.noRefundNote}>{APPLY_LINK_NO_REFUND_NOTICE}</Text>
      </View>

      {/* 2. Télécharger / Partager le PDF du CV */}
      {onDownloadPdf && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWrap}>
              <FileText size={15} color={stitchColors.primary} />
              <Text style={styles.cardTitle}>1. CV adapté au format PDF</Text>
            </View>
            <Pressable
              testID="btn-kit-download-pdf"
              style={({ pressed }) => [styles.pdfBtn, pressed && { opacity: 0.88 }]}
              onPress={onDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <ActivityIndicator size="small" color={stitchColors.white} />
              ) : (
                <Download size={14} color={stitchColors.white} />
              )}
              <Text style={styles.pdfBtnText}>
                {downloadingPdf ? 'Préparation…' : 'Télécharger le PDF'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.cardHint}>
            Joins ce fichier PDF dans le champ « CV / Curriculum Vitae » du formulaire de l'entreprise.
          </Text>
        </View>
      )}

      {/* 3. Lettre de motivation à copier */}
      {effectiveLetter ? (
        <View style={styles.card} testID="kit-letter-card">
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>2. Lettre de motivation</Text>
            <Pressable
              testID="btn-kit-copy-letter"
              style={[styles.copyBtn, copiedKey === 'letter' && styles.copyBtnSuccess]}
              onPress={() => void handleCopy('letter', effectiveLetter)}
            >
              {copiedKey === 'letter' ? (
                <Check size={13} color={stitchColors.emeraldDeep} />
              ) : (
                <Copy size={13} color={stitchColors.primary} />
              )}
              <Text style={[styles.copyBtnText, copiedKey === 'letter' && styles.copyBtnTextSuccess]}>
                {copiedKey === 'letter' ? 'Copié' : 'Copier'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.answerBodyText} numberOfLines={6}>
            {effectiveLetter}
          </Text>
        </View>
      ) : null}

      {/* 4. Les 4 réponses prêtes */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Sparkles size={15} color={stitchColors.sienna} />
          <Text style={styles.sectionTitle}>3. Réponses prêtes à copier</Text>
        </View>

        {loadingReady ? (
          <View style={styles.loadingBox} testID="kit-ready-loading">
            <ActivityIndicator size="small" color={stitchColors.primary} />
            <Text style={styles.loadingText}>Rédaction des 4 réponses à partir de ton profil…</Text>
          </View>
        ) : readyError ? (
          <View style={styles.errorBox} testID="kit-ready-error">
            <View style={styles.errorTopRow}>
              <AlertCircle size={15} color={stitchColors.error} />
              <Text style={styles.errorText}>{readyError.message}</Text>
            </View>
            <View style={styles.errorActionsRow}>
              {readyError.status === 402 && onRecharge ? (
                <Pressable
                  testID="btn-kit-recharge"
                  style={styles.retryBtnPrimary}
                  onPress={onRecharge}
                >
                  <Text style={styles.retryBtnPrimaryText}>Recharger mon portefeuille</Text>
                </Pressable>
              ) : null}
              <Pressable
                testID="btn-kit-retry-ready"
                style={styles.retryBtn}
                onPress={() => void loadOrGenerateReady(true)}
              >
                <RefreshCw size={13} color={stitchColors.primary} />
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          </View>
        ) : kit?.answers.ready ? (
          <View style={styles.readyList} testID="kit-ready-list">
            {READY_LABELS.map(({ key, title }) => {
              const text = kit.answers.ready?.[key] || '';
              const copyId = `ready-${key}`;
              const isCopied = copiedKey === copyId;
              return (
                <View key={key} style={styles.card} testID={`kit-ready-item-${key}`}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Pressable
                      testID={`btn-kit-copy-${key}`}
                      style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                      onPress={() => void handleCopy(copyId, text)}
                    >
                      {isCopied ? (
                        <Check size={13} color={stitchColors.emeraldDeep} />
                      ) : (
                        <Copy size={13} color={stitchColors.primary} />
                      )}
                      <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                        {isCopied ? 'Copié' : 'Copier'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.answerBodyText}>{text}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* 5. Questions du formulaire collées (jusqu'à 5) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeaderRow}>
            <HelpCircle size={15} color={stitchColors.primary} />
            <Text style={styles.sectionTitle}>4. Colle une question du formulaire</Text>
          </View>
          <View style={styles.counterBadge} testID="kit-questions-remaining">
            <Text style={styles.counterBadgeText}>
              {questionsRemaining} question{questionsRemaining > 1 ? 's' : ''} restante{questionsRemaining > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.customAskBox}>
          <TextInput
            testID="kit-question-input"
            style={[styles.questionInput, questionsExhausted && styles.questionInputDisabled]}
            value={questionInput}
            onChangeText={setQuestionInput}
            editable={!questionsExhausted && !askingQuestion}
            maxLength={500}
            multiline
            placeholder={
              questionsExhausted
                ? 'Tu as utilisé les 5 questions incluses dans ce kit.'
                : 'Ex : Quelle a été votre plus grande réalisation académique ?'
            }
            placeholderTextColor={stitchColors.inkSubtle}
          />
          <View style={styles.questionFooterRow}>
            <Text style={styles.charCountText}>{questionInput.trim().length}/500</Text>
            <Pressable
              testID="btn-kit-ask-question"
              style={({ pressed }) => [
                styles.askBtn,
                (questionsExhausted || !questionInput.trim() || askingQuestion) && styles.askBtnDisabled,
                pressed && { opacity: 0.88 },
              ]}
              onPress={() => void handleAskQuestion()}
              disabled={questionsExhausted || !questionInput.trim() || askingQuestion}
            >
              {askingQuestion ? (
                <ActivityIndicator size="small" color={stitchColors.white} />
              ) : (
                <Sparkles size={13} color={stitchColors.white} />
              )}
              <Text style={styles.askBtnText}>
                {askingQuestion ? 'Rédaction…' : 'Rédiger ma réponse'}
              </Text>
            </Pressable>
          </View>
        </View>

        {questionError && (
          <View style={styles.errorBox} testID="kit-question-error">
            <View style={styles.errorTopRow}>
              <AlertCircle size={15} color={stitchColors.error} />
              <Text style={styles.errorText}>{questionError.message}</Text>
            </View>
            <View style={styles.errorActionsRow}>
              {questionError.status === 402 && onRecharge ? (
                <Pressable
                  testID="btn-kit-question-recharge"
                  style={styles.retryBtnPrimary}
                  onPress={onRecharge}
                >
                  <Text style={styles.retryBtnPrimaryText}>Recharger mon portefeuille</Text>
                </Pressable>
              ) : null}
              <Pressable
                testID="btn-kit-retry-question"
                style={styles.retryBtn}
                onPress={() => void handleAskQuestion()}
              >
                <RefreshCw size={13} color={stitchColors.primary} />
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          </View>
        )}

        {kit?.answers.customQuestions && kit.answers.customQuestions.length > 0 && (
          <View style={styles.readyList} testID="kit-custom-questions-list">
            {kit.answers.customQuestions.map((item, idx) => {
              const copyId = `custom-${idx}`;
              const isCopied = copiedKey === copyId;
              return (
                <View key={`${idx}-${item.createdAt}`} style={styles.card} testID={`kit-custom-item-${idx}`}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.customQuestionLabel} numberOfLines={2}>
                      Q : {item.question}
                    </Text>
                    <Pressable
                      testID={`btn-kit-copy-custom-${idx}`}
                      style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                      onPress={() => void handleCopy(copyId, item.answer)}
                    >
                      {isCopied ? (
                        <Check size={13} color={stitchColors.emeraldDeep} />
                      ) : (
                        <Copy size={13} color={stitchColors.primary} />
                      )}
                      <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                        {isCopied ? 'Copié' : 'Copier'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.answerBodyText}>{item.answer}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 6. Bouton principal : Ouvrir le site de l'offre */}
      <Pressable
        testID="btn-kit-open-site"
        style={({ pressed }) => [styles.openSiteBtn, pressed && { opacity: 0.9 }]}
        onPress={() => onOpenSite(job)}
      >
        <ExternalLink size={16} color={stitchColors.white} />
        <Text style={styles.openSiteBtnText}>Ouvrir le site de l'offre</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
    paddingBottom: 24,
  },
  introBanner: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    gap: 4,
  },
  introTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  introSub: {
    fontSize: 12.5,
    color: stitchColors.inkSubtle,
    lineHeight: 18,
  },
  noRefundNote: {
    fontSize: 11,
    color: stitchColors.sienna,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  counterBadge: {
    backgroundColor: stitchColors.siennaSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  card: {
    backgroundColor: stitchColors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
    flex: 1,
  },
  cardHint: {
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    lineHeight: 16,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  pdfBtnText: {
    color: stitchColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.paperSoft,
  },
  copyBtnSuccess: {
    borderColor: stitchColors.emeraldDeep,
    backgroundColor: stitchColors.emeraldSoft,
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  copyBtnTextSuccess: {
    color: stitchColors.emeraldDeep,
  },
  answerBodyText: {
    fontSize: 12.5,
    color: stitchColors.ink,
    lineHeight: 18,
  },
  readyList: {
    gap: 10,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  loadingText: {
    fontSize: 12.5,
    color: stitchColors.inkSubtle,
    flex: 1,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.error,
    gap: 8,
  },
  errorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: stitchColors.error,
    flex: 1,
    fontWeight: '600',
  },
  errorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.primary,
    backgroundColor: stitchColors.white,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  retryBtnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: stitchColors.sienna,
  },
  retryBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.white,
  },
  customAskBox: {
    backgroundColor: stitchColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 10,
    gap: 8,
  },
  questionInput: {
    minHeight: 68,
    fontSize: 13,
    color: stitchColors.ink,
    textAlignVertical: 'top',
  },
  questionInputDisabled: {
    color: stitchColors.inkMuted,
    backgroundColor: stitchColors.paperSoft,
  },
  questionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  charCountText: {
    fontSize: 11,
    color: stitchColors.inkMuted,
  },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  askBtnDisabled: {
    opacity: 0.45,
  },
  askBtnText: {
    color: stitchColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  customQuestionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.inkSubtle,
    flex: 1,
  },
  openSiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.button,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  openSiteBtnText: {
    color: stitchColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
