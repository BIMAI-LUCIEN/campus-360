import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Trash2, X } from 'lucide-react-native';

import { deleteStudentAccount } from '../auth/betterAuth';
import { stitchColors, stitchRadius, stitchSpacing } from '../../theme/stitch';
import { AppAlert } from '../../ui/AppAlert';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAccountDeleted: () => Promise<void> | void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onAccountDeleted,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setStep(1);
    setConfirmInput('');
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (confirmInput.trim() !== 'SUPPRIMER' || loading) return;
    setLoading(true);
    try {
      await deleteStudentAccount();
      handleClose();
      await onAccountDeleted();
      AppAlert.alert(
        'Compte supprimé',
        'Ton compte et l’ensemble de tes données personnelles ont été supprimés définitivement.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression.';
      AppAlert.alert('Suppression impossible', message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = confirmInput.trim() === 'SUPPRIMER' && !loading;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <AlertTriangle size={20} color={stitchColors.error} />
              </View>
              <Text style={styles.title}>Supprimer mon compte</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              accessibilityLabel="Fermer"
              style={styles.closeBtn}
            >
              <X size={20} color={stitchColors.inkMuted} />
            </TouchableOpacity>
          </View>

          {step === 1 ? (
            <View style={styles.body}>
              <Text style={styles.warningIntro}>
                Cette action est irréversible. Voici ce qui adviendra de tes données :
              </Text>

              {/* Supprimé définitivement */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitleDanger}>Supprimé définitivement :</Text>
                <View style={styles.bulletRow}>
                  <Trash2 size={14} color={stitchColors.error} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Profil étudiant et identifiants de connexion</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Trash2 size={14} color={stitchColors.error} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Rapports de stage, mémoires et rédactions IA</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Trash2 size={14} color={stitchColors.error} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Fichiers, images téléversées et extraits</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Trash2 size={14} color={stitchColors.error} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Candidatures de stage et historique de relance</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Trash2 size={14} color={stitchColors.error} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Droits d’accès au catalogue et packs de PDF</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Trash2 size={14} color={stitchColors.error} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Session WhatsApp liée et historique</Text>
                </View>
              </View>

              {/* Conservé sans ton nom */}
              <View style={styles.sectionBoxNeutral}>
                <Text style={styles.sectionTitleNeutral}>Conservé sans ton nom :</Text>
                <View style={styles.bulletRow}>
                  <CheckCircle2 size={14} color={stitchColors.inkMuted} style={styles.bulletIcon} />
                  <Text style={styles.bulletTextMuted}>
                    Historique des transactions financières anonymisé (obligation comptable et légale)
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() => setStep(2)}
                  disabled={loading}
                >
                  <Text style={styles.continueBtnText}>Continuer</Text>
                  <ArrowRight size={16} color={stitchColors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.confirmPrompt}>
                Pour confirmer la suppression définitive de ton compte, saisis{' '}
                <Text style={styles.boldWord}>SUPPRIMER</Text> ci-dessous :
              </Text>

              <TextInput
                style={styles.input}
                value={confirmInput}
                onChangeText={setConfirmInput}
                placeholder="SUPPRIMER"
                placeholderTextColor={stitchColors.inkSubtle}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(1)}
                  disabled={loading}
                >
                  <ArrowLeft size={16} color={stitchColors.ink} />
                  <Text style={styles.backBtnText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteBtn, !canSubmit && styles.deleteBtnDisabled]}
                  onPress={handleConfirmDelete}
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={stitchColors.white} />
                  ) : (
                    <>
                      <Trash2 size={16} color={stitchColors.white} />
                      <Text style={styles.deleteBtnText}>Supprimer mon compte</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: stitchColors.glassOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: stitchSpacing.gutter,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: stitchSpacing.gutter,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: stitchSpacing.stackSm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    marginTop: 4,
  },
  warningIntro: {
    fontSize: 13,
    lineHeight: 18,
    color: stitchColors.inkMuted,
    marginBottom: stitchSpacing.stackSm,
  },
  sectionBox: {
    backgroundColor: stitchColors.errorBg,
    borderRadius: stitchRadius.md,
    padding: 12,
    marginBottom: stitchSpacing.stackSm,
  },
  sectionTitleDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionBoxNeutral: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderRadius: stitchRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    marginBottom: stitchSpacing.stackMd,
  },
  sectionTitleNeutral: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 17,
    color: stitchColors.ink,
    flex: 1,
  },
  bulletTextMuted: {
    fontSize: 12,
    lineHeight: 17,
    color: stitchColors.inkMuted,
    flex: 1,
  },
  confirmPrompt: {
    fontSize: 13,
    lineHeight: 19,
    color: stitchColors.ink,
    marginBottom: stitchSpacing.stackSm,
  },
  boldWord: {
    fontWeight: '800',
    color: stitchColors.error,
  },
  input: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: stitchColors.ink,
    letterSpacing: 1.5,
    marginBottom: stitchSpacing.stackMd,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: stitchRadius.button,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: stitchRadius.button,
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.white,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: stitchRadius.button,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.error,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: stitchRadius.button,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.white,
  },
});
