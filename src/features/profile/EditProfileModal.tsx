import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import {
  updateStudentProfile,
  type StudentProfile,
  type StudentProfileUpdateInput,
} from '../auth/betterAuth';
import { FACULTY_NAMES, LEVELS, UNIVERSITIES } from '../onboarding/academicCatalog';
import { fontFamilies, stitchColors, stitchRadius } from '../../theme/stitch';
import { KeyboardSafeView } from '../../ui/KeyboardSafeView';
import { SelectWithOther } from '../../ui/SelectWithOther';

interface EditProfileModalProps {
  visible: boolean;
  profile: StudentProfile | null;
  onClose: () => void;
  onSaved: (updated: StudentProfile) => void;
}

const PHONE_RE = /^[+0-9 ()\-]+$/;

const validatePhone = (value: string, label: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 6 || trimmed.length > 20 || !PHONE_RE.test(trimmed)) {
    return `${label} invalide (6 à 20 chiffres).`;
  }
  return null;
};

/** Modal for editing the student's account identity, contact numbers, and academic profile. */
export function EditProfileModal({ visible, profile, onClose, onSaved }: EditProfileModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [level, setLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setWhatsappPhone(profile?.whatsappPhone || '');
    setUniversity(profile?.university || '');
    setFaculty(profile?.faculty || '');
    setLevel(profile?.level || '');
    setError(null);
  }, [visible, profile]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Entre ton nom complet (au moins 2 caractères).');
      return;
    }
    const phoneErr = validatePhone(phone, 'Numéro de téléphone');
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    const waErr = validatePhone(whatsappPhone, 'Numéro WhatsApp');
    if (waErr) {
      setError(waErr);
      return;
    }

    const payload: StudentProfileUpdateInput = {
      name: trimmedName,
      phone: phone.trim(),
      whatsappPhone: whatsappPhone.trim(),
      university: university.trim(),
      faculty: faculty.trim(),
      level: level.trim(),
    };

    setSaving(true);
    setError(null);
    try {
      const updated = await updateStudentProfile(payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour tes informations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardSafeView style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Mes informations</Text>
              <Text style={styles.subtitle}>Modifie ton identité, tes contacts et ton parcours académique.</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              style={styles.closeBtn}
            >
              <X size={20} color={stitchColors.ink} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {profile?.email ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Adresse e-mail</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText} numberOfLines={1}>{profile.email}</Text>
                </View>
                <Text style={styles.hint}>Identifiant de connexion (non modifiable ici).</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex : Jean Dupont"
                placeholderTextColor={stitchColors.inkSubtle}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ex : +237 690 00 00 00"
                placeholderTextColor={stitchColors.inkSubtle}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Numéro WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={whatsappPhone}
                onChangeText={setWhatsappPhone}
                placeholder="Ex : +237 690 00 00 00"
                placeholderTextColor={stitchColors.inkSubtle}
                keyboardType="phone-pad"
                editable={!saving}
              />
              <Text style={styles.hint}>Utilisé pour tes candidatures et les retours recruteurs.</Text>
            </View>

            <View style={styles.divider} />

            <SelectWithOther
              label="Établissement / Université"
              value={university}
              options={UNIVERSITIES}
              onChange={setUniversity}
              placeholder="Choisir ton établissement"
              otherPlaceholder="Nom de ton établissement"
            />

            <SelectWithOther
              label="Filière / Faculté"
              value={faculty}
              options={FACULTY_NAMES}
              onChange={setFaculty}
              placeholder="Choisir ta filière"
              otherPlaceholder="Nom de ta filière"
            />

            <SelectWithOther
              label="Niveau d'études"
              value={level}
              options={LEVELS}
              onChange={setLevel}
              placeholder="Choisir ton niveau"
              otherPlaceholder="Ex : Master 2"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                saving && { opacity: 0.7 },
                pressed && !saving && { opacity: 0.88 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={stitchColors.white} />
              ) : (
                <>
                  <Check size={16} color={stitchColors.white} strokeWidth={2.5} />
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardSafeView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontWeight: '800',
    color: stitchColors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.inkMuted,
    lineHeight: 18,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: fontFamilies.displaySemi,
    fontSize: 13,
    fontWeight: '600',
    color: stitchColors.inkSoft,
  },
  input: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamilies.inter,
    fontSize: 15,
    color: stitchColors.ink,
  },
  readOnlyBox: {
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontFamily: fontFamilies.inter,
    fontSize: 15,
    color: stitchColors.inkMuted,
  },
  hint: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: stitchColors.inkSubtle,
  },
  divider: {
    height: 1,
    backgroundColor: stitchColors.inkFaint,
    marginVertical: 4,
  },
  errorBox: {
    backgroundColor: stitchColors.errorBg,
    borderRadius: stitchRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: stitchColors.error,
  },
  errorText: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 13,
    color: stitchColors.error,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: stitchColors.surface,
    borderTopWidth: 1,
    borderTopColor: stitchColors.inkFaint,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fontFamilies.displaySemi,
    fontSize: 15,
    fontWeight: '600',
    color: stitchColors.inkSoft,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 13,
    borderRadius: stitchRadius.md,
    backgroundColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fontFamilies.display,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.white,
  },
});
