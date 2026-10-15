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
import { missingCvFields } from './cvHtml';
import { companyEmail, companyWhatsapp, CONTACT_UNAVAILABLE } from './contactTargets';

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
  studentName = '',
  onClose,
  onStatusUpdated,
  onNotesUpdated,
}: ApplicationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'cv' | 'letter' | 'company'>('cv');
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [notes, setNotes] = useState(application?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  React.useEffect(() => {
    if (application) {
      setNotes(application.notes || '');
      setCopied(false);
      setActiveTab('cv');
    }
  }, [application]);

  if (!visible || !application) return null;

  const job = application.job;
  const company = job?.company;
  const refCode = `CAMPUS-${application.id.slice(0, 6).toUpperCase()}`;
  const daysElapsed = getDaysSinceApplication(application.appliedAt);
  const eligibleReminder = isEligibleForFollowup(application);
  const currentStatusConf = STATUS_CONFIG[application.status] || STATUS_CONFIG.PENDING;

  // Only what was really saved with this application: nothing is rebuilt or invented.
  const officialCv: OfficialCvData | null = application.officialCv ?? null;
  const letterText = application.generatedLetterText || '';

  const handleDownloadPdf = async () => {
    if (!officialCv) return;
    const missing = missingCvFields(officialCv);
    if (missing.length > 0) {
      Alert.alert('Profil incomplet', `Complète ton nom et ton contact avant d'exporter ce CV. Manque : ${missing.join(', ')}.`);
      return;
    }
    try {
      setDownloadingPdf(true);
      await exportOfficialCvToPdf(officialCv);
    } catch (e) {
      console.warn('PDF export error:', e);
      Alert.alert('Export impossible', "Le PDF n'a pas pu être créé. Réessaie.");
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
    const rawPhone = companyWhatsapp(company);
    if (!rawPhone) {
      Alert.alert('Relance impossible', `${CONTACT_UNAVAILABLE} : pas de numéro WhatsApp. Copie le message et envoie-le par un autre moyen.`);
      return;
    }
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`;
    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl);
    }
  };

  const handleSendEmail = () => {
    const email = companyEmail(company);
    if (!email) {
      Alert.alert('Envoi impossible', `${CONTACT_UNAVAILABLE} : pas d'adresse e-mail.`);
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

  const handleCycleStatus = async () => {
    const statuses: AppStatus[] = ['PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
    const nextIdx = (statuses.indexOf(application.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];
    const saved = await updateApplicationStatus(application.id, nextStatus);
    if (!saved) {
      Alert.alert('Erreur', "Le statut n'a pas pu être enregistré.");
      return;
    }
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
              <X size={18} color={stitchColors.inkSubtle} />
            </Pressable>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
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
                    onPress={handleSendReminderWhatsapp}
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
                {/* Urgent Follow-up Banner */}
                {eligibleReminder && (
                  <View style={styles.urgentBanner}>
                    <Clock size={14} color={stitchColors.warningTone} />
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
                        onPress={handleSendReminderWhatsapp}
                      >
                        <MessageSquare size={13} color={stitchColors.emeraldDeep} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  tabBtnText: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkSubtle,
  },
  tabBtnTextActive: {
    color: stitchColors.primary,
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
    color: stitchColors.inkMuted,
  },
  urgentRelanceBtn: {
    backgroundColor: stitchColors.warningTone,
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
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    marginBottom: 14,
  },
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
    gap: 8,
    marginTop: 8,
  },
  contactBtn: {
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
