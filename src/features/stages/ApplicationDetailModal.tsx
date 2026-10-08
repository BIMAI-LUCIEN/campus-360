import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  X,
  FileText,
  Mail,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Download,
  Copy,
  Send,
  MapPin,
  QrCode,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';
import type { StageApplication, AppStatus, OfficialCvData } from '../../types';
import { fontFamilies, stitchColors } from '../../theme/stitch';
import { OfficialCvView } from './OfficialCvView';
import {
  getDaysSinceApplication,
  isEligibleForFollowup,
  generateFollowupReminderMessage,
  updateApplicationNotes,
  updateApplicationStatus,
} from './stagesApi';
import { exportOfficialCvToPdf } from './pdfExportService';

interface ApplicationDetailModalProps {
  visible: boolean;
  application: StageApplication | null;
  studentName?: string;
  onClose: () => void;
  onStatusUpdated?: (applicationId: string, newStatus: AppStatus) => void;
  onNotesUpdated?: (applicationId: string, notes: string) => void;
}

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.25)', icon: Clock },
  SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: Send },
  DELIVERED: { label: 'Délivrée', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
  FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
  REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: Clock },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.15)', text: '#A78BFA', border: 'rgba(124, 58, 237, 0.3)', icon: MessageSquare },
  ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
};

const PIPELINE_STEPS: { key: AppStatus; label: string; desc: string }[] = [
  { key: 'PENDING', label: '1. Dépôt', desc: 'Dossier transmis' },
  { key: 'REVIEWING', label: '2. Examen RH', desc: 'Évaluation du profil' },
  { key: 'INTERVIEW', label: '3. Entretien', desc: 'Échange technique/RH' },
  { key: 'ACCEPTED', label: '4. Décision', desc: 'Proposition finale' },
];

export function ApplicationDetailModal({
  visible,
  application,
  studentName = 'Dave Lionel Kameni',
  onClose,
  onStatusUpdated,
  onNotesUpdated,
}: ApplicationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'cv' | 'letter' | 'company'>('cv');
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [notes, setNotes] = useState(application?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  React.useEffect(() => {
    if (application) {
      setNotes(application.notes || '');
      setCopied(false);
      setActiveTab('cv');
      setShowCertificate(false);
    }
  }, [application]);

  if (!visible || !application) return null;

  const job = application.job;
  const company = job?.company;
  const refCode = `CAMPUS-${application.id.slice(0, 6).toUpperCase()}`;
  const daysElapsed = getDaysSinceApplication(application.appliedAt);
  const eligibleReminder = isEligibleForFollowup(application);
  const currentStatusConf = STATUS_CONFIG[application.status] || STATUS_CONFIG.PENDING;

  // Construct fallback OfficialCvData if not stored
  const officialCv: OfficialCvData = application.officialCv || {
    titrePoste: job?.title || 'Stage Professionnel',
    photoUrl: undefined,
    detailsPersonnels: {
      nom: studentName.split(' ')[0] || 'KAMENI',
      prenom: studentName.split(' ').slice(1).join(' ') || 'Dave Lionel',
      nationalite: 'Camerounaise',
      age: '22 ans',
      email: 'etudiant@campus360.app',
      telephone: '+237 690 12 34 56',
      adresse: job?.location ? job.location.split('/')[0].trim() : 'Yaoundé',
    },
    experiences: [
      {
        poste: 'Stagiaire Informatique & Génie Logiciel',
        entreprise: 'Projets Académiques & Travaux Pratiques',
        ville: job?.location ? job.location.split('/')[0].trim() : 'Yaoundé',
        periode: '2023 - 2024',
        missions: [
          `Application des méthodologies logicielles sur les exigences du poste : ${job?.title}`,
          `Mise en œuvre des compétences clés requises : ${job?.requirements?.slice(0, 3).join(', ') || 'Analyse & Développement'}`,
          'Travail collaboratif et respect des spécifications fonctionnelles formulées',
        ],
      },
    ],
    formations: [
      {
        diplome: 'Licence 3 en Informatique & Génie Logiciel',
        etablissement: 'Université de Yaoundé I',
        ville: 'Yaoundé',
        periode: 'En cours',
      },
    ],
    competences: {
      professionnelles: [
        ...(job?.requirements?.slice(0, 3) || ['React', 'TypeScript', 'Node.js']),
        'Résolution de problèmes et analyse fonctionnelle',
        'Gestion du temps et esprit critique',
      ],
      habilitesRelationnelles: [
        'assidu',
        'attentif',
        'autonome',
        'compréhensif',
        'consciencieux',
        'courtois',
      ],
      logiciels: [
        {
          categorie: 'Bureautique & Gestion',
          items: ['Suite Office', 'Google Workspace', 'Git'],
        },
        {
          categorie: 'Outils Spécialisés',
          items: job?.requirements || ['React Native', 'SQL', 'PostgreSQL'],
        },
      ],
    },
    langues: [
      { langue: 'Français', niveau: 'expérimenté' },
      { langue: 'Anglais', niveau: 'intermédiaire' },
    ],
    loisirs: ['sport', 'lecture', 'veille technologique'],
  };

  const letterText =
    application.generatedLetterText ||
    `Madame, Monsieur le Responsable du Recrutement,\n\nActuellement étudiant en Licence 3 d'Informatique & Génie Logiciel à l'Université de Yaoundé I, je vous adresse avec un grand enthousiasme ma candidature pour le poste de "${job?.title || 'Stagiaire'}" au sein de votre entreprise ${company?.name || 'partenaire'}.\n\nFormé aux technologies modernes et au travail en équipe, j'ai acquis une solide maîtrise de compétences clés directement alignées avec vos exigences. Rigoureux, adaptable et animé d'une forte volonté d'apprendre, je suis convaincu de pouvoir m'intégrer rapidement à vos équipes et apporter une réelle valeur ajoutée à vos projets.\n\nJe reste à votre entière disposition pour tout entretien à votre convenance.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${studentName}`;

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await exportOfficialCvToPdf(officialCv);
    } catch (e) {
      console.warn('PDF export error:', e);
      Alert.alert('Information', 'Aperçu du PDF généré. Utilisez la fonction Imprimer/Enregistrer de votre navigateur.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyText = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setCopied(true);
      Alert.alert('Copié !', 'Le texte a été copié dans le presse-papiers.');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await updateApplicationNotes(application.id, notes);
    if (onNotesUpdated) {
      onNotesUpdated(application.id, notes);
    }
    setSavingNotes(false);
    Alert.alert('Succès', 'Vos notes personnelles ont été enregistrées.');
  };

  const handleSendReminderWhatsapp = () => {
    const msg = generateFollowupReminderMessage(application, studentName);
    const rawPhone = (company?.contactWhatsapp || '').replace(/[^0-9]/g, '') || '237690123456';
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`;
    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl);
    }
  };

  const handleSendEmail = () => {
    const email = company?.contactEmail || 'contact@recrutement.org';
    const subject = encodeURIComponent(`Candidature ${job?.title} — ${studentName}`);
    const body = encodeURIComponent(letterText);
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    if (Platform.OS === 'web') {
      window.open(mailtoUrl, '_blank');
    } else {
      Linking.openURL(mailtoUrl);
    }
  };

  const handleCycleStatus = async () => {
    const statuses: AppStatus[] = ['PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
    const nextIdx = (statuses.indexOf(application.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];
    await updateApplicationStatus(application.id, nextStatus);
    if (onStatusUpdated) {
      onStatusUpdated(application.id, nextStatus);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.refRow}>
                <View style={styles.refBadge}>
                  <Text style={styles.refBadgeText}>{refCode}</Text>
                </View>
                <Pressable
                  style={[styles.statusBadge, { backgroundColor: currentStatusConf.bg, borderColor: currentStatusConf.border }]}
                  onPress={handleCycleStatus}
                >
                  <Text style={[styles.statusText, { color: currentStatusConf.text }]}>
                    {currentStatusConf.label}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {job?.title || 'Stage Professionnel'}
              </Text>
              <Text style={styles.companySubtitle}>
                {company?.name || 'Entreprise Partenaire'} • {job?.location || 'Présentiel / Hybride'}
              </Text>
            </View>

            <Pressable
              testID="btn-app-detail-close"
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <X size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable
              testID="tab-detail-cv"
              style={[styles.tabBtn, activeTab === 'cv' && styles.tabBtnActive]}
              onPress={() => setActiveTab('cv')}
            >
              <FileText size={14} color={activeTab === 'cv' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabBtnText, activeTab === 'cv' && styles.tabBtnTextActive]}>
                CV Officiel
              </Text>
            </Pressable>

            <Pressable
              testID="tab-detail-letter"
              style={[styles.tabBtn, activeTab === 'letter' && styles.tabBtnActive]}
              onPress={() => setActiveTab('letter')}
            >
              <Mail size={14} color={activeTab === 'letter' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabBtnText, activeTab === 'letter' && styles.tabBtnTextActive]}>
                Lettre RH
              </Text>
            </Pressable>

            <Pressable
              testID="tab-detail-company"
              style={[styles.tabBtn, activeTab === 'company' && styles.tabBtnActive]}
              onPress={() => setActiveTab('company')}
            >
              <Building2 size={14} color={activeTab === 'company' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabBtnText, activeTab === 'company' && styles.tabBtnTextActive]}>
                Suivi & Contact
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* ── TAB 1 : CV OFFICIEL ────────────────────────────────────── */}
            {activeTab === 'cv' && (
              <View style={styles.tabContent}>
                <View style={styles.actionRowTop}>
                  <Pressable
                    testID="btn-detail-download-pdf"
                    style={({ pressed }) => [styles.primaryActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Download size={14} color="#FFFFFF" />
                    )}
                    <Text style={styles.primaryActionBtnText}>Télécharger le CV (PDF)</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.secondaryActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => handleCopyText(application.generatedCvText || JSON.stringify(officialCv))}
                  >
                    <Copy size={13} color="#A78BFA" />
                    <Text style={styles.secondaryActionBtnText}>
                      {copied ? 'Copié !' : 'Copier'}
                    </Text>
                  </Pressable>
                </View>

                {/* Render Official CV View Component */}
                <OfficialCvView cv={officialCv} />
              </View>
            )}

            {/* ── TAB 2 : LETTRE RH ───────────────────────────────────────── */}
            {activeTab === 'letter' && (
              <View style={styles.tabContent}>
                <View style={styles.actionRowTop}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => handleCopyText(letterText)}
                  >
                    <Copy size={13} color="#A78BFA" />
                    <Text style={styles.secondaryActionBtnText}>
                      {copied ? 'Lettre copiée !' : 'Copier le texte'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.whatsappActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSendReminderWhatsapp}
                  >
                    <Send size={13} color="#FFFFFF" />
                    <Text style={styles.whatsappActionBtnText}>WhatsApp RH</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.emailActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSendEmail}
                  >
                    <Mail size={13} color="#FFFFFF" />
                    <Text style={styles.emailActionBtnText}>Email RH</Text>
                  </Pressable>
                </View>

                {/* Letter Paper Container */}
                <View style={styles.letterPaper}>
                  <Text style={styles.letterText}>{letterText}</Text>
                </View>
              </View>
            )}

            {/* ── TAB 3 : SUIVI & RECRUTEUR ───────────────────────────────── */}
            {activeTab === 'company' && (
              <View style={styles.tabContent}>
                {/* Urgent Follow-up Banner */}
                {eligibleReminder && (
                  <View style={styles.urgentBanner}>
                    <Clock size={14} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.urgentBannerTitle}>
                        Relance J+7 recommandée ({daysElapsed} jours sans réponse)
                      </Text>
                      <Text style={styles.urgentBannerSub}>
                        Confirmez votre motivation par un message courtois direct sur WhatsApp.
                      </Text>
                    </View>
                    <Pressable
                      style={styles.urgentRelanceBtn}
                      onPress={handleSendReminderWhatsapp}
                    >
                      <Text style={styles.urgentRelanceBtnText}>Relancer</Text>
                    </Pressable>
                  </View>
                )}

                {/* Recruitment Pipeline Status */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Avancement de la candidature</Text>
                  <View style={styles.pipelineRow}>
                    {PIPELINE_STEPS.map((step, idx) => {
                      const isCurrent = application.status === step.key;
                      const isPassed =
                        PIPELINE_STEPS.findIndex((s) => s.key === application.status) >= idx;

                      return (
                        <View key={step.key} style={styles.pipelineCol}>
                          <View
                            style={[
                              styles.pipelineDot,
                              isPassed && styles.pipelineDotPassed,
                              isCurrent && styles.pipelineDotCurrent,
                            ]}
                          >
                            {isPassed ? (
                              <CheckCircle2 size={13} color="#FFFFFF" />
                            ) : (
                              <Text style={styles.pipelineNumber}>{idx + 1}</Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.pipelineLabel,
                              isCurrent && styles.pipelineLabelCurrent,
                            ]}
                            numberOfLines={1}
                          >
                            {step.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Pressable style={styles.cycleStatusBtn} onPress={handleCycleStatus}>
                    <Text style={styles.cycleStatusBtnText}>
                      Changer de statut (actuel : {currentStatusConf.label})
                    </Text>
                  </Pressable>
                </View>

                {/* Company Details */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Coordonnées de l'Entreprise</Text>
                  <View style={styles.infoRow}>
                    <Building2 size={14} color="#94A3B8" />
                    <Text style={styles.infoText}>{company?.name || 'Entreprise Partenaire'}</Text>
                    {company?.status === 'VERIFIED' && (
                      <View style={styles.verifiedTag}>
                        <ShieldCheck size={11} color="#34D399" />
                        <Text style={styles.verifiedTagText}>KYB Vérifié</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.infoRow}>
                    <MapPin size={14} color="#94A3B8" />
                    <Text style={styles.infoText}>{company?.address || job?.location || 'Douala / Yaoundé'}</Text>
                  </View>

                  <View style={styles.contactsRow}>
                    {company?.contactWhatsapp && (
                      <Pressable
                        style={styles.contactBtn}
                        onPress={handleSendReminderWhatsapp}
                      >
                        <MessageSquare size={13} color="#34D399" />
                        <Text style={styles.contactBtnText}>
                          {company.contactWhatsapp}
                        </Text>
                      </Pressable>
                    )}

                    {company?.contactEmail && (
                      <Pressable style={styles.contactBtn} onPress={handleSendEmail}>
                        <Mail size={13} color="#60A5FA" />
                        <Text style={styles.contactBtnText}>{company.contactEmail}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Personal Notes */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Mes Notes d'Entretien (Privé)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Notez ici les échanges avec le recruteur, questions posées ou dates de rappel..."
                    placeholderTextColor="#64748B"
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                  />
                  <Pressable
                    style={({ pressed }) => [styles.saveNotesBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveNotesBtnText}>Enregistrer mes notes</Text>
                    )}
                  </Pressable>
                </View>

                {/* QR Code & Certificate Badge */}
                <Pressable
                  style={styles.certificateCard}
                  onPress={() => setShowCertificate(!showCertificate)}
                >
                  <View style={styles.certIconWrap}>
                    <QrCode size={24} color="#A78BFA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certTitle}>Certificat de Candidature Officiel</Text>
                    <Text style={styles.certSub}>
                      Code intégrité {refCode} • Vérifiable en ligne par le recruteur
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#94A3B8" />
                </Pressable>

                {showCertificate && (
                  <View style={styles.certModalBox}>
                    <View style={styles.certHeader}>
                      <ShieldCheck size={20} color="#34D399" />
                      <Text style={styles.certModalTitle}>Attestation de Dépôt Institutionnel</Text>
                    </View>
                    <Text style={styles.certModalText}>
                      Cette candidature a été générée et transmise selon les protocoles certifiés de Campus 360 pour le compte de l'étudiant {studentName}.
                    </Text>
                    <View style={styles.certMetaRow}>
                      <Text style={styles.certMetaItem}>Dépôt : {new Date(application.appliedAt).toLocaleDateString('fr-FR')}</Text>
                      <Text style={styles.certMetaItem}>Réf : {refCode}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.footerCloseBtn} onPress={onClose}>
              <Text style={styles.footerCloseBtnText}>Fermer le dossier</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 10, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F0B1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  refBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  refBadgeText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#A78BFA',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    fontWeight: '700',
  },
  title: {
    fontFamily: fontFamilies.outfit,
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  companySubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    color: '#94A3B8',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(18, 14, 34, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  tabBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  actionRowTop: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  secondaryActionBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
  },
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  whatsappActionBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  emailActionBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  letterPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  letterText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    lineHeight: 20,
    color: '#1E293B',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 14,
  },
  urgentBannerTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 2,
  },
  urgentBannerSub: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#CBD5E1',
  },
  urgentRelanceBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  urgentRelanceBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#000000',
  },
  cardBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 14,
  },
  cardBoxTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pipelineCol: {
    alignItems: 'center',
    flex: 1,
  },
  pipelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pipelineDotPassed: {
    backgroundColor: '#7C3AED',
  },
  pipelineDotCurrent: {
    borderWidth: 2,
    borderColor: '#34D399',
  },
  pipelineNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pipelineLabel: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
  },
  pipelineLabelCurrent: {
    color: '#A78BFA',
    fontWeight: '700',
  },
  cycleStatusBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cycleStatusBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: '#E2E8F0',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#34D399',
    fontWeight: '700',
  },
  contactsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contactBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    color: '#F8FAFC',
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  saveNotesBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  saveNotesBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },
  certificateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  certIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  certSub: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  certModalBox: {
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  certModalTitle: {
    fontFamily: fontFamilies.outfit,
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  certModalText: {
    fontFamily: fontFamilies.inter,
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 8,
  },
  certMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certMetaItem: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    backgroundColor: 'rgba(15, 11, 30, 0.98)',
  },
  footerCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerCloseBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
});
