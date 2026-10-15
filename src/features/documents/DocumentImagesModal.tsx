import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CornerDownLeft, Image as ImageIcon, ImagePlus, RotateCcw, Trash2, X } from 'lucide-react-native';

import { stitchColors } from '../../theme/stitch';
import {
  attachImageToDocument,
  deleteDocumentFile,
  listDocumentImages,
  pickImageFromPhone,
  resolveFileUrls,
  updateImageCaption,
  uploadDocumentFile,
  type DocumentImageRecord,
  type PickedFile,
} from './documentFilesApi';

export type FigureWidth = 'fig-full' | 'fig-half' | 'fig-small';

export type InsertFigurePayload = {
  // Uploaded image: stored by id in the document, displayed through a signed URL.
  fileId: string | null;
  displayUrl: string;
  caption: string;
  width: FigureWidth;
};

const WIDTHS: { value: FigureWidth; label: string }[] = [
  { value: 'fig-full', label: 'Pleine largeur' },
  { value: 'fig-half', label: 'Moitié' },
  { value: 'fig-small', label: 'Petite' },
];

type DocumentImagesModalProps = {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  onInsertFigure: (figure: InsertFigurePayload) => void;
  onImagesUpdated?: (count: number) => void;
};

type PendingUpload = {
  picked: PickedFile;
  progress: number;
  error: string | null;
};

export function DocumentImagesModal({ visible, onClose, documentId, onInsertFigure, onImagesUpdated }: DocumentImagesModalProps) {
  const [images, setImages] = useState<DocumentImageRecord[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [width, setWidth] = useState<FigureWidth>('fig-half');

  const loadImages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listDocumentImages(documentId);
      setImages(list);
      onImagesUpdated?.(list.length);
      setCaptions((prev) => {
        const next = { ...prev };
        list.forEach((img) => {
          if (next[img.id] === undefined) next[img.id] = img.suggested_caption || img.file_name;
        });
        return next;
      });
      const fileIds = list.map((img) => img.file_id).filter((id): id is string => Boolean(id));
      setPreviews(fileIds.length ? await resolveFileUrls(fileIds) : {});
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [documentId, onImagesUpdated]);

  useEffect(() => {
    if (visible) loadImages();
  }, [visible, loadImages]);

  const upload = async (picked: PickedFile) => {
    setPending({ picked, progress: 0, error: null });
    try {
      const file = await uploadDocumentFile(documentId, picked, 'image', (progress) =>
        setPending((current) => (current ? { ...current, progress } : current)),
      );
      await attachImageToDocument(documentId, file.id, picked.name);
      setPending(null);
      await loadImages();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Envoi impossible. Réessayez.';
      setPending({ picked, progress: 0, error: message });
    }
  };

  const handlePick = async () => {
    try {
      const picked = await pickImageFromPhone();
      if (picked) await upload(picked);
    } catch (error) {
      Alert.alert('Image', error instanceof Error ? error.message : 'Impossible d’ouvrir vos photos.');
    }
  };

  const handleDelete = (img: DocumentImageRecord) => {
    Alert.alert('Supprimer l’image', 'Cette image sera retirée de la galerie du document. Les figures déjà insérées ne s’afficheront plus.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            if (img.file_id) await deleteDocumentFile(documentId, img.file_id);
            const next = images.filter((item) => item.id !== img.id);
            setImages(next);
            onImagesUpdated?.(next.length);
          } catch (error) {
            Alert.alert('Erreur', error instanceof Error ? error.message : 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const handleInsert = (img: DocumentImageRecord) => {
    const caption = (captions[img.id] ?? img.suggested_caption ?? img.file_name).trim() || img.file_name;
    const displayUrl = img.file_id ? previews[img.file_id] : img.image_url;
    if (!displayUrl) {
      Alert.alert('Image', 'Cette image n’est pas encore disponible. Réessayez dans un instant.');
      return;
    }
    if (caption !== img.suggested_caption) {
      updateImageCaption(documentId, img.id, { suggestedCaption: caption }).catch(() => undefined);
    }
    updateImageCaption(documentId, img.id, { isPlaced: true }).catch(() => undefined);
    onInsertFigure({ fileId: img.file_id ?? null, displayUrl, caption, width });
    onClose();
  };

  const busy = Boolean(pending && !pending.error);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ImageIcon size={18} color={stitchColors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Images du document</Text>
              <Text style={styles.headerSub}>Photos et schémas depuis votre téléphone, insérés comme figures</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Fermer">
              <X size={18} color={stitchColors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            <Pressable
              style={[styles.pickBtn, busy && styles.disabled]}
              onPress={handlePick}
              disabled={busy}
              accessibilityRole="button"
            >
              <ImagePlus size={18} color={stitchColors.white} />
              <Text style={styles.pickBtnText}>Choisir depuis le téléphone</Text>
            </Pressable>
            <Text style={styles.hint}>PNG, JPEG ou WEBP, 10 Mo maximum. La légende est numérotée automatiquement (« Figure 2.1 »).</Text>
            <View style={styles.widthRow}>
              <Text style={styles.widthLabel}>Taille dans le document</Text>
              <View style={styles.row}>
                {WIDTHS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.widthChip, width === option.value && styles.widthChipActive]}
                    onPress={() => setWidth(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: width === option.value }}
                  >
                    <Text style={[styles.widthChipText, width === option.value && styles.widthChipTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {pending ? (
              <View style={[styles.card, pending.error ? styles.cardError : null]}>
                <Image source={{ uri: pending.picked.uri }} style={styles.thumbnail} resizeMode="cover" />
                <View style={styles.cardContent}>
                  <Text style={styles.fileName} numberOfLines={1}>{pending.picked.name}</Text>
                  {pending.error ? (
                    <>
                      <Text style={styles.errorText}>{pending.error}</Text>
                      <View style={styles.row}>
                        <Pressable style={styles.smallBtn} onPress={() => upload(pending.picked)}>
                          <RotateCcw size={13} color={stitchColors.white} />
                          <Text style={styles.smallBtnText}>Réessayer</Text>
                        </Pressable>
                        <Pressable style={styles.ghostBtn} onPress={() => setPending(null)}>
                          <Text style={styles.ghostBtnText}>Retirer</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.meta}>Envoi en cours… {Math.round(pending.progress * 100)} %</Text>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.max(4, pending.progress * 100)}%` }]} />
                      </View>
                    </>
                  )}
                </View>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={stitchColors.primary} />
                <Text style={styles.meta}>Chargement des images…</Text>
              </View>
            ) : loadError ? (
              <View style={styles.centerBox}>
                <Text style={styles.errorText}>{loadError}</Text>
                <Pressable style={styles.ghostBtn} onPress={loadImages}>
                  <Text style={styles.ghostBtnText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : images.length === 0 && !pending ? (
              <View style={styles.emptyBox}>
                <ImageIcon size={32} color={stitchColors.inkSubtle} />
                <Text style={styles.emptyTitle}>Aucune image pour l’instant</Text>
                <Text style={styles.emptyDesc}>
                  Ajoutez des photos de stage, captures d’écran ou schémas. Chaque image reçoit une légende « Figure X » modifiable avant insertion.
                </Text>
              </View>
            ) : (
              images.map((img) => {
                const preview = img.file_id ? previews[img.file_id] : img.image_url;
                return (
                  <View key={img.id} style={styles.card}>
                    {preview ? (
                      <Image source={{ uri: preview }} style={styles.thumbnail} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
                        <ImageIcon size={22} color={stitchColors.inkSubtle} />
                      </View>
                    )}
                    <View style={styles.cardContent}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.fileName} numberOfLines={1}>{img.file_name}</Text>
                        <Pressable onPress={() => handleDelete(img)} hitSlop={8} accessibilityLabel="Supprimer l’image">
                          <Trash2 size={15} color={stitchColors.error} />
                        </Pressable>
                      </View>
                      <TextInput
                        style={styles.captionInput}
                        value={captions[img.id] ?? ''}
                        onChangeText={(text) => setCaptions((prev) => ({ ...prev, [img.id]: text }))}
                        placeholder="Légende de la figure"
                        placeholderTextColor={stitchColors.inkMuted}
                        maxLength={300}
                      />
                      <Pressable style={styles.smallBtn} onPress={() => handleInsert(img)}>
                        <CornerDownLeft size={13} color={stitchColors.white} />
                        <Text style={styles.smallBtnText}>{img.is_placed ? 'Insérer à nouveau' : 'Insérer dans la section'}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: stitchColors.glassOverlay, justifyContent: 'flex-end' },
  sheet: {
    height: '84%',
    backgroundColor: stitchColors.surface,
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
    borderBottomColor: stitchColors.glassBorder,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: stitchColors.siennaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { color: stitchColors.ink, fontSize: 16, fontWeight: '800' },
  headerSub: { color: stitchColors.inkMuted, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.paperSoft,
  },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12 },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  pickBtnText: { color: stitchColors.white, fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.5 },
  hint: { color: stitchColors.inkMuted, fontSize: 12, textAlign: 'center', marginTop: -4 },
  centerBox: { padding: 32, alignItems: 'center', gap: 12 },
  emptyBox: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  emptyTitle: { color: stitchColors.ink, fontSize: 15, fontWeight: '700' },
  emptyDesc: { color: stitchColors.inkMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  card: {
    flexDirection: 'row',
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    gap: 12,
  },
  cardError: { borderColor: stitchColors.error, backgroundColor: stitchColors.errorBg },
  thumbnail: { width: 88, height: 88, borderRadius: 8, backgroundColor: stitchColors.surface },
  thumbnailEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, gap: 6 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  fileName: { color: stitchColors.ink, fontSize: 14, fontWeight: '700', flex: 1 },
  meta: { color: stitchColors.inkMuted, fontSize: 12 },
  errorText: { color: stitchColors.onErrorContainer, fontSize: 12.5, lineHeight: 17 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: stitchColors.glassBorder, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: stitchColors.primary },
  captionInput: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: stitchColors.ink,
    fontSize: 12.5,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.primary,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  smallBtnText: { color: stitchColors.white, fontSize: 12, fontWeight: '700' },
  ghostBtn: { paddingVertical: 7, paddingHorizontal: 10 },
  widthRow: { gap: 6 },
  widthLabel: { color: stitchColors.inkSoft, fontSize: 12, fontWeight: '700' },
  widthChip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: stitchColors.glassBorder, backgroundColor: stitchColors.paperDeep },
  widthChipActive: { borderColor: stitchColors.primary, backgroundColor: stitchColors.siennaBg },
  widthChipText: { color: stitchColors.inkSoft, fontSize: 12.5 },
  widthChipTextActive: { color: stitchColors.siennaDeep, fontWeight: '800' },
  ghostBtnText: { color: stitchColors.primary, fontSize: 12.5, fontWeight: '700' },
});
