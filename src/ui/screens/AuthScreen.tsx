import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { legalLinks } from '../../config/legalLinks';
import { publicEnv } from '../../config/env';
import {
  GlassCard,
  GlassInput,
  GlassPill,
  PrimaryButton,
  SecondaryButton,
} from '../GlassComponents';
import {
  stitchColors,
  stitchSpacing,
  stitchRadius,
  stitchTypography,
  stitchShadows,
  fontFamilies,
} from '../../theme/stitch';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) as string;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string;

interface AuthScreenProps {
  mode: 'sign-in' | 'sign-up' | 'reset' | 'reset-code' | 'new-password' | 'verify-email';
  email: string;
  password: string;
  passwordConfirm: string;
  onPasswordConfirmChange: (v: string) => void;
  name: string;
  loading: boolean;
  notice: string;
  canGoogle: boolean;
  canPasswordReset: boolean;
  /** 6-digit email code (verify-email and new-password steps). */
  otp: string;
  /** Seconds left before a new code can be requested. */
  otpCooldown: number;
  onOtpChange: (v: string) => void;
  onResendOtp: () => void;
  onModeChange: (mode: AuthScreenProps['mode']) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onClose?: () => void;
}

export function AuthScreen({
  mode,
  email,
  password,
  passwordConfirm,
  onPasswordConfirmChange,
  name,
  loading,
  notice,
  canGoogle,
  canPasswordReset,
  otp,
  otpCooldown,
  onOtpChange,
  onResendOtp,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onSubmit,
  onGoogle,
  onClose,
}: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);

  const title =
    mode === 'sign-up'
      ? 'Créer un compte'
      : mode === 'reset'
        ? 'Mot de passe oublié'
        : mode === 'reset-code'
          ? 'Vérifie ton code'
          : mode === 'new-password'
            ? 'Nouveau mot de passe'
            : mode === 'verify-email'
              ? 'Confirme ton email'
              : 'Connexion';

  // Steps that ask for the 6-digit code (verify-email and reset-code).
  const isOtpStep = mode === 'verify-email' || mode === 'reset-code';
  const showEmailInput = mode === 'sign-in' || mode === 'sign-up' || mode === 'reset';
  const showPasswordInput = mode === 'sign-in' || mode === 'sign-up' || mode === 'new-password';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardWrap}>
          <GlassCard style={styles.authCard}>
            {onClose && (
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.closeModalBtn}
              >
                <X size={18} color={stitchColors.inkMuted} strokeWidth={2.4} />
              </Pressable>
            )}

            {/* Editorial eyebrow */}
            <Text style={styles.eyebrow}>ACCÈS ÉTUDIANT</Text>

            {/* Logo Emblem */}
            <View style={styles.logoWrap}>
              <LinearGradient
                colors={[stitchColors.primary, stitchColors.siennaDeep]}
                style={styles.logoMark}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <GraduationCap size={28} color={stitchColors.white} strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.logoTitle}>Campus 360</Text>
              <Text style={styles.logoSubtitle}>Portail Étudiant, Stages &amp; Réussite</Text>
            </View>

            {/* Title */}
            <Text style={styles.cardTitle}>{title}</Text>

            {/* Mode toggle */}
            {(mode === 'sign-in' || mode === 'sign-up') && (
              <View style={styles.modeToggle}>
                <GlassPill
                  label="Connexion"
                  active={mode === 'sign-in'}
                  onPress={() => onModeChange('sign-in')}
                  style={{ flex: 1, alignItems: 'center' }}
                />
                <GlassPill
                  label="Inscription"
                  active={mode === 'sign-up'}
                  onPress={() => onModeChange('sign-up')}
                  style={{ flex: 1, alignItems: 'center' }}
                />
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {mode === 'sign-up' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom complet</Text>
                    <GlassInput
                      value={name}
                      onChangeText={onNameChange}
                      placeholder="Ex: Jean Kamga"
                      autoCapitalize="words"
                      leftIcon={<User size={17} color={stitchColors.sienna} strokeWidth={1.8} />}
                    />
                  </View>

                </>
              )}

              {mode === 'reset' && (
                <Text style={styles.helperText}>
                  Entre l’email de ton compte : tu recevras un code à 6 chiffres pour choisir un nouveau mot de passe.
                </Text>
              )}

              {isOtpStep && (
                <>
                  <Text style={styles.helperText}>
                    Code envoyé à <Text style={styles.helperStrong}>{email}</Text>
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Code à 6 chiffres</Text>
                    <GlassInput
                      value={otp}
                      onChangeText={(value) => onOtpChange(value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      keyboardType="number-pad"
                      maxLength={6}
                      oneTimeCode
                      leftIcon={<ShieldCheck size={17} color={stitchColors.sienna} strokeWidth={1.8} />}
                    />
                  </View>
                  <Pressable
                    onPress={onResendOtp}
                    disabled={otpCooldown > 0 || loading}
                    hitSlop={8}
                  >
                    <Text style={[styles.forgotLink, styles.resendLink, otpCooldown > 0 && styles.resendLinkDisabled]}>
                      {otpCooldown > 0 ? `Renvoyer le code dans ${otpCooldown} s` : 'Renvoyer le code'}
                    </Text>
                  </Pressable>
                </>
              )}

              {showEmailInput && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <GlassInput
                    value={email}
                    onChangeText={onEmailChange}
                    placeholder="ton@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Mail size={17} color={stitchColors.sienna} strokeWidth={1.8} />}
                  />
                </View>
              )}

              {showPasswordInput && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {mode === 'new-password' ? 'Nouveau mot de passe' : 'Mot de passe'}
                  </Text>
                  <GlassInput
                    value={password}
                    onChangeText={onPasswordChange}
                    placeholder={
                      mode === 'sign-up' || mode === 'new-password'
                        ? '8 caractères minimum'
                        : '••••••••'
                    }
                    secureTextEntry
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    leftIcon={<Lock size={17} color={stitchColors.sienna} strokeWidth={1.8} />}
                  />
                </View>
              )}

              {(mode === 'new-password' || mode === 'sign-up') && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                  <GlassInput
                    value={passwordConfirm}
                    onChangeText={onPasswordConfirmChange}
                    placeholder="Retape le mot de passe"
                    secureTextEntry
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    leftIcon={<Lock size={17} color={stitchColors.sienna} strokeWidth={1.8} />}
                  />
                </View>
              )}

              {notice ? (
                <Text style={styles.notice}>{notice}</Text>
              ) : null}

              {/* Forgot password */}
              {mode === 'sign-in' && canPasswordReset && (
                <Pressable onPress={() => onModeChange('reset')}>
                  <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
                </Pressable>
              )}

              {/* Submit */}
              <PrimaryButton
                label={
                  loading
                    ? 'Patiente...'
                    : mode === 'sign-in'
                      ? "Entrer dans l'app"
                      : mode === 'sign-up'
                        ? 'Inscrire mes informations'
                        : mode === 'reset'
                          ? 'Recevoir un code'
                          : mode === 'reset-code'
                            ? 'Valider le code'
                            : mode === 'verify-email'
                              ? 'Confirmer mon email'
                              : 'Enregistrer le mot de passe'
                }
                onPress={onSubmit}
                loading={loading}
                fluid
                style={{ marginTop: 8 }}
              />

              {mode === 'sign-up' && (
                <Text style={styles.legalNotice}>
                  En créant un compte, tu acceptes les{' '}
                  <Text
                    style={styles.legalLink}
                    onPress={() => Linking.openURL(legalLinks(publicEnv.landingUrl).conditions).catch(() => {})}
                  >
                    Conditions d'utilisation
                  </Text>
                  {' '}et la{' '}
                  <Text
                    style={styles.legalLink}
                    onPress={() => Linking.openURL(legalLinks(publicEnv.landingUrl).privacy).catch(() => {})}
                  >
                    Politique de confidentialité
                  </Text>
                  .
                </Text>
              )}

              {/* Google */}
              {canGoogle && (mode === 'sign-in' || mode === 'sign-up') && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OU</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <SecondaryButton
                    label="Se connecter avec Google"
                    onPress={onGoogle}
                    fluid
                  />
                </>
              )}

              {/* Back from reset / OTP steps */}
              {(mode === 'reset' || isOtpStep) && (
                <Pressable style={styles.switchLink} onPress={() => onModeChange(mode === 'verify-email' && name ? 'sign-up' : 'sign-in')}>
                  <Text style={styles.switchText}>
                    {mode === 'verify-email' ? 'Mauvais email ? ' : 'Retour à la '}
                    <Text style={styles.switchHighlight}>
                      {mode === 'verify-email' ? 'Le modifier' : 'connexion'}
                    </Text>
                  </Text>
                </Pressable>
              )}

              {/* Switch mode */}
              {(mode === 'sign-in' || mode === 'sign-up') && (
                <Pressable
                  style={styles.switchLink}
                  onPress={() =>
                    onModeChange(mode === 'sign-in' ? 'sign-up' : 'sign-in')
                  }
                >
                  <Text style={styles.switchText}>
                    {mode === 'sign-in'
                      ? 'Pas encore de compte ? '
                      : 'Déjà un compte ? '}
                    <Text style={styles.switchHighlight}>
                      {mode === 'sign-in' ? 'Créer un compte' : 'Se connecter'}
                    </Text>
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Success Popup Dialog */}
            {/* Boolean(...) so an empty notice never renders a bare '' text node inside a View. */}
            {Boolean(notice) && (notice.toLowerCase().includes('succès') || notice.toLowerCase().includes('réussi') || notice.toLowerCase().includes('envoyé')) && (
              <View style={styles.successModalBackdrop}>
                <View style={styles.successModalCard}>
                  <View style={styles.successIconCircle}>
                    <CheckCircle2 size={36} color={stitchColors.emerald} />
                  </View>
                  <Text style={styles.successTitle}>Opération Réussie !</Text>
                  <Text style={styles.successMessage}>{notice}</Text>
                  <PrimaryButton
                    label="Continuer vers la connexion"
                    onPress={() => onModeChange('sign-in')}
                    fluid
                    style={{ marginTop: 14 }}
                  />
                </View>
              </View>
            )}

            {onClose && (
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Fermer</Text>
              </Pressable>
            )}
          </GlassCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background, // Clean white / slate 50
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: stitchSpacing.containerMargin,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 60,
  },
  cardWrap: {
    alignItems: 'center',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    backgroundColor: stitchColors.white, // Clean white
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: stitchColors.sienna,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: stitchColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  logoTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 22,
    fontWeight: '900',
    color: stitchColors.ink, // #0F172A
    letterSpacing: -0.4,
  },
  logoSubtitle: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  cardTitle: {
    fontFamily: fontFamilies.outfit,
    color: stitchColors.ink,
    textAlign: 'center',
    marginBottom: 18,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: stitchColors.inkSoft,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.sm,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
    flex: 1,
    marginRight: 6,
  },
  dropdownPlaceholder: {
    color: stitchColors.inkSubtle,
  },
  notice: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.sienna,
    fontWeight: '600',
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: stitchRadius.sm,
  },
  forgotLink: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.sienna,
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 2,
  },
  helperText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 19,
    color: stitchColors.inkMuted,
    textAlign: 'center',
  },
  helperStrong: {
    color: stitchColors.ink,
    fontWeight: '700',
  },
  resendLink: {
    textAlign: 'center',
  },
  resendLinkDisabled: {
    color: stitchColors.inkMuted,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: stitchColors.glassBorder,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: stitchColors.inkMuted,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 6,
  },
  switchText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.inkMuted,
  },
  switchHighlight: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },
  legalNotice: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 17,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  legalLink: {
    color: stitchColors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    fontSize: 13,
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },
  successModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: stitchColors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 18,
    fontWeight: '800',
    color: stitchColors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal Picker styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: stitchColors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.paperSoft,
    marginBottom: 6,
  },
  pickerModalTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 16,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  pickerOption: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.background,
  },
  pickerOptionText: {
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
    fontWeight: '500',
  },
});
