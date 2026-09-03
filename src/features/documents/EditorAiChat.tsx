import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Sparkles, X, Send, CornerDownLeft } from 'lucide-react-native';
import { authFetch } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';

type ChatRole = 'user' | 'assistant';
type ChatMsg = { role: ChatRole; content: string };

const SUGGESTIONS = [
  'Rédige une introduction pour cette section',
  'Améliore et reformule le texte actuel',
  'Propose un plan détaillé pour ce document',
  'Corrige les fautes et le style',
];

// Escape then convert a plain-text AI reply into the simple HTML the editor's
// insertAIHtml expects (paragraphs on blank lines, <br> on single newlines).
const textToHtml = (text: string): string => {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
};

export function EditorAiChat({
  visible,
  onClose,
  documentId,
  currentSectionTitle,
  sourcesCount = 0,
  onInsert,
  onReplaceSection,
}: {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  currentSectionTitle?: string;
  sourcesCount?: number;
  onInsert: (html: string) => void;
  onReplaceSection?: (html: string) => void;
}) {
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const draftFullSection = React.useCallback(async () => {
    if (loading) return;
    const prompt = `Rédige l'intégralité du contenu de la section « ${currentSectionTitle || 'Section courante'} » en t'appuyant sur mes documents de stage et nos échanges.`;
    const next = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(next);
    setLoading(true);
    scrollToEnd();
    try {
      const res = await authFetch(`/api/mobile/documents/${documentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          currentSectionTitle,
          action: 'draft_section',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur IA.');
      setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply || '') }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err instanceof Error
              ? `⚠️ ${err.message}`
              : "⚠️ Impossible de contacter l'assistant.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [loading, messages, documentId, currentSectionTitle]);

  const send = React.useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;
      const next = [...messages, { role: 'user' as const, content: text }];
      setMessages(next);
      setInput('');
      setLoading(true);
      scrollToEnd();
      try {
        const res = await authFetch(`/api/mobile/documents/${documentId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next, currentSectionTitle }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur IA.');
        setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply || '') }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              err instanceof Error
                ? `⚠️ ${err.message}`
                : "⚠️ Impossible de contacter l'assistant.",
          },
        ]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [messages, loading, documentId, currentSectionTitle],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={18} color={stitchColors.sienna} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Assistant de rédaction</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {currentSectionTitle ? (
                  <Text style={styles.headerSub} numberOfLines={1}>
                    Section : {currentSectionTitle}
                  </Text>
                ) : null}
                {sourcesCount > 0 ? (
                  <Text style={styles.sourcesBadge}>
                    • 📚 {sourcesCount} source{sourcesCount > 1 ? 's' : ''}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={stitchColors.inkMuted} />
            </Pressable>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Comment puis-je t&apos;aider ?</Text>
                <Text style={styles.emptyBody}>
                  Je connais ton document, son plan et tes sources importées. Demande-moi de rédiger,
                  reformuler, corriger ou générer.
                </Text>
                
                <Pressable style={styles.autoDraftBtn} onPress={draftFullSection}>
                  <Sparkles size={15} color="#FFFFFF" />
                  <Text style={styles.autoDraftText}>⚡ Rédiger toute la section avec mes sources</Text>
                </Pressable>

                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} style={styles.suggestion} onPress={() => send(s)}>
                      <Text style={styles.suggestionText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((m, i) => (
                <View
                  key={i}
                  style={[styles.bubbleRow, m.role === 'user' ? styles.rowUser : styles.rowAi]}
                >
                  <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                    <Text style={m.role === 'user' ? styles.textUser : styles.textAi}>
                      {m.content}
                    </Text>
                    {m.role === 'assistant' && !m.content.startsWith('⚠️') ? (
                      <View style={styles.actionRow}>
                        <Pressable
                          style={styles.insertBtn}
                          onPress={() => {
                            onInsert(textToHtml(m.content));
                            onClose();
                          }}
                        >
                          <CornerDownLeft size={13} color={stitchColors.emerald} />
                          <Text style={styles.insertText}>Insérer au curseur</Text>
                        </Pressable>

                        {onReplaceSection ? (
                          <Pressable
                            style={styles.replaceBtn}
                            onPress={() => {
                              onReplaceSection(textToHtml(m.content));
                              onClose();
                            }}
                          >
                            <Sparkles size={13} color="#FFFFFF" />
                            <Text style={styles.replaceText}>Remplacer la section</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
            {loading ? (
              <View style={[styles.bubbleRow, styles.rowAi]}>
                <View style={[styles.bubble, styles.bubbleAi, styles.typing]}>
                  <ActivityIndicator size="small" color={stitchColors.sienna} />
                  <Text style={styles.typingText}>L&apos;assistant rédige…</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Écris ta demande…"
              placeholderTextColor={stitchColors.inkSubtle}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!loading}
              onSubmitEditing={() => send(input)}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
            >
              <Send size={18} color={stitchColors.white} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    height: '86%',
    backgroundColor: stitchColors.paperDeep,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.siennaBg,
  },
  headerTitle: { color: stitchColors.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { color: stitchColors.inkMuted, fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.paperSoft,
  },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  empty: { paddingVertical: 12, gap: 8 },
  emptyTitle: { color: stitchColors.ink, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: stitchColors.inkMuted, fontSize: 14, lineHeight: 20 },
  suggestions: { marginTop: 8, gap: 8 },
  suggestion: {
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  suggestionText: { color: stitchColors.inkSoft, fontSize: 13.5, fontWeight: '500' },
  bubbleRow: { flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 13 },
  bubbleUser: { backgroundColor: stitchColors.siennaBg, borderBottomRightRadius: 5 },
  bubbleAi: {
    backgroundColor: stitchColors.paperSoft,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
  },
  textUser: { color: stitchColors.ink, fontSize: 14.5, lineHeight: 21 },
  textAi: { color: stitchColors.inkSoft, fontSize: 14.5, lineHeight: 21 },
  sourcesBadge: {
    color: stitchColors.sienna,
    fontSize: 11.5,
    fontWeight: '700',
  },
  autoDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  autoDraftText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  insertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.emeraldBg,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  insertText: { color: stitchColors.emerald, fontSize: 12.5, fontWeight: '700' },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4338CA',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  replaceText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingText: { color: stitchColors.inkMuted, fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.paperDeep,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
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
