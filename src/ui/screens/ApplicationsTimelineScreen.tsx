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
} from 'lucide-react-native';
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
  { label: string; bg: string; text: string; icon: any }
> = {
  PENDING: { label: 'En attente', bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24', icon: Clock },
  REVIEWING: { label: 'En revue', bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', icon: FileCheck },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC', icon: MessageSquare },
  ACCEPTED: { label: 'Accepté ! 🎉', bg: 'rgba(16, 185, 129, 0.18)', text: '#34D399', icon: CheckCircle2 },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', icon: XCircle },
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
      <View style={styles.header}>
        <Text style={styles.title}>Suivi des Candidatures</Text>
        <Text style={styles.subtitle}>
          Historique, mises à jour et relances automatisées
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* Duolingo-Style Re-engagement Motivation Card */}
        <View style={styles.duoCard}>
          <View style={styles.duoHeader}>
            <View style={styles.duoIconCircle}>
              <Sparkles size={16} color="#F59E0B" />
            </View>
            <Text style={styles.duoBadgeText}>Rappel Motivateur • Campus 360</Text>
          </View>
          <Text style={styles.duoMessage}>
            « Ton CV ne va pas se relancer tout seul ! 🏃‍♂️ Les recruteurs apprécient les étudiants proactifs qui prennent des nouvelles à J+7. »
          </Text>
        </View>

        {applications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Clock size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>Aucune candidature envoyée</Text>
            <Text style={styles.emptySubtitle}>
              Utilisez le bouton "L'IA postule" depuis le flux de stages pour démarrer.
            </Text>
          </View>
        ) : (
          applications.map((app, index) => {
            const conf = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = conf.icon;
            const isPendingLong = app.status === 'PENDING';

            return (
              <View key={app.id} style={styles.appCard}>
                <View style={styles.cardTop}>
                  <Pressable
                    style={[styles.statusBadge, { backgroundColor: conf.bg }]}
                    onPress={() => handleStatusChange(app.id, app.status)}
                  >
                    <StatusIcon size={13} color={conf.text} />
                    <Text style={[styles.statusText, { color: conf.text }]}>{conf.label}</Text>
                  </Pressable>
                  <Text style={styles.dateText}>
                    {new Date(app.appliedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>

                <Text style={styles.jobTitle}>{app.job?.title}</Text>
                <View style={styles.companyRow}>
                  <Building2 size={14} color="#94A3B8" />
                  <Text style={styles.companyName}>{app.job?.company?.name}</Text>
                </View>

                {app.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{app.notes}</Text>
                  </View>
                )}

                {/* Footer with Actions */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.changeStatusBtn}
                    onPress={() => handleStatusChange(app.id, app.status)}
                  >
                    <Text style={styles.changeStatusText}>Changer le statut</Text>
                  </Pressable>

                  {isPendingLong && (
                    <Pressable
                      style={styles.reminderBtn}
                      onPress={() => handleSendReminder(app)}
                    >
                      <Sparkles size={13} color="#C084FC" />
                      <Text style={styles.reminderBtnText}>Relancer par IA</Text>
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
    backgroundColor: '#090D16',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  appCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 13,
    color: '#94A3B8',
  },
  notesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  changeStatusBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeStatusText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  reminderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C084FC',
  },
  duoCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  duoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  duoIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  duoMessage: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
