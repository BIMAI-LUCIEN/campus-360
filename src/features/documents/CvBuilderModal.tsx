import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';

import { authFetch } from '../auth/betterAuth';
import { cvBackgroundFilledCount, fetchCvBackground, importCvFromFile, type CvBackground } from '../profile/cvBackgroundApi';
import { CvEditor } from '../stages/CvEditor';
import { CvTemplateGallery } from '../stages/CvTemplateGallery';
import { CvStylePicker } from '../stages/CvStylePicker';
import { CvTemplatePreview } from '../stages/CvTemplatePreview';
import { mergeAiCv, missingCvFields, type CvStyle, type CvTemplateId } from '../stages/cvHtml';
import { saveCvToLibrary, updateCvInLibrary, type SavedCv } from '../stages/cvLibrary';
import { MAX_OFFER_IMAGES, pickOfferImages } from '../stages/externalOfferApi';
import { exportOfficialCvPdf } from '../stages/pdfExportService';
import { stitchColors } from '../../theme/stitch';
import { AppAlert } from '../../ui/AppAlert';
import type { OfficialCvData } from '../../types';
import { careerOfferLabel, readOfferFromFile, readOfferFromImages, readOfferFromText, type CareerOffer } from './careerContextApi';
import { CvJuryPanel } from './CvJuryPanel';
import type { CvReview } from './cvJuryApi';

// Same as mobile-api aiCost('careerDoc').
const CV_CREDITS = 2;

type Step = 'form' | 'generating' | 'preview';

/**
 * CV for an offer seen outside the app, built like an application: skills,
 * reference CV, offer, then the generated CV to review, correct and keep in "Mes CV".
 */
export function CvBuilderModal({
  kind = 'cv',
  onLetterReady,
  visible,
  onClose,
  baseCv,
  profile,
  freeLaunch,
  onCreditsChange,
  onLibraryChange,
}: {
  /** A letter uses the same form, then opens as a text document to finish and export. */
  kind?: 'cv' | 'lettre_motivation';
  onLetterReady?: (documentId: string) => void;
  visible: boolean;
  onClose: () => void;
  baseCv: OfficialCvData;
  profile: { fullName: string; university: string; major: string; educationLevel: string; skills: string[] };
  freeLaunch: boolean;
  onCreditsChange: (credits: number) => void;
  onLibraryChange: (saved: SavedCv[] | SavedCv) => void;
}) {
  const [step, setStep] = React.useState<Step>('form');
  const [skills, setSkills] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [background, setBackground] = React.useState<CvBackground | null>(null);
  const [hasSavedBackground, setHasSavedBackground] = React.useState(false);
  const [offer, setOffer] = React.useState<CareerOffer | null>(null);
  const [offerText, setOfferText] = React.useState('');
  const [offerTextOpen, setOfferTextOpen] = React.useState(false);
  const [linkedinHelp, setLinkedinHelp] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [template, setTemplate] = React.useState<CvTemplateId>('classic');
  const [cv, setCv] = React.useState<OfficialCvData | null>(null);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'preview' | 'edit' | 'jury'>('preview');
  const [sourceGenerationId, setSourceGenerationId] = React.useState<string | undefined>(undefined);
  const [review, setReview] = React.useState<CvReview | undefined>(undefined);
  const [previousScore, setPreviousScore] = React.useState<number | undefined>(undefined);
  const [cvStyle, setCvStyle] = React.useState<CvStyle>({});
  const isLetter = kind === 'lettre_motivation';
  // A spontaneous letter has no offer: the student then says who it is for.
  const canGenerate = Boolean(offer) || (isLetter && notes.trim().length > 0);

  React.useEffect(() => {
    if (!visible) return;
    setStep('form');
    setSkills(profile.skills.join(', '));
    setNotes('');
    setBackground(null);
    setOffer(null);
    setOfferText('');
    setOfferTextOpen(false);
    setCv(null);
    setSavedId(null);
    setTab('preview');
    setSourceGenerationId(undefined);
    setReview(undefined);
    setPreviousScore(undefined);
    setCvStyle({});
    void fetchCvBackground()
      .then((r) => setHasSavedBackground(r.saved && cvBackgroundFilledCount(r.background) > 0))
      .catch(() => setHasSavedBackground(false));
    // Reset on opening only: the profile may refresh while the student types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const withBusy = async (label: string, title: string, work: () => Promise<void>) => {
    setBusy(label);
    try {
      await work();
    } catch (error) {
      AppAlert.alert(title, error instanceof Error ? error.message : 'Lecture impossible.');
    } finally {
      setBusy(null);
    }
  };

  const importReference = () =>
    withBusy('Lecture de ton CV…', 'CV de référence', async () => {
      const imported = await importCvFromFile();
      if (imported) setBackground(imported);
    });

  const attachOffer = (read: () => Promise<CareerOffer | null>) =>
    withBusy('Lecture de l’offre…', 'Offre', async () => {
      const next = await read();
      if (!next) return;
      setOffer(next);
      setOfferTextOpen(false);
      setOfferText('');
    });

  const offerFromPhotos = () =>
    attachOffer(async () => {
      const images = await pickOfferImages(MAX_OFFER_IMAGES);
      return images.length ? readOfferFromImages(images) : null;
    });

  const offerFromText = () => {
    if (offerText.trim().length < 30) {
      AppAlert.alert('Offre', 'Colle le texte complet de l’offre (30 caractères au moins).');
      return;
    }
    void attachOffer(() => readOfferFromText(offerText));
  };

  const skillList = () => skills.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 40);

  const generateLetter = async () => {
    const created = await authFetch('/api/mobile/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: offer ? `Lettre · ${careerOfferLabel(offer) || 'offre'}`.slice(0, 180) : 'Lettre de motivation',
        description: '',
        templateType: 'lettre_motivation',
      }),
    });
    const { document: doc } = (await created.json()) as { document: { id: string } };
    const res = await authFetch('/api/mobile/documents/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'lettre_motivation',
        documentId: doc.id,
        generationId: `lettre-${doc.id}-${Date.now()}`,
        offer,
        background,
        answers: {
          conversation: [skillList().length ? `Compétences : ${skillList().join(', ')}` : '', notes.trim()].filter(Boolean).join('\n'),
          fullName: profile.fullName,
          university: profile.university,
          faculty: profile.major,
          level: profile.educationLevel,
          email: baseCv.detailsPersonnels.email,
          phone: baseCv.detailsPersonnels.telephone,
        },
      }),
    }).catch((error) => {
      // No letter written: the empty document must not stay in the student's list.
      void authFetch(`/api/mobile/documents/${doc.id}`, { method: 'DELETE' }).catch(() => {});
      throw error;
    });
    const data = (await res.json()) as { remainingCredits?: number };
    if (data.remainingCredits !== undefined) onCreditsChange(data.remainingCredits);
    onClose();
    onLetterReady?.(doc.id);
  };

  const generate = async () => {
    if (!canGenerate) return;
    setStep('generating');
    try {
      if (isLetter) {
        await generateLetter();
        return;
      }
      if (!offer) return;
      const generationId = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const res = await authFetch('/api/mobile/documents/cv-fill', {
        method: 'POST',
        body: JSON.stringify({
          offer,
          background,
          student: {
            fullName: profile.fullName || undefined,
            university: profile.university || undefined,
            major: profile.major || undefined,
            educationLevel: profile.educationLevel || undefined,
            skills: skillList(),
          },
          notes: notes.trim() || undefined,
          generationId,
        }),
      });
      const data = (await res.json()) as { cv: Partial<OfficialCvData>; remainingCredits?: number };
      setSourceGenerationId(generationId);
      if (data.remainingCredits !== undefined) onCreditsChange(data.remainingCredits);
      const merged = mergeAiCv(baseCv, data.cv);
      setCv(merged);
      setStep('preview');
      // Kept at once: the CV is paid, closing the screen must not lose it.
      const saved = await saveCvToLibrary({ templateId: template, jobTitle: offer.title, company: offer.company, officialCv: merged, offer, sourceGenerationId: generationId }).catch(() => null);
      if (saved) {
        setSavedId(saved.id);
        onLibraryChange(saved);
      }
    } catch (error) {
      setStep('form');
      AppAlert.alert(isLetter ? 'Lettre' : 'CV', error instanceof Error ? error.message : 'Génération impossible.');
    }
  };

  const persist = async () => {
    if (savedId && cv) onLibraryChange(await updateCvInLibrary(savedId, { templateId: template, officialCv: cv, style: cvStyle, review, previousScore, sourceGenerationId }));
  };

  // A verdict is paid or uses the free review: kept in "Mes CV" at once.
  const keepReview = (next: CvReview, before?: number) => {
    setReview(next);
    setPreviousScore(before);
    if (savedId) void updateCvInLibrary(savedId, { review: next, previousScore: before }).then(onLibraryChange).catch(() => {});
  };

  const keepCorrection = (next: OfficialCvData, generation: string) => {
    setCv(next);
    setSourceGenerationId(generation);
    if (savedId) void updateCvInLibrary(savedId, { officialCv: next, sourceGenerationId: generation }).then(onLibraryChange).catch(() => {});
  };

  const finish = async () => {
    await persist().catch(() => AppAlert.alert('Mes CV', 'Tes dernières corrections n’ont pas pu être enregistrées.'));
    onClose();
  };

  const download = async () => {
    if (!cv) return;
    const missing = missingCvFields(cv);
    if (missing.length > 0) {
      AppAlert.alert('CV incomplet', `Complète ces champs avant le PDF : ${missing.join(', ')}.`);
      setTab('edit');
      return;
    }
    try {
      await persist();
      await exportOfficialCvPdf(cv, template, cvStyle);
    } catch {
      AppAlert.alert('Erreur', 'Impossible d’exporter le CV.');
    }
  };

  const hasReference = Boolean(background) || hasSavedBackground;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={step === 'preview' ? finish : onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{step === 'preview' ? 'Ton CV adapté' : isLetter ? 'Créer une lettre de motivation' : 'Créer un CV pour une offre'}</Text>
            {step !== 'generating' ? (
              <Pressable testID="cv-builder-close" accessibilityLabel="Fermer" onPress={step === 'preview' ? finish : onClose} style={styles.close}>
                <X size={18} color={stitchColors.ink} />
              </Pressable>
            ) : null}
          </View>

          {step === 'generating' ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={stitchColors.primary} />
              <Text style={styles.body}>{isLetter ? 'L’IA rédige ta lettre…' : 'L’IA adapte ton CV à l’offre…'}</Text>
            </View>
          ) : null}

          {step === 'form' ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>1. Tes compétences</Text>
              <TextInput
                testID="cv-builder-skills"
                style={[styles.input, styles.multiline]}
                value={skills}
                onChangeText={setSkills}
                placeholder="Excel, comptabilité, travail en équipe…"
                placeholderTextColor={stitchColors.inkMuted}
                multiline
              />

              <Text style={styles.label}>2. Ton CV de référence (infos et expériences)</Text>
              <View style={styles.row}>
                <Pressable testID="cv-builder-import" style={styles.secondary} onPress={importReference} disabled={Boolean(busy)}>
                  <Text style={styles.secondaryText}>{background ? 'Changer de CV' : 'Importer mon CV (PDF, Word)'}</Text>
                </Pressable>
                <Pressable testID="cv-builder-linkedin" style={styles.secondary} onPress={() => setLinkedinHelp((open) => !open)} disabled={Boolean(busy)}>
                  <Text style={styles.secondaryText}>Mon profil LinkedIn</Text>
                </Pressable>
              </View>
              {linkedinHelp ? (
                <View testID="cv-builder-linkedin-help" style={styles.helpBox}>
                  <Text style={styles.hint}>
                    Sur LinkedIn (ordinateur), ouvre ton profil, puis « Ressources » (ou « Plus ») et « Enregistrer au format PDF ».
                    Sur téléphone, ouvre linkedin.com dans le navigateur en « version pour ordinateur ». Importe ensuite ce PDF ici.
                  </Text>
                  <Pressable testID="cv-builder-linkedin-import" style={styles.secondary} onPress={importReference} disabled={Boolean(busy)}>
                    <Text style={styles.secondaryText}>Importer le PDF LinkedIn</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.hint}>
                {background
                  ? `CV lu : ${cvBackgroundFilledCount(background)} rubriques reprises.`
                  : hasSavedBackground
                    ? 'Sans import, l’IA reprend « Mon parcours ».'
                    : 'Sans CV, décris tes expériences à l’étape 4.'}
              </Text>

              <Text style={styles.label}>{isLetter ? '3. L’offre (ou décris ta candidature spontanée à l’étape 4)' : '3. L’offre vue hors de l’app'}</Text>
              <View style={styles.row}>
                <Pressable testID="cv-builder-offer-photo" style={styles.secondary} onPress={offerFromPhotos} disabled={Boolean(busy)}>
                  <Text style={styles.secondaryText}>Photo</Text>
                </Pressable>
                <Pressable testID="cv-builder-offer-file" style={styles.secondary} onPress={() => attachOffer(readOfferFromFile)} disabled={Boolean(busy)}>
                  <Text style={styles.secondaryText}>Fichier</Text>
                </Pressable>
                <Pressable testID="cv-builder-offer-text" style={styles.secondary} onPress={() => setOfferTextOpen(true)} disabled={Boolean(busy)}>
                  <Text style={styles.secondaryText}>Coller le texte</Text>
                </Pressable>
              </View>
              {offerTextOpen ? (
                <>
                  <TextInput
                    testID="cv-builder-offer-input"
                    style={[styles.input, styles.multiline]}
                    value={offerText}
                    onChangeText={setOfferText}
                    placeholder="Colle ici le texte de l’offre"
                    placeholderTextColor={stitchColors.inkMuted}
                    multiline
                  />
                  <Pressable testID="cv-builder-offer-read" style={styles.secondary} onPress={offerFromText} disabled={Boolean(busy)}>
                    <Text style={styles.secondaryText}>Lire l’offre</Text>
                  </Pressable>
                </>
              ) : null}
              {busy ? <Text style={styles.hint}>{busy}</Text> : null}
              {offer ? <Text testID="cv-builder-offer-label" style={styles.offer}>Offre : {careerOfferLabel(offer) || 'intitulé non trouvé'}</Text> : null}

              <Text style={styles.label}>4. À ajouter (facultatif)</Text>
              <TextInput
                testID="cv-builder-notes"
                style={[styles.input, styles.multiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Expériences, projets, langues, loisirs…"
                placeholderTextColor={stitchColors.inkMuted}
                multiline
                maxLength={4000}
              />

              {!isLetter ? (
                <>
                  <Text style={styles.label}>5. Le modèle</Text>
                  <CvTemplateGallery layout="strip" value={template} onChange={setTemplate} />
                </>
              ) : null}

              <Text style={styles.hint}>
                {freeLaunch ? 'Génération incluse.' : `Génération : ${CV_CREDITS} crédits IA, débités seulement si le document est rédigé.`}
              </Text>
              <Pressable
                testID="cv-builder-generate"
                style={[styles.primary, (!canGenerate || Boolean(busy)) && styles.disabled]}
                onPress={generate}
                disabled={!canGenerate || Boolean(busy)}
              >
                <Text style={styles.primaryText}>
                  {!canGenerate ? 'Ajoute l’offre pour continuer' : isLetter ? 'Générer ma lettre' : 'Générer mon CV adapté'}
                </Text>
              </Pressable>
            </ScrollView>
          ) : null}

          {step === 'preview' && cv ? (
            <>
              <View style={styles.tabs}>
                <Pressable testID="cv-builder-tab-preview" style={[styles.tab, tab === 'preview' && styles.tabOn]} onPress={() => setTab('preview')}>
                  <Text style={styles.secondaryText}>Aperçu</Text>
                </Pressable>
                <Pressable testID="cv-builder-tab-edit" style={[styles.tab, tab === 'edit' && styles.tabOn]} onPress={() => setTab('edit')}>
                  <Text style={styles.secondaryText}>Corriger</Text>
                </Pressable>
                <Pressable testID="cv-builder-tab-jury" style={[styles.tab, tab === 'jury' && styles.tabOn]} onPress={() => setTab('jury')}>
                  <Text style={styles.secondaryText}>{review ? `Jury ${review.score}/7` : 'Jury'}</Text>
                </Pressable>
              </View>
              {tab === 'edit' ? (
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                  <CvEditor cv={cv} onChange={setCv} />
                </ScrollView>
              ) : tab === 'jury' ? (
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                  <CvJuryPanel
                    cv={cv}
                    template={template}
                    offer={offer}
                    sourceGenerationId={sourceGenerationId}
                    review={review}
                    previousScore={previousScore}
                    student={{ fullName: profile.fullName || undefined, university: profile.university || undefined, major: profile.major || undefined, educationLevel: profile.educationLevel || undefined, skills: skillList() }}
                    onReviewed={keepReview}
                    onCorrected={keepCorrection}
                    onSwitchToAts={() => { setTemplate('ats'); setTab('preview'); }}
                    onCreditsChange={onCreditsChange}
                  />
                </ScrollView>
              ) : (
                <>
                  <View style={styles.templateStrip}>
                    <CvTemplateGallery layout="strip" value={template} onChange={setTemplate} />
                  </View>
                  <CvStylePicker value={cvStyle} onChange={setCvStyle} />
                  <View style={styles.previewBox}>
                    <CvTemplatePreview cv={cv} template={template} style={cvStyle} />
                  </View>
                </>
              )}
              <View style={styles.footer}>
                <Pressable testID="cv-builder-pdf" style={[styles.secondary, styles.grow]} onPress={download}>
                  <Text style={styles.secondaryText}>Télécharger le PDF</Text>
                </Pressable>
                <Pressable testID="cv-builder-done" style={[styles.primary, styles.grow]} onPress={finish}>
                  <Text style={styles.primaryText}>Enregistrer dans Mes CV</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  sheet: { height: '94%', backgroundColor: stitchColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: stitchColors.ink },
  close: { padding: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  body: { fontSize: 14, color: stitchColors.ink },
  content: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '700', color: stitchColors.ink, marginTop: 8 },
  hint: { fontSize: 12, color: stitchColors.inkMuted },
  offer: { fontSize: 13, fontWeight: '600', color: stitchColors.primary },
  input: { borderWidth: 1, borderColor: stitchColors.surfaceContainerHigh, borderRadius: 10, padding: 12, fontSize: 14, color: stitchColors.ink },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  helpBox: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: stitchColors.paperSoft },
  secondary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '600', color: stitchColors.primary, textAlign: 'center' },
  primary: { minHeight: 48, paddingHorizontal: 14, borderRadius: 10, backgroundColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '700', color: stitchColors.white, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  tab: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: stitchColors.paperSoft },
  tabOn: { backgroundColor: stitchColors.surfaceContainerHigh },
  previewBox: { flex: 1, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  templateStrip: { paddingHorizontal: 16, paddingBottom: 6 },
  footer: { flexDirection: 'row', gap: 8, padding: 12 },
  grow: { flex: 1 },
});
