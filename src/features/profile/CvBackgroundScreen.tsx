import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileUp, X, ClipboardPaste } from 'lucide-react-native';

import { AppAlert } from '../../ui/AppAlert';
import { stitchColors, stitchRadius } from '../../theme/stitch';
import {
  emptyCvBackground,
  fetchCvBackground,
  importCvFromFile,
  importCvFromText,
  saveCvBackground,
  type CvBackground,
} from './cvBackgroundApi';
import { AddButton, Field, fieldStyles, ItemCard, linesToList, ListField, Section } from './cvFields';

// "Mon parcours": what a CV says about the student (experiences, education,
// skills, languages, hobbies). Filled once — by importing an existing CV or by
// hand — then reused by the AI for every application.

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful save, with what was saved. */
  onSaved?: (background: CvBackground) => void;
};

export function CvBackgroundScreen({ visible, onClose, onSaved }: Props) {
  const [background, setBackground] = useState<CvBackground>(emptyCvBackground());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setImportNotice(null);
    fetchCvBackground()
      .then((res) => setBackground(res.background))
      .catch(() => setBackground(emptyCvBackground()))
      .finally(() => setLoading(false));
  }, [visible]);

  const patch = (partial: Partial<CvBackground>) => setBackground((b) => ({ ...b, ...partial }));

  const applyImport = (imported: CvBackground | null) => {
    if (!imported) return;
    setBackground(imported);
    setImportNotice("Ton CV a été lu. Vérifie chaque partie, corrige si besoin, puis enregistre.");
  };

  const runImport = async (task: () => Promise<CvBackground | null>) => {
    setImporting(true);
    try {
      applyImport(await task());
      setPasteOpen(false);
    } catch (err) {
      AppAlert.alert('Import impossible', err instanceof Error ? err.message : 'Réessaie dans un instant.');
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveCvBackground(background);
      onSaved?.(saved);
      AppAlert.alert('Parcours enregistré', "L'IA s'en servira pour chacune de tes candidatures.");
      onClose();
    } catch (err) {
      AppAlert.alert('Enregistrement impossible', err instanceof Error ? err.message : 'Réessaie dans un instant.');
    } finally {
      setSaving(false);
    }
  };

  const { experiences, formations, langues } = background;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={styles.title}>Mon parcours</Text>
              <Text style={styles.subtitle}>Rempli une fois, réutilisé pour chaque CV.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Fermer">
              <X size={20} color={stitchColors.ink} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={stitchColors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.importCard}>
                <Text style={styles.importTitle}>Tu as déjà un CV ?</Text>
                <Text style={styles.importText}>
                  Importe-le : l'IA reprend tes expériences, formations et compétences. Tu vérifies avant d'enregistrer.
                </Text>
                <Pressable
                  style={[styles.primaryBtn, importing && styles.disabled]}
                  disabled={importing}
                  onPress={() => runImport(importCvFromFile)}
                >
                  {importing ? (
                    <ActivityIndicator color={stitchColors.white} />
                  ) : (
                    <>
                      <FileUp size={18} color={stitchColors.white} />
                      <Text style={styles.primaryBtnText}>Importer mon CV (PDF, Word)</Text>
                    </>
                  )}
                </Pressable>
                <Pressable style={styles.linkBtn} onPress={() => setPasteOpen(!pasteOpen)} disabled={importing}>
                  <ClipboardPaste size={16} color={stitchColors.primary} />
                  <Text style={styles.linkBtnText}>{pasteOpen ? 'Fermer' : 'Ou coller le texte de mon CV'}</Text>
                </Pressable>
                {pasteOpen ? (
                  <View>
                    <TextInput
                      style={styles.pasteInput}
                      multiline
                      value={pasted}
                      onChangeText={setPasted}
                      placeholder="Colle ici le contenu de ton CV…"
                      placeholderTextColor={stitchColors.inkSubtle}
                      textAlignVertical="top"
                    />
                    <Pressable
                      style={[styles.secondaryBtn, (importing || pasted.trim().length < 30) && styles.disabled]}
                      disabled={importing || pasted.trim().length < 30}
                      onPress={() => runImport(() => importCvFromText(pasted))}
                    >
                      <Text style={styles.secondaryBtnText}>Analyser ce texte</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {importNotice ? <Text style={styles.notice}>{importNotice}</Text> : null}

              <Section title="Présentation" defaultOpen={!background.profil}>
                <Field
                  label="En quelques phrases, qui es-tu ?"
                  value={background.profil}
                  onChangeText={(profil) => patch({ profil })}
                  placeholder="Ex : Étudiant en BTS réseaux, à l'aise avec le support client…"
                  multiline
                />
              </Section>

              <Section title="Expériences" count={experiences.length} defaultOpen>
                {experiences.map((exp, i) => {
                  const update = (p: Partial<typeof exp>) =>
                    patch({ experiences: experiences.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                  return (
                    <ItemCard
                      key={i}
                      title={exp.poste || exp.entreprise || `Expérience ${i + 1}`}
                      onRemove={() => patch({ experiences: experiences.filter((_, j) => j !== i) })}
                    >
                      <Field label="Poste" value={exp.poste} onChangeText={(poste) => update({ poste })} placeholder="Stagiaire technicien réseau" />
                      <Field label="Entreprise" value={exp.entreprise} onChangeText={(entreprise) => update({ entreprise })} />
                      <View style={fieldStyles.row}>
                        <View style={fieldStyles.half}>
                          <Field label="Ville" value={exp.ville} onChangeText={(ville) => update({ ville })} />
                        </View>
                        <View style={fieldStyles.half}>
                          <Field label="Période" value={exp.periode} onChangeText={(periode) => update({ periode })} placeholder="Juin – août 2025" />
                        </View>
                      </View>
                      <Field
                        label="Missions"
                        value={exp.missions.join('\n')}
                        onChangeText={(v) => update({ missions: linesToList(v) })}
                        placeholder={'Une mission par ligne'}
                        multiline
                      />
                    </ItemCard>
                  );
                })}
                <AddButton
                  label="Ajouter une expérience"
                  onPress={() => patch({ experiences: [...experiences, { poste: '', entreprise: '', ville: '', periode: '', missions: [] }] })}
                />
              </Section>

              <Section title="Formations" count={formations.length}>
                {formations.map((f, i) => {
                  const update = (p: Partial<typeof f>) =>
                    patch({ formations: formations.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                  return (
                    <ItemCard
                      key={i}
                      title={f.diplome || `Formation ${i + 1}`}
                      onRemove={() => patch({ formations: formations.filter((_, j) => j !== i) })}
                    >
                      <Field label="Diplôme" value={f.diplome} onChangeText={(diplome) => update({ diplome })} placeholder="BTS Réseaux et télécoms" />
                      <Field label="Établissement" value={f.etablissement} onChangeText={(etablissement) => update({ etablissement })} />
                      <View style={fieldStyles.row}>
                        <View style={fieldStyles.half}>
                          <Field label="Ville" value={f.ville} onChangeText={(ville) => update({ ville })} />
                        </View>
                        <View style={fieldStyles.half}>
                          <Field label="Période" value={f.periode} onChangeText={(periode) => update({ periode })} placeholder="2023 – 2025" />
                        </View>
                      </View>
                    </ItemCard>
                  );
                })}
                <AddButton
                  label="Ajouter une formation"
                  onPress={() => patch({ formations: [...formations, { diplome: '', etablissement: '', ville: '', periode: '' }] })}
                />
              </Section>

              <Section title="Compétences et outils" count={background.competences.length + background.logiciels.length}>
                <ListField label="Compétences" items={background.competences} onChange={(competences) => patch({ competences })} placeholder="Configuration Cisco, support utilisateurs…" />
                <ListField label="Logiciels et outils" items={background.logiciels} onChange={(logiciels) => patch({ logiciels })} placeholder="Excel, Packet Tracer, Canva…" />
                <ListField label="Qualités" items={background.qualites} onChange={(qualites) => patch({ qualites })} placeholder="Rigueur, travail en équipe…" />
              </Section>

              <Section title="Langues" count={langues.length}>
                {langues.map((l, i) => {
                  const update = (p: Partial<typeof l>) => patch({ langues: langues.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                  return (
                    <ItemCard key={i} title={l.langue || `Langue ${i + 1}`} onRemove={() => patch({ langues: langues.filter((_, j) => j !== i) })}>
                      <View style={fieldStyles.row}>
                        <View style={fieldStyles.half}>
                          <Field label="Langue" value={l.langue} onChangeText={(langue) => update({ langue })} placeholder="Anglais" />
                        </View>
                        <View style={fieldStyles.half}>
                          <Field label="Niveau" value={l.niveau} onChangeText={(niveau) => update({ niveau })} placeholder="Courant, B2…" />
                        </View>
                      </View>
                    </ItemCard>
                  );
                })}
                <AddButton label="Ajouter une langue" onPress={() => patch({ langues: [...langues, { langue: '', niveau: '' }] })} />
              </Section>

              <Section title="Loisirs" count={background.loisirs.length}>
                <ListField label="Loisirs" items={background.loisirs} onChange={(loisirs) => patch({ loisirs })} placeholder="Football, lecture, bénévolat…" />
              </Section>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={[styles.primaryBtn, (saving || loading) && styles.disabled]} disabled={saving || loading} onPress={save}>
              {saving ? <ActivityIndicator color={stitchColors.white} /> : <Text style={styles.primaryBtnText}>Enregistrer mon parcours</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: stitchColors.paperSoft },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.outlineVariant,
  },
  title: { fontSize: 20, fontWeight: '800', color: stitchColors.ink },
  subtitle: { fontSize: 13, color: stitchColors.inkMuted, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.paperSoft,
  },
  content: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 640, alignSelf: 'center' },
  importCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.primary,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  importTitle: { fontSize: 16, fontWeight: '700', color: stitchColors.ink },
  importText: { fontSize: 13, lineHeight: 19, color: stitchColors.inkMuted },
  notice: {
    fontSize: 13,
    lineHeight: 19,
    color: stitchColors.emeraldDeep,
    backgroundColor: stitchColors.emeraldBg,
    padding: 12,
    borderRadius: stitchRadius.md,
    marginBottom: 12,
  },
  pasteInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.md,
    padding: 12,
    fontSize: 14,
    color: stitchColors.ink,
    marginBottom: 10,
  },
  primaryBtn: {
    minHeight: 50,
    borderRadius: stitchRadius.button,
    backgroundColor: stitchColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: stitchColors.white, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: stitchRadius.button,
    borderWidth: 1,
    borderColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: stitchColors.primary, fontSize: 14, fontWeight: '700' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
  linkBtnText: { color: stitchColors.primary, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  footer: {
    padding: 16,
    backgroundColor: stitchColors.surface,
    borderTopWidth: 1,
    borderTopColor: stitchColors.outlineVariant,
  },
});
