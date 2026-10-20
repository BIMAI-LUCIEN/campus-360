import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import {
  X,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react-native';
import {
  PAYMENT_PACKS,
  type PaymentPack,
  type MobileMoneyOperator,
  initiateMobileMoneyPayment,
  pollPaymentStatus,
} from './walletApi';
import { stitchColors } from '../../theme/stitch';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
  defaultPhone?: string;
  reasonMessage?: string;
}

export function PaymentModal({
  visible,
  onClose,
  onPaymentSuccess,
  defaultPhone = '',
  reasonMessage,
}: PaymentModalProps) {
  const [selectedPack, setSelectedPack] = useState<PaymentPack>(PAYMENT_PACKS[0]);
  const [operator, setOperator] = useState<MobileMoneyOperator>('mtn');
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [waitingUssd, setWaitingUssd] = useState(false);
  const [success, setSuccess] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Polling never outlives the modal.
  useEffect(() => stopPolling, []);
  useEffect(() => {
    if (!visible) stopPolling();
  }, [visible]);

  const handleInitiate = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setNoticeMessage('Veuillez entrer un numéro de téléphone valide.');
      return;
    }

    setNoticeMessage(null);
    setLoading(true);

    try {
      const response = await initiateMobileMoneyPayment({
        packType: selectedPack.id,
        amount: selectedPack.priceFcfa,
        operator,
        phone: cleanPhone,
      });

      setLoading(false);
      setWaitingUssd(true);

      // The server is the only source of truth: poll every 3 s, 20 attempts.
      let attempts = 0;
      stopPolling();
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const { status } = await pollPaymentStatus(response.reference);
          if (status === 'success') {
            stopPolling();
            setWaitingUssd(false);
            setSuccess(true);
          } else if (status === 'failed') {
            stopPolling();
            setWaitingUssd(false);
            setNoticeMessage('Le paiement a été refusé ou annulé.');
          } else if (attempts >= 20) {
            stopPolling();
            setWaitingUssd(false);
            setNoticeMessage("Paiement en attente. Ton solde sera mis à jour dès que l'opérateur confirme.");
          }
        } catch (pollError) {
          stopPolling();
          setWaitingUssd(false);
          setNoticeMessage(pollError instanceof Error ? pollError.message : 'Paiement introuvable.');
        }
      }, 3000);
    } catch (error) {
      setLoading(false);
      setNoticeMessage(error instanceof Error ? error.message : 'Paiement impossible pour le moment. Réessaie.');
    }
  };

  const handleResetAndClose = () => {
    stopPolling();
    setWaitingUssd(false);
    setSuccess(false);
    setNoticeMessage(null);
    onClose();
  };

  const handleSuccessContinue = () => {
    setWaitingUssd(false);
    setSuccess(false);
    setNoticeMessage(null);
    if (onPaymentSuccess) {
      onPaymentSuccess();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleResetAndClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Recharge Mobile Money</Text>
              <Text style={styles.subtitle}>
                {reasonMessage || 'Débloquez vos candidatures IA et vos relances instantanées.'}
              </Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={handleResetAndClose}
              disabled={loading || waitingUssd}
            >
              <X size={18} color={stitchColors.inkSubtle} />
            </Pressable>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={44} color={stitchColors.emerald} />
              </View>
              <Text style={styles.successTitle}>Recharge confirmée</Text>
              <Text style={styles.successText}>
                {`L'opérateur a confirmé ton paiement de ${selectedPack.priceFcfa.toLocaleString()} FCFA.`}
              </Text>
              <Pressable style={styles.actionBtn} onPress={handleSuccessContinue}>
                <Text style={styles.actionBtnText}>Continuer</Text>
              </Pressable>
            </View>
          ) : waitingUssd ? (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color={stitchColors.secondary} style={{ marginBottom: 16 }} />
              <Text style={styles.waitingTitle}>Validation USSD en cours...</Text>
              <Text style={styles.waitingText}>
                Un message de confirmation a été envoyé sur le{' '}
                <Text style={{ fontWeight: '700', color: stitchColors.ink }}>{phone}</Text>.
              </Text>
              <View style={styles.pinInstructionBox}>
                <Text style={styles.pinInstructionText}>
                  👉 Tapez votre code secret Mobile Money sur votre téléphone pour valider le débit de{' '}
                  <Text style={{ fontWeight: '700', color: stitchColors.emerald }}>
                    {selectedPack.priceFcfa} FCFA
                  </Text>.
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* 1. Sélection du Pack */}
              <Text style={styles.sectionLabel}>1. Choisissez votre formule</Text>
              <View style={styles.packsRow}>
                {PAYMENT_PACKS.map((pack) => {
                  const isSelected = selectedPack.id === pack.id;
                  return (
                    <Pressable
                      key={pack.id}
                      style={[
                        styles.packCard,
                        isSelected && styles.packCardSelected,
                        pack.highlight && !isSelected && styles.packCardHighlight,
                      ]}
                      onPress={() => setSelectedPack(pack)}
                    >
                      <View style={styles.packBadgeRow}>
                        <Text style={[styles.packBadge, isSelected && styles.packBadgeSelected]}>
                          {pack.badge}
                        </Text>
                        {pack.highlight && (
                          <View style={styles.popularBadge}>
                            <Sparkles size={11} color="#A78BFA" />
                            <Text style={styles.popularBadgeText}>Recommandé</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.packTitle}>{pack.title}</Text>
                      <Text style={styles.packPrice}>
                        {pack.priceFcfa.toLocaleString()} <Text style={styles.packCurrency}>FCFA</Text>
                      </Text>
                      <Text style={styles.packDesc}>{pack.description}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 2. Sélection de l'Opérateur */}
              <Text style={styles.sectionLabel}>2. Opérateur Mobile Money</Text>
              <View style={styles.operatorRow}>
                <Pressable
                  style={[
                    styles.operatorBtn,
                    operator === 'mtn' && styles.operatorBtnMtn,
                  ]}
                  onPress={() => setOperator('mtn')}
                >
                  <Text style={[styles.operatorText, operator === 'mtn' && styles.operatorTextActive]}>
                    MTN MoMo
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.operatorBtn,
                    operator === 'orange' && styles.operatorBtnOrange,
                  ]}
                  onPress={() => setOperator('orange')}
                >
                  <Text style={[styles.operatorText, operator === 'orange' && styles.operatorTextActive]}>
                    Orange Money
                  </Text>
                </Pressable>


              </View>

              {/* 3. Numéro de Téléphone */}
              <Text style={styles.sectionLabel}>3. Numéro de compte Mobile Money</Text>
              <View style={styles.phoneInputContainer}>
                <Smartphone size={18} color={stitchColors.inkSubtle} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Ex. 6XX XX XX XX"
                  placeholderTextColor={stitchColors.inkMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              {noticeMessage && (
                <Text style={styles.errorNoticeText}>{noticeMessage}</Text>
              )}

              {/* Bouton de paiement */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && { opacity: 0.9 },
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleInitiate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={stitchColors.white} />
                ) : (
                  <>
                    <Zap size={16} color={stitchColors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>
                      Payer {selectedPack.priceFcfa.toLocaleString()} FCFA par Mobile Money
                    </Text>
                    <ArrowRight size={16} color={stitchColors.white} style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>

              <View style={styles.securityRow}>
                <ShieldCheck size={14} color={stitchColors.inkMuted} />
                <Text style={styles.securityText}>
                  Paiement chiffré et sécurisé. Débit immédiat par confirmation USSD.
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: stitchColors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 20,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: stitchColors.inkSubtle,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: stitchColors.paperSoft,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 10,
  },
  packsRow: {
    gap: 10,
    marginBottom: 14,
  },
  packCard: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1.5,
    borderColor: stitchColors.glassBorder,
    borderRadius: 14,
    padding: 14,
  },
  packCardSelected: {
    borderColor: stitchColors.secondary,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  packCardHighlight: {
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  packBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  packBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: stitchColors.inkSubtle,
    backgroundColor: stitchColors.paperSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  packBadgeSelected: {
    color: '#C4B5FD',
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
  },
  packTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 2,
  },
  packPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: stitchColors.ink,
    marginBottom: 4,
  },
  packCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkSubtle,
  },
  packDesc: {
    fontSize: 11.5,
    color: stitchColors.inkSubtle,
    lineHeight: 16,
  },
  operatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  operatorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorBtnMtn: {
    borderColor: '#FACC15',
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
  },
  operatorBtnOrange: {
    borderColor: '#FB923C',
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },

  operatorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.inkSubtle,
  },
  operatorTextActive: {
    color: stitchColors.ink,
    fontWeight: '700',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  phoneInput: {
    flex: 1,
    color: stitchColors.ink,
    fontSize: 14,
  },
  errorNoticeText: {
    fontSize: 12,
    color: stitchColors.error,
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.white,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityText: {
    fontSize: 11,
    color: stitchColors.inkMuted,
  },
  waitingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 8,
  },
  waitingText: {
    fontSize: 13,
    color: stitchColors.inkSubtle,
    textAlign: 'center',
    marginBottom: 16,
  },
  pinInstructionBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
  },
  pinInstructionText: {
    fontSize: 12.5,
    color: '#D1FAE5',
    lineHeight: 18,
    textAlign: 'center',
  },
  successContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: stitchColors.ink,
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: stitchColors.inkSubtle,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
});
