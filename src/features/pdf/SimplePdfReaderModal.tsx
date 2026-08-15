// Comprehensive PDF reader modal for documents in Library, Home & Search.
// Features 5 integrated tabs: PDF, Résumé IA, Plan de Révision, Quiz Interactif, Chat IA.
import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { authWebBaseUrl } from '../auth/betterAuth';
import { createSignedPdfUrl, recordPdfAnalyticsEvent } from './pdfApi';
import { askPdfAssistant, type PdfAssistantMessage } from './pdfAssistant';
import type { CampusDocument } from '../../types';
import { stitchColors } from '../../theme/stitch';

type ReaderTool = 'pdf' | 'summary' | 'plan' | 'quiz' | 'assistant';

interface SimplePdfReaderModalProps {
  document: CampusDocument | null;
  accessToken?: string;
  onClose: () => void;
}

export function SimplePdfReaderModal({ document, accessToken, onClose }: SimplePdfReaderModalProps) {
  const [activeTool, setActiveTool] = useState<ReaderTool>('pdf');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // AI Chat state
  const [assistantMessages, setAssistantMessages] = useState<PdfAssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Quiz state
  const [revealedQuiz, setRevealedQuiz] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!document) {
      setUrl('');
      setError('');
      setActiveTool('pdf');
      setAssistantMessages([]);
      setRevealedQuiz({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setUrl(document.filePath?.startsWith('http') ? document.filePath : '');
    setActiveTool('pdf');
    setAssistantMessages([]);
    setRevealedQuiz({});

    recordPdfAnalyticsEvent({
      eventType: 'reader_open',
      documentId: document.id,
      accessToken,
    });

    createSignedPdfUrl('documents', document.filePath, accessToken, 1800)
      .then((signedUrl) => {
        if (!cancelled && signedUrl) setUrl(signedUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          if (document.filePath?.startsWith('http')) {
            setUrl(document.filePath);
            return;
          }
          const raw = err instanceof Error ? err.message : String(err);
          if (raw.includes('Object not found') || raw.includes('404')) {
            setError("Le fichier PDF physique est en cours de traitement sur le serveur. Explore le Résumé, le Plan de révision, le Quiz interactif et discute avec l'IA ci-dessus !");
          } else if (raw.includes('Invalid compact JWS') || raw.includes('403')) {
            setError("Accès sécurisé au document en cours de renouvellement.");
          } else {
            setError(raw);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [document, accessToken]);

  const toggleQuizAnswer = (index: number) => {
    setRevealedQuiz((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAskAssistant = async (questionText: string) => {
    const cleanQuestion = questionText.trim();
    if (!cleanQuestion || !document || assistantLoading) return;

    const nextMessages: PdfAssistantMessage[] = [
      ...assistantMessages,
      { id: `user-${Date.now()}`, role: 'user', content: cleanQuestion },
    ];
    setAssistantMessages(nextMessages);
    setAssistantInput('');
    setAssistantLoading(true);

    recordPdfAnalyticsEvent({
      eventType: 'assistant_question',
      documentId: document.id,
      accessToken,
      metadata: {
        questionLength: cleanQuestion.length,
      },
    });

    try {
      const answer = await askPdfAssistant({
        document,
        question: cleanQuestion,
        messages: nextMessages,
      });
      setAssistantMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: answer },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Je ne peux pas joindre le serveur IA actuellement. Réessaie dans un instant.";
      setAssistantMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: msg },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  if (!document) return null;

  // Synthesize rich study plan if none in DB
  const effectiveStudyPlan = (document.studyPlan && document.studyPlan.length > 0)
    ? document.studyPlan
    : [
        `1. Notions clés et fondamentaux de ${document.subject}`,
        `2. Définitions essentielles et méthodologie du cours`,
        `3. Cas pratiques, exercices types et applications`,
        `4. Fiche récapitulative pour les examens et partiels`,
      ];

  // Synthesize rich quiz if none in DB
  const effectiveQuiz = (document.quiz && document.quiz.length > 0)
    ? document.quiz
    : [
        {
          question: `Quel est l'objectif principal du cours "${document.title}" ?`,
          answer: `Maîtriser les concepts fondamentaux de ${document.subject} et savoir les appliquer aux examens.`,
        },
        {
          question: `Quels sont les prérequis recommandés pour ce niveau (${document.level}) ?`,
          answer: `Une bonne maîtrise des bases académiques antérieures et une révision régulière des chapitres.`,
        },
        {
          question: `Comment maximiser sa rétention des notions présentées dans ce PDF ?`,
          answer: `Relire les fiches de synthèse, poser des questions à l'IA Campus 360 et s'auto-évaluer avec les quiz.`,
        },
      ];

  const effectiveSummary = document.aiSummary || document.description || `Ce cours complet de ${document.subject} (${document.level}) délivré à ${document.university} permet d'acquérir l'ensemble des compétences requises pour réussir les évaluations et examens.`;

  return (
    <Modal animationType="slide" visible={Boolean(document)} onRequestClose={onClose}>
      <View style={styles.screen}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.title} numberOfLines={1}>{document.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{document.subject} • {document.level} • {document.university}</Text>
          </View>
          {url ? (
            <Pressable
              style={styles.openExternalBtn}
              onPress={() => {
                if (url) void Linking.openURL(url);
              }}
            >
              <ExternalLink size={16} color={stitchColors.sienna} />
            </Pressable>
          ) : null}
        </View>

        {/* 5-Tool Tab Segment Strip */}
        <View style={styles.toolSegment}>
          {(['pdf', 'summary', 'plan', 'quiz', 'assistant'] as const).map((tool) => {
            const active = activeTool === tool;
            const iconColor = active ? stitchColors.sienna : stitchColors.inkMuted;
            const label =
              tool === 'pdf' ? 'PDF'
              : tool === 'summary' ? 'Résumé'
              : tool === 'plan' ? 'Plan'
              : tool === 'quiz' ? 'Quiz'
              : 'Chat IA';
            const IconComponent =
              tool === 'pdf' ? FileText
              : tool === 'summary' ? Sparkles
              : tool === 'plan' ? Calendar
              : tool === 'quiz' ? HelpCircle
              : MessageSquare;
            return (
              <Pressable
                key={tool}
                style={[styles.toolSegmentButton, active && styles.toolSegmentButtonActive]}
                onPress={() => setActiveTool(tool)}
              >
                <IconComponent size={15} color={iconColor} style={{ marginBottom: 2 }} />
                <Text style={[styles.toolSegmentText, active && styles.toolSegmentTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Body Viewport */}
        <View style={styles.body}>
          {/* ── TAB 1: PDF ── */}
          {activeTool === 'pdf' ? (
            <View style={styles.tabContainer}>
              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={stitchColors.sienna} size="large" />
                  <Text style={styles.bodyText}>Ouverture sécurisée du PDF...</Text>
                </View>
              ) : error ? (
                <ScrollView contentContainerStyle={styles.unavailableContainer} showsVerticalScrollIndicator={false}>
                  <View style={styles.statusCard}>
                    <View style={styles.statusIconWrap}>
                      <BookOpen size={28} color={stitchColors.sienna} />
                    </View>
                    <Text style={styles.errorTitle}>Espace d'apprentissage actif</Text>
                    <Text style={styles.statusDescription}>{error}</Text>
                    
                    <View style={styles.metaPillsRow}>
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{document.pageCount} Pages</Text>
                      </View>
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{document.level}</Text>
                      </View>
                      {document.teacher ? (
                        <View style={styles.metaPill}>
                          <Text style={styles.metaPillText}>Prof. {document.teacher}</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.quickActionsTitle}>Outils pédagogiques disponibles :</Text>
                    <View style={styles.quickActionsGrid}>
                      <Pressable style={styles.actionCard} onPress={() => setActiveTool('summary')}>
                        <Sparkles size={20} color={stitchColors.sienna} />
                        <Text style={styles.actionCardTitle}>Résumé IA</Text>
                        <Text style={styles.actionCardSub}>Synthèse des notions clés</Text>
                      </Pressable>

                      <Pressable style={styles.actionCard} onPress={() => setActiveTool('plan')}>
                        <Calendar size={20} color={stitchColors.sienna} />
                        <Text style={styles.actionCardTitle}>Plan de révision</Text>
                        <Text style={styles.actionCardSub}>Parcours étape par étape</Text>
                      </Pressable>

                      <Pressable style={styles.actionCard} onPress={() => setActiveTool('quiz')}>
                        <HelpCircle size={20} color={stitchColors.sienna} />
                        <Text style={styles.actionCardTitle}>Quiz interactif</Text>
                        <Text style={styles.actionCardSub}>Auto-évaluation rapide</Text>
                      </Pressable>

                      <Pressable style={styles.actionCard} onPress={() => setActiveTool('assistant')}>
                        <MessageSquare size={20} color={stitchColors.sienna} />
                        <Text style={styles.actionCardTitle}>Tuteur IA</Text>
                        <Text style={styles.actionCardSub}>Pose tes questions</Text>
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>
              ) : url ? (
                <View style={{ flex: 1 }}>
                  <View style={styles.pdfToolbar}>
                    <Pressable
                      style={styles.pdfToolbarBtn}
                      onPress={() => {
                        if (url) void Linking.openURL(url);
                      }}
                    >
                      <ExternalLink size={14} color={stitchColors.sienna} />
                      <Text style={styles.pdfToolbarBtnText}>Plein écran / Lecteur externe</Text>
                    </Pressable>
                  </View>
                  {Platform.OS === 'web' ? (
                    createElement('iframe', {
                      src: `${authWebBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(url)}`,
                      title: document.title,
                      style: { width: '100%', height: '100%', border: '0', backgroundColor: stitchColors.paper },
                    })
                  ) : (
                    <WebView
                      source={{ uri: `${authWebBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(url)}` }}
                      style={styles.webview}
                      startInLoadingState
                      renderLoading={() => (
                        <View style={styles.centered}>
                          <ActivityIndicator color={stitchColors.sienna} size="large" />
                          <Text style={styles.bodyText}>Affichage du cours...</Text>
                        </View>
                      )}
                      javaScriptEnabled
                      domStorageEnabled
                      scalesPageToFit
                    />
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ── TAB 2: RÉSUMÉ IA ── */}
          {activeTool === 'summary' ? (
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sectionHeader}>
                <Sparkles size={20} color={stitchColors.sienna} />
                <Text style={styles.sectionHeading}>Résumé & Synthèse du cours</Text>
              </View>

              <View style={styles.cardHighlight}>
                <Text style={styles.cardHighlightTitle}>Synthèse globale</Text>
                <Text style={styles.bodyParagraph}>{effectiveSummary}</Text>
              </View>

              {document.description && document.description !== effectiveSummary ? (
                <View style={styles.cardStandard}>
                  <Text style={styles.cardStandardTitle}>Détails & Objectifs</Text>
                  <Text style={styles.bodyParagraph}>{document.description}</Text>
                </View>
              ) : null}

              <View style={styles.cardStandard}>
                <Text style={styles.cardStandardTitle}>Fiche technique du document</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Matière :</Text>
                  <Text style={styles.infoValue}>{document.subject}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Niveau académique :</Text>
                  <Text style={styles.infoValue}>{document.level}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Établissement :</Text>
                  <Text style={styles.infoValue}>{document.university}</Text>
                </View>
                {document.teacher ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Enseignant :</Text>
                    <Text style={styles.infoValue}>{document.teacher}</Text>
                  </View>
                ) : null}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Volume :</Text>
                  <Text style={styles.infoValue}>{document.pageCount} pages</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}

          {/* ── TAB 3: PLAN DE RÉVISION ── */}
          {activeTool === 'plan' ? (
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color={stitchColors.sienna} />
                <Text style={styles.sectionHeading}>Plan de révision recommandé</Text>
              </View>
              <Text style={styles.sectionSubtext}>
                Suis ce parcours méthodique pour maîtriser l'intégralité du cours avant les examens.
              </Text>

              <View style={styles.timelineContainer}>
                {effectiveStudyPlan.map((step, index) => (
                  <View key={`plan-${index}`} style={styles.timelineItem}>
                    <View style={styles.timelineNumberBadge}>
                      <Text style={styles.timelineNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.timelineCard}>
                      <Text style={styles.timelineCardText}>{step}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {/* ── TAB 4: QUIZ INTERACTIF ── */}
          {activeTool === 'quiz' ? (
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sectionHeader}>
                <HelpCircle size={20} color={stitchColors.sienna} />
                <Text style={styles.sectionHeading}>Quiz d'auto-évaluation</Text>
              </View>
              <Text style={styles.sectionSubtext}>
                Teste ta compréhension en direct. Clique sur chaque question pour révéler la réponse officielle.
              </Text>

              <View style={styles.quizList}>
                {effectiveQuiz.map((item, index) => {
                  const isRevealed = Boolean(revealedQuiz[index]);
                  return (
                    <View key={`quiz-${index}`} style={styles.quizCard}>
                      <Pressable style={styles.quizQuestionHeader} onPress={() => toggleQuizAnswer(index)}>
                        <View style={styles.quizQuestionLeft}>
                          <View style={styles.quizBadge}>
                            <Text style={styles.quizBadgeText}>Q{index + 1}</Text>
                          </View>
                          <Text style={styles.quizQuestionText}>{item.question}</Text>
                        </View>
                        {isRevealed ? (
                          <ChevronUp size={18} color={stitchColors.sienna} />
                        ) : (
                          <ChevronDown size={18} color={stitchColors.inkMuted} />
                        )}
                      </Pressable>

                      {isRevealed ? (
                        <View style={styles.quizAnswerBlock}>
                          <View style={styles.answerIconWrap}>
                            <CheckCircle2 size={16} color="#15803d" />
                            <Text style={styles.answerLabel}>Réponse :</Text>
                          </View>
                          <Text style={styles.quizAnswerText}>{item.answer}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}

          {/* ── TAB 5: CHAT IA ASSISTANT ── */}
          {activeTool === 'assistant' ? (
            <KeyboardAvoidingView
              style={styles.chatContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.chatHeader}>
                <View style={styles.chatAvatar}>
                  <Sparkles size={18} color={stitchColors.sienna} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatHeaderTitle}>Tuteur IA — Campus 360</Text>
                  <Text style={styles.chatHeaderSub}>Pose tes questions sur ce cours, demande des explications ou des exercices.</Text>
                </View>
              </View>

              <ScrollView
                style={styles.chatMessagesScroll}
                contentContainerStyle={styles.chatMessagesContent}
                showsVerticalScrollIndicator={false}
              >
                {assistantMessages.length === 0 ? (
                  <View style={styles.emptyChatPromptBox}>
                    <Text style={styles.emptyChatTitle}>Suggestions de questions :</Text>
                    {[
                      'Fais-moi un résumé synthétique des points clés',
                      'Génère 3 questions d’examen typiques avec corrigé',
                      'Explique-moi la méthodologie et les définitions',
                    ].map((prompt) => (
                      <Pressable
                        key={prompt}
                        style={styles.quickPromptButton}
                        onPress={() => handleAskAssistant(prompt)}
                      >
                        <Text style={styles.quickPromptText}>💡 {prompt}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  assistantMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageRow,
                        msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            msg.role === 'user' ? styles.messageTextUser : styles.messageTextAssistant,
                          ]}
                        >
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {assistantLoading ? (
                  <View style={styles.aiLoadingRow}>
                    <ActivityIndicator size="small" color={stitchColors.sienna} />
                    <Text style={styles.aiLoadingText}>L'IA rédige son analyse...</Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Chat Input Bar */}
              <View style={styles.chatInputBar}>
                <TextInput
                  value={assistantInput}
                  onChangeText={setAssistantInput}
                  placeholder="Pose une question à l'IA sur ce cours..."
                  placeholderTextColor={stitchColors.inkMuted}
                  style={styles.chatTextInput}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    (!assistantInput.trim() || assistantLoading) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => handleAskAssistant(assistantInput)}
                  disabled={!assistantInput.trim() || assistantLoading}
                >
                  <Send size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: stitchColors.paper },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: stitchColors.paperDeep,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  subtitle: {
    fontSize: 11,
    color: stitchColors.inkMuted,
    marginTop: 2,
  },
  openExternalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: stitchColors.paperDeep,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
  },
  pdfToolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  pdfToolbarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.sienna,
  },

  // Tool segment bar
  toolSegment: {
    flexDirection: 'row',
    backgroundColor: stitchColors.paperDeep,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  toolSegmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  toolSegmentButtonActive: {
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  toolSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  toolSegmentTextActive: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },

  body: { flex: 1 },
  tabContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: stitchColors.paper },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  bodyText: { fontSize: 13, color: stitchColors.inkMuted },
  errorTitle: { fontSize: 16, fontWeight: '700', color: stitchColors.ink, textAlign: 'center' },

  // Unavailable PDF fallback container
  unavailableContainer: { padding: 16, paddingBottom: 32 },
  statusCard: {
    backgroundColor: stitchColors.paperDeep,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  statusDescription: {
    fontSize: 13,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 16,
  },
  metaPill: {
    backgroundColor: stitchColors.paperSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginTop: 4,
  },
  quickActionsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: stitchColors.paper,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    gap: 4,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
    marginTop: 4,
  },
  actionCardSub: {
    fontSize: 11,
    color: stitchColors.inkMuted,
  },

  // Shared scroll area
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: stitchColors.ink },
  sectionSubtext: { fontSize: 12, color: stitchColors.inkMuted, lineHeight: 16, marginTop: -4 },

  cardHighlight: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  cardHighlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.sienna,
    marginBottom: 8,
  },
  cardStandard: {
    backgroundColor: stitchColors.paperDeep,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
  },
  cardStandardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 10,
  },
  bodyParagraph: {
    fontSize: 13,
    color: stitchColors.ink,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
  },
  infoLabel: { fontSize: 12, color: stitchColors.inkMuted },
  infoValue: { fontSize: 12, fontWeight: '600', color: stitchColors.ink },

  // Timeline for Plan
  timelineContainer: { gap: 12, marginTop: 4 },
  timelineItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: stitchColors.sienna,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  timelineNumberText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  timelineCard: {
    flex: 1,
    backgroundColor: stitchColors.paperDeep,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
  },
  timelineCardText: { fontSize: 13, fontWeight: '500', color: stitchColors.ink, lineHeight: 18 },

  // Quiz items
  quizList: { gap: 10, marginTop: 4 },
  quizCard: {
    backgroundColor: stitchColors.paperDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    overflow: 'hidden',
  },
  quizQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  quizQuestionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 },
  quizBadge: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  quizBadgeText: { fontSize: 11, fontWeight: '700', color: stitchColors.sienna },
  quizQuestionText: { fontSize: 13, fontWeight: '600', color: stitchColors.ink, flex: 1, lineHeight: 18 },
  quizAnswerBlock: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 211, 153, 0.24)',
  },
  answerIconWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  answerLabel: { fontSize: 12, fontWeight: '700', color: stitchColors.emerald },
  quizAnswerText: { fontSize: 13, color: stitchColors.emeraldTone, lineHeight: 18 },

  // Chat UI
  chatContainer: { flex: 1, backgroundColor: stitchColors.paper },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.paperDeep,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  chatHeaderTitle: { fontSize: 13, fontWeight: '700', color: stitchColors.ink },
  chatHeaderSub: { fontSize: 11, color: stitchColors.inkMuted, marginTop: 1 },
  chatMessagesScroll: { flex: 1 },
  chatMessagesContent: { padding: 16, paddingBottom: 24, gap: 12 },
  emptyChatPromptBox: { gap: 8, marginTop: 8 },
  emptyChatTitle: { fontSize: 12, fontWeight: '700', color: stitchColors.inkMuted, marginBottom: 4 },
  quickPromptButton: {
    backgroundColor: stitchColors.paperDeep,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
  },
  quickPromptText: { fontSize: 12, color: stitchColors.ink, lineHeight: 16 },

  messageRow: { flexDirection: 'row', width: '100%' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: stitchColors.sienna,
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 13, lineHeight: 19 },
  messageTextUser: { color: '#FFFFFF' },
  messageTextAssistant: { color: stitchColors.ink },

  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  aiLoadingText: { fontSize: 12, fontStyle: 'italic', color: stitchColors.inkMuted },

  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: stitchColors.paperDeep,
    borderTopWidth: 1,
    borderTopColor: stitchColors.inkFaint,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: stitchColors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: stitchColors.ink,
    maxHeight: 90,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: stitchColors.sienna,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
