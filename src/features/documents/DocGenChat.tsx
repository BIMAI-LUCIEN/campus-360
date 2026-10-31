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
import { BookOpen, FileText, Link2, Paperclip, Sparkles, X, Send, Wand2 } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { authFetch } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import { AppAlert } from '../../ui/AppAlert';
import { pickSourceFromPhone, SOURCE_ROLE_LABEL, type PickedFile, type SourceRole } from './documentFilesApi';

type ChatRole = 'user' | 'assistant';
type ChatMsg = { role: ChatRole; content: string };

// Files and links picked before the document exists. They are sent right after
// it is created, then the full generation reads them (see DocumentsScreen).
export type GenAttachment = { id: string; role: SourceRole } & (
  | { type: 'file'; picked: PickedFile }
  | { type: 'url'; url: string }
);

const MAX_ATTACHMENTS = 10;

const storageKeyFor = (sessionKey: string) =>
  `campus360.docgen.${sessionKey.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)}`;

export const IA_CREDITS_FULL_GEN = 5;

const TYPE_LABEL: Record<string, string> = {
  cv: 'CV',
  lettre_motivation: 'lettre de motivation',
  stage: 'rapport de stage',
  memoire: 'mémoire',
  blank: 'document',
};

const SUGGESTIONS: Record<string, string[]> = {
  cv: [
    'Je cherche un premier emploi en développement web',
    'Je veux valoriser mes stages et mes projets académiques',
  ],
  lettre_motivation: [
    'Je réponds à une offre précise',
    'Je souhaite envoyer une candidature spontanée',
  ],
  stage: [
    "J'ai fait un stage en développement web",
    "Je n'ai pas fait de stage, c'est un rapport théorique",
  ],
  memoire: [
    'Je prépare un mémoire académique de recherche',
    'Je prépare un mémoire professionnel ou un projet',
  ],
  blank: ['Je veux rédiger un document sur…'],
};

/**
 * DocGenChat — guided onboarding conversation that feeds the full-document
 * generator. The student answers a few questions, then one tap writes every
 * section (see /api/mobile/documents/generate-full).
 */
export function DocGenChat({
  visible,
  onClose,
  documentType,
  generating,
  onGenerate,
  profileContext,
  sessionKey,
}: {
  visible: boolean;
  onClose: () => void;
  documentType: string;
  generating: boolean;
  onGenerate: (messages: ChatMsg[], attachments: GenAttachment[]) => void;
  profileContext?: Record<string, string>;
  sessionKey: string;
}) {
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [attachments, setAttachments] = React.useState<GenAttachment[]>([]);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState('');
  const scrollRef = React.useRef<ScrollView>(null);
  const activeSessionRef = React.useRef('');
  const hydratedSessionRef = React.useRef('');

  React.useEffect(() => {
    if (!visible || activeSessionRef.current === sessionKey) return;
    activeSessionRef.current = sessionKey;
    hydratedSessionRef.current = '';
    setMessages([]);
    setInput('');
    setAttachments([]);
    setLinkOpen(false);
    setLinkValue('');
    void SecureStore.getItemAsync(storageKeyFor(sessionKey))
      .then((saved) => {
        if (activeSessionRef.current !== sessionKey) return;
        if (saved) {
          const parsed = JSON.parse(saved) as ChatMsg[];
          if (Array.isArray(parsed)) setMessages(parsed);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (activeSessionRef.current === sessionKey) hydratedSessionRef.current = sessionKey;
      });
  }, [sessionKey, visible]);

  React.useEffect(() => {
    if (hydratedSessionRef.current !== sessionKey) return;
    void SecureStore.setItemAsync(storageKeyFor(sessionKey), JSON.stringify(messages)).catch(() => {});
  }, [messages, sessionKey]);

  const label = TYPE_LABEL[documentType] ?? 'document';
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const requiredTurns = documentType === 'memoire'
    ? 7
    : documentType === 'cv' || documentType === 'lettre_motivation'
      ? 3
      : 2;
  const canGenerate = userTurns >= requiredTurns && !loading && !generating;

  const acceptsSources = documentType === 'stage' || documentType === 'memoire';
  const attachmentsFull = attachments.length >= MAX_ATTACHMENTS;

  const addFile = async (role: SourceRole) => {
    if (attachmentsFull) return;
    try {
      const picked = await pickSourceFromPhone();
      if (picked) setAttachments((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, role, type: 'file', picked }]);
    } catch (error) {
      AppAlert.alert('Document', error instanceof Error ? error.message : 'Impossible d’ouvrir tes fichiers.');
    }
  };

  const addLink = () => {
    const url = linkValue.trim();
    if (!/^https?:\/\//i.test(url)) {
      AppAlert.alert('Lien', 'Colle une adresse complète qui commence par https://');
      return;
    }
    setAttachments((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, role: 'reference', type: 'url', url }]);
    setLinkValue('');
    setLinkOpen(false);
  };

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const send = React.useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading || generating) return;
      const next = [...messages, { role: 'user' as const, content: text }];
      setMessages(next);
      setInput('');
      setLoading(true);
      scrollToEnd();
      try {
        const res = await authFetch('/api/mobile/documents/onboard-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next, documentType, profileContext }),
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
    [messages, loading, generating, documentType, profileContext],
  );

  // Full-screen state while every section is being written.
  if (generating) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.genBackdrop}>
          <View style={styles.genCard}>
            <ActivityIndicator size="large" color={stitchColors.sienna} />
            <Text style={styles.genTitle}>Rédaction en cours…</Text>
            <Text style={styles.genBody}>
              {attachments.length > 0
                ? `L'IA lit tes ${attachments.length} document${attachments.length > 1 ? 's' : ''}, puis rédige chaque section de ton ${label} à partir de leur contenu. Cela prend une à deux minutes.`
                : `L'IA rédige chaque section de ton ${label}. Cela prend environ une minute.`}
            </Text>
            <Text style={styles.genHint}>
              Tu peux quitter l&apos;app : une notification te préviendra dès que c&apos;est prêt.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={18} color={stitchColors.sienna} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Générer mon {label}</Text>
              <Text style={styles.headerSub}>Réponds à quelques questions</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={stitchColors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Parle-moi de ton {label}</Text>
                <Text style={styles.emptyBody}>
                  Je connais déjà les informations disponibles dans ton profil. Confirme-les et
                  réponds à quelques questions ciblées avant la rédaction complète.
                </Text>
                <View style={styles.suggestions}>
                  {(SUGGESTIONS[documentType] ?? SUGGESTIONS.blank).map((s) => (
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
                  <View
                    style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}
                  >
                    <Text style={m.role === 'user' ? styles.textUser : styles.textAi}>
                      {m.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
            {loading ? (
              <View style={[styles.bubbleRow, styles.rowAi]}>
                <View style={[styles.bubble, styles.bubbleAi, styles.typing]}>
                  <ActivityIndicator size="small" color={stitchColors.sienna} />
                  <Text style={styles.typingText}>L&apos;assistant réfléchit…</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {acceptsSources ? (
            <View style={styles.sourcesWrap}>
              <Text style={styles.sourcesTitle}>Tes documents et références (facultatif)</Text>
              <Text style={styles.sourcesHint}>
                Joins tes rapports journaliers ou notes de stage, et les références à suivre : l&apos;IA rédige à partir de leur contenu.
              </Text>
              <View style={styles.sourcesRow}>
                <Pressable
                  style={[styles.sourceBtn, attachmentsFull && styles.ctaDisabled]}
                  onPress={() => addFile('personal')}
                  disabled={attachmentsFull}
                >
                  <Paperclip size={14} color={stitchColors.sienna} />
                  <Text style={styles.sourceBtnText}>Mon fichier</Text>
                </Pressable>
                <Pressable
                  style={[styles.sourceBtn, attachmentsFull && styles.ctaDisabled]}
                  onPress={() => addFile('reference')}
                  disabled={attachmentsFull}
                >
                  <BookOpen size={14} color={stitchColors.sienna} />
                  <Text style={styles.sourceBtnText}>Fichier de référence</Text>
                </Pressable>
                <Pressable
                  style={[styles.sourceBtn, (attachmentsFull || linkOpen) && styles.ctaDisabled]}
                  onPress={() => setLinkOpen(true)}
                  disabled={attachmentsFull || linkOpen}
                >
                  <Link2 size={14} color={stitchColors.sienna} />
                  <Text style={styles.sourceBtnText}>Lien de référence</Text>
                </Pressable>
              </View>
              {linkOpen ? (
                <View style={styles.linkRow}>
                  <TextInput
                    style={[styles.input, styles.linkInput]}
                    placeholder="https://…"
                    placeholderTextColor={stitchColors.inkSubtle}
                    value={linkValue}
                    onChangeText={setLinkValue}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    onSubmitEditing={addLink}
                  />
                  <Pressable style={styles.linkAdd} onPress={addLink}>
                    <Text style={styles.linkAddText}>Ajouter</Text>
                  </Pressable>
                  <Pressable onPress={() => setLinkOpen(false)} hitSlop={8}>
                    <X size={16} color={stitchColors.inkMuted} />
                  </Pressable>
                </View>
              ) : null}
              {attachments.map((a) => (
                <View key={a.id} style={styles.chip}>
                  {a.type === 'url' ? (
                    <Link2 size={14} color={stitchColors.inkMuted} />
                  ) : (
                    <FileText size={14} color={stitchColors.inkMuted} />
                  )}
                  <Text style={styles.chipText} numberOfLines={1}>
                    {a.type === 'url' ? a.url.replace(/^https?:\/\//i, '') : a.picked.name}
                  </Text>
                  <Text style={styles.chipRole}>{SOURCE_ROLE_LABEL[a.role]}</Text>
                  <Pressable
                    onPress={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    hitSlop={8}
                    accessibilityLabel="Retirer ce document"
                  >
                    <X size={14} color={stitchColors.inkMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* Generate CTA */}
          <View style={styles.ctaWrap}>
            <Pressable
              style={[styles.cta, !canGenerate && styles.ctaDisabled]}
              onPress={() => onGenerate(messages, acceptsSources ? attachments : [])}
              disabled={!canGenerate}
            >
              <Wand2 size={17} color={stitchColors.white} strokeWidth={2.2} />
              <Text style={styles.ctaText}>
                {documentType === 'memoire' ? 'Valider le plan et rédiger' : `Générer mon ${label}`} ({IA_CREDITS_FULL_GEN} crédits)
              </Text>
            </Pressable>
            {!canGenerate && userTurns < requiredTurns ? (
              <Text style={styles.ctaHint}>
                {documentType === 'memoire'
                  ? `Complète encore ${requiredTurns - userTurns} étape${requiredTurns - userTurns > 1 ? 's' : ''} avant de valider le plan.`
                  : `Réponds à au moins ${requiredTurns} questions pour lancer la rédaction.`}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Ta réponse…"
              placeholderTextColor={stitchColors.inkSubtle}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!loading}
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
    height: '88%',
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
  typing: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingText: { color: stitchColors.inkMuted, fontSize: 13 },
  sourcesWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: stitchColors.inkFaint,
  },
  sourcesTitle: { color: stitchColors.ink, fontSize: 13, fontWeight: '800' },
  sourcesHint: { color: stitchColors.inkMuted, fontSize: 12, lineHeight: 17 },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  sourceBtnText: { color: stitchColors.sienna, fontSize: 12.5, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkInput: { minHeight: 38, paddingVertical: 8 },
  linkAdd: { backgroundColor: stitchColors.siennaDeep, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  linkAddText: { color: stitchColors.white, fontSize: 12.5, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  chipText: { flex: 1, color: stitchColors.inkSoft, fontSize: 12.5 },
  chipRole: { color: stitchColors.sienna, fontSize: 11, fontWeight: '700' },
  ctaWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: stitchColors.inkFaint,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: stitchColors.siennaDeep,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: stitchColors.white, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  ctaHint: {
    color: stitchColors.inkSubtle,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
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
    paddingVertical: 12,
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
  // Generating overlay
  genBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  genCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 24,
  },
  genTitle: { color: stitchColors.ink, fontSize: 17, fontWeight: '800', marginTop: 4 },
  genBody: { color: stitchColors.inkSoft, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  genHint: { color: stitchColors.inkMuted, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
});
