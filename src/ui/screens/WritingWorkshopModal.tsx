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
  // The plan is free; then the report (or each thesis chapter) is paid.
  const [phase, setPhase] = useState<'plan' | 'done'>('plan');
  const [planSections, setPlanSections] = useState<string[]>([]);
  const [thesisMode, setThesisMode] = useState<'forfait' | 'chapitre'>('chapitre');
  const [writtenChapters, setWrittenChapters] = useState<number[]>([]);
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const generationId = React.useRef('');
  const outline = Array.isArray(templateReport?.table_of_contents) ? templateReport!.table_of_contents : [];

  // "Utiliser ce plan": start from the reference report's field and plan.
  React.useEffect(() => {
    if (!visible || !templateReport) return;
    setDocType('REPORT');
    setGeneratedDoc(null);
    setPhase('plan');
    setField(templateReport.field || '');
  }, [visible, templateReport]);

  const pricing = {
    REPORT: { price: 'Plan gratuit, puis 2 000 FCFA', title: 'Rapport de Stage', icon: FileText, desc: 'Plan gratuit, puis rapport complet (Intro, Missions, Bilan, Recommandations)' },
    THESIS: { price: 'Plan gratuit, puis 4 000 F ou 1 000 F/chapitre', title: 'Mémoire / Soutenance', icon: GraduationCap, desc: 'Problématique et plan gratuits, puis rédaction chapitre par chapitre (forfait 4 000 F ou 1 000 F par chapitre)' },
    CV: { price: '300 FCFA', title: 'CV & Bio Professionnelle', icon: Sparkles, desc: 'CV percutant ATS-compatible avec accroche personnalisée' },
  };

  // Numbered or titled lines of the plan the AI proposed (at most 12).
  const parsePlan = (markdown: string): string[] =>
    markdown
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^(#{1,3}\s+|\d+[.)]\s+|chapitre\s+\d+)/i.test(line))
      .map((line) => line.replace(/^#{1,3}\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
      .filter((line) => line.length > 2 && !/^probl[ée]matique/i.test(line))
      .slice(0, 12);

  type StepInput = { step: 'plan' | 'full' | 'chapter'; chapterIndex?: number; chapterTitle?: string };

  const runStep = async ({ step, chapterIndex, chapterTitle }: StepInput): Promise<string | null> => {
    try {
      const res = await authFetch('/api/mobile/documents/workshop', {
        method: 'POST',
        body: JSON.stringify({
          type: docType,
          step,
          topic: topic.trim(),
          field: field.trim() || undefined,
          notes: outlineNotes.trim() || undefined,
          outline: step === 'plan' ? (docType === 'REPORT' && outline.length ? outline.slice(0, 30) : undefined) : planSections.length ? planSections : undefined,
          thesisMode: step === 'chapter' ? thesisMode : undefined,
          chapterIndex,
          chapterTitle,
          generationId: generationId.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { content?: string; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || data.message || 'Rédaction impossible pour le moment.');
      if (!data.content) throw new Error("L'IA n'a pas pu rédiger le document. Réessaie.");
      return data.content;
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
      return null;
    }
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      AppAlert.alert('Champs requis', 'Veuillez renseigner le thème ou sujet principal.');
      return;
    }
    // One id per document: the plan, the report and every chapter share it.
    generationId.current = `${docType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setWrittenChapters([]);
    setIsGenerating(true);
    void (async () => {
      const content = await runStep({ step: docType === 'CV' ? 'full' : 'plan' });
      if (content) {
        setGeneratedDoc(content);
        setPlanSections(docType === 'CV' ? [] : parsePlan(content));
        setPhase(docType === 'CV' ? 'done' : 'plan');
      }
      setIsGenerating(false);
    })();
  };

  const handleWriteReport = () => {
    setIsGenerating(true);
    void (async () => {
      const content = await runStep({ step: 'full' });
      if (content) {
        setGeneratedDoc(content);
        setPhase('done');
      }
      setIsGenerating(false);
    })();
  };

  const handleWriteChapter = (index: number, title: string) => {
    setBusyChapter(index);
    void (async () => {
      const content = await runStep({ step: 'chapter', chapterIndex: index, chapterTitle: title });
      if (content) {
        setGeneratedDoc((current) => `${current ?? ''}\n\n---\n\n${content}`);
        setWrittenChapters((current) => (current.includes(index) ? current : [...current, index]));
      }
      setBusyChapter(null);
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
                      <Text style={styles.btnText}>
                        {docType === 'CV' ? "Rédiger le CV avec l'IA (300 FCFA)" : 'Obtenir le plan (gratuit)'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <CheckCircle2 size={18} color={stitchColors.emerald} />
                <Text style={styles.resultHeaderText}>
                  {phase === 'plan' ? 'Plan proposé (gratuit)' : 'Document rédigé avec succès'}
                </Text>
              </View>

              <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.resultText}>{generatedDoc}</Text>
              </ScrollView>

              {phase === 'plan' && docType === 'REPORT' ? (
                <Pressable
                  style={styles.stepBtn}
                  onPress={handleWriteReport}
                  disabled={isGenerating}
                  testID="btn-write-report"
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color={stitchColors.white} />
                  ) : (
                    <Text style={styles.stepBtnText}>Rédiger le rapport complet (2 000 FCFA)</Text>
                  )}
                </Pressable>
              ) : null}

              {phase === 'plan' && docType === 'THESIS' ? (
                <View style={styles.thesisBox}>
                  <View style={styles.modeRow}>
                    {(['forfait', 'chapitre'] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        style={[styles.modeChip, thesisMode === mode && styles.modeChipSelected]}
                        onPress={() => setThesisMode(mode)}
                        disabled={writtenChapters.length > 0}
                      >
                        <Text style={[styles.modeChipText, thesisMode === mode && styles.modeChipTextSelected]}>
                          {mode === 'forfait' ? 'Forfait 4 000 F (tous les chapitres)' : '1 000 F par chapitre'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {planSections.length === 0 ? (
                    <Text style={styles.docDesc}>Aucun chapitre reconnu dans le plan : relance la génération du plan.</Text>
                  ) : (
                    planSections.map((title, i) => {
                      const index = i + 1;
                      const done = writtenChapters.includes(index);
                      const covered = done || (thesisMode === 'forfait' && writtenChapters.length > 0);
                      return (
                        <View key={`${index}-${title}`} style={styles.chapterRow}>
                          <Text style={styles.chapterTitle} numberOfLines={2}>
                            {index}. {title}
                          </Text>
                          <Pressable
                            style={[styles.chapterBtn, done && styles.chapterBtnDone]}
                            onPress={() => handleWriteChapter(index, title)}
                            disabled={busyChapter !== null || done}
                          >
                            {busyChapter === index ? (
                              <ActivityIndicator size="small" color={stitchColors.white} />
                            ) : (
                              <Text style={styles.chapterBtnText}>
                                {done ? 'Rédigé' : covered ? 'Rédiger (payé)' : thesisMode === 'forfait' && writtenChapters.length === 0 ? 'Rédiger' : 'Rédiger · 1 000 F'}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                  <Text style={styles.docDesc}>
                    {thesisMode === 'forfait'
                      ? 'Le forfait de 4 000 F est débité au premier chapitre et couvre tous les autres.'
                      : 'Chaque chapitre est payé une seule fois, et rendu si l’IA échoue.'}
                  </Text>
                </View>
              ) : null}

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
                    setPhase('plan');
                    setPlanSections([]);
                    setWrittenChapters([]);
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
  stepBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  stepBtnText: { color: stitchColors.white, fontWeight: '700', fontSize: 15 },
  thesisBox: { marginTop: 12, gap: 8 },
  modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modeChip: {
    borderWidth: 1,
    borderColor: stitchColors.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipSelected: { borderColor: stitchColors.sienna, backgroundColor: stitchColors.siennaBg },
  modeChipText: { fontSize: 13, color: stitchColors.inkSoft },
  modeChipTextSelected: { color: stitchColors.sienna, fontWeight: '700' },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterTitle: { flex: 1, fontSize: 14, color: stitchColors.ink },
  chapterBtn: {
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: stitchColors.primary,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterBtnDone: { backgroundColor: stitchColors.emeraldDeep },
  chapterBtnText: { color: stitchColors.white, fontWeight: '700', fontSize: 13 },
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
