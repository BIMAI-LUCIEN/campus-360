import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
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
} from 'lucide-react-native';
import type { StageApplication, AppStatus } from '../../types';
import {
  fetchStudentApplications,
  updateApplicationStatus,
  generateFollowupReminderMessage,
} from '../../features/stages/stagesApi';
import { TrustBadgeStrip } from '../GlassComponents';

interface ApplicationsTimelineProps {
  studentName: string;
  onBack?: () => void;
}

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.25)', icon: Clock },
  REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: FileCheck },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.12)', text: '#A78BFA', border: 'rgba(124, 58, 237, 0.25)', icon: MessageSquare },
  ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
};

export function ApplicationsTimelineScreen({ studentName, onBack }: ApplicationsTimelineProps) {
  const [applications, setApplications] = useState<StageApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const data = await fetchStudentApplications();
    setApplications(data);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStatusChange = async (appId: string, currentStatus: AppStatus) => {
    const options: AppStatus[] = ['PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
    const nextStatus = options[(options.indexOf(currentStatus) + 1) % options.length];
    await updateApplicationStatus(appId, nextStatus);
    if (nextStatus === 'ACCEPTED') {
      Alert.alert('Félicitations !', 'Votre candidature a été acceptée par l’entreprise.');
    }
    loadData();
  };

  const handleSendReminder = (app: StageApplication) => {
    const reminderMsg = generateFollowupReminderMessage(app, studentName || 'Étudiant');
    const rawPhone = (app.job?.company?.contactWhatsapp || '').replace(/[^0-9]/g, '') || '2250708091011';
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(reminderMsg)}`;
    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Alert.alert(
        'Message de relance',
        reminderMsg,
        [
          { text: 'Envoyer via WhatsApp', onPress: () => Linking.openURL(waUrl) },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Background ambient glow */}
      <View style={styles.glowTop} />

      {/* ── Modern Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} testID="btn-timeline-back" style={styles.backBtn}>
            <ArrowLeft size={18} color="#FFFFFF" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
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

        {applications.length === 0 ? (
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
            const isPendingLong = app.status === 'PENDING';
            const refCode = `CAMPUS-${app.id.slice(0, 5).toUpperCase()}`;

            return (
              <View key={app.id} style={styles.ticketCard}>
                {/* Top Section: Ref & Status */}
                <View style={styles.ticketTopRow}>
                  <View style={styles.ticketRefBadge}>
                    <Text style={styles.ticketRefText}>{refCode}</Text>
                  </View>
                  <Pressable
                    style={[styles.statusBadge, { backgroundColor: conf.bg, borderColor: conf.border }]}
                    onPress={() => handleStatusChange(app.id, app.status)}
                  >
                    <StatusIcon size={12} color={conf.text} />
                    <Text style={[styles.statusText, { color: conf.text }]}>{conf.label}</Text>
                  </Pressable>
                </View>

                {/* Job Title & Company */}
                <Text style={styles.ticketJobTitle} numberOfLines={2}>{app.job?.title || 'Stage Professionnel'}</Text>
                <View style={styles.ticketCompanyRow}>
                  <Building2 size={13} color="#94A3B8" />
                  <Text style={styles.ticketCompanyName}>{app.job?.company?.name || 'Entreprise Partenaire'}</Text>
                  {app.job?.location && (
                    <>
                      <Text style={styles.ticketDot}>•</Text>
                      <MapPin size={12} color="#94A3B8" />
                      <Text style={styles.ticketLocationText}>{app.job.location}</Text>
                    </>
                  )}
                </View>

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
                    <QrCode size={28} color="#CBD5E1" />
                    <Text style={styles.qrLabel}>Vérifié</Text>
                  </View>
                </View>

                {app.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{app.notes}</Text>
                  </View>
                )}

                {/* Ticket Actions */}
                <View style={styles.ticketFooter}>
                  <Pressable
                    style={styles.changeStatusPill}
                    onPress={() => handleStatusChange(app.id, app.status)}
                  >
                    <Text style={styles.changeStatusPillText}>Modifier le statut</Text>
                  </Pressable>

                  {isPendingLong && (
                    <Pressable
                      style={styles.reminderBtn}
                      onPress={() => handleSendReminder(app)}
                    >
                      <MessageSquare size={13} color="#FFFFFF" />
                      <Text style={styles.reminderBtnText}>Relancer (J+7)</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
        <TrustBadgeStrip style={{ marginTop: 16, marginBottom: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090714',
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
    backgroundColor: '#120E22',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
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
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#CBD5E1',
    fontSize: 12.5,
    lineHeight: 18,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#120E22',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Ticket Card (Anti-Saturation Calme)
  ticketCard: {
    backgroundColor: '#120E22',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketRefBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  ticketRefText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#CBD5E1',
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
    color: '#FFFFFF',
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
    color: '#94A3B8',
    fontWeight: '500',
  },
  ticketDot: {
    color: '#64748B',
    fontSize: 11,
  },
  ticketLocationText: {
    fontSize: 11.5,
    color: '#94A3B8',
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
    backgroundColor: '#090714',
    borderWidth: 0.5,
    borderLeftWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cutoutRight: {
    position: 'absolute',
    right: -1,
    width: 12,
    height: 18,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
    backgroundColor: '#090714',
    borderWidth: 0.5,
    borderRightWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dashedLine: {
    marginHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  ticketMetaValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  qrLabel: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },

  notesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notesText: {
    fontSize: 11.5,
    color: '#CBD5E1',
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  changeStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  changeStatusPillText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  reminderBtnText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
