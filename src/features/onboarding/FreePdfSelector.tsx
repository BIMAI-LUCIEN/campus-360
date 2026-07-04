import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CampusDocument } from '../../types';
import { purchasePdfDocument } from '../pdf/pdfApi';
import { recordPdfAnalyticsEvent } from '../pdf/pdfApi';

const { width } = Dimensions.get('window');
const MAX_FREE_PDFS = 3;

interface FreePdfSelectorProps {
  visible: boolean;
  documents: CampusDocument[];
  onComplete: () => void;
  onClose: () => void;
  studentSession: any;
}

function FreePdfCard({
  document,
  selected,
  onToggle,
}: {
  document: CampusDocument;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.pdfCard, selected && styles.pdfCardSelected]}
      onPress={onToggle}
    >
      <LinearGradient
        colors={selected ? ['#1D4ED8', '#2563EB'] : ['#F8FAFC', '#F1F5F9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pdfCardInner}
      >
        <View style={styles.pdfCardContent}>
          <View style={styles.pdfCardIcon}>
            <Text style={styles.pdfCardIconText}>📄</Text>
          </View>
          <View style={styles.pdfCardInfo}>
            <Text
              style={[styles.pdfCardTitle, selected && styles.pdfCardTitleSelected]}
              numberOfLines={2}
            >
              {document.title}
            </Text>
            <Text style={styles.pdfCardMeta}>
              {document.university} • {document.level}
            </Text>
            <Text style={styles.pdfCardSubject}>{document.subject}</Text>
          </View>
        </View>
        <View style={[styles.selectIndicator, selected && styles.selectIndicatorActive]}>
          <Text style={[styles.selectCheck, selected && styles.selectCheckActive]}>
            {selected ? '✓' : '+'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function FreePdfSelector({
  visible,
  documents,
  onComplete,
  onClose,
  studentSession,
}: FreePdfSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [claimingAll, setClaimingAll] = useState(false);

  const toggleDocument = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_FREE_PDFS) {
        next.add(id);
      }
      return next;
    });
  };

  const claimAllFree = async () => {
    if (!studentSession) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setClaimingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const docId of ids) {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) continue;

      setClaimingIds((prev) => new Set(prev).add(docId));

      try {
        recordPdfAnalyticsEvent({
          eventType: 'free_pdf_claim',
          documentId: docId,
          accessToken: 'better-auth',
          metadata: { source: 'onboarding', title: doc.title },
        });
        await purchasePdfDocument(docId);
        successCount++;
      } catch (err) {
        failCount++;
        console.warn('Failed to claim free PDF:', docId, err);
      }
    }

    setClaimingAll(false);
    setClaimingIds(new Set());

    if (successCount > 0) {
      Alert.alert(
        ' PDFs réclamés ! 🎉',
        `${successCount} PDF${successCount > 1 ? 's' : ''} ajouté${successCount > 1 ? 's' : ''} à ta bibliothèque. Bonne révision !`,
        [{ text: 'Parfait !', onPress: onComplete }]
      );
    } else if (failCount > 0) {
      Alert.alert(
        'Certains PDFs n\'ont pas pu être réclamés.',
        'Tu pourras les retrouver plus tard dans le catalogue.',
        [{ text: 'D\'accord', onPress: onComplete }]
      );
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const selectedCount = selectedIds.size;
  const canClaim = selectedCount > 0 && selectedCount <= MAX_FREE_PDFS;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.giftBadge}>
              <Text style={styles.giftBadgeText}>🎁</Text>
            </View>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Bienvenue !</Text>
              <Text style={styles.modalSubtitle}>
                Choisis {MAX_FREE_PDFS} PDFs gratuits pour démarrer
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressBar}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(selectedCount / MAX_FREE_PDFS) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {selectedCount} / {MAX_FREE_PDFS} PDFs sélectionnés
            </Text>
          </View>

          {/* Document list */}
          <ScrollView
            style={styles.documentList}
            contentContainerStyle={styles.documentListContent}
            showsVerticalScrollIndicator={false}
          >
            {documents.slice(0, 20).map((doc) => (
              <FreePdfCard
                key={doc.id}
                document={doc}
                selected={selectedIds.has(doc.id)}
                onToggle={() => toggleDocument(doc.id)}
              />
            ))}
            {documents.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>Aucun document disponible</Text>
                <Text style={styles.emptySubtitle}>
                  Reviens bientôt — le catalogue s'enrichit régulièrement.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <View style={styles.ctaArea}>
            {selectedCount === 0 && (
              <Text style={styles.ctaHint}>
                Sélectionne jusqu'à {MAX_FREE_PDFS} PDFs dans la liste ci-dessus
              </Text>
            )}
            {selectedCount > 0 && selectedCount < MAX_FREE_PDFS && (
              <Text style={styles.ctaHint}>
                Plus que {MAX_FREE_PDFS - selectedCount} à choisir 👇
              </Text>
            )}
            {selectedCount === MAX_FREE_PDFS && (
              <Text style={styles.ctaHint}>
                Sélection complète ! Tu peux reclamar tes {MAX_FREE_PDFS} PDFs gratuits 🎉
              </Text>
            )}
            <Pressable
              style={[
                styles.claimButton,
                !canClaim && styles.claimButtonDisabled,
              ]}
              onPress={claimAllFree}
              disabled={!canClaim || claimingAll}
            >
              <LinearGradient
                colors={canClaim ? ['#059669', '#047857'] : ['#94A3B8', '#64748B']}
                style={styles.claimButtonGradient}
              >
                <Text style={styles.claimButtonText}>
                  {claimingAll
                    ? 'Réclamation en cours...'
                    : `Réclamer ${selectedCount > 0 ? selectedCount : MAX_FREE_PDFS} PDFs gratuits`}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={handleClose} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>
                Plus tard — je choisirai moi-même
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 14,
  },
  giftBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  giftBadgeText: {
    fontSize: 26,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  documentList: {
    flex: 1,
  },
  documentListContent: {
    padding: 16,
    gap: 10,
  },
  pdfCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pdfCardSelected: {
    borderColor: '#2563EB',
  },
  pdfCardInner: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfCardIconText: {
    fontSize: 22,
  },
  pdfCardInfo: {
    flex: 1,
  },
  pdfCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  pdfCardTitleSelected: {
    color: '#FFFFFF',
  },
  pdfCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pdfCardSubject: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  selectIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  selectCheck: {
    fontSize: 16,
    fontWeight: '900',
    color: '#94A3B8',
  },
  selectCheckActive: {
    color: '#2563EB',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaArea: {
    padding: 24,
    paddingBottom: 36,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  ctaHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  claimButton: {
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  claimButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  claimButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
});
