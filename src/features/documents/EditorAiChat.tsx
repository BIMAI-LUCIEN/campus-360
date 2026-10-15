import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BookOpen, CornerDownLeft, MessageCircle, PenLine, Send, Sparkles } from 'lucide-react-native';

import { authFetchRawAt, mobileApiBaseUrl } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import type { DocumentFile, SourceCitation } from './documentFilesApi';
import { htmlToReadable, insertableHtml, textToHtml } from './aiHtml';
import { SectionInterview } from './SectionInterview';

// Assistant tab of the editor. Two modes: « Rédiger avec moi » (interview, then a
// draft in the student's voice) and « Discuter » (chat that answers from the
// ticked sources and lists the passages it relied on).

type ChatRole = 'user' | 'assistant';
type ChatMsg = {
  role: ChatRole;
  content: string;
  // Full-section drafts come back as HTML, chat answers as plain text.
  format?: 'text' | 'html';
  citations?: SourceCitation[];
  error?: boolean;
};

const SUGGESTIONS = [
  'Rédige une introduction pour cette section',
  'Résume mes sources en points clés',
  'Améliore et reformule le texte actuel',
  'Corrige les fautes et le style',
];

const toInsertableHtml = (m: ChatMsg) => (m.format === 'html' ? insertableHtml(m.content) : textToHtml(m.content));

type EditorAiChatProps = {
  documentId: string;
  currentSectionTitle?: string;
  // Set when the current section can be written through the interview.
  interviewSectionId?: string;
  // Ready + ticked sources, in the order shown in the Sources tab.
  selectedSources: DocumentFile[];
  onInsert: (html: string) => void;
  onReplaceSection?: (html: string) => void;
  onOpenSources: () => void;
};

export function EditorAiChat({
  documentId,
  currentSectionTitle,
  interviewSectionId,
  selectedSources,
  onInsert,
  onReplaceSection,
  onOpenSources,
}: EditorAiChatProps) {
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<'interview' | 'chat'>('interview');
  const scrollRef = React.useRef<ScrollView>(null);

  const scrollToEnd = () => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const ask = React.useCallback(
    async (prompt: string, action: 'chat' | 'draft_section') => {
      const text = prompt.trim();
      if (!text || loading) return;
      const history = [...messages.filter((m) => !m.error), { role: 'user' as const, content: text }];
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setInput('');
      setLoading(true);
      scrollToEnd();
      try {
        const res = await authFetchRawAt(mobileApiBaseUrl, `/api/mobile/documents/${documentId}/chat`, {
          method: 'POST',
          body: JSON.stringify({
            // Only the last exchanges: enough context, bounded cost.
            messages: history.slice(-12).map((m) => ({
              role: m.role,
              content: m.format === 'html' ? htmlToReadable(m.content) : m.content,
            })),
            currentSectionTitle,
            action,
            sourceIds: selectedSources.map((s) => s.id),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { reply?: string; citations?: SourceCitation[]; error?: string };
        if (!res.ok) throw new Error(data.error || `Erreur de l’assistant (${res.status}).`);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: String(data.reply || ''),
            format: action === 'draft_section' ? 'html' : 'text',
            citations: data.citations,
          },
        ]);
      } catch (err) {
        const message =
          err instanceof Error && err.message !== 'Network request failed'
            ? err.message
            : 'Connexion impossible. Vérifiez votre réseau et réessayez.';
        setMessages((prev) => [...prev, { role: 'assistant', content: message, error: true }]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [loading, messages, documentId, currentSectionTitle, selectedSources],
  );

  const draftFullSection = () =>
    ask(
      `Rédige l'intégralité du contenu de la section « ${currentSectionTitle || 'Section courante'} » en t'appuyant sur mes sources et nos échanges.`,
      'draft_section',
    );

  const openCitation = (c: SourceCitation) => {
    const heading = `[${c.label}] ${c.title}${c.page ? ` · page ${c.page}` : ''}`;
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' }[] = [{ text: 'Fermer', style: 'cancel' }];
    if (c.sourceUrl) buttons.push({ text: 'Ouvrir la page', onPress: () => Linking.openURL(c.sourceUrl!).catch(() => undefined) });
    Alert.alert(heading, `« ${c.excerpt.trim()}${c.excerpt.length >= 400 ? '…' : ''} »`, buttons);
  };

  const sourceCount = selectedSources.length;
  const interviewMode = mode === 'interview' && Boolean(interviewSectionId);

  const modeBar = interviewSectionId ? (
    <View style={styles.modeBar}>
      {([
        { key: 'interview', label: 'Rédiger avec moi', Icon: PenLine },
        { key: 'chat', label: 'Discuter', Icon: MessageCircle },
      ] as const).map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <Pressable
            key={key}
            style={[styles.modeBtn, active && styles.modeBtnActive]}
            onPress={() => setMode(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Icon size={14} color={active ? stitchColors.primary : stitchColors.inkMuted} />
            <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {modeBar}
      <Pressable style={styles.sourcesBar} onPress={onOpenSources} accessibilityRole="button">
        <BookOpen size={14} color={sourceCount > 0 ? stitchColors.primary : stitchColors.inkMuted} />
        <Text style={[styles.sourcesBarText, sourceCount > 0 && styles.sourcesBarTextActive]} numberOfLines={1}>
          {sourceCount > 0
            ? `${sourceCount} source${sourceCount > 1 ? 's' : ''} utilisée${sourceCount > 1 ? 's' : ''} : ${selectedSources.map((s, i) => `${i + 1}. ${s.title}`).join(', ')}`
            : 'Aucune source cochée — touchez pour en ajouter'}
        </Text>
      </Pressable>

      {interviewMode && interviewSectionId ? (
        <View style={styles.messages}>
          <SectionInterview
            key={interviewSectionId}
            documentId={documentId}
            sectionId={interviewSectionId}
            sectionTitle={currentSectionTitle || ''}
            selectedSources={selectedSources}
            onInsert={onInsert}
            onReplaceSection={onReplaceSection}
          />
        </View>
      ) : (
      <>
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Comment puis-je t’aider ?</Text>
            <Text style={styles.emptyBody}>
              Section : {currentSectionTitle || '—'}. Je connais le plan du document
              {sourceCount > 0 ? ' et je réponds à partir de tes sources cochées, en citant la page.' : '.'}
            </Text>
            <Pressable style={styles.autoDraftBtn} onPress={draftFullSection}>
              <Sparkles size={15} color={stitchColors.white} />
              <Text style={styles.autoDraftText}>Rédiger toute la section{sourceCount > 0 ? ' avec mes sources' : ''}</Text>
            </Pressable>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestion} onPress={() => ask(s, 'chat')}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((m, i) => {
            const cited = (m.citations || []).filter((c) => c.cited);
            const shown = cited.length > 0 ? cited : (m.citations || []).slice(0, 3);
            return (
              <View key={i} style={[styles.bubbleRow, m.role === 'user' ? styles.rowUser : styles.rowAi]}>
                <View
                  style={[
                    styles.bubble,
                    m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                    m.error && styles.bubbleError,
                  ]}
                >
                  <Text style={m.role === 'user' ? styles.textUser : m.error ? styles.textError : styles.textAi} selectable>
                    {m.format === 'html' ? htmlToReadable(m.content) : m.content}
                  </Text>

                  {m.role === 'assistant' && shown.length > 0 ? (
                    <View style={styles.citations}>
                      <Text style={styles.citationsLabel}>{cited.length > 0 ? 'Sources citées' : 'Passages consultés'}</Text>
                      {shown.map((c) => (
                        <Pressable
                          key={`${c.sourceId}:${c.page ?? 0}`}
                          style={styles.citationChip}
                          onPress={() => openCitation(c)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.citationText} numberOfLines={1}>
                            [{c.label}] {c.title}
                            {c.page ? ` · p.${c.page}` : ''}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  {m.role === 'assistant' && !m.error ? (
                    <View style={styles.actionRow}>
                      <Pressable style={styles.insertBtn} onPress={() => onInsert(toInsertableHtml(m))}>
                        <CornerDownLeft size={13} color={stitchColors.emeraldDeep} />
                        <Text style={styles.insertText}>Insérer au curseur</Text>
                      </Pressable>
                      {onReplaceSection ? (
                        <Pressable
                          style={styles.replaceBtn}
                          onPress={() =>
                            Alert.alert('Remplacer la section', 'Le contenu actuel de la section sera remplacé.', [
                              { text: 'Annuler', style: 'cancel' },
                              { text: 'Remplacer', style: 'destructive', onPress: () => onReplaceSection(toInsertableHtml(m)) },
                            ])
                          }
                        >
                          <Sparkles size={13} color={stitchColors.white} />
                          <Text style={styles.replaceText}>Remplacer la section</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
        {loading ? (
          <View style={[styles.bubbleRow, styles.rowAi]}>
            <View style={[styles.bubble, styles.bubbleAi, styles.typing]}>
              <ActivityIndicator size="small" color={stitchColors.sienna} />
              <Text style={styles.typingText}>
                {sourceCount > 0 ? 'Lecture des sources et rédaction…' : 'L’assistant rédige…'}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Pose une question sur tes sources ou demande une rédaction…"
          placeholderTextColor={stitchColors.inkSubtle}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
          editable={!loading}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => ask(input, 'chat')}
          disabled={!input.trim() || loading}
          accessibilityLabel="Envoyer"
        >
          <Send size={18} color={stitchColors.white} />
        </Pressable>
      </View>
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stitchColors.paperDeep },
  modeBar: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: stitchColors.siennaBg },
  modeText: { color: stitchColors.inkMuted, fontSize: 13.5, fontWeight: '600' },
  modeTextActive: { color: stitchColors.primary, fontWeight: '700' },
  sourcesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
  },
  sourcesBarText: { flex: 1, color: stitchColors.inkMuted, fontSize: 12.5 },
  sourcesBarTextActive: { color: stitchColors.primary, fontWeight: '600' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  empty: { paddingVertical: 8, gap: 8 },
  emptyTitle: { color: stitchColors.ink, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: stitchColors.inkMuted, fontSize: 14, lineHeight: 20 },
  suggestions: { marginTop: 8, gap: 8 },
  suggestion: {
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  suggestionText: { color: stitchColors.inkSoft, fontSize: 13.5, fontWeight: '500' },
  bubbleRow: { flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '90%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 13 },
  bubbleUser: { backgroundColor: stitchColors.siennaBg, borderBottomRightRadius: 5 },
  bubbleAi: {
    backgroundColor: stitchColors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  bubbleError: { backgroundColor: stitchColors.errorBg, borderColor: stitchColors.error },
  textUser: { color: stitchColors.ink, fontSize: 14.5, lineHeight: 21 },
  textAi: { color: stitchColors.inkSoft, fontSize: 14.5, lineHeight: 21 },
  textError: { color: stitchColors.onErrorContainer, fontSize: 14, lineHeight: 20 },
  citations: { marginTop: 10, gap: 6 },
  citationsLabel: { color: stitchColors.inkMuted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' },
  citationChip: {
    backgroundColor: stitchColors.siennaBg,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  citationText: { color: stitchColors.siennaDeep, fontSize: 12.5, fontWeight: '600' },
  autoDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stitchColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  autoDraftText: { color: stitchColors.white, fontSize: 13.5, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  insertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.emeraldBg,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  insertText: { color: stitchColors.emeraldDeep, fontSize: 12.5, fontWeight: '700' },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.siennaDeep,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  replaceText: { color: stitchColors.white, fontSize: 12.5, fontWeight: '700' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingText: { color: stitchColors.inkMuted, fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: stitchColors.ink,
    fontSize: 14.5,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.siennaDeep,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
