import React, { useState } from 'react';

import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  TextInput,
  ActivityIndicator,
  Platform,

  Share,

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


  updateApplicationNotes,
  updateApplicationStatus,

  withdrawStageApplication,

} from './stagesApi';

import { exportOfficialCvToPdf } from './pdfExportService';

import { missingCvFields } from './cvHtml';

import { ApplicationFollowup } from './ApplicationFollowup';

import { isLinkApply } from './applyTarget';
import { companyEmail, companyWhatsapp, CONTACT_UNAVAILABLE } from './contactTargets';
import { AppAlert } from '../../ui/AppAlert';



interface ApplicationDetailModalProps {

  visible: boolean;

  application: StageApplication | null;

  studentName?: string;

  onClose: () => void;

  onStatusUpdated?: (applicationId: string, newStatus: AppStatus) => void;

  onNotesUpdated?: (applicationId: string, notes: string) => void;

  onApplicationPatched?: (applicationId: string, patch: Partial<StageApplication>) => void;

}



const STATUS_CONFIG: Record<

  AppStatus,

  { label: string; bg: string; text: string; border: string; icon: any }

> = {

  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: stitchColors.warningDeep, border: 'rgba(245, 158, 11, 0.25)', icon: Clock },

  SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.12)', text: stitchColors.tertiary, border: 'rgba(59, 130, 246, 0.25)', icon: Send },

  DELIVERED: { label: 'Envoyée', bg: 'rgba(16, 185, 129, 0.12)', text: stitchColors.mentheInk, border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },

  FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.12)', text: stitchColors.corailInk, border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },

  REVIEWING: { label: 'Réponse reçue', bg: 'rgba(59, 130, 246, 0.12)', text: stitchColors.tertiary, border: 'rgba(59, 130, 246, 0.25)', icon: Clock },

  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.15)', text: stitchColors.siennaDeep, border: 'rgba(124, 58, 237, 0.3)', icon: MessageSquare },

  ACCEPTED: { label: 'Acceptée', bg: 'rgba(16, 185, 129, 0.12)', text: stitchColors.mentheInk, border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },

  REJECTED: { label: 'Non retenue', bg: 'rgba(239, 68, 68, 0.12)', text: stitchColors.corailInk, border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },

  WITHDRAWN: { label: 'Retirée', bg: stitchColors.paperSoft, text: stitchColors.inkMuted, border: stitchColors.glassBorder, icon: XCircle },

};



const PIPELINE_STEPS: { key: AppStatus; label: string; desc: string }[] = [
  { key: 'DELIVERED', label: '1. Envoi', desc: 'Dossier transmis' },
  { key: 'REVIEWING', label: '2. Réponse', desc: "Réponse de l'entreprise" },
  { key: 'INTERVIEW', label: '3. Entretien', desc: 'Échange avec le recruteur' },
  { key: 'ACCEPTED', label: '4. Décision', desc: 'Réponse finale' },
];

// Step reached by each status (-1: the application did not reach the company).
const PIPELINE_RANK: Record<AppStatus, number> = {
  PENDING: 0,
  SENT_PENDING: 0,
  DELIVERED: 0,
  FAILED: -1,
  REVIEWING: 1,
  INTERVIEW: 2,
  ACCEPTED: 3,
  REJECTED: 3,
  WITHDRAWN: -1,
};

// What the student can report (same rule as mobile-api/lib/application-rules.ts).
const REACHED_STATUSES: AppStatus[] = ['PENDING', 'SENT_PENDING', 'DELIVERED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
const REPORTABLE: { status: AppStatus; label: string }[] = [
  { status: 'REVIEWING', label: "J'ai eu une réponse" },
  { status: 'INTERVIEW', label: "J'ai un entretien" },
  { status: 'ACCEPTED', label: 'Je suis pris(e)' },
  { status: 'REJECTED', label: 'Pas retenu(e)' },
];



export function ApplicationDetailModal({

  visible,

  application,

  studentName = '',

  onClose,

  onStatusUpdated,

  onNotesUpdated,

  onApplicationPatched,

}: ApplicationDetailModalProps) {

  const [activeTab, setActiveTab] = useState<'cv' | 'letter' | 'company'>('cv');

  const [copied, setCopied] = useState(false);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [notes, setNotes] = useState(application?.notes || '');

  const [savingNotes, setSavingNotes] = useState(false);

  const [withdrawing, setWithdrawing] = useState(false);

  const [reportingStatus, setReportingStatus] = useState<AppStatus | null>(null);



  React.useEffect(() => {

    if (application) {

      setNotes(application.notes || '');

      setCopied(false);

      // Applied on the offer's website: no CV nor letter here, only the follow-up.

      setActiveTab(isLinkApply(application.job) ? 'company' : 'cv');

    }

  }, [application]);



  if (!visible || !application) return null;



  const job = application.job;

  const company = job?.company;

  const refCode = `CAMPUS-${application.id.slice(0, 6).toUpperCase()}`;


  const currentStatusConf = STATUS_CONFIG[application.status] || STATUS_CONFIG.PENDING;



  // Only what was really saved with this application: nothing is rebuilt or invented.

  const officialCv: OfficialCvData | null = application.officialCv ?? null;

  const letterText = application.generatedLetterText || '';



  const handleDownloadPdf = async () => {

    if (!officialCv) return;

    const missing = missingCvFields(officialCv);

    if (missing.length > 0) {

      AppAlert.alert('Profil incomplet', `Complète ton nom et ton contact avant d'exporter ce CV. Manque : ${missing.join(', ')}.`);

      return;

    }

    try {

      setDownloadingPdf(true);

      await exportOfficialCvToPdf(officialCv);

    } catch (e) {

      console.warn('PDF export error:', e);

      AppAlert.alert('Export impossible', "Le PDF n'a pas pu être créé. Réessaie.");

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

      // No clipboard module in this build: the share sheet lets the student copy or send it.

      void Share.share({ message: text });

    }

  };



  const handleSaveNotes = async () => {

    setSavingNotes(true);

    const saved = await updateApplicationNotes(application.id, notes);

    if (!saved) {

      setSavingNotes(false);

      AppAlert.alert('Notes non enregistrées', 'Vérifie ta connexion et réessaie.');

      return;

    }

    if (onNotesUpdated) {

      onNotesUpdated(application.id, notes);

    }

    setSavingNotes(false);

    AppAlert.alert('Notes enregistrées', 'Tes notes personnelles sont enregistrées.');

  };



  // Opens the conversation with the company. A reminder is sent from the follow-up block.
  const handleContactWhatsapp = () => {

    const rawPhone = companyWhatsapp(company);

    if (!rawPhone) {

      AppAlert.alert('WhatsApp indisponible', `${CONTACT_UNAVAILABLE} : pas de numéro WhatsApp.`);

      return;

    }

    const waUrl = `https://wa.me/${rawPhone}`;

    if (Platform.OS === 'web') {

      window.open(waUrl, '_blank');

    } else {

      Linking.openURL(waUrl);

    }

  };



  const handleSendEmail = () => {

    const email = companyEmail(company);

    if (!email) {

      AppAlert.alert('Envoi impossible', `${CONTACT_UNAVAILABLE} : pas d'adresse e-mail.`);

      return;

    }

    const subject = encodeURIComponent(`Candidature ${job?.title} — ${studentName}`);

    const body = encodeURIComponent(letterText);

    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    if (Platform.OS === 'web') {

      window.open(mailtoUrl, '_blank');

    } else {

      Linking.openURL(mailtoUrl);

    }

  };



  const canWithdraw = ['PENDING', 'SENT_PENDING', 'DELIVERED', 'FAILED', 'REVIEWING'].includes(application.status);



  const handleReportStatus = async (status: AppStatus, label: string) => {
    setReportingStatus(status);
    const res = await updateApplicationStatus(application.id, status);
    setReportingStatus(null);
    if (!res.success) {
      AppAlert.alert('Statut non enregistré', res.error || 'Réessaie dans un instant.');
      return;
    }
    onStatusUpdated?.(application.id, status);
    AppAlert.alert('Suivi mis à jour', `« ${label} » est enregistré.`);
  };

  const handleWithdraw = () => {

    AppAlert.alert(

      'Retirer ma candidature',

      "Retirer cette candidature ? L'entreprise ne sera pas prévenue automatiquement.",

      [

        { text: 'Annuler', style: 'cancel' },

        {

          text: 'Retirer',

          style: 'destructive',

          onPress: async () => {

            setWithdrawing(true);

            const res = await withdrawStageApplication(application.id);

            setWithdrawing(false);

            if (!res.success) {

              AppAlert.alert('Erreur', res.error || "Impossible de retirer la candidature.");

              return;

            }

            if (onStatusUpdated) {

              onStatusUpdated(application.id, 'WITHDRAWN');

            }

          },

        },

      ]

    );

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

                <View

                  style={[styles.statusBadge, { backgroundColor: currentStatusConf.bg, borderColor: currentStatusConf.border }]}

                >

                  <Text style={[styles.statusText, { color: currentStatusConf.text }]}>

                    {currentStatusConf.label}

                  </Text>

                </View>

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

              <X size={18} color={stitchColors.inkSubtle} />

            </Pressable>

          </View>



          {/* Tab Bar */}

          <View style={styles.tabBar}>

            {!isLinkApply(job) && (

            <>

            <Pressable

              testID="tab-detail-cv"

              style={[styles.tabBtn, activeTab === 'cv' && styles.tabBtnActive]}

              onPress={() => setActiveTab('cv')}

            >

              <FileText size={14} color={activeTab === 'cv' ? stitchColors.white : stitchColors.inkSubtle} />

              <Text style={[styles.tabBtnText, activeTab === 'cv' && styles.tabBtnTextActive]}>

                CV Officiel

              </Text>

            </Pressable>



            <Pressable

              testID="tab-detail-letter"

              style={[styles.tabBtn, activeTab === 'letter' && styles.tabBtnActive]}

              onPress={() => setActiveTab('letter')}

            >

              <Mail size={14} color={activeTab === 'letter' ? stitchColors.white : stitchColors.inkSubtle} />

              <Text style={[styles.tabBtnText, activeTab === 'letter' && styles.tabBtnTextActive]}>

                Lettre RH

              </Text>

            </Pressable>

            </>

            )}



            <Pressable

              testID="tab-detail-company"

              style={[styles.tabBtn, activeTab === 'company' && styles.tabBtnActive]}

              onPress={() => setActiveTab('company')}

            >

              <Building2 size={14} color={activeTab === 'company' ? stitchColors.white : stitchColors.inkSubtle} />

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

                    disabled={downloadingPdf || !officialCv}

                  >

                    {downloadingPdf ? (

                      <ActivityIndicator size="small" color={stitchColors.white} />

                    ) : (

                      <Download size={14} color={stitchColors.white} />

                    )}

                    <Text style={styles.primaryActionBtnText}>Télécharger le CV (PDF)</Text>

                  </Pressable>



                  <Pressable

                    style={({ pressed }) => [styles.secondaryActionBtn, pressed && { opacity: 0.85 }]}

                    onPress={() => handleCopyText(application.generatedCvText || '')}

                    disabled={!application.generatedCvText}

                  >

                    <Copy size={13} color="#A78BFA" />

                    <Text style={styles.secondaryActionBtnText}>

                      {copied ? 'Copié !' : 'Copier'}

                    </Text>

                  </Pressable>

                </View>



                {officialCv ? (

                  <OfficialCvView cv={officialCv} />

                ) : (

                  <Text style={styles.letterText}>CV non disponible pour cette candidature.</Text>

                )}

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

                    onPress={handleContactWhatsapp}

                  >

                    <Send size={13} color={stitchColors.white} />

                    <Text style={styles.whatsappActionBtnText}>WhatsApp RH</Text>

                  </Pressable>



                  <Pressable

                    style={({ pressed }) => [styles.emailActionBtn, pressed && { opacity: 0.85 }]}

                    onPress={handleSendEmail}

                  >

                    <Mail size={13} color={stitchColors.white} />

                    <Text style={styles.emailActionBtnText}>Email RH</Text>

                  </Pressable>

                </View>



                {/* Letter Paper Container */}

                <View style={styles.letterPaper}>

                  <Text style={styles.letterText}>{letterText || 'Lettre non disponible pour cette candidature.'}</Text>

                </View>

              </View>

            )}



            {/* ── TAB 3 : SUIVI & RECRUTEUR ───────────────────────────────── */}

            {activeTab === 'company' && (

              <View style={styles.tabContent}>

                <ApplicationFollowup
                  application={application}
                  onChanged={(patch) => onApplicationPatched?.(application.id, patch)}
                />

                {/* Recruitment Pipeline Status */}

                <View style={styles.cardBox}>

                  <Text style={styles.cardBoxTitle}>Avancement de la candidature</Text>

                  <View style={styles.pipelineRow}>

                    {PIPELINE_STEPS.map((step, idx) => {

                      const isCurrent = (PIPELINE_RANK[application.status] ?? -1) === idx;

                      const isPassed = (PIPELINE_RANK[application.status] ?? -1) >= idx;



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

                              <CheckCircle2 size={13} color={stitchColors.white} />

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



                  {REACHED_STATUSES.includes(application.status) && (
                    <View style={styles.reportBlock}>
                      <Text style={styles.reportTitle}>Du nouveau ? Indique la suite :</Text>
                      <View style={styles.reportRow}>
                        {REPORTABLE.filter((option) => option.status !== application.status).map((option) => (
                          <Pressable
                            key={option.status}
                            style={({ pressed }) => [styles.reportChip, pressed && { opacity: 0.8 }]}
                            onPress={() => void handleReportStatus(option.status, option.label)}
                            disabled={reportingStatus !== null}
                            accessibilityRole="button"
                            accessibilityLabel={option.label}
                          >
                            <Text style={styles.reportChipText} numberOfLines={1}>
                              {reportingStatus === option.status ? 'Enregistrement…' : option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {canWithdraw && (

                    <Pressable

                      style={styles.cycleStatusBtn}

                      onPress={handleWithdraw}

                      disabled={withdrawing}

                    >

                      <Text style={styles.cycleStatusBtnText}>

                        {withdrawing ? 'Retrait en cours...' : 'Retirer ma candidature'}

                      </Text>

                    </Pressable>

                  )}

                </View>



                {/* Company Details */}

                <View style={styles.cardBox}>

                  <Text style={styles.cardBoxTitle}>Coordonnées de l'Entreprise</Text>

                  <View style={styles.infoRow}>

                    <Building2 size={14} color={stitchColors.inkSubtle} />

                    <Text style={styles.infoText}>{company?.name || 'Entreprise'}</Text>

                    {company?.status === 'VERIFIED' && (

                      <View style={styles.verifiedTag}>

                        <ShieldCheck size={11} color={stitchColors.emeraldDeep} />

                        <Text style={styles.verifiedTagText}>KYB Vérifié</Text>

                      </View>

                    )}

                  </View>



                  <View style={styles.infoRow}>

                    <MapPin size={14} color={stitchColors.inkSubtle} />

                    <Text style={styles.infoText}>{company?.address || job?.location || 'Adresse non renseignée'}</Text>

                  </View>



                  <View style={styles.contactsRow}>

                    {company?.contactWhatsapp && (

                      <Pressable

                        style={styles.contactBtn}

                        onPress={handleContactWhatsapp}

                      >

                        <MessageSquare size={13} color={stitchColors.emeraldDeep} />

                        <Text style={styles.contactBtnText} numberOfLines={1}>

                          {company.contactWhatsapp}

                        </Text>

                      </Pressable>

                    )}



                    {company?.contactEmail && (

                      <Pressable style={styles.contactBtn} onPress={handleSendEmail}>

                        <Mail size={13} color="#60A5FA" />

                        <Text style={styles.contactBtnText} numberOfLines={1}>{company.contactEmail}</Text>

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

                    placeholderTextColor={stitchColors.inkMuted}

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

                      <ActivityIndicator size="small" color={stitchColors.white} />

                    ) : (

                      <Text style={styles.saveNotesBtnText}>Enregistrer mes notes</Text>

                    )}

                  </Pressable>

                </View>



                {/* Application summary (real data only) */}

                <View style={styles.cardBox}>

                  <Text style={styles.cardBoxTitle}>Récapitulatif de la candidature</Text>

                  <Text style={styles.infoText}>Référence : {refCode}</Text>

                  <Text style={styles.infoText}>Déposée le {new Date(application.appliedAt).toLocaleDateString('fr-FR')}</Text>

                  <Text style={styles.infoText}>Entreprise : {company?.name || 'Entreprise'}</Text>

                  <Text style={styles.infoText}>Statut : {currentStatusConf.label}</Text>

                </View>

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

    backgroundColor: 'rgba(15, 23, 42, 0.55)',

    justifyContent: 'flex-end',

  },

  container: {

    backgroundColor: stitchColors.background,

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

    borderBottomColor: stitchColors.glassBorder,

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

    color: stitchColors.ink,

    marginBottom: 2,

  },

  companySubtitle: {

    fontFamily: fontFamilies.inter,

    fontSize: 12,

    color: stitchColors.inkSubtle,

  },

  closeBtn: {

    width: 32,

    height: 32,

    borderRadius: 16,

    backgroundColor: stitchColors.paperSoft,

    alignItems: 'center',

    justifyContent: 'center',

  },

  tabBar: {

    flexDirection: 'row',

    paddingHorizontal: 16,

    paddingVertical: 10,

    backgroundColor: stitchColors.white,

    borderBottomWidth: 1,

    borderBottomColor: stitchColors.glassBorder,

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

    backgroundColor: stitchColors.paperSoft,

    borderWidth: 1,

    borderColor: 'transparent',

  },

  tabBtnActive: {

    backgroundColor: stitchColors.primary,

    borderColor: stitchColors.primary,

  },

  tabBtnText: {

    fontFamily: fontFamilies.inter,

    fontSize: 12,

    fontWeight: '600',

    color: stitchColors.inkSubtle,

  },

  tabBtnTextActive: {

    color: stitchColors.white,

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

    flexWrap: 'wrap',

    gap: 8,

    marginBottom: 12,

  },

  primaryActionBtn: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,

    backgroundColor: stitchColors.primary,

    paddingVertical: 10,

    paddingHorizontal: 12,

    borderRadius: 10,

  },

  primaryActionBtnText: {

    fontFamily: fontFamilies.inter,

    fontSize: 12,

    fontWeight: '700',

    color: stitchColors.white,

  },

  secondaryActionBtn: {

    flexGrow: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

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

    flexGrow: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 5,

    backgroundColor: stitchColors.emerald,

    paddingVertical: 10,

    paddingHorizontal: 10,

    borderRadius: 10,

  },

  whatsappActionBtnText: {

    fontFamily: fontFamilies.inter,

    fontSize: 11.5,

    fontWeight: '700',

    color: stitchColors.white,

  },

  emailActionBtn: {

    flexGrow: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

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

    color: stitchColors.white,

  },

  letterPaper: {

    backgroundColor: stitchColors.white,

    borderRadius: 8,

    padding: 18,

    borderWidth: 1,

    borderColor: stitchColors.glassBorder,

  },

  letterText: {

    fontFamily: fontFamilies.inter,

    fontSize: 12.5,

    lineHeight: 20,

    color: '#1E293B',

  },

  cardBox: {

    backgroundColor: stitchColors.paperSoft,

    borderRadius: 12,

    padding: 14,

    borderWidth: 1,

    borderColor: stitchColors.glassBorder,

    marginBottom: 14,

  },

  reportBlock: { marginBottom: 12 },
  reportTitle: { fontSize: 12, fontWeight: '700', color: stitchColors.inkMuted, marginBottom: 8 },
  reportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
    backgroundColor: stitchColors.siennaBg,
    maxWidth: '100%',
  },
  reportChipText: { fontSize: 13, fontWeight: '700', color: stitchColors.siennaDeep },

  cardBoxTitle: {

    fontFamily: fontFamilies.outfit,

    fontSize: 13,

    fontWeight: '700',

    color: stitchColors.ink,

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

    backgroundColor: stitchColors.primary,

  },

  pipelineDotCurrent: {

    borderWidth: 2,

    borderColor: '#34D399',

  },

  pipelineNumber: {

    fontSize: 10,

    fontWeight: '700',

    color: stitchColors.inkSubtle,

  },

  pipelineLabel: {

    fontFamily: fontFamilies.inter,

    fontSize: 9.5,

    color: stitchColors.inkMuted,

    textAlign: 'center',

  },

  pipelineLabelCurrent: {

    color: '#A78BFA',

    fontWeight: '700',

  },

  cycleStatusBtn: {

    backgroundColor: stitchColors.paperSoft,

    paddingVertical: 8,

    borderRadius: 8,

    alignItems: 'center',

  },

  cycleStatusBtnText: {

    fontFamily: fontFamilies.inter,

    fontSize: 11.5,

    color: stitchColors.inkSubtle,

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

    color: stitchColors.inkSoft,

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

    color: stitchColors.emeraldDeep,

    fontWeight: '700',

  },

  contactsRow: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 8,

    marginTop: 8,

  },

  contactBtn: {

    maxWidth: '100%',

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    backgroundColor: stitchColors.paperSoft,

    paddingHorizontal: 10,

    paddingVertical: 7,

    borderRadius: 8,

    borderWidth: 1,

    borderColor: stitchColors.glassBorder,

  },

  contactBtnText: {

    flexShrink: 1,

    fontFamily: fontFamilies.inter,

    fontSize: 11,

    color: stitchColors.inkSoft,

    fontWeight: '600',

  },

  notesInput: {

    backgroundColor: 'rgba(0, 0, 0, 0.25)',

    borderRadius: 8,

    borderWidth: 1,

    borderColor: stitchColors.glassBorder,

    padding: 10,

    color: stitchColors.ink,

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

  footer: {

    padding: 14,

    borderTopWidth: 1,

    borderTopColor: stitchColors.glassBorder,

    backgroundColor: 'rgba(15, 23, 42, 0.55)',

  },

  footerCloseBtn: {

    backgroundColor: stitchColors.paperSoft,

    paddingVertical: 12,

    borderRadius: 10,

    alignItems: 'center',

  },

  footerCloseBtnText: {

    fontFamily: fontFamilies.inter,

    fontSize: 13,

    fontWeight: '600',

    color: stitchColors.inkSoft,

  },

});

