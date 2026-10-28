import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  FileText,
  X,
  CheckCircle2,
  Download,
  Copy,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { stitchColors } from '../../theme/stitch';
import { freeLabel, isFreeLaunch } from '../../config/launch';
import { AppAlert } from '../AppAlert';
import { authFetch } from '../../features/auth/betterAuth';
import { copyToClipboard } from '../../features/whatsapp/whatsappService';
import type { ScrapedStageReport } from '../../types';

interface WritingWorkshopModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenWallet?: () => void;
  /** Reference report whose plan the AI follows ("Utiliser ce plan"). */
  templateReport?: ScrapedStageReport | null;
}

type WorkshopType = 'REPORT' | 'THESIS' | 'CV';

export function WritingWorkshopModal({
  visible,
  onClose,
  onOpenWallet,
  templateReport,
}: WritingWorkshopModalProps) {
  const [docType, setDocType] = useState<WorkshopType>('REPORT');
  const [topic, setTopic] = useState('');
  const [field, setField] = useState('');
  const [outlineNotes, setOutlineNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const outline = Array.isArray(templateReport?.table_of_contents) ? templateReport!.table_of_contents : [];

  // "Utiliser ce plan": start from the reference report's field and plan.
  React.useEffect(() => {
    if (!visible || !templateReport) return;
    setDocType('REPORT');
    setGeneratedDoc(null);
    setField(templateReport.field || '');
  }, [visible, templateReport]);

  const pricing = {
    REPORT: { get price() { return isFreeLaunch() ? freeLabel() : '2 000 FCFA'; }, title: 'Rapport de Stage', icon: FileText, desc: 'Structure académique complète (Intro, Missions, Bilan, Recommandations)' },
    THESIS: { get price() { return isFreeLaunch() ? freeLabel() : '5 000 FCFA'; }, title: 'Mémoire / Soutenance', icon: GraduationCap, desc: 'Problématique, Revue de littérature, Méthodologie et Conclusion' },
    CV: { get price() { return isFreeLaunch() ? freeLabel() : '500 FCFA'; }, title: 'CV & Bio Professionnelle', icon: Sparkles, desc: 'CV percutant ATS-compatible avec accroche personnalisée' },
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      AppAlert.alert('Champs requis', 'Veuillez renseigner le thème ou sujet principal.');
      return;
    }

    setIsGenerating(true);
    void (async () => {
      try {
        const res = await authFetch('/api/mobile/documents/workshop', {
          method: 'POST',
          body: JSON.stringify({
            type: docType,
            topic: topic.trim(),
            field: field.trim() || undefined,
            notes: outlineNotes.trim() || undefined,
            outline: docType === 'REPORT' && outline.length ? outline.slice(0, 30) : undefined,
            generationId: `${docType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          }),
        });
        const data = (await res.json()) as { content?: string };
        if (!data.content) throw new Error("L'IA n'a pas pu rédiger le document. Réessaie.");
        setGeneratedDoc(data.content);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Rédaction impossible pour le moment.';
        if (/solde insuffisant/i.test(message) && onOpenWallet) {
          AppAlert.alert('Solde insuffisant', message, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Recharger', onPress: onOpenWallet },
          ]);
        } else {
          AppAlert.alert('Rédaction impossible', message);
        }
      } finally {
        setIsGenerating(false);
      }
    })();
  };

  const handleCopy = async () => {
    if (!generatedDoc) return;
    const ok = await copyToClipboard(generatedDoc);
    AppAlert.alert(ok ? 'Copié' : 'Copie impossible', ok ? 'Le document est dans le presse-papier.' : 'Sélectionne le texte pour le copier.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Sparkles size={14} color="#C084FC" />
                <Text style={styles.badgeText}>Atelier d'Écriture IA</Text>
              </View>
              <Text style={styles.title}>Générateur Académique & Pro</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={stitchColors.inkSubtle} />
            </Pressable>
          </View>

          {!generatedDoc ? (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Doc Type Selector */}
              <Text style={styles.sectionLabel}>Type de document à rédiger</Text>
              <View style={styles.typeCardsRow}>
                {(['REPORT', 'THESIS', 'CV'] as WorkshopType[]).map((t) => {
                  const item = pricing[t];
                  const Icon = item.icon;
                  const isSelected = docType === t;
                  return (
                    <Pressable
                      key={t}
                      style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                      onPress={() => setDocType(t)}
                    >
                      <Icon size={20} color={isSelected ? '#A855F7' : stitchColors.inkSubtle} />
                      <Text style={[styles.typeCardTitle, isSelected && styles.typeCardTitleSelected]}>
                        {item.title}
                      </Text>
                      <Text style={styles.typeCardPrice}>{item.price}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.docDesc}>{pricing[docType].desc}</Text>
              {docType === 'REPORT' && outline.length > 0 && (
                <Text style={styles.docDesc}>
                  Plan repris de « {templateReport?.title} » ({outline.length} parties).
                </Text>
              )}

              {/* Input Form */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Thème / Sujet du document *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ex: Impact de la digitalisation sur la performance financière..."
                  placeholderTextColor={stitchColors.inkMuted}
                  value={topic}
                  onChangeText={setTopic}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Filière ou Établissement (Optionnel)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ex: Master Finance / INP-HB"
                  placeholderTextColor={stitchColors.inkMuted}
                  value={field}
                  onChangeText={setField}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Consignes particulières ou plan souhaité (Optionnel)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="ex: Mettre l'accent sur les outils SYSCOHADA et inclure 3 graphiques..."
                  placeholderTextColor={stitchColors.inkMuted}
                  multiline
                  value={outlineNotes}
                  onChangeText={setOutlineNotes}
                />
              </View>

              <Pressable
                style={styles.generateBtn}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                <LinearGradient
                  colors={[stitchColors.secondary, stitchColors.siennaDeep]}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color={stitchColors.white} />
                  ) : (
                    <>
                      <Sparkles size={18} color={stitchColors.white} />
                      <Text style={styles.btnText}>Rédiger avec l'IA ({pricing[docType].price})</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <CheckCircle2 size={18} color={stitchColors.emerald} />
                <Text style={styles.resultHeaderText}>Document rédigé avec succès</Text>
              </View>

              <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.resultText}>{generatedDoc}</Text>
              </ScrollView>

              <View style={styles.resultFooter}>
                <Pressable style={styles.copyBtn} onPress={handleCopy}>
                  <Copy size={16} color={stitchColors.inkSubtle} />
                  <Text style={styles.copyBtnText}>Copier le texte</Text>
                </Pressable>
                <Pressable
                  style={styles.newDocBtn}
                  onPress={() => {
                    setGeneratedDoc(null);
                    setTopic('');
                  }}
                >
                  <Text style={styles.newDocBtnText}>Nouveau Document</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: stitchColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    maxHeight: '92%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C084FC',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: stitchColors.ink,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  typeCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  typeCardSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#A855F7',
  },
  typeCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: stitchColors.inkSubtle,
    marginTop: 6,
    textAlign: 'center',
  },
  typeCardTitleSelected: {
    color: stitchColors.primary,
    fontWeight: '700',
  },
  typeCardPrice: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
    marginTop: 2,
  },
  docDesc: {
    fontSize: 11,
    color: stitchColors.inkSubtle,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkSoft,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: stitchColors.ink,
    fontSize: 13,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  generateBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  btnText: {
    color: stitchColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  resultContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  resultHeaderText: {
    color: stitchColors.emeraldDeep,
    fontSize: 13,
    fontWeight: '700',
  },
  resultScroll: {
    backgroundColor: stitchColors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 16,
    maxHeight: 280,
    marginBottom: 14,
  },
  resultText: {
    color: stitchColors.inkSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  resultFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 12,
    paddingVertical: 12,
  },
  copyBtnText: {
    color: stitchColors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  newDocBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  newDocBtnText: {
    color: stitchColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
