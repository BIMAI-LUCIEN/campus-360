import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MessageSquare, RotateCcw, Send, X } from 'lucide-react-native';
import { FormattedMarkdown } from '../../components/FormattedMarkdown';
import type { CampusDocument } from '../../types';
import { stitchColors } from '../../theme/stitch';
import { askPdfAssistant, PassRequiredError, type PdfAssistantMessage, type PdfZone } from './pdfAssistant';

const SHORTCUTS = ['Explique', 'Résous pas à pas', 'Donne un exemple similaire'];

interface ZoneQuestionSheetProps {
  document: CampusDocument;
  zone: PdfZone | null;
  onClose: () => void;
  // Hands the exchange over to the Assistant tab.
  onContinue: (messages: PdfAssistantMessage[]) => void;
  onAllowance: (allowance: number | 'pass' | null) => void;
  onPassRequired: (message: string) => void;
}

// Bottom sheet for a question about the zone circled in the viewer (Module 30).
// The image stays attached while the student keeps asking here; a new zone resets it.
export function ZoneQuestionSheet({ document, zone, onClose, onContinue, onAllowance, onPassRequired }: ZoneQuestionSheetProps) {
  const [messages, setMessages] = useState<PdfAssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; question: string } | null>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setError(null);
  }, [zone]);

  if (!zone) return null;

  const ask = async (questionText: string) => {
    const question = questionText.trim();
    if (!question || loading) return;
    const userMsg: PdfAssistantMessage = { id: `user-${Date.now()}`, role: 'user', content: question, zonePage: zone.page };
    const history = messages;
    setMessages([...history, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const { answer, freeActionsLeft, passActive } = await askPdfAssistant({ document, question, messages: history, zone });
      onAllowance(passActive ? 'pass' : freeActionsLeft);
      setMessages([...history, userMsg, { id: `assistant-${Date.now()}`, role: 'assistant', content: answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "L'assistant est indisponible pour le moment.";
      if (err instanceof PassRequiredError) {
        onAllowance(0);
        onPassRequired(message);
      }
      // The unanswered question is taken back so a retry does not duplicate it.
      setMessages(history);
      setError({ message, question });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Image source={{ uri: zone.image }} style={styles.thumbnail} resizeMode="contain" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Question sur ta zone</Text>
          <Text style={styles.subtitle}>Page {zone.page}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={onClose} accessibilityLabel="Fermer">
          <X size={18} color={stitchColors.inkMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {messages.length === 0 && !loading ? (
          <View style={styles.shortcuts}>
            {SHORTCUTS.map((label) => (
              <Pressable key={label} style={styles.shortcut} onPress={() => ask(label)}>
                <Text style={styles.shortcutText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <View key={msg.id} style={styles.userBubble}>
              <Text style={styles.userText}>{msg.content}</Text>
            </View>
          ) : (
            <View key={msg.id} style={styles.answer}>
              <FormattedMarkdown content={msg.content} baseTextColor={stitchColors.ink} isDark={true} />
            </View>
          ),
        )}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={stitchColors.sienna} />
            <Text style={styles.loadingText}>L'IA lit ta zone...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error.message}</Text>
            <Pressable style={styles.retryBtn} onPress={() => ask(error.question)}>
              <RotateCcw size={14} color={stitchColors.sienna} />
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {messages.some((msg) => msg.role === 'assistant') ? (
        <Pressable style={styles.continueBtn} onPress={() => onContinue(messages)}>
          <MessageSquare size={14} color={stitchColors.sienna} />
          <Text style={styles.continueText}>Continuer dans l'Assistant</Text>
        </Pressable>
      ) : null}

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ta question sur cette partie..."
          placeholderTextColor={stitchColors.inkMuted}
          style={styles.input}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => ask(input)}
          disabled={!input.trim() || loading}
          accessibilityLabel="Envoyer la question"
        >
          <Send size={16} color={stitchColors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    backgroundColor: stitchColors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: stitchColors.inkFaint,
    shadowColor: stitchColors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
  },
  thumbnail: {
    width: 72,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.sienna,
    backgroundColor: stitchColors.paperSoft,
  },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: stitchColors.ink },
  subtitle: { fontSize: 12, color: stitchColors.inkMuted, marginTop: 2 },
  iconBtn: { padding: 6 },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 10 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcut: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  shortcutText: { fontSize: 13, fontWeight: '600', color: stitchColors.sienna },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: stitchColors.sienna,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userText: { fontSize: 13, lineHeight: 19, color: stitchColors.white },
  answer: {
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  loadingText: { fontSize: 12, fontStyle: 'italic', color: stitchColors.inkMuted },
  errorBox: { backgroundColor: stitchColors.errorBg, borderRadius: 12, padding: 12, gap: 8 },
  errorText: { fontSize: 13, color: stitchColors.ink },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  retryText: { fontSize: 13, fontWeight: '700', color: stitchColors.sienna },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  continueText: { fontSize: 13, fontWeight: '700', color: stitchColors.sienna },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: stitchColors.paperDeep,
    borderTopWidth: 1,
    borderTopColor: stitchColors.inkFaint,
  },
  input: {
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
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: stitchColors.sienna,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
