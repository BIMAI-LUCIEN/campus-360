import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Linking, KeyboardAvoidingView, Platform
} from 'react-native';

import { FileText, Mail, Briefcase, GraduationCap, Sparkles } from 'lucide-react-native';
import { authBaseUrl, authFetch, authClient, type StudentProfile } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import { GradientText } from '../../ui/GlassComponents';
import { DocGenChat } from './DocGenChat';

// ─── Document-type tiles (reference "upload options" grid layout) ─────────────
const TYPE_TILES = [
  { key: 'cv', label: 'CV', Icon: FileText, color: '#60A5FA', tint: 'rgba(96,165,250,0.14)', hasAi: true },
  { key: 'lettre_motivation', label: 'Lettre', Icon: Mail, color: '#F472B6', tint: 'rgba(244,114,182,0.14)', hasAi: true },
  { key: 'stage', label: 'Rapport de stage', Icon: Briefcase, color: '#FBBF24', tint: 'rgba(251,191,36,0.14)', hasAi: false },
  { key: 'memoire', label: 'Mémoire', Icon: GraduationCap, color: '#A855F7', tint: 'rgba(168,85,247,0.14)', hasAi: false },
] as const;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) as string;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string;
const SANS = Platform.select({ ios: 'System', android: 'sans-serif-medium', web: 'Outfit, sans-serif' }) as string;

type Document = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type CreateStep = 'type-select' | 'form' | 'generating' | null;

type DocumentsScreenProps = {
  onEditDocument: (id: string) => void;
};

const IA_CREDITS_PER_GEN = 5;

// ─── Type cards ────────────────────────────────────────────────────────────────
// Each type is rendered in its own typographic voice — like a poster series.
// No emoji, no random color. The typography IS the personality.
const DOCUMENT_TYPES = [
  {
    key: 'cv',
    label: 'CV',
    kicker: 'Pour postuler',
    desc: 'Une page. Des faits. Pas de place pour le doute.',
    voice: 'sans' as const,
    voiceStyle: { fontFamily: SANS, fontWeight: '700' as const, letterSpacing: -0.5 },
    badge: 'IA',
    hasAi: true,
  },
  {
    key: 'lettre_motivation',
    label: 'Lettre de motivation',
    kicker: 'Pour convaincre',
    desc: 'Une voix, une histoire, une raison d’être retenu.',
    voice: 'script' as const,
    voiceStyle: { fontFamily: SERIF, fontStyle: 'italic' as const, fontWeight: '500' as const },
    badge: 'IA',
    hasAi: true,
  },
  {
    key: 'stage',
    label: 'Rapport de stage',
    kicker: 'Pour documenter',
    desc: 'Qu’as-tu fait, comment, et qu’en as-tu appris ?',
    voice: 'mono' as const,
    voiceStyle: { fontFamily: MONO, fontWeight: '500' as const, letterSpacing: 0.5 },
    badge: null,
    hasAi: false,
  },
  {
    key: 'memoire',
    label: 'Mémoire',
    kicker: 'Pour démontrer',
    desc: 'Une thèse, des preuves, un travail de recherche.',
    voice: 'display' as const,
    voiceStyle: { fontFamily: SERIF, fontWeight: '900' as const, letterSpacing: -1.5 },
    badge: null,
    hasAi: false,
  },
] as const;


// ─── Skills common options ────────────────────────────────────────────────────
const COMMON_SKILLS = [
  'HTML / CSS', 'JavaScript', 'React', 'Node.js', 'Python',
  'SQL / Base de données', 'Git / GitHub', 'Figma / UI Design',
  'Analyse de données', 'Marketing digital', 'Communication',
  'Travail en équipe', 'Gestion de projet', 'Excel / Tableur',
  'Power BI', 'Réseaux sociaux',
];

export function DocumentsScreen({ onEditDocument }: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create flow state
  const [createStep, setCreateStep] = useState<CreateStep>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Form state — shared
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [iaCredits, setIaCredits] = useState<number | null>(null);

  // CV form state
  const [cvFullName, setCvFullName] = useState('');
  const [cvUniversity, setCvUniversity] = useState('');
  const [cvFaculty, setCvFaculty] = useState('');
  const [cvLevel, setCvLevel] = useState('');
  const [cvPosition, setCvPosition] = useState('');
  const [cvSkills, setCvSkills] = useState<string[]>([]);
  const [cvLanguages, setCvLanguages] = useState<string[]>([]);
  const [cvExperiences, setCvExperiences] = useState<string[]>(['']);

  // Lettre form state
  const [lettrePosition, setLettrePosition] = useState('');
  const [lettreCompany, setLettreCompany] = useState('');
  const [lettreSector, setLettreSector] = useState('');
  const [lettreMotivation, setLettreMotivation] = useState('');

  // AI generation state
  const [generating, setGenerating] = useState(false);
  // Guided "one conversation -> full document" flow (stage / mémoire / vierge).
  const [genChatVisible, setGenChatVisible] = useState(false);
  const [generatingFull, setGeneratingFull] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch('/api/mobile/documents');
    if (!res.ok) throw new Error('Impossible de récupérer vos documents.');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const fetchIaCredits = async () => {
    try {
      const res = await authFetch('/api/mobile/account');
      if (res.ok) {
        const data = await res.json();
        setIaCredits(data.wallet?.iaCredits ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDocuments();
    fetchIaCredits();
  }, []);

  // ─── Reset form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setNewTitle(''); setNewDesc('');
    setCvFullName(''); setCvUniversity(''); setCvFaculty('');
    setCvLevel(''); setCvPosition('');
    setCvSkills([]); setCvLanguages([]); setCvExperiences(['']);
    setLettrePosition(''); setLettreCompany(''); setLettreSector('');
    setLettreMotivation('');
    setSelectedType(null);
    setCreateStep(null);
  };

  // ─── Create + generate ──────────────────────────────────────────────────────
  const handleCreateWithAi = async () => {
    const type = selectedType;
    if (!type) return;

    if (!newTitle.trim()) {
      Alert.alert('Titre requis', 'Donne un titre à ton document.');
      return;
    }

    if (type === 'cv' || type === 'lettre_motivation') {
      if (iaCredits !== null && iaCredits < IA_CREDITS_PER_GEN) {
        Alert.alert(
          'Crédits IA insuffisants',
          `Il te faut ${IA_CREDITS_PER_GEN} crédits IA pour générer ce document. Tu en as ${iaCredits}.`,
          [{ text: 'Recharger', onPress: () => { resetForm(); } }, { text: 'Annuler' }]
        );
        return;
      }
    }

    setGenerating(true);
    setCreating(true);

    try {
      // 1. Create the document
      const createRes = await authFetch('/api/mobile/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          templateType: type,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur lors de la création.');
      }

      const { document: doc } = await createRes.json();

      // 2. Build form data for AI generation
      let formData: Record<string, string | string[]> = {};

      if (type === 'cv') {
        formData = {
          fullName: cvFullName,
          university: cvUniversity,
          faculty: cvFaculty,
          level: cvLevel,
          targetPosition: cvPosition,
          skills: cvSkills,
          languages: cvLanguages,
          experiences: cvExperiences.filter(Boolean),
        };
      } else if (type === 'lettre_motivation') {
        formData = {
          fullName: cvFullName,
          university: cvUniversity,
          faculty: cvFaculty,
          level: cvLevel,
          targetPosition: lettrePosition,
          company: lettreCompany,
          sector: lettreSector,
          motivation: lettreMotivation,
        };
      }

      // 3. Call AI generation (only for CV and Lettre)
      if (type === 'cv' || type === 'lettre_motivation') {
        const genRes = await authFetch('/api/mobile/documents/generate', {
          method: 'POST',
          body: JSON.stringify({
            type,
            formData,
            documentId: doc.id,
          }),
        });

        if (!genRes.ok) {
          const err = await genRes.json().catch(() => ({ error: 'Erreur IA' }));
          // Document was created, just open it without AI content
          console.warn('[Documents] AI generation failed, opening editor anyway:', err.error);
        } else {
          const genData = await genRes.json();
          setIaCredits(genData.remainingCredits ?? null);
        }
      }

      resetForm();
      fetchDocuments();
      onEditDocument(doc.id);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setGenerating(false);
      setCreating(false);
    }
  };

  // ─── Create + generate the WHOLE document from the onboarding chat ──────────
  const openGenChat = () => {
    if (!newTitle.trim()) {
      Alert.alert('Titre requis', 'Donne un titre à ton document.');
      return;
    }
    if (iaCredits !== null && iaCredits < IA_CREDITS_PER_GEN) {
      Alert.alert(
        'Crédits IA insuffisants',
        `Il te faut ${IA_CREDITS_PER_GEN} crédits IA pour générer ce document. Tu en as ${iaCredits}.`,
      );
      return;
    }
    setGenChatVisible(true);
  };

  const handleGenerateFull = async (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    if (!selectedType) return;
    setGeneratingFull(true);
    let createdId: string | null = null;
    try {
      // 1. Create the document (sections come from the template).
      const createRes = await authFetch('/api/mobile/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          templateType: selectedType,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur lors de la création.');
      }
      const { document: doc } = await createRes.json();
      createdId = doc.id;

      // 2. Write every section + the cover page from the conversation.
      const genRes = await authFetch('/api/mobile/documents/generate-full', {
        method: 'POST',
        body: JSON.stringify({
          messages,
          documentId: doc.id,
          documentType: selectedType,
        }),
      });
      if (genRes.ok) {
        const genData = await genRes.json().catch(() => ({}));
        if (genData.remainingCredits !== undefined) setIaCredits(genData.remainingCredits);
      } else {
        // Document exists — open it anyway so the work isn't lost.
        const err = await genRes.json().catch(() => ({ error: '' }));
        Alert.alert(
          'Génération partielle',
          err.error || "L'IA n'a pas pu tout rédiger. Le document est créé, tu peux le compléter.",
        );
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setGeneratingFull(false);
      setGenChatVisible(false);
      resetForm();
      fetchDocuments();
      if (createdId) onEditDocument(createdId);
    }
  };

  // ─── Create without AI ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedType || !newTitle.trim()) {
      Alert.alert('Titre requis', 'Donne un titre à ton document.');
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/mobile/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          templateType: selectedType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur lors de la création.');
      }

      const { document: doc } = await res.json();
      resetForm();
      fetchDocuments();
      onEditDocument(doc.id);
    } catch (err: any) {
      Alert.alert('Erreur de création', err.message);
    } finally {
      setCreating(false);
    }
  };

  // ─── Toggle skill/language tag ────────────────────────────────────────────────
  const toggleTag = (tag: string, current: string[], setter: (v: string[]) => void) => {
    if (current.includes(tag)) {
      setter(current.filter((t) => t !== tag));
    } else {
      setter([...current, tag]);
    }
  };

  // ─── Template label helper ───────────────────────────────────────────────────
  const templateLabel = (t: string) => {
    if (t === 'cv') return 'CV';
    if (t === 'lettre_motivation') return 'Lettre de motivation';
    if (t === 'memoire') return 'Mémoire';
    if (t === 'blank') return 'Personnalisé';
    return 'Stage';
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading && documents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={stitchColors.emeraldTone} />
        <Text style={styles.loadingText}>Chargement de vos documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header — greeting + gradient question */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Atelier de rédaction</Text>
        <GradientText text="Qu'écris-tu aujourd'hui ?" size={26} weight="700" style={styles.headerQuestion} />
        {iaCredits !== null && iaCredits > 0 && (
          <View style={styles.creditsPill}>
            <Sparkles size={12} color={stitchColors.sienna} strokeWidth={2} />
            <Text style={styles.creditsPillText}>{iaCredits} crédits IA</Text>
          </View>
        )}
      </View>

      {/* Options de rédaction — icon tile grid */}
      <View style={styles.optionsCard}>
        <Text style={styles.optionsTitle}>Options de rédaction</Text>
        <View style={styles.tileGrid}>
          {TYPE_TILES.map((tile) => (
            <Pressable
              key={tile.key}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => { setSelectedType(tile.key); setCreateStep('form'); }}
            >
              <View style={[styles.tileIcon, { backgroundColor: tile.tint }]}>
                <tile.Icon size={20} color={tile.color} strokeWidth={2} />
              </View>
              <Text style={styles.tileLabel} numberOfLines={2}>{tile.label}</Text>
              {tile.hasAi ? <Text style={styles.tileBadge}>IA</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Mes documents récents</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchDocuments}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyFolioRule} />
          <Text style={styles.emptyTitle}>Le tiroir est vide.</Text>
          <Text style={styles.emptyText}>
            Commence par un CV ou une lettre — l'IA pose les premières lignes, tu traces le reste.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {documents.map((doc) => {
            const dateStr = new Date(doc.updated_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short',
            });
            return (
              <View key={doc.id} style={styles.documentCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.templateBadge, {
                    backgroundColor: doc.template_type === 'cv' ? stitchColors.ink :
                      doc.template_type === 'lettre_motivation' ? stitchColors.ink :
                      doc.template_type === 'memoire' ? stitchColors.ink : stitchColors.ink,
                  }]}>
                    <Text style={[styles.templateBadgeText, {
                      color: '#FFFFFF',
                    }]}>{templateLabel(doc.template_type)}</Text>
                  </View>
                  <Text style={styles.cardDate}>{dateStr}</Text>
                </View>
                <Text style={styles.cardTitle}>{doc.title}</Text>
                <View style={styles.cardActions}>
                  <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => onEditDocument(doc.id)}>
                    <Text style={styles.editButtonText}>Modifier</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.pdfButton]} onPress={() => {
                    Alert.alert('Ouvrir', 'Veuillez ouvrir le document en cliquant sur "Editer" pour générer et exporter le PDF nativement.');
                  }}>
                    <Text style={styles.pdfButtonText}>PDF</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => {
                    Alert.alert('Confirmer', `Supprimer "${doc.title}" ?`, [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Supprimer', style: 'destructive',
                        onPress: async () => {
                          try {
                            await authFetch(`/api/mobile/documents/${doc.id}`, { method: 'DELETE' });
                            setDocuments((p) => p.filter((d) => d.id !== doc.id));
                          } catch { Alert.alert('Erreur', 'Suppression impossible.'); }
                        },
                      },
                    ]);
                  }}>
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── TYPE SELECTOR MODAL — Editorial poster series ─────────────── */}
      <Modal
        visible={createStep === 'type-select'}
        transparent animationType="slide"
        onRequestClose={resetForm}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropDismiss} onPress={resetForm} />
          <View style={styles.posterSheet}>
            <View style={styles.modalHandle} />

            {/* Scrollable content */}
            <ScrollView
              style={styles.posterScroll}
              contentContainerStyle={styles.posterScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Editorial header */}
              <View style={styles.posterHeader}>
                <Text style={styles.posterEyebrow}>DOSSIER · No. 01</Text>
                <View style={styles.posterHeaderRule} />
                <Text style={styles.posterTitle}>Que veux-tu écrire ?</Text>
                <Text style={styles.posterSubtitle}>
                  Quatre intentions, quatre voix. Choisis celle qui te ressemble.
                </Text>
              </View>

              {/* The poster grid */}
              <View style={styles.posterGrid}>
                {DOCUMENT_TYPES.map((t, i) => (
                  <Pressable
                    key={t.key}
                    style={({ pressed }) => [
                      styles.posterCard,
                      i % 2 === 0 ? styles.posterCardLeft : styles.posterCardRight,
                      pressed && styles.posterCardPressed,
                    ]}
                    onPress={() => {
                      setSelectedType(t.key);
                      setCreateStep('form');
                    }}
                  >
                    {/* Folio number — sets the editorial tone */}
                    <Text style={styles.posterFolio}>— 0{i + 1}</Text>

                    {/* The typographic statement — this is the signature */}
                    <Text
                      style={[styles.posterVoice, t.voiceStyle]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {t.label}
                    </Text>

                    {/* Kicker + description */}
                    <View style={styles.posterKickerRow}>
                      <View style={styles.posterKickerRule} />
                      <Text style={styles.posterKicker}>{t.kicker.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.posterDesc}>{t.desc}</Text>

                    {/* Footer with IA badge if applicable */}
                    <View style={styles.posterFooter}>
                      {t.badge ? (
                        <View style={styles.posterAiBadge}>
                          <Text style={styles.posterAiBadgeText}>✦ {t.badge}</Text>
                        </View>
                      ) : (
                        <View style={styles.posterDot} />
                      )}
                      <Text style={styles.posterArrow}>→</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Sticky footer with the close button — always visible */}
            <View style={styles.posterFooterBar}>
              <View style={styles.posterFooterRule} />
              <Pressable style={styles.posterCloseBtn} onPress={resetForm}>
                <Text style={styles.posterCloseBtnText}>Annuler</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── FORM MODAL — Editorial form ────────────────────────────────── */}
      <Modal
        visible={createStep === 'form'}
        transparent animationType="slide"
        onRequestClose={resetForm}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <View style={styles.modalBackdrop}>
            {/* Backdrop tap area — top half dismisses */}
            <Pressable style={styles.modalBackdropDismiss} onPress={resetForm} />
            <View style={styles.formSheet}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                <View style={styles.modalHandle} />

                {/* Editorial header for form */}
                <View style={styles.formHeader}>
                  <View style={styles.formHeaderTopRow}>
                    <Text style={styles.formEyebrow}>DOSSIER · No. 0{DOCUMENT_TYPES.findIndex(t => t.key === selectedType) + 1}</Text>
                    <Pressable onPress={resetForm} hitSlop={12}>
                      <Text style={styles.formCloseLink}>✕ Fermer</Text>
                    </Pressable>
                  </View>
                  <View style={styles.formHeaderRule} />
                  {(() => {
                    const t = DOCUMENT_TYPES.find(d => d.key === selectedType);
                    if (!t) return <Text style={styles.formTitle}>Créer un document</Text>;
                    return (
                      <>
                        <Text style={[styles.formTitle, t.voiceStyle]} numberOfLines={1} adjustsFontSizeToFit>
                          {t.label}
                        </Text>
                        <Text style={styles.formKicker}>{t.kicker.toUpperCase()}</Text>
                      </>
                    );
                  })()}
                </View>

                {/* Title */}
                <Text style={styles.fieldLabel}>TITRE DU DOCUMENT</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: CV - Miguel Melago"
                  placeholderTextColor={stitchColors.inkSubtle}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                {/* Common profile fields for AI docs */}
                {(selectedType === 'cv' || selectedType === 'lettre_motivation') && (
                  <>
                    <Text style={styles.fieldLabel}>INFORMATIONS PERSONNELLES</Text>
                    <TextInput style={styles.textInput} placeholder="Nom complet" placeholderTextColor={stitchColors.inkSubtle} value={cvFullName} onChangeText={setCvFullName} />
                    <View style={styles.fieldRow}>
                      <TextInput style={[styles.textInput, styles.flex]} placeholder="Université" placeholderTextColor={stitchColors.inkSubtle} value={cvUniversity} onChangeText={setCvUniversity} />
                      <TextInput style={[styles.textInput, styles.flex]} placeholder="Filière" placeholderTextColor={stitchColors.inkSubtle} value={cvFaculty} onChangeText={setCvFaculty} />
                    </View>
                    <TextInput style={styles.textInput} placeholder="Niveau (ex: Licence 3)" placeholderTextColor={stitchColors.inkSubtle} value={cvLevel} onChangeText={setCvLevel} />
                    <TextInput style={styles.textInput} placeholder="Poste visé" placeholderTextColor={stitchColors.inkSubtle} value={selectedType === 'cv' ? cvPosition : lettrePosition}
                      onChangeText={selectedType === 'cv' ? setCvPosition : setLettrePosition} />
                  </>
                )}

                {/* CV-specific fields */}
                {selectedType === 'cv' && (
                  <>
                    <Text style={styles.fieldLabel}>COMPÉTENCES</Text>
                    <View style={styles.tagGrid}>
                      {COMMON_SKILLS.map((skill) => (
                        <Pressable
                          key={skill}
                          style={[styles.tagChip, cvSkills.includes(skill) && styles.tagChipActive]}
                          onPress={() => toggleTag(skill, cvSkills, setCvSkills)}
                        >
                          <Text style={[styles.tagChipText, cvSkills.includes(skill) && styles.tagChipTextActive]}>
                            {skill}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>LANGUES</Text>
                    {['Français', 'Anglais', 'Espagnol', 'Allemand', 'Chinois', 'Arabe'].map((lang) => (
                      <Pressable key={lang} style={styles.tagRow} onPress={() => toggleTag(lang, cvLanguages, setCvLanguages)}>
                        <View style={[styles.tagCheckbox, cvLanguages.includes(lang) && styles.tagCheckboxActive]}>
                          {cvLanguages.includes(lang) && <Text style={styles.tagCheckboxCheck}>✓</Text>}
                        </View>
                        <Text style={styles.tagRowLabel}>{lang}</Text>
                      </Pressable>
                    ))}

                    <Text style={styles.fieldLabel}>EXPÉRIENCES (une par ligne : Poste | Entreprise | Durée)</Text>
                    {cvExperiences.map((exp, i) => (
                      <TextInput
                        key={i}
                        style={[styles.textInput, { fontSize: 12 }]}
                        placeholder="Ex: Stagiaire | TechCorp | 3 mois"
                        placeholderTextColor={stitchColors.inkSubtle}
                        value={exp}
                        onChangeText={(v) => {
                          const updated = [...cvExperiences];
                          updated[i] = v;
                          setCvExperiences(updated);
                        }}
                      />
                    ))}
                    <Pressable onPress={() => setCvExperiences([...cvExperiences, ''])}>
                      <Text style={styles.addMoreText}>+ Ajouter une expérience</Text>
                    </Pressable>
                  </>
                )}

                {/* Lettre-specific fields */}
                {selectedType === 'lettre_motivation' && (
                  <>
                    <Text style={styles.fieldLabel}>INFORMATIONS SUR L'OFFRE</Text>
                    <TextInput style={styles.textInput} placeholder="Entreprise / Organisation" placeholderTextColor={stitchColors.inkSubtle} value={lettreCompany} onChangeText={setLettreCompany} />
                    <TextInput style={styles.textInput} placeholder="Secteur (ex: Technologie, Santé, Finance)" placeholderTextColor={stitchColors.inkSubtle} value={lettreSector} onChangeText={setLettreSector} />
                    <Text style={styles.fieldLabel}>VOS MOTIVATIONS (optionnel)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Décrivez brièvement pourquoi ce poste vous intéresse..."
                      placeholderTextColor={stitchColors.inkSubtle}
                      multiline
                      value={lettreMotivation}
                      onChangeText={setLettreMotivation}
                    />
                  </>
                )}

                {/* Credits info — every type can now be generated by the AI */}
                <View style={styles.creditsInfo}>
                  <Text style={styles.creditsInfoText}>
                    🤖 Génération IA : {IA_CREDITS_PER_GEN} crédit{IA_CREDITS_PER_GEN > 1 ? 's' : ''}
                    {iaCredits !== null ? ` — Tu as ${iaCredits} crédit${iaCredits > 1 ? 's' : ''}` : ''}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.modalButtons}>
                  <Pressable style={[styles.modalButton, styles.cancelBtn]} onPress={() => setCreateStep('type-select')}>
                    <Text style={styles.cancelBtnText}>Retour</Text>
                  </Pressable>
                  {(selectedType === 'cv' || selectedType === 'lettre_motivation') ? (
                    <Pressable
                      style={[styles.modalButton, styles.aiGenerateBtn, creating && styles.buttonDisabled]}
                      onPress={handleCreateWithAi}
                      disabled={creating}
                    >
                      {creating ? (
                        <ActivityIndicator size="small" color={stitchColors.white} />
                      ) : (
                        <Text style={styles.aiGenerateBtnText}>🤖 Générer avec l'IA</Text>
                      )}
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        style={[styles.modalButton, styles.cancelBtn, creating && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={creating}
                      >
                        {creating ? (
                          <ActivityIndicator size="small" color={stitchColors.ink} />
                        ) : (
                          <Text style={styles.cancelBtnText}>Vierge</Text>
                        )}
                      </Pressable>
                      <Pressable
                        style={[styles.modalButton, styles.aiGenerateBtn, creating && styles.buttonDisabled]}
                        onPress={openGenChat}
                        disabled={creating}
                      >
                        <Text style={styles.aiGenerateBtnText}>🤖 Générer avec l&apos;IA</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Guided onboarding chat → full document generation */}
      <DocGenChat
        visible={genChatVisible}
        onClose={() => setGenChatVisible(false)}
        documentType={selectedType ?? 'blank'}
        generating={generatingFull}
        onGenerate={handleGenerateFull}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stitchColors.paper, padding: 16 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: stitchColors.paper,
    gap: 16,
  },
  loadingText: {
    color: stitchColors.ink,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: SERIF,
    fontStyle: 'italic',
  },

  header: {
    marginBottom: 20,
  },
  greeting: {
    fontFamily: SANS,
    fontSize: 14,
    color: stitchColors.inkMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerQuestion: {
    height: 34,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: stitchColors.siennaBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  creditsPillText: {
    color: stitchColors.sienna,
    fontFamily: SANS,
    fontSize: 12,
    fontWeight: '700',
  },

  // Options de rédaction — tile grid
  optionsCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 16,
    marginBottom: 28,
  },
  optionsTitle: {
    fontFamily: SANS,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 14,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    backgroundColor: stitchColors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 10,
  },
  tilePressed: {
    backgroundColor: stitchColors.surfaceContainerHigh,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  tileBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: stitchColors.sienna,
  },

  sectionLabel: {
    color: stitchColors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  listContainer: { gap: 12, paddingBottom: 40 },

  documentCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 4,
    padding: 18,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  templateBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, borderWidth: 1, borderColor: stitchColors.glassBorder },
  templateBadgeText: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardDate: {
    color: stitchColors.inkMuted,
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: stitchColors.ink,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: SERIF,
    lineHeight: 22,
    marginBottom: 14,
  },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { height: 36, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  editButton: { flex: 1, backgroundColor: stitchColors.surfaceContainerHigh },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF,
  },
  pdfButton: {
    width: 64,
    backgroundColor: 'transparent',
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
  },
  pdfButtonText: {
    color: stitchColors.ink,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  deleteButton: { width: 36, backgroundColor: 'transparent', borderWidth: 1, borderColor: stitchColors.sienna },
  deleteButtonText: { color: stitchColors.sienna, fontSize: 14, fontWeight: 'bold' },

  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  emptyFolioRule: {
    width: 40,
    height: 1,
    backgroundColor: stitchColors.sienna,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: stitchColors.ink,
    fontFamily: SERIF,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: SERIF,
    maxWidth: 280,
  },
  errorBox: { padding: 30, alignItems: 'center' },
  errorText: {
    color: stitchColors.sienna,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: SERIF,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: stitchColors.surfaceContainerHigh,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 2,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF,
  },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: stitchColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  formModalCard: { maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: stitchColors.inkFaint, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeading: { fontSize: 20, fontWeight: '800', color: stitchColors.inkSoft, marginBottom: 8 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1.5, minHeight: 130 },
  typeCardLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  typeCardDesc: { fontSize: 11, color: stitchColors.inkMuted, lineHeight: 15 },
  typeBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  cancelLink: { alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  cancelLinkText: {
    color: stitchColors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: SERIF,
    fontStyle: 'italic',
  },

  fieldLabel: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
    color: stitchColors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: SERIF,
    color: stitchColors.ink,
    marginBottom: 10,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
  fieldRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: 'transparent',
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
  },
  tagChipActive: { backgroundColor: stitchColors.surfaceContainerHigh, borderColor: stitchColors.glassBorder },
  tagChipText: { fontSize: 12, color: stitchColors.ink, fontWeight: '600' },
  tagChipTextActive: { color: '#FFFFFF' },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tagCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagCheckboxActive: { backgroundColor: stitchColors.surfaceContainerHigh, borderColor: stitchColors.glassBorder },
  tagCheckboxCheck: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  tagRowLabel: { fontSize: 13, color: stitchColors.ink, fontWeight: '600' },

  addMoreText: {
    color: stitchColors.sienna,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: SERIF,
    fontStyle: 'italic',
  },

  creditsInfo: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: stitchColors.emerald,
    borderStyle: 'dashed',
  },
  creditsInfoText: {
    color: stitchColors.emerald,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: MONO,
    letterSpacing: 0.5,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: stitchColors.ink,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  cancelBtnText: { color: stitchColors.ink, fontSize: 14, fontWeight: '700', fontFamily: SERIF },
  confirmBtn: { backgroundColor: stitchColors.surfaceContainerHigh },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: SERIF },
  aiGenerateBtn: { backgroundColor: stitchColors.sienna, flex: 2 },
  aiGenerateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: SERIF },
  buttonDisabled: { opacity: 0.5 },

  // ── Editorial poster sheet (type selector) ─────────────────────────────
  posterSheet: {
    backgroundColor: stitchColors.paper,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingTop: 14,
    paddingBottom: 0,
    flex: 1,
    marginTop: 60,
  },
  posterScroll: {
    flex: 1,
    paddingHorizontal: 22,
  },
  posterScrollContent: {
    paddingBottom: 24,
  },
  posterFooterBar: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: stitchColors.paper,
  },
  posterFooterRule: {
    height: 1,
    backgroundColor: stitchColors.surfaceContainerHigh,
    marginBottom: 12,
  },
  posterCloseBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  posterCloseBtnText: {
    fontFamily: SERIF,
    fontSize: 15,
    fontStyle: 'italic',
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },
  posterHeader: { marginTop: 18, marginBottom: 22 },
  posterEyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 2,
    color: stitchColors.ink,
    fontWeight: '600',
    marginBottom: 10,
  },
  posterHeaderRule: {
    height: 1,
    backgroundColor: stitchColors.surfaceContainerHigh,
    marginBottom: 14,
  },
  posterTitle: {
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: '900',
    color: stitchColors.ink,
    lineHeight: 36,
    letterSpacing: -1,
    marginBottom: 6,
  },
  posterSubtitle: {
    fontFamily: SERIF,
    fontSize: 14,
    fontStyle: 'italic',
    color: stitchColors.inkMuted,
    lineHeight: 20,
  },
  posterGrid: { gap: 14 },
  posterCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: 4,
    padding: 22,
    minHeight: 168,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  posterCardLeft: {},
  posterCardRight: {},
  posterCardPressed: { backgroundColor: stitchColors.paperDeep },
  posterFolio: {
    fontFamily: MONO,
    fontSize: 11,
    color: stitchColors.sienna,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 14,
  },
  posterVoice: {
    color: stitchColors.ink,
    fontSize: 30,
    lineHeight: 34,
    marginBottom: 14,
  },
  posterKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  posterKickerRule: {
    width: 16,
    height: 1,
    backgroundColor: stitchColors.surfaceContainerHigh,
  },
  posterKicker: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: stitchColors.ink,
    fontWeight: '700',
  },
  posterDesc: {
    fontFamily: SERIF,
    fontSize: 14,
    color: stitchColors.inkSoft,
    lineHeight: 20,
    marginBottom: 14,
  },
  posterFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterAiBadge: {
    backgroundColor: stitchColors.emerald,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  posterAiBadgeText: {
    color: stitchColors.white,
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  posterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: stitchColors.inkSubtle,
  },
  posterArrow: {
    fontFamily: SERIF,
    fontSize: 22,
    color: stitchColors.ink,
  },

  // ── Editorial form sheet (creation form) ────────────────────────────────
  modalBackdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
  },
  formSheet: {
    backgroundColor: stitchColors.paper,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    flex: 1,
    marginTop: 60,
  },
  formScrollContent: { paddingBottom: 40 },
  formHeader: { marginTop: 12, marginBottom: 18 },
  formHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  formEyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: stitchColors.ink,
    fontWeight: '600',
  },
  formCloseLink: {
    fontFamily: SERIF,
    fontSize: 13,
    color: stitchColors.inkMuted,
  },
  formHeaderRule: {
    height: 1,
    backgroundColor: stitchColors.surfaceContainerHigh,
    marginBottom: 14,
  },
  formTitle: {
    color: stitchColors.ink,
    fontSize: 32,
    lineHeight: 36,
    marginBottom: 6,
  },
  formKicker: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: stitchColors.sienna,
    fontWeight: '700',
  },
});
