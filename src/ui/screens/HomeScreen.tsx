import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  MapPin,
  Clock,
} from 'lucide-react-native';

import { type StudentProfile } from '../../features/auth/betterAuth';
import { fetchStageJobs, fetchStudentApplications } from '../../features/stages/stagesApi';
import { AiApplyModal } from '../../features/stages/AiApplyModal';
import type { StageApplication, StageJob, Transaction } from '../../types';
import {
  stitchColors,
  stitchRadius,
  stitchSpacing,
  stitchTypography,
} from '../../theme/stitch';
import { SearchFilterBar } from '../GlassComponents';

interface HomeScreenProps {
  studentProfile?: StudentProfile | null;
  studentName?: string;
  studentSkills?: string[];
  profileComplete: boolean;
  balance: number;
  iaCredits: number;
  transactions: Transaction[];
  onRecharge: () => void;
  onStages: () => void;
  onApplications: () => void;
  onDocuments: () => void;
  onResources: () => void;
  onProfile: () => void;
}

export function HomeScreen({
  studentProfile,
  studentName,
  studentSkills = [],
  balance,
  iaCredits,
  onRecharge,
  onStages,
  onApplications,
  onDocuments,
  onResources,
  onProfile,
}: HomeScreenProps) {
  const [jobs, setJobs] = useState<StageJob[]>([]);
  const [recentApp, setRecentApp] = useState<StageApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveSkills = useMemo(() => {
    if (studentSkills && studentSkills.length > 0) return studentSkills;
    if (studentProfile?.skills && studentProfile.skills.length > 0) return studentProfile.skills;
    return [];
  }, [studentSkills, studentProfile]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [jobsRes, appsRes] = await Promise.allSettled([
          fetchStageJobs({ userSkills: effectiveSkills }),
          fetchStudentApplications(),
        ]);

        if (active) {
          if (jobsRes.status === 'fulfilled') {
            setJobs(jobsRes.value);
          }
          if (appsRes.status === 'fulfilled' && appsRes.value.length > 0) {
            setRecentApp(appsRes.value[0]);
          }
        }
      } catch {
        // Fallback géré par stagesApi
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [effectiveSkills]);

  const recommendedJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    return jobs.slice(0, 6);
  }, [jobs]);

  const firstName = studentProfile?.name
    ? studentProfile.name.trim().split(' ')[0]
    : studentName
      ? studentName.trim().split(' ')[0]
      : 'Étudiant';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 1. En-tête Salutation & Contexte Étudiant ────────────────── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Bonjour, {firstName}</Text>
          <Text style={styles.greetingSubtitle} numberOfLines={1}>
            {studentProfile?.university || 'Université de Yaoundé I'} • {studentProfile?.faculty || 'Faculté des Sciences'}
          </Text>
        </View>

        {/* ── 2. Barre de Recherche Simple & Rapide ────────────────────── */}
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un stage, entreprise, ville..."
          onFilterPress={onStages}
          onSubmitEditing={onStages}
        />

        {/* ── 3. Raccourcis Outils (4 Actions Essentielles) ─────────────── */}
        <View style={styles.quickToolsGrid}>
          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onStages}
          >
            <View style={styles.quickToolIcon}>
              <Briefcase size={18} color="#A78BFA" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Stages</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onDocuments}
          >
            <View style={styles.quickToolIcon}>
              <FileText size={18} color="#A78BFA" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Mon CV</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onResources}
          >
            <View style={styles.quickToolIcon}>
              <BookOpen size={18} color="#A78BFA" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Cours PDF</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickToolCard, pressed && { opacity: 0.85 }]}
            onPress={onApplications}
          >
            <View style={styles.quickToolIcon}>
              <CheckCircle2 size={18} color="#A78BFA" strokeWidth={2} />
            </View>
            <Text style={styles.quickToolLabel}>Candidatures</Text>
          </Pressable>
        </View>

        {/* ── 4. Opportunités Recommandées Directes ────────────────────── */}
        <View style={styles.recommendedSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Offres recommandées</Text>
            <Pressable onPress={onStages} hitSlop={8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.seeAllText}>Voir tout</Text>
                <ChevronRight size={14} color="#A78BFA" />
              </View>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.loadingText}>Chargement des offres disponibles...</Text>
            </View>
          ) : recommendedJobs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aucune offre disponible pour le moment.</Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {recommendedJobs.map((job) => (
                <Pressable
                  key={job.id}
                  style={({ pressed }) => [styles.jobCard, pressed && { opacity: 0.9 }]}
                  onPress={() => setApplyingJob(job)}
                >
                  <View style={styles.jobCardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <View style={styles.companyRow}>
                        <Text style={styles.companyName} numberOfLines={1}>
                          {job.company?.name || 'Entreprise partenaire'}
                        </Text>
                        {job.company?.status === 'VERIFIED' && (
                          <CheckCircle2 size={12} color="#34D399" />
                        )}
                      </View>
                    </View>
                    <View style={styles.contractBadge}>
                      <Text style={styles.contractBadgeText}>{job.contractType || 'Stage'}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>{job.location || 'Douala / Yaoundé'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>{job.duration || '3 à 6 mois'}</Text>
                    </View>
                  </View>

                  <View style={styles.jobCardFooter}>
                    <Text style={styles.stipendText}>
                      {job.stipend || 'Indemnité de stage'}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setApplyingJob(job);
                      }}
                    >
                      <Text style={styles.applyBtnText}>Postuler</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Espace bas pour laisser respirer au-dessus de la BottomNav */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Modale de Candidature 1-Clic ─────────────────────────────── */}
      {applyingJob && (
        <AiApplyModal
          visible={Boolean(applyingJob)}
          onClose={() => setApplyingJob(null)}
          job={applyingJob}
          studentProfile={{
            fullName: studentProfile?.name || studentName || 'Étudiant',
            email: studentProfile?.email || '',
            phoneWhatsapp: studentProfile?.whatsappPhone,
            major: studentProfile?.faculty || 'Informatique & Télécoms',
            educationLevel: studentProfile?.level || 'Licence 3 / Master 1',
            skills: effectiveSkills,
            tokens: iaCredits,
          }}
          onApplicationComplete={() => {
            setApplyingJob(null);
            onApplications();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090714',
  },
  scrollContent: {
    paddingTop: 12,
  },

  // 1. En-tête Salutation
  greetingSection: {
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 14,
  },
  greetingTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },

  // 2. Raccourcis Outils (4 Cartes sobres)
  quickToolsGrid: {
    flexDirection: 'row',
    paddingHorizontal: stitchSpacing.containerMargin,
    gap: 8,
    marginBottom: 22,
  },
  quickToolCard: {
    flex: 1,
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickToolIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToolLabel: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
  },

  // 3. Offres Recommandées
  recommendedSection: {
    paddingHorizontal: stitchSpacing.containerMargin,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
  },

  // Jobs List & Cards
  jobsList: {
    gap: 10,
  },
  jobCard: {
    backgroundColor: '#120E22',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobTitle: {
    fontFamily: stitchTypography.displayHero.fontFamily,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  companyName: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    color: '#94A3B8',
  },
  contractBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  contractBadgeText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 11,
    fontWeight: '500',
    color: '#C4B5FD',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  stipendText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#34D399',
  },
  applyBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  applyBtnText: {
    fontFamily: stitchTypography.labelMd.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // États chargement & vide
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: stitchTypography.bodySm.fontFamily,
    fontSize: 12.5,
    color: '#94A3B8',
  },
});
