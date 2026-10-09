import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {
  X,
  Check,
  Copy,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Hash,
} from 'lucide-react-native';
import {
  stitchColors,
  fontFamilies,
  stitchRadius,
} from '../../theme/stitch';
import {
  requestPairingCode,
  checkConnectionStatus,
  getStoredWhatsAppStatus,
  clearWhatsAppStatus,
  formatPairingCode,
  copyToClipboard,
  cleanPhoneNumber,
} from './whatsappService';

export interface WhatsAppPairingModalProps {
  visible: boolean;
  onClose: () => void;
  initialPhone?: string;
  onPairingSuccess?: (phone: string) => void;
  onStatusChange?: (connected: boolean) => void;
}

type PairingStep = 'idle' | 'requesting' | 'pairing' | 'connected' | 'error';

export function WhatsAppPairingModal({
  visible,
  onClose,
  initialPhone = '',
  onPairingSuccess,
  onStatusChange,
}: WhatsAppPairingModalProps) {
  const [step, setStep] = useState<PairingStep>('idle');
  const [phone, setPhone] = useState(initialPhone);
  const [rawCode, setRawCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [linkedAt, setLinkedAt] = useState<string | null>(null);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling interval
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Hydrate initial phone & status when modal opens
  useEffect(() => {
    let isMounted = true;
    if (visible) {
      setErrorMessage(null);
      setCopied(false);

      getStoredWhatsAppStatus().then((status) => {
        if (!isMounted) return;
        if (status.connected) {
          setPhone(status.phone || initialPhone);
          setLinkedAt(status.linkedAt || null);
          setStep('connected');
        } else {
          setPhone(status.phone || initialPhone);
          setStep('idle');
        }
      });
    } else {
      stopPolling();
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    }

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [visible, initialPhone, stopPolling]);

  // Handle connection check
  const verifyConnection = useCallback(
    async (phoneToCheck: string) => {
      const res = await checkConnectionStatus(phoneToCheck);
      if (res.connected) {
        stopPolling();
        setStep('connected');
        setLinkedAt(new Date().toISOString());
        onStatusChange?.(true);
        onPairingSuccess?.(phoneToCheck);
      }
      return res.connected;
    },
    [stopPolling, onStatusChange, onPairingSuccess]
  );

  // Start polling every 3.5 seconds
  const startPolling = useCallback(
    (phoneToPoll: string) => {
      stopPolling();
      pollingTimerRef.current = setInterval(async () => {
        try {
          await verifyConnection(phoneToPoll);
        } catch (err) {
          console.warn('[WhatsAppPairingModal] Polling error:', err);
        }
      }, 3500);
    },
    [stopPolling, verifyConnection]
  );

  // Request code handler
  const handleRequestCode = async () => {
    const clean = cleanPhoneNumber(phone);
    if (!clean || clean.length < 8) {
      setErrorMessage('Veuillez entrer un numéro de téléphone valide (ex: +237 690 12 34 56).');
      return;
    }

    setErrorMessage(null);
    setStep('requesting');

    try {
      const result = await requestPairingCode(clean);
      if (result.success && (result.state === 'open' || result.connected)) {
        stopPolling();
        setStep('connected');
        setLinkedAt(new Date().toISOString());
        onStatusChange?.(true);
        onPairingSuccess?.(clean);
        return;
      }
      if (result.success && result.pairingCode) {
        setRawCode(result.pairingCode);
        setStep('pairing');
        startPolling(clean);
      } else {
        setErrorMessage(result.error || 'Impossible de générer le code de jumelage.');
        setStep('idle');
      }
    } catch (err) {
      console.warn('[WhatsAppPairingModal] Request code error:', err);
      setErrorMessage('Une erreur est survenue lors de la communication avec le serveur.');
      setStep('idle');
    }
  };

  // 1-tap copy handler
  const handleCopyCode = async () => {
    if (!rawCode) return;
    const cleanCode = rawCode.replace(/[^a-zA-Z0-9]/g, '');
    const success = await copyToClipboard(cleanCode);
    if (success) {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2500);
    }
  };

  // Manual verify button
  const handleManualCheck = async () => {
    setIsCheckingManual(true);
    try {
      const connected = await verifyConnection(phone);
      if (!connected) {
        setErrorMessage("Le jumelage n'est pas encore finalisé sur votre téléphone WhatsApp.");
      }
    } finally {
      setIsCheckingManual(false);
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    stopPolling();
    const clean = cleanPhoneNumber(phone);
    await clearWhatsAppStatus(clean);
    setStep('idle');
    setRawCode('');
    setLinkedAt(null);
    onStatusChange?.(false);
  };

  // Close handler
  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const formattedCode = rawCode ? formatPairingCode(rawCode) : '---- ----';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      testID="whatsapp-pairing-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.headerIconCircle}>
                <Smartphone size={18} color={stitchColors.emerald} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Liaison WhatsApp RH</Text>
                <Text style={styles.sheetSubtitle}>Candidatures & CV officiels en 1-Clic</Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Fermer la modale"
            >
              <X size={18} color={stitchColors.inkMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* ── STEP: ALREADY CONNECTED ── */}
            {step === 'connected' && (
              <View style={styles.connectedCard}>
                <View
                  style={styles.connectedBadge}
                  testID="badge-whatsapp-connected"
                >
                  <CheckCircle2 size={16} color={stitchColors.emerald} strokeWidth={2.4} />
                  <Text style={styles.connectedBadgeText}>✅ WhatsApp connecté</Text>
                </View>

                <Text style={styles.connectedCardTitle}>Compte WhatsApp prêt pour l'envoi</Text>
                <Text style={styles.connectedCardDesc}>
                  Vos candidatures aux offres de stage et votre CV officiel certifié seront envoyés
                  directement en arrière-plan via ce compte sans ouvrir d'application externe.
                </Text>

                <View style={styles.infoMetaRow}>
                  <Text style={styles.infoMetaLabel}>Numéro associé :</Text>
                  <Text style={styles.infoMetaValue}>+{cleanPhoneNumber(phone)}</Text>
                </View>

                {linkedAt && (
                  <View style={styles.infoMetaRow}>
                    <Text style={styles.infoMetaLabel}>Actif depuis :</Text>
                    <Text style={styles.infoMetaValue}>
                      {new Date(linkedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                )}

                <View style={styles.connectedActionRow}>
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleClose}
                  >
                    <Text style={styles.primaryBtnText}>Terminer</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.disconnectBtn, pressed && { opacity: 0.75 }]}
                    onPress={handleDisconnect}
                  >
                    <Text style={styles.disconnectBtnText}>Dissocier ce compte</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── STEP: IDLE & PHONE ENTRY ── */}
            {(step === 'idle' || step === 'requesting') && (
              <View style={styles.formContainer}>
                <View style={styles.explanationBox}>
                  <ShieldCheck size={18} color={stitchColors.sienna} strokeWidth={2} />
                  <Text style={styles.explanationText}>
                    Associez votre compte WhatsApp en 30 secondes pour expédier vos CV officiels et
                    pitchs personnalisés directement aux recruteurs en 1 clic.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Numéro WhatsApp de l'étudiant</Text>
                  <View style={styles.inputRow}>
                    <Smartphone size={18} color={stitchColors.inkMuted} strokeWidth={1.8} />
                    <TextInput
                      testID="input-whatsapp-phone"
                      style={styles.textInput}
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Ex: 690 12 34 56 ou +237..."
                      placeholderTextColor={stitchColors.inkSubtle}
                      keyboardType="phone-pad"
                      autoFocus={!phone}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    Le numéro doit être celui de votre WhatsApp actuellement actif sur ce téléphone.
                  </Text>
                </View>

                {errorMessage && (
                  <View style={styles.errorAlert}>
                    <AlertCircle size={15} color={stitchColors.error} strokeWidth={2} />
                    <Text style={styles.errorAlertText}>{errorMessage}</Text>
                  </View>
                )}

                <Pressable
                  testID="btn-request-pairing-code"
                  disabled={step === 'requesting'}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    step === 'requesting' && { opacity: 0.7 },
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={handleRequestCode}
                >
                  {step === 'requesting' ? (
                    <View style={styles.btnLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Génération du code sécurisé…</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>Obtenir mon code de jumelage</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* ── STEP: CODE DISPLAY & POLLING ── */}
            {step === 'pairing' && (
              <View style={styles.pairingContainer}>
                <View style={styles.codeCard}>
                  <Text style={styles.codeCardLabel}>VOTRE CODE DE JUMELAGE (8 CHIFFRES)</Text>

                  <Text
                    testID="pairing-code-display"
                    style={styles.codeNumberText}
                    selectable
                  >
                    {formattedCode}
                  </Text>

                  <Pressable
                    testID="btn-copy-pairing-code"
                    style={({ pressed }) => [
                      styles.copyBtn,
                      copied && styles.copyBtnSuccess,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={handleCopyCode}
                  >
                    {copied ? (
                      <Check size={16} color={stitchColors.emerald} strokeWidth={2.4} />
                    ) : (
                      <Copy size={16} color={stitchColors.ink} strokeWidth={2} />
                    )}
                    <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
                      {copied ? 'Copié dans le presse-papiers !' : 'Copier le code à 8 chiffres'}
                    </Text>
                  </Pressable>
                </View>

                {/* 3-Step Guide */}
                <View style={styles.stepsCard}>
                  <Text style={styles.stepsTitle}>Instructions rapides dans WhatsApp :</Text>

                  <View style={styles.stepItem}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Ouvrez WhatsApp</Text>
                      <Text style={styles.stepDesc}>Sur votre smartphone avec le numéro +{cleanPhoneNumber(phone)}</Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Appareils connectés</Text>
                      <Text style={styles.stepDesc}>
                        Allez dans Réglages (iOS) ou ⋮ (Android) &gt; Appareils connectés &gt; Connecter un appareil.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Lier avec un numéro</Text>
                      <Text style={styles.stepDesc}>
                        Appuyez sur « Lier avec un numéro de téléphone » en bas, puis saisissez le code ci-dessus.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Live Polling Indicator */}
                <View style={styles.pollingBanner}>
                  <ActivityIndicator size="small" color={stitchColors.sienna} />
                  <View style={styles.pollingTextBox}>
                    <Text style={styles.pollingTitle}>Détection automatique en cours…</Text>
                    <Text style={styles.pollingSub}>
                      L'application détecte la connexion dès que vous saisissez le code sur WhatsApp.
                    </Text>
                  </View>
                </View>

                {errorMessage && (
                  <View style={styles.errorAlert}>
                    <AlertCircle size={15} color={stitchColors.error} strokeWidth={2} />
                    <Text style={styles.errorAlertText}>{errorMessage}</Text>
                  </View>
                )}

                <View style={styles.pairingSecondaryRow}>
                  <Pressable
                    disabled={isCheckingManual}
                    onPress={handleManualCheck}
                    style={({ pressed }) => [styles.secondaryCheckBtn, pressed && { opacity: 0.8 }]}
                  >
                    <RefreshCw
                      size={14}
                      color={stitchColors.inkSoft}
                      style={isCheckingManual ? styles.rotating : undefined}
                    />
                    <Text style={styles.secondaryCheckBtnText}>
                      {isCheckingManual ? 'Vérification…' : 'Vérifier la connexion maintenant'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      stopPolling();
                      setStep('idle');
                    }}
                    style={({ pressed }) => [styles.changePhoneBtn, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.changePhoneBtnText}>Changer de numéro / Régénérer</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 7, 20, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: stitchColors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    maxHeight: '92%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: stitchColors.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  sheetTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 16.5,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: stitchColors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 16,
  },

  // 1. Idle Form
  formContainer: {
    gap: 16,
    paddingTop: 4,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: stitchColors.surfaceVariant,
    padding: 12,
    borderRadius: stitchRadius.sm,
    borderWidth: 0.5,
    borderColor: stitchColors.outline,
  },
  explanationText: {
    flex: 1,
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    lineHeight: 18,
    color: stitchColors.inkSoft,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.inkSoft,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.surfaceVariant,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.outline,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamilies.inter,
    fontSize: 15,
    color: stitchColors.ink,
    padding: 0,
  },
  inputHint: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: stitchColors.inkSubtle,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: stitchColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // 2. Pairing Screen (Code Display)
  pairingContainer: {
    gap: 16,
  },
  codeCard: {
    backgroundColor: stitchColors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
  },
  codeCardLabel: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: stitchColors.siennaTone,
    marginBottom: 8,
  },
  codeNumberText: {
    fontFamily: fontFamilies.mono,
    fontSize: 32,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: 4,
    paddingVertical: 6,
    textAlign: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    backgroundColor: stitchColors.surfaceVariant,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: stitchRadius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  copyBtnSuccess: {
    backgroundColor: stitchColors.emeraldBg,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  copyBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.inkSoft,
  },
  copyBtnTextSuccess: {
    color: stitchColors.emerald,
  },

  // 3-Step Guide
  stepsCard: {
    backgroundColor: stitchColors.surfaceVariant,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  stepsTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.inkSoft,
    letterSpacing: 0.2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: stitchColors.primaryContainer,
    borderWidth: 0.5,
    borderColor: stitchColors.sienna,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    color: stitchColors.siennaTone,
  },
  stepContent: {
    flex: 1,
  },
  stepHeading: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  stepDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    lineHeight: 16,
    marginTop: 1,
  },

  // Polling Banner
  pollingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stitchColors.surfaceContainerLow,
    padding: 12,
    borderRadius: stitchRadius.sm,
    borderWidth: 0.5,
    borderColor: stitchColors.glassBorder,
  },
  pollingTextBox: {
    flex: 1,
  },
  pollingTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  pollingSub: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: stitchColors.inkMuted,
    marginTop: 1,
  },

  // Pairing Action Row
  pairingSecondaryRow: {
    gap: 8,
    marginTop: 2,
  },
  secondaryCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: stitchColors.surfaceVariant,
    borderRadius: stitchRadius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryCheckBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '500',
    color: stitchColors.inkSoft,
  },
  rotating: {
    opacity: 0.6,
  },
  changePhoneBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  changePhoneBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.inkSubtle,
    textDecorationLine: 'underline',
  },

  // 3. Connected Card
  connectedCard: {
    backgroundColor: stitchColors.surfaceVariant,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    gap: 12,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stitchColors.emeraldBg,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  connectedBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.emerald,
  },
  connectedCardTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 15.5,
    fontWeight: '700',
    color: stitchColors.ink,
    textAlign: 'center',
    marginTop: 2,
  },
  connectedCardDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    lineHeight: 18,
    color: stitchColors.inkMuted,
    textAlign: 'center',
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoMetaLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  infoMetaValue: {
    fontFamily: fontFamilies.mono,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  connectedActionRow: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  disconnectBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: stitchRadius.sm,
  },
  disconnectBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '500',
    color: stitchColors.error,
  },

  // Error Alert
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stitchColors.errorBg,
    borderRadius: stitchRadius.sm,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorAlertText: {
    flex: 1,
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: stitchColors.error,
  },
});
