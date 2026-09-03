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
} from 'react-native';
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  Calendar,
  Send,
  Building2,
  HelpCircle,
  FileCheck,
  QrCode,
  MapPin,
  Briefcase,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { StageApplication, AppStatus } from '../../types';
import {
  fetchStudentApplications,
  updateApplicationStatus,
  generateFollowupReminderMessage,
} from '../../features/stages/stagesApi';

interface ApplicationsTimelineProps {
  studentName: string;
}

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING: { label: 'En attente', bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24', border: 'rgba(251, 191, 36, 0.35)', icon: Clock },
  REVIEWING: { label: 'En revue', bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.35)', icon: FileCheck },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.35)', icon: MessageSquare },
  ACCEPTED: { label: 'Accepté ! 🎉', bg: 'rgba(16, 185, 129, 0.18)', text: '#34D399', border: 'rgba(16, 185, 129, 0.35)', icon: CheckCircle2 },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.35)', icon: XCircle },
};

export function ApplicationsTimelineScreen({ studentName }: ApplicationsTimelineProps) {
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
      Alert.alert('Félicitations ! 🎓✨', 'Félicitations pour votre stage ! Nous célébrons votre réussite.');
    }
    loadData();
  };

  const handleSendReminder = (app: StageApplication) => {
    const reminderMsg = generateFollowupReminderMessage(app, studentName || 'Étudiant');
    const rawPhone = (app.job?.company?.contactWhatsapp || '').replace(/[^0-9]/g, '') || '2250708091011';
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(reminderMsg)}`;
    Alert.alert(
      'Relance IA Préparée',
      reminderMsg,
      [
        { text: 'Envoyer via WhatsApp', onPress: () => Linking.openURL(waUrl) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Background ambient glow */}
      <View style={styles.glowTop} />

      {/* ── Modern Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Suivi des Candidatures</Text>
        <Text style={styles.subtitle}>
          Historique, statut d'examen et relances automatisées par IA
        </Text>
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
              <Sparkles size={16} color="#F59E0B" />
            </View>
            <Text style={styles.duoBadgeText}>Conseil Recrutement • Campus 360</Text>
          </View>
          <Text style={styles.duoMessage}>
            « Les candidatures relancées à J+7 multiplient par 3 le taux de réponse des tuteurs de stage. »
          </Text>
        </View>

        {applications.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Clock size={36} color="#A78BFA" />
            </View>
            <Text style={styles.emptyTitle}>Aucune candidature enregistrée</Text>
            <Text style={styles.emptySubtitle}>
              Utilisez le bouton "Postuler 1-clic" depuis les offres de stage pour générer votre premier dossier.
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

                  {/* QR Code Verification Preview (From Image 1 Flight Ticket) */}
                  <View style={styles.qrBox}>
                    <QrCode size={34} color="#DDD6FE" />
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
                      style={styles.reminderPill}
                      onPress={() => handleSendReminder(app)}
                    >
                      <LinearGradient
                        colors={['#8B5CF6', '#7C3AED']}
                        style={styles.reminderGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.reminderPillText}>Relance IA WhatsApp</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
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
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0D0A1C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.12)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 40,
  },
  duoCard: {
    backgroundColor: '#131024',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 20,
    padding: 16,
  },
  duoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  duoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  duoMessage: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#131024',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Boarding Pass / Flight Ticket Card (Image 1 style) ───────────────────
  ticketCard: {
    backgroundColor: '#131024',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ticketRefBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  ticketRefText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DDD6FE',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 5,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  ticketJobTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 23,
    marginBottom: 6,
  },
  ticketCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  ticketCompanyName: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  ticketDot: {
    color: '#64748B',
    fontSize: 12,
  },
  ticketLocationText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Perforated line
  ticketSeparator: {
    position: 'relative',
    height: 20,
    justifyContent: 'center',
    marginHorizontal: -18,
    marginVertical: 4,
  },
  cutoutLeft: {
    position: 'absolute',
    left: -1,
    width: 14,
    height: 20,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#090714',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  cutoutRight: {
    position: 'absolute',
    right: -1,
    width: 14,
    height: 20,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: '#090714',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  dashedLine: {
    marginHorizontal: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(139, 92, 246, 0.25)',
    borderStyle: 'dashed',
  },

  ticketCandidateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  ticketMetaCol: {
    flex: 1,
  },
  ticketMetaLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ticketMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  qrLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DDD6FE',
    marginTop: 2,
  },

  notesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notesText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  changeStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0E0B1F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  changeStatusPillText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  reminderPill: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  reminderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reminderPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
