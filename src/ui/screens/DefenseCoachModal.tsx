import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Sparkles,
  X,
  Presentation,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  Lightbulb,
  BookOpen,
} from 'lucide-react-native';
import { authFetch } from '../../features/auth/betterAuth';

interface DefenseCoachModalProps {
  visible: boolean;
  onClose: () => void;
  reportTitle?: string;
  field?: string;
  company?: string;
}

interface SlideItem {
  slide_number: number;
  title: string;
  timing_minutes: number;
  bullet_points: string[];
  speaker_notes: string;
}

interface JuryItem {
  question: string;
  trap_context: string;
  recommended_answer: string;
}

export function DefenseCoachModal({
  visible,
  onClose,
  reportTitle = 'Rapport de Stage Professionnel',
  field = 'Informatique / Général',
  company = "Entreprise d'Accueil",
}: DefenseCoachModalProps) {
  const [activeTab, setActiveTab] = useState<'slides' | 'jury' | 'tips'>('slides');
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [juryQuestions, setJuryQuestions] = useState<JuryItem[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [expandedJuryIdx, setExpandedJuryIdx] = useState<number | null>(0);
  const [loaded, setLoaded] = useState(false);

  const fetchCoaching = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/mobile/documents/defense-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reportTitle,
          field,
          company,
          level: 'Licence',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.coaching) {
          setSlides(data.coaching.presentation_plan || []);
          setJuryQuestions(data.coaching.jury_simulation || []);
          setTips(data.coaching.defense_tips || []);
          setLoaded(true);
        }
      }
    } catch (err) {
      console.warn('Erreur chargement coaching soutenance:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && !loaded) {
      fetchCoaching();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Sparkles size={14} color="#A78BFA" />
                <Text style={styles.badgeText}>Coach IA de Soutenance</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {reportTitle}
              </Text>
              <Text style={styles.subtitle}>
                {field} • {company}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Sub-Tabs */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, activeTab === 'slides' && styles.tabActive]}
              onPress={() => setActiveTab('slides')}
            >
              <Presentation size={13} color={activeTab === 'slides' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'slides' && styles.tabTextActive]}>
                Slides ({slides.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tab, activeTab === 'jury' && styles.tabActive]}
              onPress={() => setActiveTab('jury')}
            >
              <HelpCircle size={13} color={activeTab === 'jury' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'jury' && styles.tabTextActive]}>
                Questions Jury ({juryQuestions.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tab, activeTab === 'tips' && styles.tabActive]}
              onPress={() => setActiveTab('tips')}
            >
              <Lightbulb size={13} color={activeTab === 'tips' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'tips' && styles.tabTextActive]}>
                Conseils 18/20
              </Text>
            </Pressable>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>L'IA prépare ta soutenance d'élite...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'slides' && (
                <View style={styles.sectionContainer}>
                  {slides.map((s) => (
                    <View key={s.slide_number} style={styles.card}>
                      <View style={styles.slideHeader}>
                        <View style={styles.slideNumberBadge}>
                          <Text style={styles.slideNumberText}>Slide {s.slide_number}</Text>
                        </View>
                        <View style={styles.timingBadge}>
                          <Clock size={11} color="#34D399" />
                          <Text style={styles.timingText}>{s.timing_minutes} min</Text>
                        </View>
                      </View>

                      <Text style={styles.slideTitle}>{s.title}</Text>

                      <View style={styles.bulletList}>
                        {s.bullet_points.map((b, i) => (
                          <View key={i} style={styles.bulletRow}>
                            <View style={styles.dot} />
                            <Text style={styles.bulletText}>{b}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.notesBox}>
                        <Text style={styles.notesHeader}>🎙️ Ce que tu dois dire au jury :</Text>
                        <Text style={styles.notesText}>{s.speaker_notes}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {activeTab === 'jury' && (
                <View style={styles.sectionContainer}>
                  {juryQuestions.map((q, idx) => {
                    const isExpanded = expandedJuryIdx === idx;
                    return (
                      <View key={idx} style={styles.card}>
                        <Pressable
                          style={styles.juryToggle}
                          onPress={() => setExpandedJuryIdx(isExpanded ? null : idx)}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.juryQuestionNumber}>Question Piège #{idx + 1}</Text>
                            <Text style={styles.juryQuestionText}>{q.question}</Text>
                          </View>
                          {isExpanded ? (
                            <ChevronUp size={16} color="#A78BFA" />
                          ) : (
                            <ChevronDown size={16} color="#94A3B8" />
                          )}
                        </Pressable>

                        {isExpanded && (
                          <View style={styles.juryExpanded}>
                            <View style={styles.trapBox}>
                              <Text style={styles.trapLabel}>⚠️ Ce que le jury teste :</Text>
                              <Text style={styles.trapText}>{q.trap_context}</Text>
                            </View>

                            <View style={styles.answerBox}>
                              <Text style={styles.answerLabel}>💡 Réponse modèle recommandée :</Text>
                              <Text style={styles.answerText}>{q.recommended_answer}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {activeTab === 'tips' && (
                <View style={styles.sectionContainer}>
                  {tips.map((t, idx) => (
                    <View key={idx} style={styles.tipCard}>
                      <Award size={18} color="#FDE047" style={{ marginTop: 2 }} />
                      <Text style={styles.tipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 12, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F0C20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    maxHeight: '90%',
    minHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  badgeText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#090714',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 27, 58, 0.6)',
  },
  tabActive: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  centerBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A78BFA',
    marginTop: 12,
    fontSize: 13,
  },
  sectionContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#16122C',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slideNumberBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slideNumberText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timingText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  bulletList: {
    gap: 4,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B5CF6',
  },
  bulletText: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1,
  },
  notesBox: {
    backgroundColor: 'rgba(10, 7, 24, 0.7)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  notesHeader: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  notesText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 17,
  },
  juryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  juryQuestionNumber: {
    color: '#F43F5E',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  juryQuestionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  juryExpanded: {
    marginTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  trapBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  trapLabel: {
    color: '#FDA4AF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  trapText: {
    color: '#FECDD3',
    fontSize: 12,
    lineHeight: 16,
  },
  answerBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  answerLabel: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  answerText: {
    color: '#D1FAE5',
    fontSize: 12,
    lineHeight: 17,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#16122C',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.2)',
  },
  tipText: {
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
