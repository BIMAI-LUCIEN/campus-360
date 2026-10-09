import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Modal,
  FlatList,
  View,
} from 'react-native';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const UNIVERSITIES = [
  'Université de Douala',
  'Université de Yaoundé I',
  'Université de Yaoundé II',
  'Université de Dschang',
  'Université de Buea',
  'Université de Bamenda',
  'Université de Ngaoundéré',
  'Université de Maroua',
  'ENSP (Polytechnique)',
  'ENAM',
  'IUC',
  'IUT',
  'IUG',
  'UCAC',
  'Autre / Privé',
];

const FACULTIES = [
  'Informatique et Génie Logiciel',
  'Génie Informatique',
  'Génie Réseaux et Télécommunications',
  'Génie Électrique',
  'Génie Civil',
  'Sciences Économiques et Gestion',
  'Droit et Sciences Politiques',
  'Médecine et Pharmacie',
  'Autre',
];

const LEVELS = [
  'Licence 1',
  'Licence 2',
  'Licence 3',
  'Master 1',
  'Master 2',
  'BTS 1ère année',
  'BTS 2ème année',
  'Cycle Ingénieur',
  'Autre',
];

interface AuthScreenProps {
  mode: 'sign-in' | 'sign-up' | 'reset' | 'new-password' | 'verify-email';
  email: string;
  password: string;
  name: string;
  whatsappPhone: string;
  university: string;
  faculty: string;
  level: string;
  loading: boolean;
  notice: string;
  canGoogle: boolean;
  canPasswordReset: boolean;
  onModeChange: (mode: AuthScreenProps['mode']) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
  onUniversityChange: (v: string) => void;
  onFacultyChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onClose?: () => void;
}

export function AuthScreen({
  mode,
  email,
  password,
  name,
  whatsappPhone,
  university,
  faculty,
  level,
  loading,
  notice,
  canGoogle,
  canPasswordReset,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onWhatsappChange,
  onUniversityChange,
  onFacultyChange,
  onLevelChange,
  onSubmit,
  onGoogle,
  onClose,
}: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [modalPicker, setModalPicker] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    onSelect: () => {},
  });

  const title =
    mode === 'sign-up'
      ? 'Créer un compte'
      : mode === 'reset'
        ? 'Mot de passe oublié'
        : mode === 'new-password'
          ? 'Nouveau mot de passe'
          : mode === 'verify-email'
            ? 'Confirmation e-mail'
            : 'Connexion';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
                colors={['#7C3AED', '#6D28D9']}
                style={styles.logoMark}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <GraduationCap size={28} color="#FFFFFF" strokeWidth={2} />
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

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>WhatsApp</Text>
                    <GlassInput
                      value={whatsappPhone}
                      onChangeText={onWhatsappChange}
                      placeholder="Ex: +237680000000"
                      keyboardType="phone-pad"
                      leftIcon={<Phone size={17} color={stitchColors.sienna} strokeWidth={1.8} />}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Université</Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() =>
                        setModalPicker({
                          visible: true,
                          title: 'Choisir une université',
                          options: UNIVERSITIES,
                          onSelect: (u) => onUniversityChange(u),
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.dropdownValue,
                          !university && styles.dropdownPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {university || 'Choisir une université...'}
                      </Text>
                      <ChevronDown size={16} color={stitchColors.inkMuted} />
                    </Pressable>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Filière</Text>
                      <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() =>
                          setModalPicker({
                            visible: true,
                            title: 'Choisir une filière',
                            options: FACULTIES,
                            onSelect: (f) => onFacultyChange(f),
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.dropdownValue,
                            !faculty && styles.dropdownPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {faculty || 'Filière'}
                        </Text>
                        <ChevronDown size={14} color={stitchColors.inkMuted} />
                      </Pressable>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Niveau</Text>
                      <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() =>
                          setModalPicker({
                            visible: true,
                            title: 'Choisir un niveau',
                            options: LEVELS,
                            onSelect: (l) => onLevelChange(l),
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.dropdownValue,
                            !level && styles.dropdownPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {level || 'Niveau'}
                        </Text>
                        <ChevronDown size={14} color={stitchColors.inkMuted} />
                      </Pressable>
                    </View>
                  </View>
                </>
              )}

              {mode !== 'new-password' && mode !== 'reset' && (
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

              {mode !== 'reset' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mot de passe</Text>
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
                        ? 'Créer mon espace'
                        : mode === 'reset'
                          ? 'Envoyer le lien'
                          : 'Modifier le mot de passe'
                }
                onPress={onSubmit}
                loading={loading}
                fluid
                style={{ marginTop: 8 }}
              />

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

              {/* Switch mode */}
              {mode !== 'reset' && mode !== 'new-password' && mode !== 'verify-email' && (
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
            {notice && (notice.toLowerCase().includes('succès') || notice.toLowerCase().includes('réussi') || notice.toLowerCase().includes('envoyé')) && (
              <View style={styles.successModalBackdrop}>
                <View style={styles.successModalCard}>
                  <View style={styles.successIconCircle}>
                    <CheckCircle2 size={36} color="#10B981" />
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

      {/* Modal Picker for University, Faculty, Level (Smooth, no keyboard push or layout crash) */}
      <Modal
        visible={modalPicker.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPicker((p) => ({ ...p, visible: false }))}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setModalPicker((p) => ({ ...p, visible: false }))}
        >
          <View style={styles.pickerModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{modalPicker.title}</Text>
              <Pressable
                onPress={() => setModalPicker((p) => ({ ...p, visible: false }))}
                hitSlop={10}
              >
                <X size={20} color={stitchColors.inkMuted} />
              </Pressable>
            </View>
            <FlatList
              data={modalPicker.options}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerOption,
                    pressed && { backgroundColor: 'rgba(124, 58, 237, 0.08)' },
                  ]}
                  onPress={() => {
                    modalPicker.onSelect(item);
                    setModalPicker((p) => ({ ...p, visible: false }));
                  }}
                >
                  <Text style={styles.pickerOptionText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Clean white / slate 50
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: stitchSpacing.containerMargin,
    paddingVertical: 36,
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF', // Clean white
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
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
    shadowColor: '#7C3AED',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#94A3B8',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    shadowColor: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
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
    borderBottomColor: '#F1F5F9',
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
    borderBottomColor: '#F8FAFC',
  },
  pickerOptionText: {
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
    fontWeight: '500',
  },
});
