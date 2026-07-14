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

type CreateStep = 'type-select' | 'form' | 'generating';

type DocumentsScreenProps = {
  onEditDocument: (id: string) => void;
};

const IA_CREDITS_PER_GEN = 5;

// ─── Type cards ────────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = [
  {
    key: 'cv',
    label: 'CV',
    emoji: '📄',
    badge: '🤖 IA',
    desc: 'Génère un CV professionnel en quelques clics',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    hasAi: true,
  },
  {
    key: 'lettre_motivation',
    label: 'Lettre de Motivation',
    emoji: '✉️',
    badge: '🤖 IA',
    desc: 'Génère une lettre adaptée à ton poste cible',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    hasAi: true,
  },
  {
    key: 'stage',
    label: 'Rapport de Stage',
    emoji: '📋',
    badge: null,
    desc: 'Structure académique pour rapport de fin de stage',
    color: '#059669',
    bgColor: '#ECFDF5',
    hasAi: false,
  },
  {
    key: 'memoire',
    label: 'Mémoire',
    emoji: '🎓',
    badge: null,
    desc: 'Template pour mémoire de recherche académique',
    color: '#D97706',
    bgColor: '#FFFBEB',
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
  const [createStep, setCreateStep] = useState<CreateStep>('type-select');
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
    setCreateStep('type-select');
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
      {/* Header */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Éditeur Guidé de Documents</Text>
        <Text style={styles.heroDesc}>
          CV, lettres de motivation, rapports de stage et mémoires — l'IA vous aide à démarrer.
        </Text>
        {iaCredits !== null && iaCredits > 0 && (
          <View style={styles.creditsBadge}>
            <Text style={styles.creditsBadgeText}>🤖 {iaCredits} crédit{iaCredits > 1 ? 's' : ''} IA</Text>
          </View>
        )}
        <Pressable style={styles.createButton} onPress={() => setCreateStep('type-select')}>
          <Text style={styles.createButtonText}>✍️ Créer un nouveau document</Text>
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
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Aucun document créé</Text>
          <Text style={styles.emptyText}>
            Commencez par un CV ou une lettre de motivation — l'IA vous aide à démarrer.
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
                    backgroundColor: doc.template_type === 'cv' ? '#EFF6FF' :
                      doc.template_type === 'lettre_motivation' ? '#F5F3FF' :
                      doc.template_type === 'memoire' ? '#FFFBEB' : '#ECFDF5',
                  }]}>
                    <Text style={[styles.templateBadgeText, {
                      color: doc.template_type === 'cv' ? '#2563EB' :
                        doc.template_type === 'lettre_motivation' ? '#7C3AED' :
                        doc.template_type === 'memoire' ? '#D97706' : '#059669',
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

      {/* ─── TYPE SELECTOR MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={createStep === 'type-select'}
        transparent animationType="slide"
        onRequestClose={resetForm}
      >
        <Pressable style={styles.modalBackdrop} onPress={resetForm}>
          <Pressable style={[styles.modalCard, { paddingBottom: 40 }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalHeading}>Choisir le type de document</Text>

            <View style={styles.typeGrid}>
              {DOCUMENT_TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  style={[styles.typeCard, { backgroundColor: t.bgColor, borderColor: t.color + '40' }]}
                  onPress={() => {
                    setSelectedType(t.key);
                    setCreateStep('form');
                  }}
                >
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</Text>
                  <Text style={[styles.typeCardLabel, { color: t.color }]}>{t.label}</Text>
                  <Text style={styles.typeCardDesc}>{t.desc}</Text>
                  {t.badge && (
                    <View style={[styles.typeBadge, { backgroundColor: t.color + '20' }]}>
                      <Text style={[styles.typeBadgeText, { color: t.color }]}>{t.badge}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.cancelLink} onPress={resetForm}>
              <Text style={styles.cancelLinkText}>Annuler</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── FORM MODAL ─────────────────────────────────────────────────── */}
      <Modal
        visible={createStep === 'form'}
        transparent animationType="slide"
        onRequestClose={resetForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalBackdrop} onPress={resetForm}>
            <Pressable style={[styles.modalCard, styles.formModalCard]} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalHeading}>
                  {selectedType === 'cv' ? 'Créer un CV' :
                   selectedType === 'lettre_motivation' ? 'Créer une lettre de motivation' :
                   'Créer un document'}
                </Text>

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
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', gap: 16 },
  loadingText: { color: '#64748B', fontSize: 14, fontWeight: '600' },

  heroCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  heroDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  creditsBadge: { alignSelf: 'flex-start', backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 14 },
  creditsBadgeText: { color: '#7C3AED', fontSize: 12, fontWeight: '700' },
  createButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  sectionTitle: { color: '#1E293B', fontSize: 16, fontWeight: '800', marginBottom: 16 },
  listContainer: { gap: 14, paddingBottom: 40 },

  documentCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderColor: '#E2E8F0', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  templateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  templateBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  cardTitle: { color: '#1E293B', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editButton: { flex: 1, backgroundColor: '#1E293B' },
  editButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pdfButton: { width: 60, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1 },
  pdfButtonText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  deleteButton: { width: 36, backgroundColor: '#FEF2F2' },
  deleteButtonText: { color: '#EF4444', fontSize: 13, fontWeight: 'bold' },

  emptyBox: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  errorBox: { padding: 30, alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

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

  cancelLink: { alignItems: 'center', paddingVertical: 8 },
  cancelLinkText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  textInput: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1 },
  tagChipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  tagChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  tagChipTextActive: { color: '#2563EB' },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tagCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  tagCheckboxActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  tagCheckboxCheck: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  tagRowLabel: { fontSize: 13, color: '#1E293B', fontWeight: '600' },

  addMoreText: { color: '#3B82F6', fontSize: 13, fontWeight: '600', marginBottom: 10 },

  creditsInfo: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, marginTop: 8 },
  creditsInfoText: { color: '#7C3AED', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  confirmBtn: { backgroundColor: '#10B981' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  aiGenerateBtn: { backgroundColor: '#7C3AED', flex: 2 },
  aiGenerateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
});
