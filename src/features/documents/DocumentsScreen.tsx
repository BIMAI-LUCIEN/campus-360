import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, View, Text, Pressable, ScrollView, 
  ActivityIndicator, Alert, Modal, TextInput, Linking 
} from 'react-native';

import { authBaseUrl, authFetch } from '../auth/betterAuth';

type Document = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type DocumentsScreenProps = {
  onEditDocument: (id: string) => void;
};

export function DocumentsScreen({ onEditDocument }: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Document Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplate, setNewTemplate] = useState<'stage' | 'memoire' | 'blank'>('stage');
  const [creating, setCreating] = useState(false);

  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch('/api/mobile/documents');
      if (!res.ok) throw new Error('Impossible de récupérer vos documents.');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle Create Document
  const handleCreate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour votre document.');
      return;
    }

    try {
      setCreating(true);
      const res = await authFetch('/api/mobile/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          templateType: newTemplate,
        }),
      });

      if (!res.ok) throw new Error('Impossible de créer le document.');
      const data = await res.json();
      
      setNewTitle('');
      setNewDesc('');
      setNewTemplate('stage');
      setCreateModalVisible(false);
      
      // Refresh and open editor directly
      fetchDocuments();
      if (data.document?.id) {
        onEditDocument(data.document.id);
      }
    } catch (err: any) {
      Alert.alert('Erreur de création', err.message);
    } finally {
      setCreating(false);
    }
  };

  // Handle Delete Document
  const handleDelete = (documentId: string, title: string) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer définitivement le document "${title}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authFetch(`/api/mobile/documents/${documentId}`, {
                method: 'DELETE',
              });
              if (!res.ok) throw new Error();
              setDocuments((prev) => prev.filter((r) => r.id !== documentId));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer le document.');
            }
          },
        },
      ]
    );
  };

  // Handle PDF Download
  const handleDownloadPdf = (documentId: string) => {
    const pdfUrl = `${authBaseUrl}/api/mobile/documents/${documentId}/export/pdf`;
    Linking.openURL(pdfUrl).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'URL de téléchargement.');
    });
  };

  if (loading && documents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Chargement de vos documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header card with action */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Éditeur Guidé de Documents</Text>
        <Text style={styles.heroDesc}>
          Rédigez votre document de stage ou mémoire facilement. Mise en page automatique aux normes académiques et assistant IA intégré !
        </Text>
        <Pressable 
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.createButtonText}>✍️ Créer un nouveau document</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Mes documents récents</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchDocuments}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Aucun document créé</Text>
          <Text style={styles.emptyText}>Commencez la rédaction de votre premier document de stage universitaire dès maintenant.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {documents.map((document) => {
            const dateStr = new Date(document.updated_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            let templateLabel = 'Document de stage';
            if (document.template_type === 'memoire') templateLabel = 'Mémoire de recherche';
            else if (document.template_type === 'blank') templateLabel = 'Document personnalisé';

            return (
              <View key={document.id} style={styles.documentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.templateBadge}>
                    <Text style={styles.templateBadgeText}>{templateLabel}</Text>
                  </View>
                  <Text style={styles.cardDate}>{dateStr}</Text>
                </View>
                
                <Text style={styles.cardTitle}>{document.title}</Text>
                {document.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{document.description}</Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => onEditDocument(document.id)}
                  >
                    <Text style={styles.editButtonText}>Modifier</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.actionButton, styles.pdfButton]}
                    onPress={() => handleDownloadPdf(document.id)}
                  >
                    <Text style={styles.pdfButtonText}>📄 PDF</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(document.id, document.title)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* CREATE REPORT MODAL */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setCreateModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Nouveau document</Text>
            
            <Text style={styles.inputLabel}>Titre du document</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Document de stage - Miguel Melago"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Description (Optionnelle)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Ex: Stage de fin d'études chez NextGen Tech..."
              placeholderTextColor="#94A3B8"
              multiline={true}
              numberOfLines={3}
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <Text style={styles.inputLabel}>Modèle de structure</Text>
            <View style={styles.templatesRow}>
              {[
                { key: 'stage', label: 'Document Stage' },
                { key: 'memoire', label: 'Mémoire Acad.' },
                { key: 'blank', label: 'Personnalisé' },
              ].map((t) => (
                <Pressable
                  key={t.key}
                  style={[
                    styles.templateChip,
                    newTemplate === t.key && styles.templateChipActive,
                  ]}
                  onPress={() => setNewTemplate(t.key as any)}
                >
                  <Text style={[
                    styles.templateChipText,
                    newTemplate === t.key && styles.templateChipTextActive,
                  ]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.confirmBtn]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Créer et Ouvrir</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#1E293B', // Dark Slate
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#10B981', // Emerald 500
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  listContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  templateBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDesc: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pdfButton: {
    width: 70,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  pdfButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    width: 38,
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBox: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  templatesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  templateChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  templateChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#10B981',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
