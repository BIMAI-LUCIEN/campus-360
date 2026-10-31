import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import {
  CheckCircle2,
  Mail,
  X,
  Send,
  Building2,
  FileText,
  ShieldCheck,
  Edit3,
  Check,
  Copy,
  Download,
  Zap,
  AlertCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import type { StageJob } from '../../types';
import {
  generateIaApplication,
  fillCvWithAi,
  buildCvText,
  submitStageApplication,
  dispatchStageApplication,
  type GeneratedApplicationResult,
} from './stagesApi';
import { analyzeJobMatch, type MatchAnalysis } from './aiMatchEngine';
import { APPLY_LINK_NOTICE, isLinkApply } from './applyTarget';
import { exportApplicationPdf, buildWhatsAppPitch, generateCvPdfBase64 } from './pdfExportService';
import { mergeAiCv, missingCvFields, type CvTemplateId } from './cvHtml';
import { CvTemplateGallery } from './CvTemplateGallery';
import { CvTemplatePreview } from './CvTemplatePreview';
import { composeApplicationMail, type ApplicationMailResult } from './applicationMail';
import { StudentProfileExpressModal } from './StudentProfileExpressModal';
import { getStudentAccount, updateStudentProfile } from '../auth/betterAuth';
import { PaymentModal } from '../wallet/PaymentModal';
import { cleanPhoneNumber } from '../whatsapp/whatsappService';
import { stitchColors, fontFamilies, stitchRadius } from '../../theme/stitch';
import { fetchOffers } from '../wallet/offersApi';
import { OffersModal } from '../wallet/OffersModal';
import { applyPriceLabel, jobApplyCredits, jobApplyPrice, jobIsPaid } from './applyPrice';
import { saveCvToLibrary } from './cvLibrary';
import { CvEditor } from './CvEditor';
import { CvBackgroundScreen } from '../profile/CvBackgroundScreen';
import { cvBackgroundFilledCount, fetchCvBackground } from '../profile/cvBackgroundApi';
import { companyEmail, companyWhatsapp, CONTACT_UNAVAILABLE } from './contactTargets';
import { AppAlert } from '../../ui/AppAlert';

interface AiApplyModalProps {
  visible: boolean;
  job: StageJob | null;
  studentProfile: {
    fullName: string;
    email: string;
    phoneWhatsapp?: string;
    university?: string;
    major: string;
    educationLevel: string;
    skills: string[];
    portfolioUrl?: string;
    tokens?: number;
  };
  onClose: () => void;
  onApplicationComplete?: () => void;
  onRecharge?: () => void;
  /** Called after the pre-application sheet saved missing profile data (WhatsApp, studies, skills). */
  onProfileSaved?: (patch: ApplicationProfilePatch) => void;
}

export interface ApplicationProfilePatch {
  whatsappPhone: string;
  faculty: string;
  level: string;
  skills: string[];
}

export function AiApplyModal({
  visible,
  job,
  studentProfile,
  onClose,
  onApplicationComplete,
  onRecharge,
  onProfileSaved,
}: AiApplyModalProps) {
  // template: the student picks the CV layout and tells the AI what is not in the profile.
  const [step, setStep] = useState<'template' | 'generating' | 'preview' | 'send' | 'sent'>('template');
  const [cvTemplate, setCvTemplate] = useState<CvTemplateId>('classic');
  // Kept while the screen lives, so the next application starts from the same notes.
  const [cvNotes, setCvNotes] = useState('');
  const [cvAiNotice, setCvAiNotice] = useState<string | null>(null);
  const progressTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [progressMsg, setProgressMsg] = useState("Analyse de l'offre et correspondance des compétences...");
  const [result, setResult] = useState<GeneratedApplicationResult | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'letter' | 'cv' | 'match'>('letter');
  const [isEditing, setIsEditing] = useState(false);
  const [editableLetter, setEditableLetter] = useState('');
  const [editableCv, setEditableCv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Dynamic state for student profile if completed via express modal
  const [currentProfile, setCurrentProfile] = useState(studentProfile);
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // "Mon parcours" saved on the account: the AI reads it for every application.
  const [backgroundCount, setBackgroundCount] = useState<number | null>(null);
  const [showBackground, setShowBackground] = useState(false);
  const refreshBackground = () =>
    fetchCvBackground()
      .then((res) => setBackgroundCount(res.saved ? cvBackgroundFilledCount(res.background) : 0))
      .catch(() => setBackgroundCount(null));
  useEffect(() => {
    if (visible) void refreshBackground();
  }, [visible]);
  // Wallet balance in coins (1 coin = 1 FCFA): the application is paid before the AI writes it.
  const [balanceCoins, setBalanceCoins] = useState<number | null>(null);
  // Pack credits valid now: used before the coins (1, or 2 for a paid offer).
  const [credits, setCredits] = useState(0);
  const [showOffers, setShowOffers] = useState(false);

  const refreshBalance = async () => {
    try {
      const account = await getStudentAccount();
      setBalanceCoins(account.wallet.balanceCoins);
    } catch {
      setBalanceCoins(null);
    }
    try {
      setCredits((await fetchOffers()).credits);
    } catch {
      setCredits(0);
    }
  };

  useEffect(() => {
    if (visible) void refreshBalance();
  }, [visible]);

  // E-mail : messagerie de l'étudiant en premier sur mobile (pièces jointes possibles), Campus 360 sur le web
  const studentMailFirst = Platform.OS !== 'web';
  // Canal d'envoi (la liaison du compte WhatsApp est retirée de l'UI en attendant l'API officielle)
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [dispatchReceipt, setDispatchReceipt] = useState<{
    applicationId: string;
    channel: 'whatsapp' | 'email' | 'whatsapp_manual' | 'email_manual' | 'inapp';
    status: string;
    appliedAt: string;
    message: string;
    companyName: string;
    jobTitle: string;
  } | null>(null);

  useEffect(() => {
    setCurrentProfile(studentProfile);
  }, [studentProfile]);

  // Sélectionne le canal par défaut
  useEffect(() => {
    if (visible && job) {
      // Safety net: a 'LINK' offer has no recipient, the screens open its website instead.
      if (isLinkApply(job)) {
        AppAlert.alert("Candidature sur le site de l'offre", APPLY_LINK_NOTICE);
        onClose();
        return;
      }
      if (job.applyMethod === 'EMAIL') {
        setSelectedChannel('email');
      } else {
        setSelectedChannel('whatsapp');
      }
    }
  }, [visible, job, onClose]);

  // Compute Match Analysis
  const matchAnalysis: MatchAnalysis | null = useMemo(() => {
    if (!job) return null;
    return analyzeJobMatch(job, currentProfile);
  }, [job, currentProfile]);

  // Check if profile is missing essentials (WhatsApp is first asked here, at the first application)
  const isProfileIncomplete = useMemo(() => {
    return (
      !currentProfile.phoneWhatsapp?.trim() ||
      !currentProfile.major ||
      currentProfile.major === 'Non renseigné' ||
      !currentProfile.skills ||
      currentProfile.skills.length === 0
    );
  }, [currentProfile]);

  const persistApplication = async () => {
    if (!result || !job) throw new Error('Candidature non générée.');
    setSubmitting(true);
    try {
      const applicationId = await submitStageApplication(job, editableCv, editableLetter, result.officialCv);
      setResult((current) => (current ? { ...current, applicationId } : current));
      return applicationId;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (visible && job) {
      // If student has incomplete profile, prompt express modal first
      if (isProfileIncomplete) {
        setShowExpressModal(true);
        return;
      }

      // The student can fill everything in first: payment is asked just before generation.
      setStep('template');
      setResult(null);
      setIsEditing(false);
      setCopiedPitch(false);
    }
  }, [visible, job, currentProfile, isProfileIncomplete]);

  useEffect(() => () => progressTimers.current.forEach(clearTimeout), []);

  const applyPrice = job ? jobApplyPrice(job) : 0;
  const applyCredits = job ? jobApplyCredits(job) : 1;
  const mustPay = applyPrice > 0;
  const paysWithCredits = credits >= applyCredits;
  const canAfford = !mustPay || paysWithCredits || (balanceCoins !== null && balanceCoins >= applyPrice);
  const creditsLabel = `${applyCredits} crédit${applyCredits > 1 ? 's' : ''}`;

  // Letter and match are written on the device; the CV is filled by the AI
  // (/api/mobile/stages/cv), which charges the application first. When the AI
  // fails the coins come back and the CV falls back to the profile alone.
  const startGeneration = async () => {
    if (!job) return;
    if (!canAfford) {
      setShowPaymentModal(true);
      return;
    }
    setStep('generating');
    setCvAiNotice(null);
    setProgressMsg("Lecture de ton profil et de l'offre...");
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [
      setTimeout(() => setProgressMsg("L'IA remplit ton CV et rédige ta lettre..."), 1200),
      setTimeout(() => setProgressMsg('Mise en page dans le modèle choisi...'), 4000),
    ];
    try {
      // Paid first: a balance too low stops here, before anything is written.
      let aiCv: Awaited<ReturnType<typeof fillCvWithAi>> | null = null;
      try {
        aiCv = await fillCvWithAi(job, currentProfile, cvNotes);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (/solde insuffisant/i.test(message)) {
          await refreshBalance();
          setStep('template');
          setShowPaymentModal(true);
          return;
        }
        console.warn('[AiApplyModal] AI CV fill failed:', err);
      }
      void refreshBalance();
      const res = await generateIaApplication(job, currentProfile);
      const officialCv = res.officialCv ? mergeAiCv(res.officialCv, aiCv) : undefined;
      const cvText = officialCv ? buildCvText(officialCv) : res.cvText;
      setResult({ ...res, officialCv, cvText });
      if (officialCv) {
        // Keep this CV in the library, whatever happens to the application afterwards.
        void saveCvToLibrary({
          templateId: cvTemplate,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company?.name ?? '',
          officialCv,
        }).catch(() => {});
      }
      setEditableLetter(res.letterText);
      setEditableCv(cvText);
      if (!aiCv) {
        setCvAiNotice("L'IA n'a pas pu compléter ton CV pour le moment : il reprend les informations de ton profil.");
      }
      setActivePreviewTab('cv');
      setStep('preview');
    } catch (err) {
      AppAlert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de générer la candidature. Réessayez.');
      setStep('template');
    } finally {
      progressTimers.current.forEach(clearTimeout);
    }
  };

  if (!visible || !job) return null;

  const handleExpressProfileSaved = (data: {
    fullName: string;
    phoneWhatsapp: string;
    university: string;
    major: string;
    level: string;
    skills: string[];
  }) => {
    setShowExpressModal(false);
    const patch: ApplicationProfilePatch = {
      whatsappPhone: data.phoneWhatsapp || currentProfile.phoneWhatsapp || '',
      faculty: data.major || currentProfile.major,
      level: data.level || currentProfile.educationLevel,
      skills: data.skills.length > 0 ? data.skills : currentProfile.skills,
    };
    setCurrentProfile((prev) => ({
      ...prev,
      phoneWhatsapp: patch.whatsappPhone,
      major: patch.faculty,
      educationLevel: patch.level,
      skills: patch.skills,
    }));
    // Persist on the account so the sheet is never shown again for the same data.
    updateStudentProfile({
      whatsappPhone: patch.whatsappPhone,
      phone: patch.whatsappPhone,
      faculty: patch.faculty,
      level: patch.level,
      skills: patch.skills,
    }).catch((error) => console.warn('[AiApplyModal] profile save failed:', error));
    onProfileSaved?.(patch);
  };

  const handleReformulateTone = (tone: 'formal' | 'concise' | 'impact') => {
    if (tone === 'formal') {
      setEditableLetter((prev) =>
        prev
          .replace(/Bonjour,/g, 'Madame, Monsieur le Responsable du Recrutement,')
          .replace(
            /Cordialement,/g,
            'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.'
          )
      );
      AppAlert.alert('Ton formel appliqué', 'Formules protocolaires professionnelles insérées.');
    } else if (tone === 'concise') {
      setEditableLetter((prev) =>
        prev.split('\n\n').slice(0, 3).join('\n\n') +
        '\n\nRestant à votre entière disposition pour échanger lors d’un entretien.'
      );
      AppAlert.alert('Version concise', 'Format direct en 3 paragraphes opérationnels.');
    } else if (tone === 'impact') {
      const skillsHighlight = currentProfile.skills.slice(0, 3).join(', ');
      setEditableLetter((prev) =>
        prev + `\n\nCompétences clés directement opérationnelles : ${skillsHighlight}.`
      );
      AppAlert.alert('Compétences mises en avant', 'Compétences clés insérées dans le corps du texte.');
    }
  };

  // 1. Action: Copier le message WhatsApp d'accroche direct
  const handleCopyPitchForWhatsapp = async () => {
    const pitch = buildWhatsAppPitch({
      studentName: currentProfile.fullName,
      major: currentProfile.major,
      jobTitle: job.title,
      companyName: job.company?.name || "L'Entreprise",
      letterSummary: editableLetter,
    });

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(pitch);
    }
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 3000);
  };

  // 2. Action: Télécharger le PDF mis en page
  const handleDownloadPdf = async () => {
    if (result?.officialCv) {
      const missing = missingCvFields(result.officialCv);
      if (missing.length > 0) {
        AppAlert.alert('Profil incomplet', `Complète ton nom et ton contact (e-mail ou téléphone) dans ton profil avant d'envoyer ton CV. Manque : ${missing.join(', ')}.`);
        return;
      }
    }
    setDownloadingPdf(true);
    try {
      await exportApplicationPdf({
        studentName: currentProfile.fullName,
        studentEmail: currentProfile.email,
        studentPhone: currentProfile.phoneWhatsapp,
        major: currentProfile.major,
        educationLevel: currentProfile.educationLevel,
        jobTitle: job.title,
        companyName: job.company?.name || "L'Entreprise",
        letterText: editableLetter,
        cvText: editableCv,
        officialCv: result?.officialCv,
        cvTemplate,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 3. Action: 1-Click Background Apply (WhatsApp or Email via /api/mobile/stages/dispatch)
  const handleOneClickApply = async (channel: 'whatsapp' | 'email') => {
    if (!result || !job) return;
    if (result?.officialCv) {
      const missing = missingCvFields(result.officialCv);
      if (missing.length > 0) {
        AppAlert.alert('Profil incomplet', `Complète ton nom et ton contact (e-mail ou téléphone) dans ton profil avant d'envoyer ton CV. Manque : ${missing.join(', ')}.`);
        return;
      }
    }
    setSubmitting(true);
    setDispatchReceipt(null);
    try {
      const studentPhone = currentProfile.phoneWhatsapp || '';
      const pdfBase64 = await generateCvPdfBase64({
        studentName: currentProfile.fullName,
        studentEmail: currentProfile.email,
        studentPhone,
        major: currentProfile.major,
        educationLevel: currentProfile.educationLevel,
        jobTitle: job.title,
        companyName: job.company?.name || "L'Entreprise",
        letterText: editableLetter,
        cvText: editableCv,
        officialCv: result.officialCv,
        cvTemplate,
      });

      if (!pdfBase64 && Platform.OS === 'web') {
        AppAlert.alert('CV non joint', "Sur le web, ton CV n'est pas joint automatiquement. Utilise l'app mobile pour l'envoyer avec ta candidature.");
      }

      const pitch = buildWhatsAppPitch({
        studentName: currentProfile.fullName,
        major: currentProfile.major,
        jobTitle: job.title,
        companyName: job.company?.name || "L'Entreprise",
        letterSummary: editableLetter,
      });

      const res = await dispatchStageApplication({
        jobId: job.id,
        channel,
        whatsappPitch: pitch,
        letterText: editableLetter,
        cvPdfBase64: pdfBase64 || undefined,
        studentNotes: '',
        studentName: currentProfile.fullName,
        studentEmail: currentProfile.email,
        studentPhone,
        phoneNumber: studentPhone,
        officialCv: result.officialCv,
        cvText: editableCv,
        job,
      });

      setDispatchReceipt({
        applicationId: res.applicationId,
        channel,
        status: res.status,
        appliedAt: new Date().toISOString(),
        message: res.message,
        companyName: job.company?.name || 'Entreprise Partenaire',
        jobTitle: job.title,
      });

      setStep('sent');
    } catch (err) {
      console.error('[AiApplyModal] 1-Click apply error:', err);
      AppAlert.alert('Envoi impossible', err instanceof Error ? err.message : "La candidature n'a pas pu être enregistrée.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Action: Fallback Manuel WhatsApp (Native Deep-link)
  const handleManualWhatsAppApply = async () => {
    if (!result || !job) return;
    setSubmitting(true);
    try {
      const applicationId = await persistApplication();
      const rawTarget = companyWhatsapp(job.company);
      if (!rawTarget) throw new Error(`${CONTACT_UNAVAILABLE} : pas de numéro WhatsApp.`);
      const cleanTarget = cleanPhoneNumber(rawTarget);
      const pitch = buildWhatsAppPitch({
        studentName: currentProfile.fullName,
        major: currentProfile.major,
        jobTitle: job.title,
        companyName: job.company?.name || "L'Entreprise",
        letterSummary: editableLetter,
      });
      const encodedPitch = encodeURIComponent(pitch);
      const nativeScheme = `whatsapp://send?phone=${cleanTarget}&text=${encodedPitch}`;
      const webUrl = result.whatsappUrl || `https://wa.me/${cleanTarget}?text=${encodedPitch}`;

      try {
        const canOpen = await Linking.canOpenURL(nativeScheme);
        if (canOpen) {
          await Linking.openURL(nativeScheme);
        } else {
          await Linking.openURL(webUrl);
        }
      } catch {
        await Linking.openURL(webUrl);
      }

      setDispatchReceipt({
        applicationId,
        channel: 'whatsapp_manual',
        status: 'SENT_PENDING',
        appliedAt: new Date().toISOString(),
        message: 'Candidature préparée dans WhatsApp.',
        companyName: job.company?.name || 'Entreprise Partenaire',
        jobTitle: job.title,
      });
      setStep('sent');
    } catch (err) {
      console.warn('[AiApplyModal] Manual WhatsApp error:', err);
      AppAlert.alert('Envoi impossible', err instanceof Error ? err.message : "La candidature n'a pas pu être enregistrée.");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Action: Fallback Manuel Email (mailto)
  const handleManualEmailApply = async () => {
    if (!result || !job) return;
    try {
      if (!result.recipientEmail) throw new Error(`${CONTACT_UNAVAILABLE} : pas d'adresse e-mail.`);
      if (result.officialCv) {
        const missing = missingCvFields(result.officialCv);
        if (missing.length > 0) {
          AppAlert.alert('Profil incomplet', `Complète ton nom et ton contact (e-mail ou téléphone) dans ton profil avant d'envoyer ton CV. Manque : ${missing.join(', ')}.`);
          return;
        }
      }
      const companyName = job.company?.name || "L'Entreprise";
      // Enregistrée (et débitée côté serveur) avant l'envoi, comme pour les autres canaux.
      const applicationId = await persistApplication();

      // Mobile : messagerie de l'étudiant avec CV + lettre en PDF joints. Web : mailto (sans pièce jointe).
      setSubmitting(true);
      let mailResult: ApplicationMailResult;
      try {
        mailResult = await composeApplicationMail({
          to: result.recipientEmail,
          subject: decodeURIComponent(result.emailSubject),
          body:
            `Bonjour,\n\nVeuillez trouver ci-joints mon CV et ma lettre de motivation pour l'offre « ${job.title} » chez ${companyName}.\n\n` +
            `Je reste à votre disposition pour un entretien.\n\nCordialement,\n${currentProfile.fullName}` +
            (currentProfile.phoneWhatsapp ? `\n${currentProfile.phoneWhatsapp}` : ''),
          data: {
            studentName: currentProfile.fullName,
            studentEmail: currentProfile.email,
            studentPhone: currentProfile.phoneWhatsapp,
            major: currentProfile.major,
            educationLevel: currentProfile.educationLevel,
            jobTitle: job.title,
            companyName,
            letterText: editableLetter,
            cvText: editableCv,
            officialCv: result.officialCv,
          },
        });
      } finally {
        setSubmitting(false);
      }
      if (mailResult === 'cancelled') {
        AppAlert.alert('Envoi annulé', 'Ta candidature est enregistrée dans ton suivi. Tu peux la renvoyer quand tu veux.');
        return;
      }
      if (mailResult === 'unavailable') {
        const mailto = `mailto:${result.recipientEmail}?subject=${result.emailSubject}&body=${encodeURIComponent(
          editableLetter
        )}`;
        await Linking.openURL(mailto);
      }
      setDispatchReceipt({
        applicationId,
        channel: 'email_manual',
        status: 'SENT_PENDING',
        appliedAt: new Date().toISOString(),
        message:
          mailResult === 'sent'
            ? 'Candidature envoyée depuis votre messagerie, CV et lettre joints.'
            : 'Candidature ouverte dans votre messagerie (joignez votre CV).',
        companyName: job.company?.name || 'Entreprise Partenaire',
        jobTitle: job.title,
      });
      setStep('sent');
    } catch (err) {
      AppAlert.alert('Envoi impossible', err instanceof Error ? err.message : "La candidature n'a pas pu être enregistrée.");
    }
  };

  // 6. Action: Enregistrement In-App uniquement
  const handleInAppApply = async () => {
    try {
      const applicationId = await persistApplication();
      setDispatchReceipt({
        applicationId,
        channel: 'inapp',
        status: 'PENDING',
        appliedAt: new Date().toISOString(),
        message: 'Candidature enregistrée dans votre suivi.',
        companyName: job?.company?.name || 'Entreprise Partenaire',
        jobTitle: job?.title || 'Offre de stage',
      });
      setStep('sent');
    } catch (err) {
      AppAlert.alert('Erreur', err instanceof Error ? err.message : "La candidature n'a pas pu être enregistrée.");
    }
  };

  // Aliases for compatibility
  const handleOpenWhatsapp = handleManualWhatsAppApply;
  const handleOpenEmail = handleManualEmailApply;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.aiBadge}>
                  <FileText size={13} color="#A78BFA" />
                  <Text style={styles.aiBadgeText}>Dossier de candidature</Text>
                </View>

                {matchAnalysis && (
                  <View style={styles.matchBadgeTop}>
                    <Text style={styles.matchBadgeTopText}>{matchAnalysis.score}% de correspondance</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setShowPaymentModal(true)}
                  style={styles.rechargeHeaderBtn}
                  testID="btn-open-payment"
                >
                  <Text style={styles.rechargeHeaderBtnText}>Recharge MoMo</Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={styles.closeBtn}
                  testID="ai-modal-close"
                  accessibilityLabel="Fermer"
                >
                  <X size={18} color={stitchColors.inkSubtle} />
                </Pressable>
              </View>

              <Text style={styles.jobTitle} numberOfLines={1}>
                {job.title}
              </Text>
              <Text style={styles.companyName}>
                {job.company?.name} • {job.location || 'Hybride / Présentiel'}
              </Text>
            </View>

            {step !== 'sent' && (
              <View style={styles.stepper}>
                {(['Préparer', 'Vérifier', 'Envoyer'] as const).map((label, i) => {
                  const current = step === 'template' || step === 'generating' ? 0 : step === 'preview' ? 1 : 2;
                  return (
                    <View key={label} style={styles.stepperItem}>
                      <View style={[styles.stepperDot, i <= current && styles.stepperDotActive]}>
                        <Text style={[styles.stepperDotText, i <= current && styles.stepperDotTextActive]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.stepperLabel, i === current && styles.stepperLabelActive]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Étape 0 : Choix du modèle de CV et notes pour l'IA */}
            {step === 'template' && (
              <View style={styles.previewContainer}>
                <ScrollView
                  style={styles.previewScroll}
                  contentContainerStyle={styles.templateStepContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable style={styles.backgroundCard} onPress={() => setShowBackground(true)} testID="btn-open-background">
                    <View style={{ flex: 1 }}>
                      <Text style={styles.backgroundCardTitle}>
                        {backgroundCount ? 'Ton parcours est enregistré' : 'Ajoute ton parcours'}
                      </Text>
                      <Text style={styles.backgroundCardText}>
                        {backgroundCount
                          ? "L'IA reprend tes expériences, formations et langues. Touche pour les compléter."
                          : "Importe ton CV ou remplis tes expériences une fois : l'IA s'en servira à chaque candidature."}
                      </Text>
                    </View>
                    <Text style={styles.backgroundCardAction}>{backgroundCount ? 'Modifier' : 'Ajouter'}</Text>
                  </Pressable>

                  <Text style={styles.templateStepTitle}>Choisis le modèle de ton CV</Text>
                  <Text style={styles.templateStepSubtitle}>
                    L'IA le remplit avec ton profil et l'adapte à cette offre. Tu pourras encore changer de modèle avant l'envoi.
                  </Text>
                  <CvTemplateGallery value={cvTemplate} onChange={setCvTemplate} />

                  <Text style={styles.notesLabel}>Pour cette offre, à ajouter (facultatif)</Text>
                  <TextInput
                    testID="cv-notes-input"
                    style={styles.notesInput}
                    multiline
                    maxLength={4000}
                    value={cvNotes}
                    onChangeText={setCvNotes}
                    placeholder="Ce qui compte pour ce poste et n'est pas dans ton parcours. Ex : j'ai déjà utilisé Sage lors d'un projet de classe."
                    placeholderTextColor={stitchColors.inkSubtle}
                    textAlignVertical="top"
                  />
                  <Text style={styles.notesHint}>
                    L'IA n'utilise que ton profil, ton parcours et ce que tu écris ici : elle n'invente ni entreprise, ni diplôme, ni langue.
                  </Text>
                </ScrollView>
                <View style={styles.templateFooter}>
                  {mustPay && (
                    <View style={styles.payGate} testID="apply-pay-gate">
                      <Text style={styles.payGateText}>
                        Candidature : {applyPriceLabel(job)} ou {creditsLabel} • Ton solde :{' '}
                        {balanceCoins === null ? '…' : `${balanceCoins} FCFA`} • Crédits : {credits}
                      </Text>
                      <Text style={styles.payGateHint}>
                        {canAfford
                          ? "CV adapté et lettre compris. Payé une seule fois à la génération, rendu si l'IA ou l'envoi échoue."
                          : 'Recharge ton portefeuille ou prends un pack pour que l’IA rédige ton CV et ta lettre.'}
                      </Text>
                      <Pressable onPress={() => setShowOffers(true)} testID="btn-open-packs">
                        <Text style={styles.payGateLink}>Packs : 5 candidatures pour 1 000 F, 12 pour 2 000 F</Text>
                      </Pressable>
                    </View>
                  )}
                  <Pressable
                    testID="btn-generate-cv"
                    style={({ pressed }) => [styles.primaryOneClickBtn, styles.generateCvBtn, pressed && { opacity: 0.9 }]}
                    onPress={canAfford ? startGeneration : () => setShowPaymentModal(true)}
                  >
                    <Sparkles size={16} color={stitchColors.white} />
                    <Text style={styles.primaryOneClickBtnText}>
                      {canAfford
                        ? mustPay
                          ? paysWithCredits
                            ? `Utiliser ${creditsLabel} et générer`
                            : `Payer ${applyPriceLabel(job)} et générer`
                          : 'Générer mon CV et ma lettre'
                        : 'Recharger mon portefeuille'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Étape 1 : Génération & Analyse de correspondance */}
            {step === 'generating' && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingOrb}>
                  <ActivityIndicator size="large" color={stitchColors.primary} />
                </View>
                <Text style={styles.loadingTitle}>Préparation de votre dossier</Text>
                <Text style={styles.loadingSubtitle}>{progressMsg}</Text>

                {matchAnalysis && (
                  <View style={styles.matchBriefCard}>
                    <View style={styles.matchBriefHeader}>
                      <Text style={styles.matchBriefTitle}>
                        Correspondance de profil : {matchAnalysis.score}%
                      </Text>
                    </View>
                    {matchAnalysis.matchedPoints.slice(0, 2).map((point, idx) => (
                      <View key={idx} style={styles.matchPointRow}>
                        <CheckCircle2 size={13} color={stitchColors.emeraldDeep} />
                        <Text style={styles.matchPointText}>{point}</Text>
                      </View>
                    ))}
                    <Text style={styles.matchAdviceText}>
                      Conseil : {matchAnalysis.strategicAdvice}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Étape 2 : Prévisualisation, Onglets, Édition & Sorties */}
            {step === 'preview' && result && (
              <View style={styles.previewContainer}>
                {/* Tab Bar */}
                <View style={styles.tabBar}>
                  <View style={styles.tabGroup}>
                    <Pressable
                      testID="tab-letter"
                      style={[styles.tabBtn, activePreviewTab === 'letter' && styles.tabBtnActive]}
                      onPress={() => setActivePreviewTab('letter')}
                    >
                      <FileText
                        size={14}
                        color={activePreviewTab === 'letter' ? stitchColors.white : stitchColors.inkSubtle}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activePreviewTab === 'letter' && styles.tabBtnTextActive,
                        ]}
                      >
                        Lettre
                      </Text>
                    </Pressable>

                    <Pressable
                      testID="tab-cv"
                      style={[styles.tabBtn, activePreviewTab === 'cv' && styles.tabBtnActive]}
                      onPress={() => setActivePreviewTab('cv')}
                    >
                      <Building2
                        size={14}
                        color={activePreviewTab === 'cv' ? stitchColors.white : stitchColors.inkSubtle}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activePreviewTab === 'cv' && styles.tabBtnTextActive,
                        ]}
                      >
                        CV
                      </Text>
                    </Pressable>

                    <Pressable
                      testID="tab-match"
                      style={[styles.tabBtn, activePreviewTab === 'match' && styles.tabBtnActive]}
                      onPress={() => setActivePreviewTab('match')}
                    >
                      <ShieldCheck
                        size={14}
                        color={activePreviewTab === 'match' ? stitchColors.white : stitchColors.inkSubtle}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activePreviewTab === 'match' && styles.tabBtnTextActive,
                        ]}
                      >
                        Correspondance
                      </Text>
                    </Pressable>
                  </View>

                  {activePreviewTab !== 'match' && (
                    <Pressable
                      style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
                      onPress={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 size={13} color={isEditing ? stitchColors.white : '#A78BFA'} />
                      <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                        {isEditing ? 'Voir le rendu' : activePreviewTab === 'cv' ? 'Modifier le CV' : 'Modifier la lettre'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* AI Quick Reformulation Toolbar (Lettre) */}
                {activePreviewTab === 'letter' && !isEditing && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.aiToolbarScroll}
                    contentContainerStyle={styles.aiToolbarContent}
                  >
                    <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('formal')}>
                      <Text style={styles.aiPillText}>Plus formel</Text>
                    </Pressable>
                    <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('concise')}>
                      <Text style={styles.aiPillText}>Plus concis</Text>
                    </Pressable>
                    <Pressable style={styles.aiPill} onPress={() => handleReformulateTone('impact')}>
                      <Text style={styles.aiPillText}>Compétences clés</Text>
                    </Pressable>
                  </ScrollView>
                )}

                {/* Main Content Area */}
                {activePreviewTab === 'cv' && !isEditing && result.officialCv ? (
                  <View style={styles.cvPreviewArea}>
                    {cvAiNotice && <Text style={styles.cvAiNotice}>{cvAiNotice}</Text>}
                    <CvTemplateGallery layout="strip" value={cvTemplate} onChange={setCvTemplate} />
                    <View style={styles.cvPreviewPage}>
                      <CvTemplatePreview cv={result.officialCv} template={cvTemplate} />
                    </View>
                  </View>
                ) : (
                <ScrollView
                  style={styles.previewScroll}
                  contentContainerStyle={styles.previewScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {activePreviewTab === 'match' && matchAnalysis ? (
                    <View style={styles.matchTabCard}>
                      <View style={styles.matchHeaderScore}>
                        <Text style={styles.matchScoreBig}>{matchAnalysis.score}%</Text>
                        <Text style={styles.matchScoreHeadline}>{matchAnalysis.headline}</Text>
                      </View>

                      <View style={styles.divider} />

                      <Text style={styles.matchSectionTitle}>Points forts du profil :</Text>
                      {matchAnalysis.matchedPoints.map((p, i) => (
                        <View key={i} style={styles.matchPointItem}>
                          <CheckCircle2 size={15} color={stitchColors.emeraldDeep} />
                          <Text style={styles.matchPointItemText}>{p}</Text>
                        </View>
                      ))}

                      <View style={styles.strategicBox}>
                        <Text style={styles.strategicTitle}>Stratégie recommandée</Text>
                        <Text style={styles.strategicText}>{matchAnalysis.strategicAdvice}</Text>
                      </View>
                    </View>
                  ) : isEditing && activePreviewTab === 'cv' && result.officialCv ? (
                    <CvEditor
                      cv={result.officialCv}
                      onChange={(officialCv) => {
                        setResult((current) => (current ? { ...current, officialCv } : current));
                        setEditableCv(buildCvText(officialCv));
                      }}
                    />
                  ) : isEditing ? (
                    <TextInput
                      style={styles.editorTextInput}
                      multiline
                      value={activePreviewTab === 'letter' ? editableLetter : editableCv}
                      onChangeText={
                        activePreviewTab === 'letter' ? setEditableLetter : setEditableCv
                      }
                      placeholderTextColor={stitchColors.inkMuted}
                    />
                  ) : (
                    <Text style={styles.previewText}>
                      {activePreviewTab === 'letter' ? editableLetter : editableCv}
                    </Text>
                  )}
                </ScrollView>
                )}

                {/* Vérifier -> Envoyer : l'envoi a son propre écran, plus rien ne s'empile ici. */}
                {!isEditing && (
                  <View style={styles.stepFooter}>
                    <Pressable
                      style={({ pressed }) => [styles.footerSecondaryBtn, pressed && { opacity: 0.85 }]}
                      onPress={handleDownloadPdf}
                      disabled={downloadingPdf}
                    >
                      {downloadingPdf ? (
                        <ActivityIndicator size="small" color={stitchColors.primary} />
                      ) : (
                        <Download size={16} color={stitchColors.primary} />
                      )}
                      <Text style={styles.footerSecondaryBtnText}>PDF</Text>
                    </Pressable>
                    <Pressable
                      testID="btn-go-send"
                      style={({ pressed }) => [styles.primaryOneClickBtn, styles.footerPrimaryBtn, pressed && { opacity: 0.9 }]}
                      onPress={() => setStep('send')}
                    >
                      <Text style={styles.primaryOneClickBtnText}>Continuer vers l'envoi</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Étape 3 : Envoi (canal, copie du texte, suivi) */}
            {step === 'send' && result && (
              <View style={styles.previewContainer}>
                <ScrollView style={styles.previewScroll} contentContainerStyle={styles.sendStepContent}>
                  <Pressable style={styles.backLink} onPress={() => setStep('preview')} hitSlop={8}>
                    <Text style={styles.backLinkText}>‹ Revenir à mon CV et ma lettre</Text>
                  </Pressable>
                {/* Quick Utility Actions Row: Copier WhatsApp & Télécharger PDF */}
                <View style={styles.utilRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.utilBtn,
                      copiedPitch && styles.utilBtnSuccess,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={handleCopyPitchForWhatsapp}
                  >
                    {copiedPitch ? (
                      <Check size={14} color={stitchColors.emerald} />
                    ) : (
                      <Copy size={14} color="#A78BFA" />
                    )}
                    <Text style={[styles.utilBtnText, copiedPitch && { color: stitchColors.emerald }]}>
                      {copiedPitch ? 'Texte copié' : 'Copier le texte'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.utilBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? (
                      <ActivityIndicator size="small" color="#A78BFA" />
                    ) : (
                      <Download size={14} color="#A78BFA" />
                    )}
                    <Text style={styles.utilBtnText}>Télécharger le PDF</Text>
                  </Pressable>
                </View>

                {/* Actions Box: Canaux d'expédition et 1-Clic */}
                <View style={styles.actionsBox}>
                  <Text style={styles.actionsTitle}>Canal d'expédition :</Text>
                  <Text style={styles.applyPriceBanner} testID="apply-modal-price">
                    {jobApplyPrice(job) === 0
                      ? 'Cette candidature est gratuite.'
                      : `Cette candidature coûte ${applyPriceLabel(job)} ou ${creditsLabel} (${jobIsPaid(job) ? 'offre rémunérée' : 'offre non rémunérée'}), déjà réglée à la génération : l'envoi ne coûte rien de plus.`}
                  </Text>

                  {/* Segmented Channel Selector */}
                  <View style={styles.channelSegmentContainer}>
                    <Pressable
                      testID="channel-tab-whatsapp"
                      style={[
                        styles.channelSegmentPill,
                        selectedChannel === 'whatsapp' && styles.channelSegmentPillActiveWhatsApp,
                      ]}
                      onPress={() => setSelectedChannel('whatsapp')}
                    >
                      <MessageSquare
                        size={14}
                        color={selectedChannel === 'whatsapp' ? '#34D399' : stitchColors.inkSubtle}
                      />
                      <Text
                        style={[
                          styles.channelSegmentText,
                          selectedChannel === 'whatsapp' && styles.channelSegmentTextActiveWhatsApp,
                        ]}
                      >
                        WhatsApp
                      </Text>
                    </Pressable>

                    <Pressable
                      testID="channel-tab-email"
                      style={[
                        styles.channelSegmentPill,
                        selectedChannel === 'email' && styles.channelSegmentPillActiveEmail,
                      ]}
                      onPress={() => setSelectedChannel('email')}
                    >
                      <Mail
                        size={14}
                        color={selectedChannel === 'email' ? '#A78BFA' : stitchColors.inkSubtle}
                      />
                      <Text
                        style={[
                          styles.channelSegmentText,
                          selectedChannel === 'email' && styles.channelSegmentTextActiveEmail,
                        ]}
                      >
                        Email RH ✉️
                      </Text>
                    </Pressable>
                  </View>

                  {/* Dynamic Action Box based on Channel & Pairing status */}
                  {(selectedChannel === 'whatsapp' ? !companyWhatsapp(job?.company) : !companyEmail(job?.company)) ? (
                    <Text style={styles.subHintText}>
                      {CONTACT_UNAVAILABLE} pour ce canal : {selectedChannel === 'whatsapp' ? 'pas de numéro WhatsApp' : "pas d'adresse e-mail"}. Tu peux enregistrer la candidature dans ton suivi.
                    </Text>
                  ) : null}
                  {selectedChannel === 'whatsapp' ? (
                    <View style={styles.oneClickBox}>
                      {/* TEMPORAIREMENT AJUSTÉ en attendant l'API officielle WhatsApp Cloud :
                          Bouton d'appairage Evolution API et bouton d'envoi automatique en arrière-plan
                          masqués pour préserver le numéro de téléphone contre les risques de ban.
                          L'envoi s'effectue via l'application WhatsApp officielle (wa.me)
                          ou par enregistrement dans le suivi in-app. Toute la logique sous-jacente est conservée. */}
                      <Pressable
                        testID="btn-fallback-manual-whatsapp"
                        style={({ pressed }) => [styles.primaryOneClickBtn, pressed && { opacity: 0.9 }]}
                        onPress={handleManualWhatsAppApply}
                        disabled={submitting || !companyWhatsapp(job?.company)}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color={stitchColors.white} />
                        ) : (
                          <>
                            <MessageSquare size={16} color={stitchColors.white} />
                            <Text style={styles.primaryOneClickBtnText}>
                              💬 Ouvrir WhatsApp & Envoyer ma Candidature
                            </Text>
                          </>
                        )}
                      </Pressable>
                      <View style={styles.secondaryActionsRow}>
                        <Pressable
                          testID="btn-apply-inapp"
                          style={styles.textFallbackBtn}
                          onPress={handleInAppApply}
                          disabled={submitting}
                        >
                          <Text style={styles.textFallbackBtnText}>📁 Suivi in-app uniquement</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.subHintText}>
                        Votre candidature et votre pitch sont pré-remplis pour un envoi sécurisé via votre application WhatsApp officielle.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emailBox}>
                      {/* Mobile : l'étudiant envoie depuis sa propre messagerie (CV + lettre joints),
                          l'envoi par Campus 360 (n8n) reste en option. Web : pas de pièce jointe
                          possible en mailto, l'envoi par Campus 360 reste le bouton principal. */}
                      <Pressable
                        testID={studentMailFirst ? 'btn-fallback-manual-email' : 'btn-apply-email-dispatch'}
                        style={({ pressed }) => [styles.primaryEmailBtn, pressed && { opacity: 0.9 }]}
                        onPress={studentMailFirst ? handleManualEmailApply : () => handleOneClickApply('email')}
                        disabled={submitting || !companyEmail(job?.company)}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color={stitchColors.white} />
                        ) : (
                          <>
                            <Mail size={16} color={stitchColors.white} />
                            <Text style={styles.primaryEmailBtnText}>
                              {studentMailFirst ? '✉️ Envoyer depuis ma messagerie' : '✉️ Expédier ma Candidature par Email'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                      <View style={styles.secondaryActionsRow}>
                        <Pressable
                          testID={studentMailFirst ? 'btn-apply-email-dispatch' : 'btn-fallback-manual-email'}
                          style={styles.textFallbackBtn}
                          onPress={studentMailFirst ? () => handleOneClickApply('email') : handleManualEmailApply}
                          disabled={submitting || !companyEmail(job?.company)}
                        >
                          <Text style={styles.textFallbackBtnText}>
                            {studentMailFirst ? "🤖 Laisser Campus 360 l'envoyer pour moi" : '📧 Ouvrir ma messagerie (mailto)'}
                          </Text>
                        </Pressable>
                        <Pressable
                          testID="btn-apply-inapp"
                          style={styles.textFallbackBtn}
                          onPress={handleInAppApply}
                          disabled={submitting}
                        >
                          <Text style={styles.textFallbackBtnText}>📁 Suivi in-app uniquement</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.subHintText}>
                        {studentMailFirst
                          ? "Ta messagerie s'ouvre avec ton CV et ta lettre en PDF : il ne te reste qu'à appuyer sur Envoyer. Le recruteur te répondra directement."
                          : 'Expédition sécurisée avec CV officiel PDF joint via SMTP N8N.'}
                      </Text>
                    </View>
                  )}
                </View>
                </ScrollView>
              </View>
            )}

            {/* Étape 4 : Confirmation & Accusé de réception officiel */}
            {step === 'sent' && (
              <View style={styles.receiptContainer}>
                <View style={styles.receiptIconCircle}>
                  <CheckCircle2 size={40} color={stitchColors.emerald} />
                </View>
                <Text style={styles.receiptTitle}>
                  {dispatchReceipt?.channel === 'whatsapp' || dispatchReceipt?.channel === 'email'
                    ? 'Candidature transmise'
                    : 'Candidature enregistrée'}
                </Text>
                <Text style={styles.receiptSubtitle}>
                  {dispatchReceipt?.channel === 'whatsapp' || dispatchReceipt?.channel === 'email'
                    ? dispatchReceipt.status === 'DELIVERED'
                      ? 'Ton dossier a été délivré au recruteur.'
                      : "Ton dossier est en cours d'acheminement vers le recruteur."
                    : 'Ta candidature est dans ton suivi. Pense à envoyer le message au recruteur.'}
                </Text>

                {/* Carte Accusé de Réception Officiel */}
                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Référence :</Text>
                    <Text style={styles.receiptValueBold}>
                      {dispatchReceipt?.applicationId ? `CAMPUS-${dispatchReceipt.applicationId.replace(/[^a-zA-Z0-9]/g, '').slice(-7).toUpperCase()}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Poste :</Text>
                    <Text style={styles.receiptValue} numberOfLines={1}>
                      {dispatchReceipt?.jobTitle || job?.title}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Entreprise :</Text>
                    <Text style={styles.receiptValue} numberOfLines={1}>
                      {dispatchReceipt?.companyName || job?.company?.name || "L'Entreprise"}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Canal :</Text>
                    <Text style={styles.receiptValueChannel}>
                      {dispatchReceipt?.channel === 'whatsapp'
                        ? '⚡ WhatsApp (Automatique)'
                        : dispatchReceipt?.channel === 'email'
                        ? '✉️ Email RH (Automatique)'
                        : dispatchReceipt?.channel === 'whatsapp_manual'
                        ? '💬 WhatsApp (Manuel)'
                        : dispatchReceipt?.channel === 'email_manual'
                        ? '📧 Email RH (Manuel)'
                        : '📁 In-App'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Statut :</Text>
                    <View style={styles.receiptStatusBadge}>
                      <Text style={styles.receiptStatusBadgeText}>
                        {dispatchReceipt?.status === 'DELIVERED'
                          ? 'Délivrée'
                          : "En cours d'acheminement · SENT_PENDING"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Relance :</Text>
                    <Text style={styles.receiptValueMuted}>Prévue à J+7 en l'absence de réponse</Text>
                  </View>
                </View>

                <Pressable
                  testID="btn-receipt-timeline"
                  style={styles.receiptTimelineBtn}
                  onPress={() => {
                    onClose();
                    onApplicationComplete?.();
                  }}
                >
                  <Text style={styles.receiptTimelineBtnText}>📋 Voir dans mon Suivi de Candidatures</Text>
                </Pressable>

                <Pressable
                  testID="ai-modal-done"
                  style={styles.receiptCloseBtn}
                  onPress={() => {
                    onClose();
                    onApplicationComplete?.();
                  }}
                >
                  <Text style={styles.receiptCloseBtnText}>Fermer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Express si profil incomplet */}
      <StudentProfileExpressModal
        visible={showExpressModal}
        initialFullName={currentProfile.fullName}
        initialPhoneWhatsapp={currentProfile.phoneWhatsapp}
        initialUniversity={currentProfile.university || ''}
        initialMajor={currentProfile.major}
        initialLevel={currentProfile.educationLevel}
        initialSkills={currentProfile.skills}
        onClose={() => {
          setShowExpressModal(false);
          onClose();
        }}
        onSaveAndContinue={handleExpressProfileSaved}
      />

      <CvBackgroundScreen
        visible={showBackground}
        onClose={() => setShowBackground(false)}
        onSaved={(b) => setBackgroundCount(cvBackgroundFilledCount(b))}
      />

      <OffersModal
        visible={showOffers}
        focus="pack"
        reasonMessage="Un pack donne des crédits de candidature valables 30 jours : 1 crédit par offre non rémunérée, 2 par offre rémunérée."
        onClose={() => setShowOffers(false)}
        onPurchased={(state) => {
          setCredits(state.credits);
          void refreshBalance();
        }}
      />

      {/* Modal Paiement Mobile Money si solde épuisé */}
      <PaymentModal
        visible={showPaymentModal}
        defaultPhone={currentProfile.phoneWhatsapp || ''}
        reasonMessage={`Candidature (${job ? applyPriceLabel(job) : ''}). Recharge ton portefeuille Mobile Money pour continuer.`}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={async () => {
          setShowPaymentModal(false);
          await refreshBalance();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: stitchColors.white, // Clean White
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    // Fixed height so each step's scroll area and footer get the room they need on phones;
    // capped width keeps it readable on tablets and the web.
    height: '94%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.paperSoft,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  aiBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  matchBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchBadgeTopText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  rechargeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  rechargeHeaderBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  companyName: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  // Loading Screen
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  loadingOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  matchBriefCard: {
    width: '100%',
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  matchBriefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  matchBriefTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  matchPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchPointText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkSoft,
    flex: 1,
  },
  matchAdviceText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: stitchColors.primary,
    marginTop: 4,
    fontWeight: '500',
  },

  // Preview Container
  previewContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.paperSoft,
  },
  tabGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  tabBtnActive: {
    backgroundColor: stitchColors.primary,
    borderColor: stitchColors.primary,
  },
  tabBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  tabBtnTextActive: {
    color: stitchColors.white,
    fontWeight: '700',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  editToggleBtnActive: {
    backgroundColor: stitchColors.primary,
    borderColor: stitchColors.primary,
  },
  editToggleText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '600',
    color: stitchColors.primary,
  },
  editToggleTextActive: {
    color: stitchColors.white,
  },

  // AI Toolbar
  aiToolbarScroll: {
    maxHeight: 38,
    marginBottom: 6,
    marginTop: 4,
  },
  aiToolbarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  aiPillText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
  },

  // Text Content
  previewScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewScrollContent: {
    paddingVertical: 10,
  },
  templateStepContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  templateStepTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 18,
    color: stitchColors.ink,
  },
  templateStepSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 19,
    color: stitchColors.inkMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  notesLabel: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 13.5,
    color: stitchColors.ink,
    marginTop: 20,
    marginBottom: 6,
  },
  notesInput: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.sm,
    backgroundColor: stitchColors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamilies.inter,
    fontSize: 13.5,
    lineHeight: 19,
    color: stitchColors.ink,
  },
  notesHint: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    lineHeight: 16,
    color: stitchColors.inkMuted,
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.paperSoft,
  },
  stepperItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.paperSoft,
  },
  stepperDotActive: { backgroundColor: stitchColors.primary },
  stepperDotText: { fontSize: 11, fontWeight: '700', color: stitchColors.inkMuted },
  stepperDotTextActive: { color: stitchColors.white },
  stepperLabel: { flexShrink: 1, fontSize: 12, color: stitchColors.inkMuted, fontWeight: '600' },
  stepperLabelActive: { color: stitchColors.ink },
  backgroundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 18,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.primary,
    backgroundColor: stitchColors.siennaBg,
  },
  backgroundCardTitle: { fontSize: 15, fontWeight: '700', color: stitchColors.ink },
  backgroundCardText: { marginTop: 3, fontSize: 13, lineHeight: 18, color: stitchColors.inkMuted },
  backgroundCardAction: { fontSize: 14, fontWeight: '700', color: stitchColors.primary },
  stepFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: stitchColors.outlineVariant,
  },
  footerSecondaryBtn: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: stitchRadius.button,
    borderWidth: 1,
    borderColor: stitchColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerSecondaryBtnText: { color: stitchColors.primary, fontSize: 14, fontWeight: '700' },
  footerPrimaryBtn: { flex: 1, minHeight: 50, marginTop: 0 },
  sendStepContent: { padding: 16, paddingBottom: 24 },
  backLink: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 8 },
  backLinkText: { color: stitchColors.primary, fontSize: 14, fontWeight: '600' },
  templateFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: stitchColors.outlineVariant,
  },
  payGate: {
    marginBottom: 10,
    gap: 2,
  },
  payGateText: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  payGateHint: {
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  payGateLink: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.sienna,
    marginTop: 4,
  },
  cvPreviewArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  cvAiNotice: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 17,
    color: stitchColors.warningDeep,
    backgroundColor: stitchColors.warningBg,
    borderRadius: stitchRadius.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cvPreviewPage: {
    flex: 1,
    minHeight: 260,
    borderRadius: stitchRadius.DEFAULT,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
  },
  previewText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13.5,
    lineHeight: 22,
    color: '#1E293B',
    backgroundColor: stitchColors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  editorTextInput: {
    fontFamily: fontFamilies.inter,
    fontSize: 13.5,
    lineHeight: 22,
    color: stitchColors.ink,
    backgroundColor: stitchColors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: stitchColors.primary,
    minHeight: 220,
    textAlignVertical: 'top',
  },

  // Match Tab
  matchTabCard: {
    backgroundColor: stitchColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 16,
  },
  matchHeaderScore: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 10,
  },
  matchScoreBig: {
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    fontWeight: '800',
    color: stitchColors.primary,
  },
  matchScoreHeadline: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: stitchColors.glassBorder,
    marginVertical: 12,
  },
  matchSectionTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 8,
  },
  matchPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  matchPointItemText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    lineHeight: 18,
    color: stitchColors.inkSoft,
    flex: 1,
  },
  strategicBox: {
    marginTop: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    borderRadius: 10,
    padding: 12,
  },
  strategicTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.primary,
    marginBottom: 4,
  },
  strategicText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 17,
    color: '#4C1D95',
  },

  // Utility row (Copier WhatsApp & Télécharger PDF)
  utilRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  utilBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingVertical: 10,
    borderRadius: 10,
  },
  utilBtnSuccess: {
    borderColor: stitchColors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  utilBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkSoft,
  },

  // Actions Box & Channel Selector
  actionsBox: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: stitchColors.paperSoft,
  },
  actionsTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '600',
    color: stitchColors.inkMuted,
    marginBottom: 8,
  },
  channelSegmentContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  channelSegmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  channelSegmentPillActiveWhatsApp: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: stitchColors.emerald,
  },
  channelSegmentPillActiveEmail: {
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    borderColor: stitchColors.primary,
  },
  channelSegmentText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  channelSegmentTextActiveWhatsApp: {
    color: stitchColors.emeraldDeep,
    fontWeight: '700',
  },
  channelSegmentTextActiveEmail: {
    color: stitchColors.primary,
    fontWeight: '700',
  },

  // 1-Click WhatsApp Box
  oneClickBox: {
    gap: 8,
  },
  linkedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  linkedBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: stitchColors.emeraldDeep,
    fontWeight: '600',
  },
  primaryOneClickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.emeraldDeep,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: stitchColors.emerald,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  generateCvBtn: {
    backgroundColor: stitchColors.primary,
    shadowColor: stitchColors.primary,
  },
  primaryOneClickBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.white,
  },

  // Unlinked WhatsApp Box
  unlinkedBox: {
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  unlinkedWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlinkedWarningTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.warning,
  },
  unlinkedWarningDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#475569',
  },
  unlinkedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pairingOfferBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: stitchColors.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pairingOfferBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.white,
  },
  manualFallbackBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.white,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingVertical: 10,
    borderRadius: 10,
  },
  manualFallbackBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '600',
    color: stitchColors.inkSoft,
    textAlign: 'center',
  },

  // Email Box
  emailBox: {
    gap: 8,
  },
  primaryEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: stitchColors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: stitchColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryEmailBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14,
    fontWeight: '700',
    color: stitchColors.white,
  },

  // Secondary text buttons row
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  textFallbackBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  textFallbackBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: stitchColors.inkMuted,
    textDecorationLine: 'underline',
  },
  applyPriceBanner: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.sienna,
    marginBottom: 8,
  },
  subHintText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    color: stitchColors.inkSubtle,
    textAlign: 'center',
    marginTop: 2,
  },

  // Legacy channel styles for compatibility
  channelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  channelBtnInApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: stitchColors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelBtnWhatsapp: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: stitchColors.emeraldDeep,
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelBtnEmail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: stitchColors.background,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  channelBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '600',
    color: stitchColors.white,
  },
  savedHint: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginTop: 8,
  },

  // Rich Receipt Confirmation View
  receiptContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  receiptIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 18,
    fontWeight: '800',
    color: stitchColors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: stitchColors.inkMuted,
  },
  receiptValue: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.ink,
    maxWidth: '65%',
    textAlign: 'right',
    fontWeight: '500',
  },
  receiptValueBold: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  receiptValueChannel: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '600',
    color: stitchColors.emeraldDeep,
  },
  receiptStatusBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptStatusBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    color: '#60A5FA',
    fontWeight: '600',
  },
  receiptValueMuted: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: stitchColors.inkSubtle,
    fontStyle: 'italic',
  },
  receiptTimelineBtn: {
    width: '100%',
    backgroundColor: stitchColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptTimelineBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '600',
    color: stitchColors.white,
  },
  receiptCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  receiptCloseBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },

  // Sent Confirmation
  sentContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  sentIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sentTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 19,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  sentDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 19,
    color: stitchColors.inkMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: stitchColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  doneBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '500',
    color: stitchColors.white,
  },

  // Official CV Card Preview styles (Gabarit 2 Colonnes)
});
