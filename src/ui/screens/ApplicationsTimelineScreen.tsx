import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';

import {

  Clock,

  CheckCircle2,

  XCircle,

  MessageSquare,

  Calendar,

  Send,

  Building2,

  HelpCircle,

  FileCheck,

  QrCode,

  MapPin,

  Briefcase,

  ChevronRight,

  ArrowLeft,

  Eye,

} from 'lucide-react-native';

import type { StageApplication, AppStatus } from '../../types';

import {

  fetchStudentApplications,
  peekStudentApplications,

  updateApplicationStatus,

  withdrawStageApplication,

  generateFollowupReminderMessage,

  getDaysSinceApplication,

  isEligibleForFollowup,

  recordApplicationReminder,

} from '../../features/stages/stagesApi';

import { ApplicationDetailModal } from '../../features/stages/ApplicationDetailModal';

import { stitchColors } from '../../theme/stitch';

import { companyWhatsapp } from '../../features/stages/contactTargets';
import { AppAlert } from '../AppAlert';



interface ApplicationsTimelineProps {

  studentName: string;

  onBack?: () => void;

}



const STATUS_CONFIG: Record<

  AppStatus,

  { label: string; bg: string; text: string; border: string; icon: any }

> = {

  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.25)', icon: Clock },

  SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: Send },

  DELIVERED: { label: 'Délivrée', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },

  FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },

  REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: FileCheck },

  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.12)', text: '#A78BFA', border: 'rgba(124, 58, 237, 0.25)', icon: MessageSquare },

  ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },

  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },

  WITHDRAWN: { label: 'Retirée', bg: stitchColors.paperSoft, text: stitchColors.inkMuted, border: stitchColors.glassBorder, icon: XCircle },

};



export function ApplicationsTimelineScreen({ studentName, onBack }: ApplicationsTimelineProps) {

  const [applications, setApplications] = useState<StageApplication[]>(() => peekStudentApplications() ?? []);

  const [refreshing, setRefreshing] = useState(false);

  const [selectedApp, setSelectedApp] = useState<StageApplication | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);



  const loadData = async () => {

    setLoadError(null);

    try {

      const data = await fetchStudentApplications();

      setApplications(data);

    } catch (error) {

      setLoadError(error instanceof Error ? error.message : 'Candidatures indisponibles pour le moment.');

    } finally {

      setRefreshing(false);

    }

  };



  useEffect(() => {

    loadData();

  }, []);



  const onRefresh = () => {

    setRefreshing(true);

    loadData();

  };



  const handleWithdrawApplication = (appId: string) => {

    AppAlert.alert(

      'Retirer ma candidature',

      "Retirer cette candidature ? L'entreprise ne sera pas prévenue automatiquement.",

      [

        { text: 'Annuler', style: 'cancel' },

        {

          text: 'Retirer',

          style: 'destructive',

          onPress: async () => {

            const res = await withdrawStageApplication(appId);

            if (!res.success) {

              AppAlert.alert('Erreur', res.error || "Impossible de retirer la candidature.");

              return;

            }

            loadData();

          },

        },

      ]

    );

  };



  const handleSendReminder = async (app: StageApplication) => {

    const reminderMsg = generateFollowupReminderMessage(app, studentName || 'Étudiant');

    const rawPhone = companyWhatsapp(app.job?.company);

    if (!rawPhone) {

      AppAlert.alert('Relance impossible', "Cette entreprise n'a pas de numéro WhatsApp. Copie le message et envoie-le par un autre moyen.");

      return;

    }

    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(reminderMsg)}`;



    await recordApplicationReminder(app.id);

    setApplications((prev) =>

      prev.map((a) =>

        a.id === app.id ? { ...a, lastRemindedAt: new Date().toISOString() } : a

      )

    );



    if (Platform.OS === 'web') {

      window.open(waUrl, '_blank');

    } else {

      AppAlert.alert(

        'Message de relance J+7 préparé',

        reminderMsg,

        [

          { text: 'Envoyer sur WhatsApp', onPress: () => Linking.openURL(waUrl) },

          { text: 'Annuler', style: 'cancel' },

        ]

      );

    }

  };



  return (

    <View style={styles.container}>

      {/* ── Modern Header ────────────────────────────────────────── */}

      <View style={styles.header}>

        {onBack && (

          <Pressable onPress={onBack} testID="btn-timeline-back" style={styles.backBtn}>

            <ArrowLeft size={18} color={stitchColors.ink} />

          </Pressable>

        )}

        <View style={{ flex: 1 }}>

          <Text style={styles.title}>Suivi des Candidatures</Text>

          <Text style={styles.subtitle}>

            Historique, statut d'examen et relances auprès des recruteurs

          </Text>

        </View>

      </View>



      <ScrollView

        style={styles.scroll}

        contentContainerStyle={styles.scrollContent}

        showsVerticalScrollIndicator={false}

        refreshControl={

          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={stitchColors.secondary} />

        }

      >

        {/* Motivation Card */}

        <View style={styles.duoCard}>

          <View style={styles.duoHeader}>

            <View style={styles.duoIconCircle}>

              <Briefcase size={14} color="#A78BFA" />

            </View>

            <Text style={styles.duoBadgeText}>Conseil candidature</Text>

          </View>

          <Text style={styles.duoMessage}>

            « Relancer un recruteur à J+7 permet de confirmer votre motivation et d'accélérer le traitement de votre dossier. »

          </Text>

        </View>



        {loadError ? (

          <View style={styles.emptyBox}>

            <Text style={styles.emptyTitle}>Impossible de charger tes candidatures</Text>

            <Text style={styles.emptySubtitle}>{loadError}</Text>

            <Pressable style={styles.retryButton} onPress={onRefresh} accessibilityRole="button">

              <Text style={styles.retryText}>Réessayer</Text>

            </Pressable>

          </View>

        ) : applications.length === 0 ? (

          <View style={styles.emptyBox}>

            <View style={styles.emptyIconCircle}>

              <Clock size={36} color="#A78BFA" />

            </View>

            <Text style={styles.emptyTitle}>Aucune candidature enregistrée</Text>

            <Text style={styles.emptySubtitle}>

              Utilisez le bouton "Postuler" depuis les offres de stage pour enregistrer votre premier dossier.

            </Text>

          </View>

        ) : (

          applications.map((app) => {

            const conf = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;

            const StatusIcon = conf.icon;

            const daysElapsed = getDaysSinceApplication(app.appliedAt);

            const isPending = app.status === 'PENDING' || app.status === 'SENT_PENDING' || app.status === 'DELIVERED';

            const isEligibleReminder = isEligibleForFollowup(app);

            const refCode = `CAMPUS-${app.id.slice(0, 5).toUpperCase()}`;



            return (

              <View key={app.id} style={styles.ticketCard}>

                {/* Top Section: Ref & Status */}

                <View style={styles.ticketTopRow}>

                  <View style={styles.ticketRefBadge}>

                    <Text style={styles.ticketRefText}>{refCode}</Text>

                  </View>

                  <View

                    style={[styles.statusBadge, { backgroundColor: conf.bg, borderColor: conf.border }]}

                  >

                    <StatusIcon size={12} color={conf.text} />

                    <Text style={[styles.statusText, { color: conf.text }]}>{conf.label}</Text>

                  </View>

                </View>



                {/* Job Title & Company */}

                <Text style={styles.ticketJobTitle} numberOfLines={2}>{app.job?.title || 'Stage Professionnel'}</Text>

                <View style={styles.ticketCompanyRow}>

                  <Building2 size={13} color={stitchColors.inkSubtle} />

                  <Text style={styles.ticketCompanyName}>{app.job?.company?.name || 'Entreprise Partenaire'}</Text>

                  {app.job?.location && (

                    <>

                      <Text style={styles.ticketDot}>•</Text>

                      <MapPin size={12} color={stitchColors.inkSubtle} />

                      <Text style={styles.ticketLocationText}>{app.job.location}</Text>

                    </>

                  )}

                </View>



                {/* Urgent Followup J+7 Badge */}

                {isEligibleReminder && (

                  <View style={styles.urgentBanner} testID={`urgent-banner-${app.id}`}>

                    <Clock size={12} color={stitchColors.warningTone} />

                    <Text style={styles.urgentBannerText}>

                      Relance J+7 recommandée ({daysElapsed}j sans réponse)

                    </Text>

                  </View>

                )}

                {app.lastRemindedAt && (

                  <View style={styles.lastRemindedPill}>

                    <CheckCircle2 size={11} color="#A78BFA" />

                    <Text style={styles.lastRemindedText}>

                      Dernière relance envoyée le {new Date(app.lastRemindedAt).toLocaleDateString('fr-FR')}

                    </Text>

                  </View>

                )}



                {/* Perforated / Cutout Ticket Separator */}

                <View style={styles.ticketSeparator}>

                  <View style={styles.cutoutLeft} />

                  <View style={styles.dashedLine} />

                  <View style={styles.cutoutRight} />

                </View>



                {/* Candidate & Application Specs */}

                <View style={styles.ticketCandidateSection}>

                  <View style={styles.ticketMetaCol}>

                    <Text style={styles.ticketMetaLabel}>Candidat</Text>

                    <Text style={styles.ticketMetaValue}>{studentName || 'Étudiant'}</Text>

                  </View>



                  <View style={styles.ticketMetaCol}>

                    <Text style={styles.ticketMetaLabel}>Date de dépôt</Text>

                    <Text style={styles.ticketMetaValue}>

                      {new Date(app.appliedAt).toLocaleDateString('fr-FR', {

                        day: 'numeric',

                        month: 'short',

                        year: 'numeric',

                      })}

                    </Text>

                  </View>



                  {/* QR Code Verification Preview */}

                  <View style={styles.qrBox}>

                    <QrCode size={28} color={stitchColors.outline} />

                    <Text style={styles.qrLabel}>Vérifié</Text>

                  </View>

                </View>



                {app.notes && (

                  <View style={styles.notesBox}>

                    <Text style={styles.notesText}>{app.notes}</Text>

                  </View>

                )}



                {/* Primary Action: View Candidature Dossier (CV Officiel, Lettre RH, Entreprise & Notes) */}

                <Pressable

                  style={styles.viewDossierButton}

                  onPress={() => setSelectedApp(app)}

                  testID={`btn-view-dossier-${app.id}`}

                >

                  <View style={styles.viewDossierButtonLeft}>

                    <Eye size={15} color="#A78BFA" />

                    <Text style={styles.viewDossierButtonText}>👁️ Voir ma candidature & CV officiel</Text>

                  </View>

                  <ChevronRight size={16} color="#A78BFA" />

                </Pressable>



                {/* Ticket Actions */}

                <View style={styles.ticketFooter}>

                  {['PENDING', 'SENT_PENDING', 'DELIVERED', 'FAILED', 'REVIEWING'].includes(app.status) && (

                    <Pressable

                      style={styles.changeStatusPill}

                      onPress={() => handleWithdrawApplication(app.id)}

                    >

                      <Text style={styles.changeStatusPillText}>Retirer ma candidature</Text>

                    </Pressable>

                  )}



                  {isEligibleReminder ? (

                    <Pressable

                      testID={`btn-relance-j7-${app.id}`}

                      style={styles.reminderBtn}

                      onPress={() => handleSendReminder(app)}

                    >

                      <MessageSquare size={13} color={stitchColors.white} />

                      <Text style={styles.reminderBtnText}>💬 Relancer sur WhatsApp (J+7)</Text>

                    </Pressable>

                  ) : isPending ? (

                    <View style={styles.waitingBadge}>

                      <Clock size={11} color={stitchColors.inkSubtle} />

                      <Text style={styles.waitingBadgeText}>Dépôt il y a {daysElapsed}j (relance à J+7)</Text>

                    </View>

                  ) : null}

                </View>

              </View>

            );

          })

        )}

      </ScrollView>



      {/* Modal Dossier Complet Candidature (CV Officiel, Lettre, Suivi & Notes RH) */}

      <ApplicationDetailModal

        visible={!!selectedApp}

        application={selectedApp}

        studentName={studentName}

        onClose={() => setSelectedApp(null)}

        onStatusUpdated={(appId, newStatus) => {

          setApplications((prev) =>

            prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))

          );

          if (selectedApp && selectedApp.id === appId) {

            setSelectedApp({ ...selectedApp, status: newStatus });

          }

        }}

        onNotesUpdated={(appId, notes) => {

          setApplications((prev) =>

            prev.map((a) => (a.id === appId ? { ...a, notes } : a))

          );

          if (selectedApp && selectedApp.id === appId) {

            setSelectedApp({ ...selectedApp, notes });

          }

        }}

      />

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: stitchColors.background,

  },

  glowTop: {

    position: 'absolute',

    top: 0,

    right: 0,

    width: 250,

    height: 250,

    borderRadius: 125,

    backgroundColor: 'rgba(124, 58, 237, 0.08)',

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

    paddingTop: 18,

    paddingHorizontal: 20,

    paddingBottom: 16,

    backgroundColor: stitchColors.background,

    borderBottomWidth: 0.5,

    borderBottomColor: stitchColors.glassBorder,

  },

  backBtn: {

    width: 34,

    height: 34,

    borderRadius: 8,

    backgroundColor: stitchColors.paperSoft,

    alignItems: 'center',

    justifyContent: 'center',

  },

  title: {

    fontSize: 20,

    fontWeight: '600',

    color: stitchColors.ink,

    letterSpacing: -0.2,

  },

  subtitle: {

    fontSize: 12.5,

    color: stitchColors.inkSubtle,

    marginTop: 3,

  },

  scroll: {

    flex: 1,

  },

  scrollContent: {

    padding: 16,

    gap: 14,

    paddingBottom: 40,

  },

  duoCard: {

    backgroundColor: stitchColors.background,

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

    borderRadius: 12,

    padding: 14,

  },

  duoHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    marginBottom: 6,

  },

  duoIconCircle: {

    width: 26,

    height: 26,

    borderRadius: 6,

    backgroundColor: 'rgba(124, 58, 237, 0.14)',

    alignItems: 'center',

    justifyContent: 'center',

  },

  duoBadgeText: {

    color: '#A78BFA',

    fontSize: 11.5,

    fontWeight: '600',

  },

  duoMessage: {

    color: stitchColors.inkMuted,

    fontSize: 12.5,

    lineHeight: 18,

  },

  emptyBox: {

    padding: 32,

    alignItems: 'center',

    gap: 10,

    backgroundColor: stitchColors.background,

    borderRadius: 12,

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

    marginTop: 10,

  },

  emptyIconCircle: {

    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: 'rgba(124, 58, 237, 0.12)',

    alignItems: 'center',

    justifyContent: 'center',

  },

  emptyTitle: {

    fontSize: 15,

    fontWeight: '600',

    color: stitchColors.ink,

  },

  emptySubtitle: {

    fontSize: 12.5,

    color: stitchColors.inkSubtle,

    textAlign: 'center',

    lineHeight: 18,

  },

  retryButton: {

    marginTop: 6,

    paddingVertical: 10,

    paddingHorizontal: 18,

    borderRadius: 10,

    backgroundColor: stitchColors.primary,

  },

  retryText: {

    color: stitchColors.white,

    fontSize: 13.5,

    fontWeight: '700',

  },



  // Ticket Card (Anti-Saturation Calme)

  ticketCard: {

    backgroundColor: stitchColors.background,

    borderRadius: 12,

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

    padding: 16,

  },

  ticketTopRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 8,

  },

  ticketRefBadge: {

    backgroundColor: stitchColors.paperSoft,

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 6,

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

  },

  ticketRefText: {

    fontSize: 10.5,

    fontWeight: '500',

    color: stitchColors.inkMuted,

    letterSpacing: 0.4,

  },

  statusBadge: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 6,

    borderWidth: 0.5,

    gap: 4,

  },

  statusText: {

    fontSize: 11,

    fontWeight: '500',

  },

  ticketJobTitle: {

    fontSize: 15,

    fontWeight: '600',

    color: stitchColors.ink,

    lineHeight: 21,

    marginBottom: 4,

  },

  ticketCompanyRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    marginBottom: 12,

  },

  ticketCompanyName: {

    fontSize: 12,

    color: stitchColors.inkSubtle,

    fontWeight: '500',

  },

  ticketDot: {

    color: stitchColors.inkMuted,

    fontSize: 11,

  },

  ticketLocationText: {

    fontSize: 11.5,

    color: stitchColors.inkSubtle,

  },



  // Perforated line

  ticketSeparator: {

    position: 'relative',

    height: 18,

    justifyContent: 'center',

    marginHorizontal: -16,

    marginVertical: 4,

  },

  cutoutLeft: {

    position: 'absolute',

    left: -1,

    width: 12,

    height: 18,

    borderTopRightRadius: 9,

    borderBottomRightRadius: 9,

    backgroundColor: stitchColors.background,

    borderWidth: 0.5,

    borderLeftWidth: 0,

    borderColor: stitchColors.glassBorder,

  },

  cutoutRight: {

    position: 'absolute',

    right: -1,

    width: 12,

    height: 18,

    borderTopLeftRadius: 9,

    borderBottomLeftRadius: 9,

    backgroundColor: stitchColors.background,

    borderWidth: 0.5,

    borderRightWidth: 0,

    borderColor: stitchColors.glassBorder,

  },

  dashedLine: {

    marginHorizontal: 20,

    borderBottomWidth: 0.5,

    borderBottomColor: stitchColors.glassBorder,

    borderStyle: 'dashed',

  },



  ticketCandidateSection: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingVertical: 10,

  },

  ticketMetaCol: {

    flex: 1,

  },

  ticketMetaLabel: {

    fontSize: 10,

    color: stitchColors.inkSubtle,

    fontWeight: '500',

    textTransform: 'uppercase',

    letterSpacing: 0.4,

    marginBottom: 2,

  },

  ticketMetaValue: {

    fontSize: 12.5,

    fontWeight: '600',

    color: stitchColors.ink,

  },

  qrBox: {

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: stitchColors.paperSoft,

    borderRadius: 8,

    padding: 5,

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

  },

  qrLabel: {

    fontSize: 8.5,

    fontWeight: '500',

    color: stitchColors.inkSubtle,

    marginTop: 2,

  },



  notesBox: {

    backgroundColor: stitchColors.paperSoft,

    borderRadius: 8,

    padding: 8,

    marginBottom: 10,

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

  },

  notesText: {

    fontSize: 11.5,

    color: stitchColors.inkMuted,

  },

  ticketFooter: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingTop: 10,

    borderTopWidth: 0.5,

    borderTopColor: stitchColors.glassBorder,

  },

  changeStatusPill: {

    paddingHorizontal: 12,

    paddingVertical: 7,

    borderRadius: 6,

    backgroundColor: 'transparent',

    borderWidth: 0.5,

    borderColor: stitchColors.glassBorder,

  },

  changeStatusPillText: {

    fontSize: 11.5,

    color: stitchColors.inkSubtle,

    fontWeight: '500',

  },

  reminderBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    backgroundColor: stitchColors.primary,

    paddingHorizontal: 12,

    paddingVertical: 7,

    borderRadius: 6,

  },

  reminderBtnText: {

    fontSize: 11.5,

    fontWeight: '500',

    color: stitchColors.white,

  },

  urgentBanner: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    backgroundColor: 'rgba(245, 158, 11, 0.12)',

    borderWidth: 0.5,

    borderColor: 'rgba(245, 158, 11, 0.3)',

    borderRadius: 6,

    paddingHorizontal: 10,

    paddingVertical: 5,

    marginTop: 8,

  },

  urgentBannerText: {

    fontSize: 11,

    fontWeight: '600',

    color: '#FBBF24',

  },

  lastRemindedPill: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    marginTop: 6,

  },

  lastRemindedText: {

    fontSize: 10.5,

    color: '#A78BFA',

    fontStyle: 'italic',

  },

  waitingBadge: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    backgroundColor: stitchColors.paperSoft,

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 6,

  },

  waitingBadgeText: {

    fontSize: 11,

    color: stitchColors.inkSubtle,

  },

  viewDossierButton: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    backgroundColor: 'rgba(124, 58, 237, 0.12)',

    borderWidth: 1,

    borderColor: 'rgba(139, 92, 246, 0.35)',

    borderRadius: 8,

    paddingHorizontal: 12,

    paddingVertical: 10,

    marginTop: 10,

    marginBottom: 6,

  },

  viewDossierButtonLeft: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

  },

  viewDossierButtonText: {

    fontSize: 12.5,

    fontWeight: '600',

    color: stitchColors.primary,

  },

});

