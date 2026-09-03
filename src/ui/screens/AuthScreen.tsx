import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  Sparkles,
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
  stitchComponents,
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

function DropdownSelector({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = options.filter((o) => o.toLowerCase().includes(value.toLowerCase()));

  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        style={styles.dropdownTrigger}
        onPress={() => setOpen(!open)}
      >
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {value || `Choisir...`}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdownList}>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            {filtered.map((opt) => (
              <Pressable
                key={opt}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  pressed && { backgroundColor: `${stitchColors.primary}10` },
                ]}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
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
  const [univOpen, setUnivOpen] = useState(false);
  const [facOpen, setFacOpen] = useState(false);
  const [lvlOpen, setLvlOpen] = useState(false);

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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                <Text style={{ color: '#DDD6FE', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </Pressable>
            )}
            {/* Editorial eyebrow */}
            <Text style={styles.eyebrow}>ACCÈS ÉTUDIANT</Text>

            {/* Logo Emblem (Image 2 style) */}
            <View style={styles.logoWrap}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
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
                      leftIcon={<User size={17} color="#A78BFA" strokeWidth={1.8} />}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>WhatsApp</Text>
                    <GlassInput
                      value={whatsappPhone}
                      onChangeText={onWhatsappChange}
                      placeholder="Ex: +237680000000"
                      keyboardType="phone-pad"
                      leftIcon={<Phone size={17} color="#A78BFA" strokeWidth={1.8} />}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Université</Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setUnivOpen(!univOpen)}
                    >
                      <Text style={[styles.dropdownValue, !university && styles.dropdownPlaceholder]}>
                        {university || 'Choisir une université...'}
                      </Text>
                      <Text style={styles.dropdownArrow}>▼</Text>
                    </Pressable>
                    {univOpen && (
                      <View style={styles.dropdownList}>
                        <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                          {UNIVERSITIES.map((u) => (
                            <Pressable
                              key={u}
                              style={({ pressed }) => [
                                styles.dropdownOption,
                                pressed && { backgroundColor: `${stitchColors.primary}10` },
                              ]}
                              onPress={() => { onUniversityChange(u); setUnivOpen(false); }}
                            >
                              <Text style={styles.dropdownOptionText}>{u}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Filière</Text>
                      <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setFacOpen(!facOpen)}
                      >
                        <Text style={[styles.dropdownValue, !faculty && styles.dropdownPlaceholder]}>
                          {faculty || 'Filière'}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                      </Pressable>
                      {facOpen && (
                        <View style={styles.dropdownList}>
                          <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                            {FACULTIES.map((f) => (
                              <Pressable
                                key={f}
                                style={({ pressed }) => [
                                  styles.dropdownOption,
                                  pressed && { backgroundColor: `${stitchColors.primary}10` },
                                ]}
                                onPress={() => { onFacultyChange(f); setFacOpen(false); }}
                              >
                                <Text style={styles.dropdownOptionText}>{f}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Niveau</Text>
                      <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setLvlOpen(!lvlOpen)}
                      >
                        <Text style={[styles.dropdownValue, !level && styles.dropdownPlaceholder]}>
                          {level || 'Niveau'}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                      </Pressable>
                      {lvlOpen && (
                        <View style={styles.dropdownList}>
                          <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                            {LEVELS.map((l) => (
                              <Pressable
                                key={l}
                                style={({ pressed }) => [
                                  styles.dropdownOption,
                                  pressed && { backgroundColor: `${stitchColors.primary}10` },
                                ]}
                                onPress={() => { onLevelChange(l); setLvlOpen(false); }}
                              >
                                <Text style={styles.dropdownOptionText}>{l}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
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
                    leftIcon={<Mail size={17} color="#A78BFA" strokeWidth={1.8} />}
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
                    leftIcon={<Lock size={17} color="#A78BFA" strokeWidth={1.8} />}
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

            {/* Success Popup Dialog (Image 2 style) */}
            {notice && (notice.toLowerCase().includes('succès') || notice.toLowerCase().includes('réussi') || notice.toLowerCase().includes('envoyé')) && (
              <View style={styles.successModalBackdrop}>
                <View style={styles.successModalCard}>
                  <View style={styles.successIconCircle}>
                    <CheckCircle2 size={36} color="#34D399" />
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
    backgroundColor: stitchColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: stitchSpacing.containerMargin,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#131024',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: stitchColors.primary,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerRule: {
    height: 1,
    backgroundColor: stitchColors.outlineVariant,
    marginBottom: 20,
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
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  logoMarkText: {
    fontFamily: SERIF,
    color: stitchColors.paper,
    fontSize: 24,
    fontWeight: '900',
  },
  logoTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.4,
  },
  logoSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center',
  },
  iconInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  leadingInputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 5,
  },
  cardTitle: {
    ...stitchTypography.headlineMd,
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 18,
    fontSize: 19,
    fontWeight: '800',
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
    ...stitchTypography.labelSm,
    color: stitchColors.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: stitchColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    ...stitchComponents.inputText,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: stitchColors.outline,
  },
  dropdownArrow: {
    fontSize: 10,
    color: stitchColors.onSurfaceVariant,
  },
  dropdownList: {
    backgroundColor: stitchColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.md,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.outlineVariant,
  },
  dropdownOptionText: {
    ...stitchTypography.bodyMd,
    color: stitchColors.onSurface,
  },
  notice: {
    ...stitchTypography.bodyMd,
    color: stitchColors.secondary,
    fontWeight: '600',
    textAlign: 'center',
    padding: 8,
    backgroundColor: `${stitchColors.secondary}10`,
    borderRadius: stitchRadius.sm,
  },
  forgotLink: {
    ...stitchTypography.labelMd,
    color: stitchColors.primary,
    textAlign: 'right',
    fontWeight: '600',
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
    backgroundColor: stitchColors.outlineVariant,
  },
  dividerText: {
    ...stitchTypography.labelSm,
    color: stitchColors.onSurfaceVariant,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 4,
  },
  switchText: {
    ...stitchTypography.bodyMd,
    color: stitchColors.onSurfaceVariant,
  },
  switchHighlight: {
    color: stitchColors.primary,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    ...stitchTypography.labelMd,
    color: stitchColors.onSurfaceVariant,
  },
  successModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 7, 20, 0.88)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: '#160F2E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 19,
  },
});
