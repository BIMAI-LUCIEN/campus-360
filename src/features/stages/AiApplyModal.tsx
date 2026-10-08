import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
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
} from 'lucide-react-native';
import type { StageJob, OfficialCvData } from '../../types';
import {
  generateIaApplication,
  submitStageApplication,
  dispatchStageApplication,
  type GeneratedApplicationResult,
} from './stagesApi';
import { analyzeJobMatch, type MatchAnalysis } from './aiMatchEngine';
import { exportApplicationPdf, buildWhatsAppPitch, generateCvPdfBase64 } from './pdfExportService';
import { StudentProfileExpressModal } from './StudentProfileExpressModal';
import { PaymentModal } from '../wallet/PaymentModal';
import { WhatsAppPairingModal } from '../whatsapp/WhatsAppPairingModal';
import { getStoredWhatsAppStatus, cleanPhoneNumber } from '../whatsapp/whatsappService';
import { stitchColors, fontFamilies, stitchRadius } from '../../theme/stitch';

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
}

function OfficialCvCardPreview({ cv }: { cv: OfficialCvData }) {
  const nom = cv.detailsPersonnels.nom.toUpperCase();
  const prenom = cv.detailsPersonnels.prenom;

  return (
    <View style={styles.officialCvBox}>
      {/* En-tête avec nom et photo */}
      <View style={styles.officialCvHeaderRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.officialCvFullName}>{nom} {prenom}</Text>
          <Text style={styles.officialCvJobTitle}>{cv.titrePoste}</Text>
        </View>
        <View style={styles.officialCvPhotoFrame}>
          <Text style={styles.officialCvPhotoInitials}>
            {nom.slice(0, 1)}{prenom.slice(0, 1)}
          </Text>
        </View>
      </View>

      <View style={styles.officialCvBlueDivider} />

      {/* 1. Détails personnels */}
      <Text style={styles.officialCvSectionHeader}>Détails personnels</Text>
      <View style={styles.officialCvTwoCols}>
        <View style={{ flex: 1 }}>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Nom : </Text>{cv.detailsPersonnels.nom}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Prénom : </Text>{cv.detailsPersonnels.prenom}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Nationalité : </Text>{cv.detailsPersonnels.nationalite}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Âge : </Text>{cv.detailsPersonnels.age}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.officialCvField} numberOfLines={1}>
            <Text style={styles.officialCvLabel}>Email : </Text>{cv.detailsPersonnels.email}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Tél : </Text>{cv.detailsPersonnels.telephone}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Adresse : </Text>{cv.detailsPersonnels.adresse}
          </Text>
        </View>
      </View>

      {/* 2. Expérience professionnelle */}
      <Text style={styles.officialCvSectionHeader}>Expérience professionnelle</Text>
      {cv.experiences.map((exp, idx) => (
        <View key={idx} style={styles.officialCvBlock}>
          <Text style={styles.officialCvItemTitle}>{exp.poste}</Text>
          <View style={styles.officialCvRowBetween}>
            <Text style={styles.officialCvItemSubtitle}>{exp.entreprise}, {exp.ville}</Text>
            <Text style={styles.officialCvItemDate}>{exp.periode}</Text>
          </View>
          {exp.missions.map((m, mIdx) => (
            <Text key={mIdx} style={styles.officialCvBullet}>• {m}</Text>
          ))}
        </View>
      ))}

      {/* 3. Formation */}
      <Text style={styles.officialCvSectionHeader}>Formation</Text>
      {cv.formations.map((form, idx) => (
        <View key={idx} style={styles.officialCvBlock}>
          <View style={styles.officialCvRowBetween}>
            <Text style={styles.officialCvItemTitle}>{form.diplome}</Text>
            <Text style={styles.officialCvItemDate}>{form.periode}</Text>
          </View>
          <Text style={styles.officialCvItemSubtitle}>{form.etablissement}, {form.ville}</Text>
        </View>
      ))}

      {/* 4. Compétences */}
      <Text style={styles.officialCvSectionHeader}>Compétences</Text>
      <Text style={styles.officialCvSubheading}>Compétences professionnelles</Text>
      {cv.competences.professionnelles.map((comp, idx) => (
        <Text key={idx} style={styles.officialCvBullet}>• {comp}</Text>
      ))}

      <Text style={styles.officialCvSubheading}>Habilités personnelles et relationnelles :</Text>
      <Text style={styles.officialCvInlineText}>
        {cv.competences.habilitesRelationnelles.join(', ')}
      </Text>

      <Text style={styles.officialCvSubheading}>Maîtrise des logiciels</Text>
      {cv.competences.logiciels.map((log, idx) => (
        <Text key={idx} style={styles.officialCvBullet}>
          • {log.categorie ? `${log.categorie} : ` : ''}{log.items.join(', ')}
        </Text>
      ))}

      {/* 5. Langues */}
      <Text style={styles.officialCvSectionHeader}>Langues</Text>
      {cv.langues.map((l, idx) => (
        <Text key={idx} style={styles.officialCvInlineText}>
          {l.langue}: {l.niveau}
        </Text>
      ))}

      {/* 6. Autres informations importantes */}
      <Text style={styles.officialCvSectionHeader}>Autres informations importantes</Text>
      <Text style={styles.officialCvInlineText}>
        Loisirs : {cv.loisirs.join(', ')}
      </Text>

      <Text style={styles.officialCvPageNumber}>1</Text>
    </View>
  );
}

export function AiApplyModal({
  visible,
  job,
  studentProfile,
  onClose,
  onApplicationComplete,
  onRecharge,
}: AiApplyModalProps) {
  const [step, setStep] = useState<'generating' | 'preview' | 'sent'>('generating');
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

  // 1-Click Apply & WhatsApp Session State
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isWhatsAppLinked, setIsWhatsAppLinked] = useState<boolean>(false);
  const [linkedPhone, setLinkedPhone] = useState<string>('');
  const [showPairingModal, setShowPairingModal] = useState<boolean>(false);
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

  // Synchronise le statut de jumelage WhatsApp et sélectionne le canal par défaut
  useEffect(() => {
    let isMounted = true;
    if (visible && job) {
      if (job.applyMethod === 'EMAIL') {
        setSelectedChannel('email');
      } else {
        setSelectedChannel('whatsapp');
      }

      getStoredWhatsAppStatus().then((status) => {
        if (!isMounted) return;
        setIsWhatsAppLinked(Boolean(status.connected));
        setLinkedPhone(status.phone || currentProfile.phoneWhatsapp || '');
      });
    }
    return () => {
      isMounted = false;
    };
  }, [visible, job, currentProfile.phoneWhatsapp]);

  // Compute Match Analysis
  const matchAnalysis: MatchAnalysis | null = useMemo(() => {
    if (!job) return null;
    return analyzeJobMatch(job, currentProfile);
  }, [job, currentProfile]);

  // Check if profile is missing essentials
  const isProfileIncomplete = useMemo(() => {
    return (
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
      const applicationId = await submitStageApplication(job.id, editableCv, editableLetter, result.officialCv);
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

      // If student has 0 tokens, prompt Mobile Money payment modal
      if (currentProfile.tokens !== undefined && currentProfile.tokens <= 0) {
        setShowPaymentModal(true);
        return;
      }

      setStep('generating');
      setResult(null);
      setIsEditing(false);
      setCopiedPitch(false);

      const t1 = setTimeout(() => {
        setProgressMsg('Rédaction du CV et de la lettre personnalisée...');
      }, 700);

      const t2 = setTimeout(() => {
        setProgressMsg('Mise en page et alignement avec les critères du poste...');
      }, 1400);

      generateIaApplication(job, currentProfile)
        .then((res) => {
          setResult(res);
          setEditableLetter(res.letterText);
          setEditableCv(res.cvText);
          setStep('preview');
        })
        .catch(() => {
          Alert.alert('Erreur', 'Impossible de générer la candidature. Réessayez.');
          onClose();
        });

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [visible, job, currentProfile, isProfileIncomplete]);

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
    setCurrentProfile((prev) => ({
      ...prev,
      fullName: data.fullName || prev.fullName,
      phoneWhatsapp: data.phoneWhatsapp || prev.phoneWhatsapp,
      university: data.university,
      major: data.major,
      educationLevel: data.level,
      skills: data.skills,
    }));
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
      Alert.alert('Ton formel appliqué', 'Formules protocolaires professionnelles insérées.');
    } else if (tone === 'concise') {
      setEditableLetter((prev) =>
        prev.split('\n\n').slice(0, 3).join('\n\n') +
        '\n\nRestant à votre entière disposition pour échanger lors d’un entretien.'
      );
      Alert.alert('Version concise', 'Format direct en 3 paragraphes opérationnels.');
    } else if (tone === 'impact') {
      const skillsHighlight = currentProfile.skills.slice(0, 3).join(', ');
      setEditableLetter((prev) =>
        prev + `\n\nCompétences clés directement opérationnelles : ${skillsHighlight}.`
      );
      Alert.alert('Compétences mises en avant', 'Compétences clés insérées dans le corps du texte.');
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
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 3. Action: 1-Click Background Apply (WhatsApp or Email via /api/mobile/stages/dispatch)
  const handleOneClickApply = async (channel: 'whatsapp' | 'email') => {
    if (!result || !job) return;
    setSubmitting(true);
    try {
      const studentPhone = linkedPhone || currentProfile.phoneWhatsapp || '';
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
      });

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
        cvPdfBase64: pdfBase64,
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
      Alert.alert('Erreur', "Échec de l'envoi automatique. Vous pouvez utiliser le fallback manuel.");
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
      const rawTarget = (job.company?.contactWhatsapp || '').replace(/[^0-9]/g, '');
      const cleanTarget = rawTarget ? cleanPhoneNumber(rawTarget) : '237672364124';
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
      Alert.alert('Info', 'Ouverture de WhatsApp...');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Action: Fallback Manuel Email (mailto)
  const handleManualEmailApply = async () => {
    if (!result || !job) return;
    try {
      const applicationId = await persistApplication();
      const mailto = `mailto:${result.recipientEmail}?subject=${result.emailSubject}&body=${encodeURIComponent(
        editableLetter
      )}`;
      await Linking.openURL(mailto);
      setDispatchReceipt({
        applicationId,
        channel: 'email_manual',
        status: 'SENT_PENDING',
        appliedAt: new Date().toISOString(),
        message: 'Candidature ouverte dans votre messagerie.',
        companyName: job.company?.name || 'Entreprise Partenaire',
        jobTitle: job.title,
      });
      setStep('sent');
    } catch (e) {
      Alert.alert('Info', 'Ouverture de votre messagerie...');
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
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d’enregistrer la candidature.');
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
                  <X size={18} color="#94A3B8" />
                </Pressable>
              </View>

              <Text style={styles.jobTitle} numberOfLines={1}>
                {job.title}
              </Text>
              <Text style={styles.companyName}>
                {job.company?.name} • {job.location || 'Hybride / Présentiel'}
              </Text>
            </View>

            {/* Étape 1 : Génération & Analyse de correspondance */}
            {step === 'generating' && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingOrb}>
                  <ActivityIndicator size="large" color="#7C3AED" />
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
                        <CheckCircle2 size={13} color="#34D399" />
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
                        color={activePreviewTab === 'letter' ? '#FFFFFF' : '#94A3B8'}
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
                        color={activePreviewTab === 'cv' ? '#FFFFFF' : '#94A3B8'}
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
                        color={activePreviewTab === 'match' ? '#FFFFFF' : '#94A3B8'}
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
                      <Edit3 size={13} color={isEditing ? '#FFFFFF' : '#A78BFA'} />
                      <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                        {isEditing ? 'Terminer' : 'Modifier'}
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
                          <CheckCircle2 size={15} color="#34D399" />
                          <Text style={styles.matchPointItemText}>{p}</Text>
                        </View>
                      ))}

                      <View style={styles.strategicBox}>
                        <Text style={styles.strategicTitle}>Stratégie recommandée</Text>
                        <Text style={styles.strategicText}>{matchAnalysis.strategicAdvice}</Text>
                      </View>
                    </View>
                  ) : activePreviewTab === 'cv' && !isEditing && result?.officialCv ? (
                    <OfficialCvCardPreview cv={result.officialCv} />
                  ) : isEditing ? (
                    <TextInput
                      style={styles.editorTextInput}
                      multiline
                      value={activePreviewTab === 'letter' ? editableLetter : editableCv}
                      onChangeText={
                        activePreviewTab === 'letter' ? setEditableLetter : setEditableCv
                      }
                      placeholderTextColor="#64748B"
                    />
                  ) : (
                    <Text style={styles.previewText}>
                      {activePreviewTab === 'letter' ? editableLetter : editableCv}
                    </Text>
                  )}
                </ScrollView>

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
                      <Check size={14} color="#10B981" />
                    ) : (
                      <Copy size={14} color="#A78BFA" />
                    )}
                    <Text style={[styles.utilBtnText, copiedPitch && { color: '#10B981' }]}>
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
                        color={selectedChannel === 'whatsapp' ? '#34D399' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.channelSegmentText,
                          selectedChannel === 'whatsapp' && styles.channelSegmentTextActiveWhatsApp,
                        ]}
                      >
                        WhatsApp {isWhatsAppLinked ? '⚡ 1-Clic' : ''}
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
                        color={selectedChannel === 'email' ? '#A78BFA' : '#94A3B8'}
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
                  {selectedChannel === 'whatsapp' ? (
                    isWhatsAppLinked ? (
                      <View style={styles.oneClickBox}>
                        <View style={styles.linkedBadgeRow}>
                          <CheckCircle2 size={13} color="#34D399" />
                          <Text style={styles.linkedBadgeText}>
                            WhatsApp connecté ({linkedPhone || currentProfile.phoneWhatsapp || 'associé'})
                          </Text>
                        </View>
                        <Pressable
                          testID="btn-apply-1click-whatsapp"
                          style={({ pressed }) => [styles.primaryOneClickBtn, pressed && { opacity: 0.9 }]}
                          onPress={() => handleOneClickApply('whatsapp')}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Zap size={16} color="#FFFFFF" />
                              <Text style={styles.primaryOneClickBtnText}>
                                ⚡ Postuler en 1 Clic (Envoi Automatique)
                              </Text>
                            </>
                          )}
                        </Pressable>
                        <View style={styles.secondaryActionsRow}>
                          <Pressable
                            testID="btn-fallback-manual-whatsapp"
                            style={styles.textFallbackBtn}
                            onPress={handleManualWhatsAppApply}
                            disabled={submitting}
                          >
                            <Text style={styles.textFallbackBtnText}>💬 Ouvrir WhatsApp Manuellement</Text>
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
                          Expédition directe en arrière-plan via Evolution API. Aucun changement d'application requis.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.unlinkedBox}>
                        <View style={styles.unlinkedWarningRow}>
                          <AlertCircle size={15} color="#FBBF24" />
                          <Text style={styles.unlinkedWarningTitle}>WhatsApp non associé</Text>
                        </View>
                        <Text style={styles.unlinkedWarningDesc}>
                          Associez votre compte en 30s pour expédier vos dossiers en 1 clic en arrière-plan.
                        </Text>
                        <View style={styles.unlinkedActionsRow}>
                          <Pressable
                            testID="btn-open-pairing-modal"
                            style={styles.pairingOfferBtn}
                            onPress={() => setShowPairingModal(true)}
                          >
                            <Zap size={14} color="#7C3AED" />
                            <Text style={styles.pairingOfferBtnText}>🔗 Associer mon WhatsApp en 30s</Text>
                          </Pressable>
                          <Pressable
                            testID="btn-fallback-manual-whatsapp"
                            style={styles.manualFallbackBtn}
                            onPress={handleManualWhatsAppApply}
                            disabled={submitting}
                          >
                            <Text style={styles.manualFallbackBtnText}>💬 Ouvrir WhatsApp Manuellement</Text>
                          </Pressable>
                        </View>
                        <View style={styles.secondaryActionsRow}>
                          <Pressable
                            testID="btn-apply-inapp"
                            style={styles.textFallbackBtn}
                            onPress={handleInAppApply}
                            disabled={submitting}
                          >
                            <Text style={styles.textFallbackBtnText}>📁 Enregistrer dans mon suivi uniquement</Text>
                          </Pressable>
                        </View>
                      </View>
                    )
                  ) : (
                    <View style={styles.emailBox}>
                      <Pressable
                        testID="btn-apply-email-dispatch"
                        style={({ pressed }) => [styles.primaryEmailBtn, pressed && { opacity: 0.9 }]}
                        onPress={() => handleOneClickApply('email')}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Mail size={16} color="#FFFFFF" />
                            <Text style={styles.primaryEmailBtnText}>
                              ✉️ Expédier ma Candidature par Email
                            </Text>
                          </>
                        )}
                      </Pressable>
                      <View style={styles.secondaryActionsRow}>
                        <Pressable
                          testID="btn-fallback-manual-email"
                          style={styles.textFallbackBtn}
                          onPress={handleManualEmailApply}
                          disabled={submitting}
                        >
                          <Text style={styles.textFallbackBtnText}>📧 Ouvrir ma messagerie manuellement (mailto)</Text>
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
                        Expédition sécurisée avec CV officiel PDF joint via SMTP N8N.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Étape 3 : Confirmation & Accusé de réception officiel */}
            {step === 'sent' && (
              <View style={styles.receiptContainer}>
                <View style={styles.receiptIconCircle}>
                  <CheckCircle2 size={40} color="#10B981" />
                </View>
                <Text style={styles.receiptTitle}>Candidature transmise avec succès !</Text>
                <Text style={styles.receiptSubtitle}>
                  Votre dossier officiel a été enregistré et expédié au recruteur.
                </Text>

                {/* Carte Accusé de Réception Officiel */}
                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Référence :</Text>
                    <Text style={styles.receiptValueBold}>
                      CAMPUS-{dispatchReceipt?.applicationId ? dispatchReceipt.applicationId.replace(/[^a-zA-Z0-9]/g, '').slice(-7).toUpperCase() : 'APP-2026'}
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
        initialUniversity={currentProfile.university || "Université de Yaoundé I"}
        initialMajor={currentProfile.major}
        initialLevel={currentProfile.educationLevel}
        initialSkills={currentProfile.skills}
        onClose={() => {
          setShowExpressModal(false);
          onClose();
        }}
        onSaveAndContinue={handleExpressProfileSaved}
      />

      {/* Modal Paiement Mobile Money si solde épuisé */}
      <PaymentModal
        visible={showPaymentModal}
        defaultPhone={currentProfile.phoneWhatsapp || ''}
        reasonMessage="Candidature 1-Clic RH (500 FCFA). Rechargez votre portefeuille Mobile Money pour continuer."
        onClose={() => {
          setShowPaymentModal(false);
          if (currentProfile.tokens !== undefined && currentProfile.tokens <= 0) {
            onClose();
          }
        }}
        onPaymentSuccess={(pack) => {
          setShowPaymentModal(false);
          const newTokens = (currentProfile.tokens ?? 0) + pack.tokensReward;
          setCurrentProfile((prev) => ({
            ...prev,
            tokens: newTokens,
          }));
        }}
      />
      {/* Modal d'appairage WhatsApp en 30s si non lié */}
      <WhatsAppPairingModal
        visible={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        initialPhone={currentProfile.phoneWhatsapp || linkedPhone || ''}
        onPairingSuccess={(pairedPhone) => {
          setIsWhatsAppLinked(true);
          setLinkedPhone(pairedPhone);
          setShowPairingModal(false);
          setCurrentProfile((prev) => ({
            ...prev,
            phoneWhatsapp: pairedPhone || prev.phoneWhatsapp,
          }));
        }}
        onStatusChange={(connected) => {
          setIsWhatsAppLinked(connected);
          if (connected) setShowPairingModal(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#120E22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '92%',
    minHeight: 520,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  aiBadgeText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '500',
    color: '#A78BFA',
  },
  matchBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeTopText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  rechargeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  rechargeHeaderBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  companyName: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
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
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  matchBriefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  matchBriefTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  matchPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchPointText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#F8FAFC',
    flex: 1,
  },
  matchAdviceText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: '#A78BFA',
    marginTop: 4,
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
  },
  tabGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  tabBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  editToggleBtnActive: {
    backgroundColor: '#7C3AED',
  },
  editToggleText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#A78BFA',
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },

  // AI Toolbar
  aiToolbarScroll: {
    maxHeight: 36,
    marginBottom: 6,
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
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  aiPillText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '400',
    color: '#CBD5E1',
  },

  // Text Content
  previewScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewScrollContent: {
    paddingVertical: 8,
  },
  previewText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 20,
    color: '#E2E8F0',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  editorTextInput: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 20,
    color: '#FFFFFF',
    backgroundColor: '#131024',
    padding: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#7C3AED',
    minHeight: 220,
    textAlignVertical: 'top',
  },

  // Match Tab
  matchTabCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  matchHeaderScore: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 10,
  },
  matchScoreBig: {
    fontFamily: fontFamilies.serif,
    fontSize: 28,
    fontWeight: '700',
    color: '#A78BFA',
  },
  matchScoreHeadline: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  matchSectionTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  matchPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  matchPointItemText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 17,
    color: '#CBD5E1',
    flex: 1,
  },
  strategicBox: {
    marginTop: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 8,
    padding: 10,
  },
  strategicTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 3,
  },
  strategicText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    lineHeight: 16,
    color: '#DDD6FE',
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  utilBtnSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  utilBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#CBD5E1',
  },

  // Actions Box & Channel Selector
  actionsBox: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionsTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
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
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  channelSegmentPillActiveWhatsApp: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  channelSegmentPillActiveEmail: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7C3AED',
  },
  channelSegmentText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  channelSegmentTextActiveWhatsApp: {
    color: '#34D399',
    fontWeight: '600',
  },
  channelSegmentTextActiveEmail: {
    color: '#C4B5FD',
    fontWeight: '600',
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
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkedBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#34D399',
    fontWeight: '500',
  },
  primaryOneClickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryOneClickBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Unlinked WhatsApp Box
  unlinkedBox: {
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    padding: 10,
  },
  unlinkedWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlinkedWarningTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '600',
    color: '#FBBF24',
  },
  unlinkedWarningDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    lineHeight: 16,
    color: '#CBD5E1',
  },
  unlinkedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  pairingOfferBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F3E8FF',
    paddingVertical: 9,
    borderRadius: 7,
  },
  pairingOfferBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#7C3AED',
  },
  manualFallbackBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 9,
    borderRadius: 7,
  },
  manualFallbackBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    fontWeight: '500',
    color: '#CBD5E1',
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
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryEmailBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Secondary text buttons row
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },
  textFallbackBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  textFallbackBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
  subHintText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#64748B',
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
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelBtnWhatsapp: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelBtnEmail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  channelBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savedHint: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#94A3B8',
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
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 14,
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
    fontSize: 11.5,
    color: '#64748B',
  },
  receiptValue: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#E2E8F0',
    maxWidth: '65%',
    textAlign: 'right',
  },
  receiptValueBold: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#A78BFA',
  },
  receiptValueChannel: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#34D399',
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
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  receiptTimelineBtn: {
    width: '100%',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptTimelineBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  receiptCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  receiptCloseBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  sentDesc: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  doneBtnText: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Official CV Card Preview styles (Gabarit 2 Colonnes)
  officialCvBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  officialCvHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  officialCvFullName: {
    fontFamily: fontFamilies.outfit,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  officialCvJobTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 2,
  },
  officialCvPhotoFrame: {
    width: 48,
    height: 58,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  officialCvPhotoInitials: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  officialCvBlueDivider: {
    height: 2,
    backgroundColor: '#005691',
    marginVertical: 10,
  },
  officialCvSectionHeader: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#005691',
    borderBottomWidth: 1,
    borderBottomColor: '#005691',
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 6,
  },
  officialCvTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  officialCvField: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#1F2937',
    marginBottom: 3,
  },
  officialCvLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  officialCvBlock: {
    marginBottom: 6,
  },
  officialCvRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  officialCvItemTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#111827',
  },
  officialCvItemSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    fontStyle: 'italic',
    color: '#4B5563',
  },
  officialCvItemDate: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#6B7280',
  },
  officialCvBullet: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#374151',
    marginLeft: 4,
    marginBottom: 2,
  },
  officialCvSubheading: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    marginBottom: 2,
  },
  officialCvInlineText: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#374151',
    marginBottom: 4,
  },
  officialCvPageNumber: {
    textAlign: 'center',
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 12,
  },
});
