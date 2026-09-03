import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FileText, Plus, Trash2, X, Upload, CheckCircle2 } from 'lucide-react-native';
import { authFetch } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';

export type DocumentSourceItem = {
  id: string;
  document_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  extracted_text: string;
  summary?: string;
  created_at: string;
};

type DocumentSourcesModalProps = {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  onSourcesUpdated?: (count: number) => void;
};

export function DocumentSourcesModal({
  visible,
  onClose,
  documentId,
  onSourcesUpdated,
}: DocumentSourcesModalProps) {
  const [sources, setSources] = useState<DocumentSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [textContent, setTextContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/mobile/documents/${documentId}/sources`);
      if (res.ok) {
        const data = await res.json();
        const list = data.sources || [];
        setSources(list);
        onSourcesUpdated?.(list.length);
      }
    } catch (e) {
      console.warn('Load sources error:', e);
    } finally {
      setLoading(false);
    }
  }, [documentId, onSourcesUpdated]);

  useEffect(() => {
    if (visible) {
      loadSources();
    }
  }, [visible, loadSources]);

  const handleAddSource = async () => {
    if (!fileName.trim()) {
      Alert.alert('Nom requis', 'Donnez un nom à votre source (ex: Rapport_Entreprise.pdf).');
      return;
    }
    if (!textContent.trim() && !fileUrl.trim()) {
      Alert.alert('Contenu requis', 'Renseignez un extrait de texte ou un lien vers le document.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/mobile/documents/${documentId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName.trim(),
          fileType,
          fileUrl: fileUrl.trim() || 'https://campus360b.site/documents/source',
          extractedText: textContent.trim(),
          fileSize: textContent.length,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Échec de l'ajout.");
      }

      setFileName('');
      setTextContent('');
      setFileUrl('');
      setShowAddForm(false);
      await loadSources();
      Alert.alert('✅ Source ajoutée', "L'IA utilisera cette source pour rédiger et contextualiser votre rapport.");
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Impossible d'ajouter la source.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSource = async (sourceId: string, name: string) => {
    Alert.alert(
      'Supprimer la source',
      `Voulez-vous retirer "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authFetch(`/api/mobile/documents/${documentId}/sources/${sourceId}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                const next = sources.filter((s) => s.id !== sourceId);
                setSources(next);
                onSourcesUpdated?.(next.length);
              }
            } catch {
              Alert.alert('Erreur', 'Suppression impossible.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <FileText size={18} color="#818CF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Sources & Documents de référence</Text>
              <Text style={styles.headerSub}>
                {sources.length} document{sources.length > 1 ? 's' : ''} injecté{sources.length > 1 ? 's' : ''} dans la mémoire de l&apos;IA
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Callout information */}
            <View style={styles.infoBanner}>
              <CheckCircle2 size={16} color="#34D399" />
              <Text style={styles.infoText}>
                Tous les documents téléversés ici (livret d&apos;accueil, notes de stage, cahier des charges) sont analysés et alimentent les suggestions de l&apos;IA.
              </Text>
            </View>

            {/* List of existing sources */}
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#818CF8" />
                <Text style={styles.loadingText}>Chargement des sources...</Text>
              </View>
            ) : sources.length === 0 && !showAddForm ? (
              <View style={styles.emptyBox}>
                <FileText size={36} color="#475569" />
                <Text style={styles.emptyTitle}>Aucune source ajoutée</Text>
                <Text style={styles.emptyDesc}>
                  Importez vos notes de stage, documents PDF ou rapports de réunion pour que l&apos;IA écrive avec les vraies données de votre stage.
                </Text>
                <Pressable style={styles.primaryBtn} onPress={() => setShowAddForm(true)}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Ajouter une première source</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.sourcesList}>
                {sources.map((s) => (
                  <View key={s.id} style={styles.sourceCard}>
                    <View style={styles.sourceIconBox}>
                      <FileText size={20} color="#818CF8" />
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.sourceName} numberOfLines={1}>
                        {s.file_name}
                      </Text>
                      <Text style={styles.sourceMeta}>
                        {s.file_type.toUpperCase()} • {s.extracted_text ? `${s.extracted_text.length} caractères indexés` : 'Lien de référence'}
                      </Text>
                      {s.summary ? (
                        <Text style={styles.sourceSummary} numberOfLines={2}>
                          {s.summary}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={styles.deleteIconBtn}
                      onPress={() => handleDeleteSource(s.id, s.file_name)}
                    >
                      <Trash2 size={16} color="#F87171" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Add Source Form */}
            {showAddForm ? (
              <View style={styles.formContainer}>
                <Text style={styles.formHeading}>Ajouter un document de stage</Text>

                <Text style={styles.inputLabel}>Nom du fichier / Référence</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Livret_Entreprise_2026.pdf ou Notes_Semaine1"
                  placeholderTextColor="#64748B"
                  value={fileName}
                  onChangeText={setFileName}
                />

                <Text style={styles.inputLabel}>Type de source</Text>
                <View style={styles.typeRow}>
                  {['pdf', 'notes', 'specifications'].map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.typePill, fileType === t && styles.typePillActive]}
                      onPress={() => setFileType(t)}
                    >
                      <Text style={[styles.typePillText, fileType === t && styles.typePillTextActive]}>
                        {t === 'pdf' ? '📄 Document PDF' : t === 'notes' ? '📝 Notes de stage' : '📋 Spécification'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Extrait de texte ou contenu clé</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  multiline
                  numberOfLines={5}
                  placeholder="Copiez-collez ici le texte du document, les chiffres clés, missions, ou notes..."
                  placeholderTextColor="#64748B"
                  value={textContent}
                  onChangeText={setTextContent}
                />

                <View style={styles.formBtnRow}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setShowAddForm(false)}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleAddSource}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Upload size={15} color="#FFFFFF" />
                        <Text style={styles.saveBtnText}>Enregistrer la source</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : sources.length > 0 ? (
              <Pressable style={styles.outlineBtn} onPress={() => setShowAddForm(true)}>
                <Plus size={16} color="#818CF8" />
                <Text style={styles.outlineBtnText}>Ajouter une autre source</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '84%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  infoText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12.5,
    lineHeight: 18,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  sourcesList: {
    gap: 10,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sourceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sourceName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  sourceMeta: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  sourceSummary: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  deleteIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    borderStyle: 'dashed',
  },
  outlineBtnText: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 13.5,
  },
  formContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  formHeading: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13.5,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typePillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typePillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
