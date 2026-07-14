import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Linking, KeyboardAvoidingView, Platform
} from 'react-native';

import { authBaseUrl, authFetch, authClient, type StudentProfile } from '../auth/betterAuth';

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
    voiceStyle: { fontFamily: 'sans-serif', fontWeight: '700' as const, letterSpacing: -0.5 },
    badge: 'IA',
    hasAi: true,
  },
  {
    key: 'lettre_motivation',
    label: 'Lettre de motivation',
    kicker: 'Pour convaincre',
    desc: 'Une voix, une histoire, une raison d’être retenu.',
    voice: 'script' as const,
    voiceStyle: { fontFamily: 'serif', fontStyle: 'italic' as const, fontWeight: '500' as const },
    badge: 'IA',
    hasAi: true,
  },
  {
    key: 'stage',
    label: 'Rapport de stage',
    kicker: 'Pour documenter',
    desc: 'Qu’as-tu fait, comment, et qu’en as-tu appris ?',
    voice: 'mono' as const,
    voiceStyle: { fontFamily: 'monospace', fontWeight: '500' as const, letterSpacing: 0.5 },
    badge: null,
    hasAi: false,
  },
  {
    key: 'memoire',
    label: 'Mémoire',
    kicker: 'Pour démontrer',
    desc: 'Une thèse, des preuves, un travail de recherche.',
    voice: 'display' as const,
    voiceStyle: { fontFamily: 'serif', fontWeight: '900' as const, letterSpacing: -1.5 },
    badge: null,
    hasAi: false,
  },
] as const;

// ─── Editorial palette ────────────────────────────────────────────────────────
const EDITORIAL = {
  ink: '#0F172A',
  inkSoft: '#1E293B',
  paper: '#F6F1E7',
  paperDeep: '#EDE6D3',
  sienna: '#B7410E',
  emeraldDeep: '#047857',
  rule: '#0F172A',
};

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
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Chargement de vos documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header — editorial */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>CAMPUS 360 — ATELIER D'ÉCRITURE</Text>
        <View style={styles.heroRule} />
        <Text style={styles.heroTitle}>Qu'écris-tu aujourd'hui ?</Text>
        <Text style={styles.heroDesc}>
          CV, lettres, rapports de stage, mémoires — l'IA t'aide à démarrer, la typo te donne le ton.
        </Text>
        {iaCredits !== null && iaCredits > 0 && (
          <View style={styles.creditsBadge}>
            <Text style={styles.creditsBadgeText}>✦ {iaCredits} CRÉDIT{iaCredits > 1 ? 'S' : ''} IA</Text>
          </View>
        )}
        <Pressable style={styles.createButton} onPress={() => setCreateStep('type-select')}>
          <Text style={styles.createButtonText}>Commencer un nouveau document</Text>
          <Text style={styles.createButtonArrow}>→</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Mes documents récents</Text>

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
                    backgroundColor: doc.template_type === 'cv' ? '#0F172A' :
                      doc.template_type === 'lettre_motivation' ? '#0F172A' :
                      doc.template_type === 'memoire' ? '#0F172A' : '#0F172A',
                  }]}>
                    <Text style={[styles.templateBadgeText, {
                      color: '#F6F1E7',
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
                    const cookie = authClient.getCookie();
                    const token = cookie?.split('better-auth.session_token=')[1]?.split(';')[0] || '';
                    const url = `${authBaseUrl}/api/mobile/documents/${doc.id}/export/pdf${token ? `?token=${token}` : ''}`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert('Erreur', "Impossible d'ouvrir le PDF.");
                    });
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
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropDismiss} onPress={resetForm} />
          <View style={[styles.posterSheet]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />

            {/* Editorial header */}
            <View style={styles.posterHeader}>
              <Text style={styles.posterEyebrow}>CAMPUS 360 — DOSSIER No. 01</Text>
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

              <Pressable style={styles.cancelLink} onPress={resetForm}>
                <Text style={styles.cancelLinkText}>Annuler</Text>
              </Pressable>
            </ScrollView>
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
                    <Text style={styles.formEyebrow}>CAMPUS 360 — No. 0{DOCUMENT_TYPES.findIndex(t => t.key === selectedType) + 1}</Text>
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
                  placeholderTextColor="#94A3B8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                {/* Common profile fields for AI docs */}
                {(selectedType === 'cv' || selectedType === 'lettre_motivation') && (
                  <>
                    <Text style={styles.fieldLabel}>INFORMATIONS PERSONNELLES</Text>
                    <TextInput style={styles.textInput} placeholder="Nom complet" placeholderTextColor="#94A3B8" value={cvFullName} onChangeText={setCvFullName} />
                    <View style={styles.fieldRow}>
                      <TextInput style={[styles.textInput, styles.flex]} placeholder="Université" placeholderTextColor="#94A3B8" value={cvUniversity} onChangeText={setCvUniversity} />
                      <TextInput style={[styles.textInput, styles.flex]} placeholder="Filière" placeholderTextColor="#94A3B8" value={cvFaculty} onChangeText={setCvFaculty} />
                    </View>
                    <TextInput style={styles.textInput} placeholder="Niveau (ex: Licence 3)" placeholderTextColor="#94A3B8" value={cvLevel} onChangeText={setCvLevel} />
                    <TextInput style={styles.textInput} placeholder="Poste visé" placeholderTextColor="#94A3B8" value={selectedType === 'cv' ? cvPosition : lettrePosition}
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
                        placeholderTextColor="#94A3B8"
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
                    <TextInput style={styles.textInput} placeholder="Entreprise / Organisation" placeholderTextColor="#94A3B8" value={lettreCompany} onChangeText={setLettreCompany} />
                    <TextInput style={styles.textInput} placeholder="Secteur (ex: Technologie, Santé, Finance)" placeholderTextColor="#94A3B8" value={lettreSector} onChangeText={setLettreSector} />
                    <Text style={styles.fieldLabel}>VOS MOTIVATIONS (optionnel)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Décrivez brièvement pourquoi ce poste vous intéresse..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      value={lettreMotivation}
                      onChangeText={setLettreMotivation}
                    />
                  </>
                )}

                {/* Credits info for AI docs */}
                {(selectedType === 'cv' || selectedType === 'lettre_motivation') && (
                  <View style={styles.creditsInfo}>
                    <Text style={styles.creditsInfoText}>
                      🤖 Génération IA : {IA_CREDITS_PER_GEN} crédit{IA_CREDITS_PER_GEN > 1 ? 's' : ''}
                      {iaCredits !== null ? ` — Tu as ${iaCredits} crédit${iaCredits > 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                )}

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
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.aiGenerateBtnText}>🤖 Générer avec l'IA</Text>
                      )}
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.modalButton, styles.confirmBtn, creating && styles.buttonDisabled]}
                      onPress={handleCreate}
                      disabled={creating}
                    >
                      {creating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Créer et ouvrir</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F1E7', padding: 16 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F1E7',
    gap: 16,
  },
  loadingText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'serif',
    fontStyle: 'italic',
  },

  heroCard: {
    backgroundColor: '#F6F1E7',
    borderRadius: 4,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  heroEyebrow: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 2,
    color: '#B7410E',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroRule: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
    fontFamily: 'serif',
    letterSpacing: -0.02,
    marginBottom: 10,
  },
  heroDesc: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  creditsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
    marginBottom: 16,
  },
  creditsBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  createButton: {
    backgroundColor: '#0F172A',
    borderRadius: 2,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  createButtonText: {
    color: '#F6F1E7',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'serif',
    letterSpacing: 0.3,
  },
  createButtonArrow: {
    color: '#B7410E',
    fontSize: 18,
    fontFamily: 'serif',
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  listContainer: { gap: 12, paddingBottom: 40 },

  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 18,
    borderColor: '#0F172A',
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  templateBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, borderWidth: 1, borderColor: '#0F172A' },
  templateBadgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardDate: {
    color: '#475569',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'serif',
    lineHeight: 22,
    marginBottom: 14,
  },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { height: 36, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  editButton: { flex: 1, backgroundColor: '#0F172A' },
  editButtonText: {
    color: '#F6F1E7',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  pdfButton: {
    width: 64,
    backgroundColor: 'transparent',
    borderColor: '#0F172A',
    borderWidth: 1,
  },
  pdfButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  deleteButton: { width: 36, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#B7410E' },
  deleteButtonText: { color: '#B7410E', fontSize: 14, fontWeight: 'bold' },

  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0F172A',
  },
  emptyFolioRule: {
    width: 40,
    height: 1,
    backgroundColor: '#B7410E',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'serif',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'serif',
    maxWidth: 280,
  },
  errorBox: { padding: 30, alignItems: 'center' },
  errorText: {
    color: '#B7410E',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'serif',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 2,
  },
  retryText: {
    color: '#F6F1E7',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'serif',
  },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  formModalCard: { maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeading: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1.5, minHeight: 130 },
  typeCardLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  typeCardDesc: { fontSize: 11, color: '#64748B', lineHeight: 15 },
  typeBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  cancelLink: { alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  cancelLinkText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'serif',
    fontStyle: 'italic',
  },

  fieldLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'serif',
    color: '#0F172A',
    marginBottom: 10,
  },
  fieldRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: 'transparent',
    borderColor: '#0F172A',
    borderWidth: 1,
  },
  tagChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tagChipText: { fontSize: 12, color: '#0F172A', fontWeight: '600' },
  tagChipTextActive: { color: '#F6F1E7' },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tagCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagCheckboxActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tagCheckboxCheck: { color: '#F6F1E7', fontSize: 11, fontWeight: 'bold' },
  tagRowLabel: { fontSize: 13, color: '#0F172A', fontWeight: '600' },

  addMoreText: {
    color: '#B7410E',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: 'serif',
    fontStyle: 'italic',
  },

  creditsInfo: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#047857',
    borderStyle: 'dashed',
  },
  creditsInfoText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
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
    borderColor: '#0F172A',
  },
  cancelBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '700', fontFamily: 'serif' },
  confirmBtn: { backgroundColor: '#0F172A' },
  confirmBtnText: { color: '#F6F1E7', fontSize: 14, fontWeight: '700', fontFamily: 'serif' },
  aiGenerateBtn: { backgroundColor: '#B7410E', flex: 2 },
  aiGenerateBtnText: { color: '#F6F1E7', fontSize: 14, fontWeight: '700', fontFamily: 'serif' },
  buttonDisabled: { opacity: 0.5 },

  // ── Editorial poster sheet (type selector) ─────────────────────────────
  posterSheet: {
    backgroundColor: '#F6F1E7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  posterHeader: { marginTop: 18, marginBottom: 22 },
  posterEyebrow: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 10,
  },
  posterHeaderRule: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 14,
  },
  posterTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 36,
    letterSpacing: -1,
    marginBottom: 6,
  },
  posterSubtitle: {
    fontFamily: 'serif',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 20,
  },
  posterGrid: { gap: 14 },
  posterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 22,
    minHeight: 168,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  posterCardLeft: {},
  posterCardRight: {},
  posterCardPressed: { backgroundColor: '#EDE6D3' },
  posterFolio: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#B7410E',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 14,
  },
  posterVoice: {
    color: '#0F172A',
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
    backgroundColor: '#0F172A',
  },
  posterKicker: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  posterDesc: {
    fontFamily: 'serif',
    fontSize: 14,
    color: '#334155',
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
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  posterAiBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  posterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  posterArrow: {
    fontFamily: 'serif',
    fontSize: 22,
    color: '#0F172A',
  },

  // ── Editorial form sheet (creation form) ────────────────────────────────
  modalBackdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  formSheet: {
    backgroundColor: '#F6F1E7',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    maxHeight: '92%',
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
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  formCloseLink: {
    fontFamily: 'serif',
    fontSize: 13,
    color: '#475569',
  },
  formHeaderRule: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 14,
  },
  formTitle: {
    color: '#0F172A',
    fontSize: 32,
    lineHeight: 36,
    marginBottom: 6,
  },
  formKicker: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#B7410E',
    fontWeight: '700',
  },
});
