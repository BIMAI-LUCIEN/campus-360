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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CampusDocument } from '../../types';
import { stitchColors, brandGradient } from '../../theme/stitch';
import { purchasePdfDocument } from '../pdf/pdfApi';
import { recordPdfAnalyticsEvent } from '../pdf/pdfApi';

const { width } = Dimensions.get('window');
const MAX_FREE_PDFS = 3;

// ─── Editorial palette — sourced from the shared theme, not duplicated ─────────
const INK = stitchColors.ink;
const PAPER = stitchColors.paper;
const SIENNA = stitchColors.sienna;
const EMERALD = stitchColors.emerald;
const MUTED = stitchColors.inkMuted;
const SOFT = stitchColors.inkSubtle;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) as string;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string;

// ─── Folio counter ───────────────────────────────────────────────────────────
function folioLabel(index: number): string {
  return `— ${String(index + 1).padStart(2, '0')}`;
}

// ─── Single PDF card (editorial poster style) ─────────────────────────────────
function FreePdfCard({
  document,
  index,
  selected,
  onToggle,
}: {
  document: CampusDocument;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.pdfCard, selected && styles.pdfCardSelected]}
      onPress={onToggle}
    >
      {/* Left: folio */}
      <View style={styles.folioCol}>
        <Text style={styles.folioNum}>{folioLabel(index)}</Text>
        <View style={styles.folioRule} />
      </View>

      {/* Center: info */}
      <View style={styles.pdfInfo}>
        <Text
          style={[styles.pdfTitle, selected && styles.pdfTitleSelected]}
          numberOfLines={2}
        >
          {document.title}
        </Text>
        <Text style={styles.pdfMeta}>
          {document.university} &middot; {document.level}
        </Text>
        <Text style={styles.pdfSubject}>{document.subject}</Text>
      </View>

      {/* Right: selector mark */}
      <View style={[styles.selectMark, selected && styles.selectMarkActive]}>
        {selected ? (
          <View style={styles.checkMark} />
        ) : (
          <View style={styles.plusMark}>
            <View style={styles.plusMarkH} />
            <View style={styles.plusMarkV} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Main selector modal ──────────────────────────────────────────────────────
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
        'PDFs réclamés',
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
          {/* ── Header ── */}
          <View style={styles.modalHeader}>
            <View style={styles.headerMeta}>
              <Text style={styles.headerEyebrow}>BIENVENUE</Text>
              <Text style={styles.headerTitle}>Choisis tes gratuits</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Thin rule */}
          <View style={styles.headerRule} />

          {/* ── Progress / selection indicator ── */}
          <View style={styles.selectionBar}>
            <View style={styles.selectionRules}>
              {Array.from({ length: MAX_FREE_PDFS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.selectionRule,
                    i < selectedCount && styles.selectionRuleActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.selectionLabel}>
              {selectedCount === 0
                ? `Sélectionne jusqu'à ${MAX_FREE_PDFS} PDFs`
                : `${selectedCount} / ${MAX_FREE_PDFS} sélectionnés`}
            </Text>
          </View>

          {/* ── Document list ── */}
          <ScrollView
            style={styles.documentList}
            contentContainerStyle={styles.documentListContent}
            showsVerticalScrollIndicator={false}
          >
            {documents.slice(0, 20).map((doc, i) => (
              <FreePdfCard
                key={doc.id}
                document={doc}
                index={i}
                selected={selectedIds.has(doc.id)}
                onToggle={() => toggleDocument(doc.id)}
              />
            ))}
            {documents.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyRule} />
                <Text style={styles.emptyTitle}>Aucun document disponible</Text>
                <Text style={styles.emptySubtitle}>
                  Reviens bientôt — le catalogue s'enrichit régulièrement.
                </Text>
                <View style={styles.emptyRule} />
              </View>
            )}
          </ScrollView>

          {/* ── Footer CTA ── */}
          <View style={styles.ctaArea}>
            {/* Selection hint */}
            <Text style={styles.ctaHint}>
              {selectedCount === 0 && `Sélectionne jusqu'à ${MAX_FREE_PDFS} PDFs dans la liste`}
              {selectedCount > 0 && selectedCount < MAX_FREE_PDFS && (
                <>Plus que {MAX_FREE_PDFS - selectedCount} à choisir</>
              )}
              {selectedCount === MAX_FREE_PDFS && (
                <>Sélection complète</>
              )}
            </Text>

            {/* Claim button */}
            <Pressable
              style={{ width: '100%' }}
              onPress={claimAllFree}
              disabled={!canClaim || claimingAll}
            >
              {canClaim ? (
                <LinearGradient
                  colors={brandGradient.colors}
                  start={brandGradient.horizontal.start}
                  end={brandGradient.horizontal.end}
                  style={styles.claimButton}
                >
                  <Text style={styles.claimButtonText}>
                    {claimingAll
                      ? 'Réclamation en cours…'
                      : selectedCount > 0
                      ? `RÉCLAMER ${selectedCount} PDF${selectedCount > 1 ? 'S' : ''}`
                      : `RÉCLAMER ${MAX_FREE_PDFS} PDFs`}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.claimButton, styles.claimButtonDisabled]}>
                  <Text style={[styles.claimButtonText, styles.claimButtonTextDisabled]}>
                    {`RÉCLAMER ${MAX_FREE_PDFS} PDFs`}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Skip link */}
            <Pressable onPress={handleClose} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Plus tard — je choisirai moi-même</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Modal shell
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: PAPER,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: INK,
    maxHeight: '92%',
    overflow: 'hidden',
  },

  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  headerMeta: {
    flex: 1,
  },
  headerEyebrow: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: SOFT,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headerRule: {
    height: 1,
    backgroundColor: '#2A2A30',
    marginHorizontal: 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: INK,
  },

  // Selection indicator
  selectionBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  selectionRules: {
    flexDirection: 'row',
    gap: 6,
  },
  selectionRule: {
    flex: 1,
    height: 3,
    backgroundColor: SOFT,
    borderRadius: 1,
    opacity: 0.5,
  },
  selectionRuleActive: {
    backgroundColor: EMERALD,
    opacity: 1,
  },
  selectionLabel: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: MUTED,
    textTransform: 'uppercase',
  },

  // Document list
  documentList: {
    flex: 1,
  },
  documentListContent: {
    padding: 16,
    gap: 0,
  },

  // PDF card
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: INK + '1A',
    backgroundColor: PAPER,
    gap: 16,
  },
  pdfCardSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    borderBottomColor: 'rgba(168, 85, 247, 0.4)',
  },
  folioCol: {
    alignItems: 'center',
    width: 40,
    paddingTop: 2,
  },
  folioNum: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: SIENNA,
    marginBottom: 6,
  },
  folioRule: {
    width: 1,
    height: 36,
    backgroundColor: SOFT,
    opacity: 0.4,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfTitle: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    lineHeight: 20,
    marginBottom: 4,
  },
  pdfTitleSelected: {
    color: PAPER,
  },
  pdfMeta: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: MUTED,
    marginBottom: 2,
  },
  pdfSubject: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: SOFT,
    textTransform: 'uppercase',
  },
  selectMark: {
    width: 28,
    height: 28,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  selectMarkActive: {
    backgroundColor: EMERALD,
    borderColor: EMERALD,
  },
  checkMark: {
    width: 12,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: PAPER,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  plusMark: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusMarkH: {
    position: 'absolute',
    width: 10,
    height: 2,
    backgroundColor: INK,
    borderRadius: 1,
  },
  plusMarkV: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: INK,
    borderRadius: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 14,
  },
  emptyRule: {
    width: 40,
    height: 1,
    backgroundColor: SOFT,
    opacity: 0.4,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '700',
    color: INK,
  },
  emptySubtitle: {
    fontFamily: SERIF,
    fontSize: 13,
    fontStyle: 'italic',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  // CTA area
  ctaArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#2A2A30',
  },
  ctaHint: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: MUTED,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  claimButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: stitchColors.surfaceContainerHigh,
    opacity: 0.6,
  },
  claimButtonText: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  claimButtonTextDisabled: {
    color: MUTED,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipButtonText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: SOFT,
    textTransform: 'uppercase',
  },
});

// ─── Prop type (already exported from the original) ───────────────────────────
interface FreePdfSelectorProps {
  visible: boolean;
  documents: CampusDocument[];
  onComplete: () => void;
  onClose: () => void;
  studentSession: any;
}
