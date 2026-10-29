import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { ImagePlus, X } from 'lucide-react-native';

import type { StageJob } from '../../types';
import { fontFamilies, stitchColors, stitchComponents } from '../../theme/stitch';
import { MAX_OFFER_IMAGES, importExternalOffer, pickOfferImages, type OfferImage } from './externalOfferApi';

export interface ExternalOfferModalProps {
  visible: boolean;
  onClose: () => void;
  /** The offer, read and saved as a private offer: the caller opens the application on it. */
  onOfferReady: (job: StageJob) => void;
}

// "Une offre vue ailleurs": the student adds photos of a flyer, screenshots
// or the text of an offer; the AI reads it and the CV is then written for it.
export function ExternalOfferModal({ visible, onClose, onOfferReady }: ExternalOfferModalProps) {
  const [images, setImages] = useState<OfferImage[]>([]);
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setImages([]);
      setText('');
      setError(null);
    }
  }, [visible]);

  const canRead = !reading && (images.length > 0 || text.trim().length >= 30);

  const addImages = async () => {
    setError(null);
    try {
      const picked = await pickOfferImages(MAX_OFFER_IMAGES - images.length);
      setImages((current) => [...current, ...picked].slice(0, MAX_OFFER_IMAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’ajouter cette image.');
    }
  };

  const readOffer = async () => {
    if (!canRead) return;
    setReading(true);
    setError(null);
    try {
      const job = await importExternalOffer({ text, images });
      onOfferReady(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'offre n'a pas pu être lue. Réessaie.");
    } finally {
      setReading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stitchComponents.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Une offre vue ailleurs</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fermer" testID="btn-external-offer-close">
              <X size={20} color={stitchColors.inkMuted} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Ajoute l’affiche, une capture d’écran ou le texte de l’offre. L’IA la lit, puis ton CV et ta lettre sont
            écrits pour elle.
          </Text>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.block}>
              <Text style={styles.label}>Photos ou captures ({images.length}/{MAX_OFFER_IMAGES})</Text>
              <View style={styles.thumbs}>
                {images.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.thumb}>
                    <Image source={{ uri: `data:${image.mime};base64,${image.base64}` }} style={styles.thumbImage} />
                    <Pressable
                      style={styles.thumbRemove}
                      onPress={() => setImages((current) => current.filter((_, i) => i !== index))}
                      hitSlop={8}
                      accessibilityLabel="Retirer cette image"
                    >
                      <X size={12} color={stitchColors.onPrimary} />
                    </Pressable>
                  </View>
                ))}
                {images.length < MAX_OFFER_IMAGES ? (
                  <Pressable
                    style={styles.addThumb}
                    onPress={addImages}
                    disabled={reading}
                    accessibilityLabel="Ajouter une photo de l'offre"
                    testID="btn-external-offer-add-image"
                  >
                    <ImagePlus size={22} color={stitchColors.primary} />
                    <Text style={styles.addThumbText}>Ajouter</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Ou le texte de l’offre</Text>
              <TextInput
                style={styles.textArea}
                value={text}
                onChangeText={setText}
                placeholder="Colle ici le message WhatsApp, l’annonce LinkedIn ou le texte de l’affiche."
                placeholderTextColor={stitchColors.inkMuted}
                multiline
                maxLength={12000}
                editable={!reading}
                testID="input-external-offer-text"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <Pressable
            style={[styles.cta, !canRead && styles.ctaDisabled]}
            onPress={readOffer}
            disabled={!canRead}
            testID="btn-external-offer-read"
          >
            {reading ? (
              <View style={styles.ctaRow}>
                <ActivityIndicator color={stitchColors.onPrimary} />
                <Text style={styles.ctaText}>Lecture de l’offre…</Text>
              </View>
            ) : (
              <Text style={styles.ctaText}>Lire l’offre et préparer mon CV</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '88%',
    backgroundColor: stitchColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fontFamilies.outfit, fontSize: 20, fontWeight: '800', color: stitchColors.ink },
  subtitle: { fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 18, color: stitchColors.inkMuted },
  body: { gap: 18, paddingVertical: 8 },
  block: { gap: 10 },
  label: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: stitchColors.inkSoft,
  },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 84, height: 108, borderRadius: 12, overflow: 'hidden', backgroundColor: stitchColors.background },
  thumbImage: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.ink,
  },
  addThumb: {
    width: 84,
    height: 108,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: stitchColors.primary,
    backgroundColor: stitchColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addThumbText: { fontFamily: fontFamilies.inter, fontSize: 12, fontWeight: '600', color: stitchColors.primary },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    padding: 12,
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
  },
  error: { fontFamily: fontFamilies.inter, fontSize: 12, color: stitchColors.error },
  cta: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: stitchColors.primary,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontFamily: fontFamilies.inter, fontSize: 15, fontWeight: '700', color: stitchColors.onPrimary },
});
