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
import { Sparkles, X, Check, School, BookOpen, Layers } from 'lucide-react-native';
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
              <View style={styles.aiBadge}>
                <Sparkles size={14} color="#A78BFA" />
                <Text style={styles.aiBadgeText}>Agent Matcher IA</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <X size={18} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.title}>Complète ton profil express</Text>
            <Text style={styles.subtitle}>
              L'IA a besoin de ces 3 informations pour aligner ton CV et ta lettre mot pour mot sur l'offre.
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
                <Sparkles size={13} color="#34D399" />
                <Text style={styles.label}>3 Compétences majeures (séparées par des virgules)</Text>
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
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.submitBtnText}>Enregistrer et Lancer l'IA</Text>
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
    backgroundColor: '#131024',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
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
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  aiBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    color: '#A78BFA',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#191433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
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
    fontWeight: '600',
    color: '#DDD6FE',
  },
  input: {
    backgroundColor: '#090714',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamilies.inter,
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
