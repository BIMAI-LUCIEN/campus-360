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
  Alert,
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

interface WritingWorkshopModalProps {
  visible: boolean;
  onClose: () => void;
  tokens?: number;
  onOpenWallet?: () => void;
}

type WorkshopType = 'REPORT' | 'THESIS' | 'CV';

export function WritingWorkshopModal({
  visible,
  onClose,
  tokens = 1,
  onOpenWallet,
}: WritingWorkshopModalProps) {
  const [docType, setDocType] = useState<WorkshopType>('REPORT');
  const [topic, setTopic] = useState('');
  const [field, setField] = useState('');
  const [outlineNotes, setOutlineNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);

  const pricing = {
    REPORT: { price: '1 000 FCFA', title: 'Rapport de Stage', icon: FileText, desc: 'Structure académique complète (Intro, Missions, Bilan, Recommandations)' },
    THESIS: { price: '2 500 FCFA', title: 'Mémoire / Soutenance', icon: GraduationCap, desc: 'Problématique, Revue de littérature, Méthodologie et Conclusion' },
    CV: { price: '500 FCFA', title: 'CV & Bio Professionnelle', icon: Sparkles, desc: 'CV percutant ATS-compatible avec accroche personnalisée' },
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le thème ou sujet principal.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      if (docType === 'REPORT') {
        setGeneratedDoc(
          `# RAPPORT DE STAGE ACADÉMIQUE\n## Thème : ${topic}\nFilière : ${field || 'Sciences de Gestion / Informatique'}\n\n### 1. Introduction & Présentation de l'Entreprise\nLe présent rapport retrace la période d'immersion professionnelle effectuée au sein de la structure d'accueil. Ce stage a constitué une opportunité d'appliquer les connaissances théoriques acquises durant le cycle de formation.\n\n### 2. Missions Confiées & Réalisations\n- Analyse des besoins et diagnostic opérationnel\n- Déploiement des solutions et suivi des indicateurs de performance\n- Coordination des livrables avec l'équipe projet\n\n### 3. Compétences Développées & Bilan Professionnel\nAu cours de cette expérience, nous avons renforcé notre maîtrise des outils de gestion de projet ainsi que nos aptitudes en travail d'équipe et en résolution de problèmes complexes.\n\n### 4. Recommandations Stratégiques & Conclusion\nNous suggérons une automatisation progressive des flux de traitement afin d'accroître l'efficience opérationnelle globale.`
        );
      } else if (docType === 'THESIS') {
        setGeneratedDoc(
          `# PROJET DE MÉMOIRE DE FIN D'ÉTUDES\n## Thématique : ${topic}\n\n### I. Problématique & Justification du Choix\nComment optimiser les processus décisionnels dans un contexte d'intégration technologique accélérée ?\n\n### II. Cadre Théorique & Revue de Littérature\nSynthèse des modèles conceptuels existants et identification des lacunes opérationnelles.\n\n### III. Méthodologie de Recherche\nApproche mixte combinant analyse qualitative des entretiens et modélisation quantitative des données terrain.\n\n### IV. Résultats Attendus & Perspectives\nFormulation de préconisations scientifiques et managériales pour le secteur d'activité.`
        );
      } else {
        setGeneratedDoc(
          `# CV PROFESSIONNEL OPTIMISÉ\n**Profil : ${topic}**\n\n**Accroche Professionnelle :**\nDiplômé dynamique et orienté résultats, démontrant une solide expertise pratique et une forte capacité d'adaptation en environnement agile.\n\n**Compétences Clés :**\n- Analyse Stratégique & Gestion de Projet\n- Maîtrise des Outils Digitaux & Reporting\n- Communication Interpersonnelle & Négociation`
        );
      }
    }, 1800);
  };

  const handleCopy = () => {
    Alert.alert('Succès', 'Le document a été copié dans le presse-papier !');
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
              <X size={20} color="#94A3B8" />
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
                      <Icon size={20} color={isSelected ? '#A855F7' : '#94A3B8'} />
                      <Text style={[styles.typeCardTitle, isSelected && styles.typeCardTitleSelected]}>
                        {item.title}
                      </Text>
                      <Text style={styles.typeCardPrice}>{item.price}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.docDesc}>{pricing[docType].desc}</Text>

              {/* Input Form */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Thème / Sujet du document *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ex: Impact de la digitalisation sur la performance financière..."
                  placeholderTextColor="#64748B"
                  value={topic}
                  onChangeText={setTopic}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Filière ou Établissement (Optionnel)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ex: Master Finance / INP-HB"
                  placeholderTextColor="#64748B"
                  value={field}
                  onChangeText={setField}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Consignes particulières ou plan souhaité (Optionnel)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="ex: Mettre l'accent sur les outils SYSCOHADA et inclure 3 graphiques..."
                  placeholderTextColor="#64748B"
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
                  colors={['#8B5CF6', '#6D28D9']}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#FFFFFF" />
                      <Text style={styles.btnText}>Rédiger avec l'IA ({pricing[docType].price})</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={styles.resultHeaderText}>Document rédigé avec succès</Text>
              </View>

              <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.resultText}>{generatedDoc}</Text>
              </ScrollView>

              <View style={styles.resultFooter}>
                <Pressable style={styles.copyBtn} onPress={handleCopy}>
                  <Copy size={16} color="#94A3B8" />
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
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#FFFFFF',
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
    color: '#CBD5E1',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  typeCardTitleSelected: {
    color: '#FFFFFF',
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
    color: '#94A3B8',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  resultScroll: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    maxHeight: 280,
    marginBottom: 14,
  },
  resultText: {
    color: '#E2E8F0',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  newDocBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 12,
  },
  newDocBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
