import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image as ImageIcon, Plus, Trash2, X, Sparkles, CornerDownLeft } from 'lucide-react-native';
import { authFetch } from '../auth/betterAuth';

export type DocumentImageItem = {
  id: string;
  document_id: string;
  file_name: string;
  image_url: string;
  ai_description: string;
  suggested_caption: string;
  suggested_section_id?: string | null;
  is_placed: boolean;
  created_at: string;
};

type DocumentImagesModalProps = {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  sections: Array<{ id: string; title: string }>;
  currentSectionId?: string;
  onInsertFigure: (imageUrl: string, caption: string) => void;
  onImagesUpdated?: (count: number) => void;
};

export function DocumentImagesModal({
  visible,
  onClose,
  documentId,
  sections,
  currentSectionId,
  onInsertFigure,
  onImagesUpdated,
}: DocumentImagesModalProps) {
  const [images, setImages] = useState<DocumentImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/mobile/documents/${documentId}/images`);
      if (res.ok) {
        const data = await res.json();
        const list = data.images || [];
        setImages(list);
        onImagesUpdated?.(list.length);
      }
    } catch (e) {
      console.warn('Load images error:', e);
    } finally {
      setLoading(false);
    }
  }, [documentId, onImagesUpdated]);

  useEffect(() => {
    if (visible) {
      loadImages();
    }
  }, [visible, loadImages]);

  const handleAddImage = async () => {
    if (!fileName.trim() || !imageUrl.trim()) {
      Alert.alert('Champs requis', "Renseignez un titre et l'URL de votre image.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/mobile/documents/${documentId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName.trim(),
          imageUrl: imageUrl.trim(),
          analyze: true,
          suggestedSectionId: currentSectionId || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Échec de l'ajout.");
      }

      setFileName('');
      setImageUrl('');
      setShowAddForm(false);
      await loadImages();
      Alert.alert('✨ Image analysée', "L'IA a formulé une légende académique et calculé le meilleur emplacement.");
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Impossible d'ajouter l'image.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    Alert.alert('Supprimer l’image', 'Voulez-vous retirer cette image de la galerie ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await authFetch(`/api/mobile/documents/${documentId}/images?imageId=${imageId}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              const next = images.filter((img) => img.id !== imageId);
              setImages(next);
              onImagesUpdated?.(next.length);
            }
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ImageIcon size={18} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Galerie & Placement d&apos;Images IA</Text>
              <Text style={styles.headerSub}>
                L&apos;IA légende et détermine où insérer chaque figure dans vos sections
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={styles.loadingText}>Chargement des images...</Text>
              </View>
            ) : images.length === 0 && !showAddForm ? (
              <View style={styles.emptyBox}>
                <ImageIcon size={36} color="#475569" />
                <Text style={styles.emptyTitle}>Aucune image enregistrée</Text>
                <Text style={styles.emptyDesc}>
                  Importez des captures d&apos;écran, photos d&apos;atelier ou schémas. L&apos;IA analysera le contenu pour vous indiquer dans quelle section la placer et rédigera la légende « Figure X : ... ».
                </Text>
                <Pressable style={styles.primaryBtn} onPress={() => setShowAddForm(true)}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Ajouter une première image</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagesGrid}>
                {images.map((img) => {
                  const targetSec = sections.find((s) => s.id === img.suggested_section_id);
                  return (
                    <View key={img.id} style={styles.imageCard}>
                      <Image source={{ uri: img.image_url }} style={styles.thumbnail} resizeMode="cover" />
                      
                      <View style={styles.imageCardContent}>
                        <View style={styles.cardTopRow}>
                          <Text style={styles.imageFileName} numberOfLines={1}>
                            {img.file_name}
                          </Text>
                          <Pressable
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteImage(img.id)}
                            hitSlop={8}
                          >
                            <Trash2 size={15} color="#F87171" />
                          </Pressable>
                        </View>

                        {/* AI Recommendation Badge */}
                        <View style={styles.aiBadgeBox}>
                          <Sparkles size={13} color="#38BDF8" />
                          <Text style={styles.aiBadgeText} numberOfLines={1}>
                            Recommandé : {targetSec ? targetSec.title : 'Section courante'}
                          </Text>
                        </View>

                        <Text style={styles.captionPreview} numberOfLines={2}>
                          {img.suggested_caption || 'Figure académique'}
                        </Text>

                        <Pressable
                          style={styles.insertBtn}
                          onPress={() => {
                            onInsertFigure(img.image_url, img.suggested_caption || img.file_name);
                            onClose();
                          }}
                        >
                          <CornerDownLeft size={13} color="#FFFFFF" />
                          <Text style={styles.insertBtnText}>Insérer dans la section</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Add Image Form */}
            {showAddForm ? (
              <View style={styles.formContainer}>
                <Text style={styles.formHeading}>Ajouter une illustration / capture</Text>

                <Text style={styles.inputLabel}>Titre ou descriptif rapide</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Architecture logicielle ou Photo atelier"
                  placeholderTextColor="#64748B"
                  value={fileName}
                  onChangeText={setFileName}
                />

                <Text style={styles.inputLabel}>URL de l&apos;image</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://... ou lien Supabase Storage"
                  placeholderTextColor="#64748B"
                  value={imageUrl}
                  onChangeText={setImageUrl}
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
                    onPress={handleAddImage}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Sparkles size={14} color="#FFFFFF" />
                        <Text style={styles.saveBtnText}>Analyser & Ajouter</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : images.length > 0 ? (
              <Pressable style={styles.outlineBtn} onPress={() => setShowAddForm(true)}>
                <Plus size={16} color="#38BDF8" />
                <Text style={styles.outlineBtnText}>Ajouter une autre image</Text>
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
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  imagesGrid: {
    gap: 12,
  },
  imageCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  imageCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageFileName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  aiBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  aiBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  captionPreview: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  insertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  insertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    borderStyle: 'dashed',
  },
  outlineBtnText: {
    color: '#38BDF8',
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
    backgroundColor: '#0284C7',
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
