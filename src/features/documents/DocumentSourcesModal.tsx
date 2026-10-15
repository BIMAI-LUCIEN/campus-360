import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AlertCircle,
  CheckSquare,
  FileText,
  Globe,
  Link2,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react-native';

import { authStorage } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import {
  addTextSource,
  addUrlSource,
  deleteSource,
  formatBytes,
  listDocumentSources,
  pickSourceFromPhone,
  uploadDocumentFile,
  type DocumentFile,
  type PickedFile,
} from './documentFilesApi';

// Sources tab of the editor: files from the phone, web pages and pasted notes.
// Ticked sources are the only ones the assistant reads; the choice is kept per
// document on the device (new sources are ticked by default).

const EXCLUDED_KEY = (documentId: string) => `campus360_doc_sources_excluded_v1_${documentId}`;

const loadExcluded = async (documentId: string): Promise<string[]> => {
  try {
    const raw = await authStorage.getItemAsync(EXCLUDED_KEY(documentId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const saveExcluded = (documentId: string, ids: string[]) =>
  authStorage.setItemAsync(EXCLUDED_KEY(documentId), JSON.stringify(ids)).catch(() => undefined);

const kindLabel = (source: DocumentFile) => {
  if (source.origin === 'url') return 'Page web';
  if (source.origin === 'text') return 'Note';
  if (source.mime === 'application/pdf') return 'PDF';
  if (source.mime === 'text/plain') return 'Texte';
  return 'Word';
};

const SourceIcon = ({ source }: { source: DocumentFile }) => {
  const color = stitchColors.primary;
  if (source.origin === 'url') return <Globe size={16} color={color} />;
  if (source.origin === 'text') return <StickyNote size={16} color={color} />;
  return <FileText size={16} color={color} />;
};

type PendingFile = { picked: PickedFile; progress: number; error: string | null };
type AddMode = 'none' | 'url' | 'text';

export type DocumentSourcesPanelProps = {
  documentId: string;
  // Ready + ticked sources, in display order (labels "Source 1, 2…" follow this order).
  onSelectionChange: (selected: DocumentFile[]) => void;
};

export function DocumentSourcesPanel({ documentId, onSelectionChange }: DocumentSourcesPanelProps) {
  const [sources, setSources] = useState<DocumentFile[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [mode, setMode] = useState<AddMode>('none');
  const [url, setUrl] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, ex] = await Promise.all([listDocumentSources(documentId), loadExcluded(documentId)]);
      setSources(list);
      setExcluded(ex);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Oldest first so labels stay stable as sources are added.
  const ordered = useMemo(
    () => [...sources].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [sources],
  );
  const selected = useMemo(
    () => ordered.filter((s) => s.status === 'ready' && !excluded.includes(s.id)),
    [ordered, excluded],
  );

  useEffect(() => {
    onSelectionChange(selected);
  }, [selected, onSelectionChange]);

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      saveExcluded(documentId, next);
      return next;
    });
  };

  const upsert = (source: DocumentFile) =>
    setSources((prev) => [source, ...prev.filter((s) => s.id !== source.id)]);

  const upload = async (picked: PickedFile) => {
    setPending({ picked, progress: 0, error: null });
    try {
      const file = await uploadDocumentFile(documentId, picked, 'source', (progress) =>
        setPending((current) => (current ? { ...current, progress } : current)),
      );
      upsert(file);
      setPending(null);
    } catch (error) {
      setPending({ picked, progress: 0, error: error instanceof Error ? error.message : 'Envoi impossible.' });
    }
  };

  const handlePickFile = async () => {
    try {
      const picked = await pickSourceFromPhone();
      if (picked) await upload(picked);
    } catch (error) {
      Alert.alert('Source', error instanceof Error ? error.message : 'Impossible d’ouvrir vos fichiers.');
    }
  };

  const handleAddUrl = async (value = url) => {
    const target = value.trim();
    if (!/^https?:\/\//i.test(target)) {
      setAddError('Collez une adresse complète qui commence par https://');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      upsert(await addUrlSource(documentId, target));
      setUrl('');
      setMode('none');
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Ajout impossible.');
    } finally {
      setAdding(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !noteText.trim()) {
      setAddError('Donnez un titre et collez le texte de la note.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      upsert(await addTextSource(documentId, noteTitle, noteText));
      setNoteTitle('');
      setNoteText('');
      setMode('none');
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Ajout impossible.');
    } finally {
      setAdding(false);
    }
  };

  // A failed web page is fetched again; the failed row is then removed.
  const retryUrl = async (source: DocumentFile) => {
    if (!source.source_url) return;
    setAdding(true);
    try {
      const fresh = await addUrlSource(documentId, source.source_url);
      await deleteSource(documentId, source).catch(() => undefined);
      setSources((prev) => [fresh, ...prev.filter((s) => s.id !== source.id && s.id !== fresh.id)]);
    } catch (error) {
      Alert.alert('Page web', error instanceof Error ? error.message : 'Nouvel essai impossible.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (source: DocumentFile) => {
    Alert.alert('Retirer la source', `« ${source.title} » ne sera plus utilisée par l’assistant.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSource(documentId, source);
            setSources((prev) => prev.filter((s) => s.id !== source.id));
          } catch (error) {
            Alert.alert('Erreur', error instanceof Error ? error.message : 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const uploading = Boolean(pending && !pending.error);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Ajoutez vos documents de stage, pages web et notes. L’assistant répond à partir des sources cochées et cite la page
        utilisée.
      </Text>

      <View style={styles.addRow}>
        <Pressable style={[styles.addBtn, uploading && styles.disabled]} onPress={handlePickFile} disabled={uploading}>
          <Upload size={15} color={stitchColors.white} />
          <Text style={styles.addBtnText}>Fichier</Text>
        </Pressable>
        <Pressable
          style={[styles.addBtnOutline, mode === 'url' && styles.addBtnOutlineActive]}
          onPress={() => {
            setMode(mode === 'url' ? 'none' : 'url');
            setAddError(null);
          }}
        >
          <Link2 size={15} color={stitchColors.primary} />
          <Text style={styles.addBtnOutlineText}>Lien web</Text>
        </Pressable>
        <Pressable
          style={[styles.addBtnOutline, mode === 'text' && styles.addBtnOutlineActive]}
          onPress={() => {
            setMode(mode === 'text' ? 'none' : 'text');
            setAddError(null);
          }}
        >
          <StickyNote size={15} color={stitchColors.primary} />
          <Text style={styles.addBtnOutlineText}>Note</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>PDF, Word (.docx) ou texte, 20 Mo maximum.</Text>

      {mode === 'url' ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://exemple.com/article"
            placeholderTextColor={stitchColors.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={() => handleAddUrl()}
          />
          <Pressable style={[styles.formBtn, adding && styles.disabled]} onPress={() => handleAddUrl()} disabled={adding}>
            {adding ? <ActivityIndicator size="small" color={stitchColors.white} /> : <Text style={styles.formBtnText}>Ajouter la page</Text>}
          </Pressable>
        </View>
      ) : null}

      {mode === 'text' ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={noteTitle}
            onChangeText={setNoteTitle}
            placeholder="Titre (ex. Notes de réunion avec le tuteur)"
            placeholderTextColor={stitchColors.inkMuted}
            maxLength={200}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Collez ou saisissez le texte"
            placeholderTextColor={stitchColors.inkMuted}
            multiline
            textAlignVertical="top"
          />
          <Pressable style={[styles.formBtn, adding && styles.disabled]} onPress={handleAddNote} disabled={adding}>
            {adding ? <ActivityIndicator size="small" color={stitchColors.white} /> : <Text style={styles.formBtnText}>Ajouter la note</Text>}
          </Pressable>
        </View>
      ) : null}

      {addError ? <Text style={styles.errorText}>{addError}</Text> : null}

      {pending ? (
        <View style={[styles.card, pending.error ? styles.cardError : null]}>
          <FileText size={16} color={stitchColors.primary} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{pending.picked.name}</Text>
            {pending.error ? (
              <>
                <Text style={styles.errorText}>{pending.error}</Text>
                <View style={styles.inlineRow}>
                  <Pressable style={styles.linkBtn} onPress={() => upload(pending.picked)}>
                    <RotateCcw size={13} color={stitchColors.primary} />
                    <Text style={styles.linkBtnText}>Réessayer</Text>
                  </Pressable>
                  <Pressable style={styles.linkBtn} onPress={() => setPending(null)}>
                    <Text style={styles.linkBtnText}>Retirer</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.meta}>
                  {pending.progress < 1 ? `Envoi… ${Math.round(pending.progress * 100)} %` : 'Lecture du document…'}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(4, pending.progress * 100)}%` }]} />
                </View>
              </>
            )}
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={stitchColors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={styles.linkBtn} onPress={load}>
            <Text style={styles.linkBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : ordered.length === 0 && !pending ? (
        <View style={styles.empty}>
          <FileText size={28} color={stitchColors.inkSubtle} />
          <Text style={styles.emptyTitle}>Aucune source</Text>
          <Text style={styles.emptyText}>
            Sans source, l’assistant rédige à partir du plan de votre document. Avec des sources, il s’appuie sur vos documents
            et indique d’où vient chaque information.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            {selected.length} source{selected.length > 1 ? 's' : ''} utilisée{selected.length > 1 ? 's' : ''} par l’assistant
          </Text>
          {ordered.map((source) => {
            const ready = source.status === 'ready';
            const checked = ready && !excluded.includes(source.id);
            const label = ready ? selected.findIndex((s) => s.id === source.id) + 1 : 0;
            return (
              <View key={source.id} style={[styles.card, source.status === 'failed' && styles.cardError]}>
                <Pressable
                  onPress={() => ready && toggle(source.id)}
                  disabled={!ready}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked, disabled: !ready }}
                  accessibilityLabel={`Utiliser ${source.title}`}
                >
                  {source.status === 'pending' ? (
                    <ActivityIndicator size="small" color={stitchColors.primary} />
                  ) : source.status === 'failed' ? (
                    <AlertCircle size={18} color={stitchColors.error} />
                  ) : checked ? (
                    <CheckSquare size={18} color={stitchColors.primary} />
                  ) : (
                    <Square size={18} color={stitchColors.inkSubtle} />
                  )}
                </Pressable>
                <View style={styles.cardBody}>
                  <View style={styles.inlineRow}>
                    <SourceIcon source={source} />
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {label > 0 ? `${label}. ` : ''}
                      {source.title}
                    </Text>
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {kindLabel(source)}
                    {source.page_count > 0 ? ` · ${source.page_count} p.` : ''}
                    {source.origin === 'upload' && source.bytes > 0 ? ` · ${formatBytes(source.bytes)}` : ''}
                    {source.origin === 'url' && source.source_url ? ` · ${source.source_url.replace(/^https?:\/\//, '')}` : ''}
                  </Text>
                  {source.status === 'failed' ? (
                    <>
                      <Text style={styles.errorText}>{source.error || 'Lecture impossible.'}</Text>
                      {source.origin === 'url' ? (
                        <Pressable style={styles.linkBtn} onPress={() => retryUrl(source)} disabled={adding}>
                          <RotateCcw size={13} color={stitchColors.primary} />
                          <Text style={styles.linkBtnText}>Réessayer</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                </View>
                <Pressable onPress={() => handleDelete(source)} hitSlop={8} accessibilityLabel={`Retirer ${source.title}`}>
                  <Trash2 size={15} color={stitchColors.error} />
                </Pressable>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stitchColors.background },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  intro: { color: stitchColors.inkSoft, fontSize: 13, lineHeight: 19 },
  addRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addBtnText: { color: stitchColors.white, fontWeight: '700', fontSize: 13 },
  addBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addBtnOutlineActive: { borderColor: stitchColors.primary, backgroundColor: stitchColors.siennaBg },
  addBtnOutlineText: { color: stitchColors.primary, fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.5 },
  hint: { color: stitchColors.inkMuted, fontSize: 12 },
  form: {
    gap: 8,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    padding: 12,
  },
  input: {
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: stitchColors.ink,
    fontSize: 13.5,
  },
  textArea: { minHeight: 110 },
  formBtn: {
    alignSelf: 'flex-end',
    backgroundColor: stitchColors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    minWidth: 120,
    alignItems: 'center',
  },
  formBtnText: { color: stitchColors.white, fontWeight: '700', fontSize: 13 },
  center: { padding: 24, alignItems: 'center', gap: 8 },
  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: stitchColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  emptyTitle: { color: stitchColors.ink, fontWeight: '700', fontSize: 15 },
  emptyText: { color: stitchColors.inkMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  sectionLabel: { color: stitchColors.inkMuted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    padding: 12,
  },
  cardError: { borderColor: stitchColors.error, backgroundColor: stitchColors.errorBg },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { color: stitchColors.ink, fontWeight: '700', fontSize: 13.5, flexShrink: 1 },
  meta: { color: stitchColors.inkMuted, fontSize: 12 },
  errorText: { color: stitchColors.onErrorContainer, fontSize: 12.5, lineHeight: 17 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  linkBtnText: { color: stitchColors.primary, fontWeight: '700', fontSize: 12.5 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: stitchColors.glassBorder, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: stitchColors.primary },
});
