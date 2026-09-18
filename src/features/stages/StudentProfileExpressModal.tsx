import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Check, School, BookOpen, Layers, User } from 'lucide-react-native';
import { stitchColors, fontFamilies } from '../../theme/stitch';

interface StudentProfileExpressModalProps {
  visible: boolean;
  initialUniversity?: string;
  initialMajor?: string;
  initialLevel?: string;
  initialSkills?: string[];
  onClose: () => void;
  onSaveAndContinue: (data: {
    university: string;
    major: string;
    level: string;
    skills: string[];
  }) => void;
}

export function StudentProfileExpressModal({
  visible,
  initialUniversity = 'Université de Yaoundé I',
  initialMajor = 'Informatique & Télécoms',
  initialLevel = 'Licence 3',
  initialSkills = [],
  onClose,
  onSaveAndContinue,
}: StudentProfileExpressModalProps) {
  const [university, setUniversity] = useState(initialUniversity);
  const [major, setMajor] = useState(initialMajor);
  const [level, setLevel] = useState(initialLevel);
  const [skillsStr, setSkillsStr] = useState(
    initialSkills.length > 0 ? initialSkills.join(', ') : 'Excel, Comptabilité, Analyse'
  );
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  const handleSave = () => {
    setSaving(true);
    const parsedSkills = skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSaveAndContinue({
      university: university.trim() || 'Université Partenaire',
      major: major.trim() || 'Gestion & Commerce',
      level: level.trim() || 'Licence 3',
      skills: parsedSkills.length > 0 ? parsedSkills : ['Rigueur', 'Gestion', 'Informatique'],
    });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.profileBadge}>
                <User size={13} color="#A78BFA" />
                <Text style={styles.profileBadgeText}>Profil candidat</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <X size={18} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.title}>Complétez votre profil express</Text>
            <Text style={styles.subtitle}>
              Ces informations permettent d'adapter votre CV et votre lettre de motivation aux exigences du recruteur.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Université */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <School size={13} color="#A78BFA" />
                <Text style={styles.label}>Université ou École</Text>
              </View>
              <TextInput
                style={styles.input}
                value={university}
                onChangeText={setUniversity}
                placeholder="Ex: Université de Yaoundé I, INP-HB..."
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Filière & Niveau */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1.4 }]}>
                <View style={styles.labelRow}>
                  <BookOpen size={13} color="#A78BFA" />
                  <Text style={styles.label}>Filière</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={major}
                  onChangeText={setMajor}
                  placeholder="Ex: Finance, Informatique..."
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Layers size={13} color="#A78BFA" />
                  <Text style={styles.label}>Niveau</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={level}
                  onChangeText={setLevel}
                  placeholder="Ex: Licence 3, BTS"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            {/* Compétences clés */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Layers size={13} color="#A78BFA" />
                <Text style={styles.label}>Compétences majeures (séparées par des virgules)</Text>
              </View>
              <TextInput
                style={styles.input}
                value={skillsStr}
                onChangeText={setSkillsStr}
                placeholder="Ex: React, Node.js, SQL ou Comptabilité, Audit"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            testID="btn-express-save"
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.submitBtnText}>Enregistrer et continuer</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#120E22',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    elevation: 4,
  },
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  profileBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '600',
    color: '#DDD6FE',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 16,
    color: stitchColors.inkMuted,
  },
  form: {
    gap: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGroup: {
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#DDD6FE',
  },
  input: {
    backgroundColor: '#090714',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamilies.inter,
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
