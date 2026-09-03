import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {
  FileText,
  Search,
  ExternalLink,
  GraduationCap,
  Building2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Award,
  RefreshCw,
  Layers,
  Presentation,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScrapedStageReport } from '../../types';
import { authFetch } from '../../features/auth/betterAuth';
import { DefenseCoachModal } from './DefenseCoachModal';

const FIELDS = [
  'Tous',
  'Informatique / Génie Logiciel',
  'Réseaux & Télécoms',
  'Gestion & Comptabilité',
  'Marketing & Commerce',
  'Génie Civil',
];

interface ScrapedReportsViewProps {
  onUseStructure?: (report: ScrapedStageReport) => void;
}

export function ScrapedReportsView({ onUseStructure }: ScrapedReportsViewProps) {
  const [reports, setReports] = useState<ScrapedStageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeField, setActiveField] = useState('Tous');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [defenseTargetReport, setDefenseTargetReport] = useState<ScrapedStageReport | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeField !== 'Tous') {
        params.set('field', activeField);
      }
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const res = await authFetch(`/api/mobile/documents/scraped-reports${suffix}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reports)) {
          setReports(data.reports);
        }
      }
    } catch (err) {
      console.warn('Failed to load scraped reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeField]);

  const handleOpenSource = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (r.title || '').toLowerCase().includes(q) ||
      (r.school || '').toLowerCase().includes(q) ||
      (r.company || '').toLowerCase().includes(q) ||
      (r.abstract || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un rapport, école, entreprise..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadReports}
            returnKeyType="search"
          />
          <Pressable onPress={loadReports} style={styles.refreshBtn}>
            <RefreshCw size={14} color="#A78BFA" />
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {FIELDS.map((f) => {
            const isActive = activeField === f;
            return (
              <Pressable
                key={f}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveField(f)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Récupération des rapports de référence...</Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.centerBox}>
            <BookOpen size={36} color="#64748B" />
            <Text style={styles.emptyTitle}>Aucun rapport trouvé</Text>
            <Text style={styles.emptySubtitle}>
              Les agents IA moissonnent le web et les réseaux en continu. Réessaie avec d'autres mots-clés.
            </Text>
          </View>
        ) : (
          filteredReports.map((item) => {
            const isExpanded = expandedReportId === item.id;
            const toc = Array.isArray(item.table_of_contents) ? item.table_of_contents : [];

            return (
              <View key={item.id} style={styles.card}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.platformBadge}>
                      <Text style={styles.platformBadgeText}>{item.source_platform}</Text>
                    </View>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{item.level || 'Licence'}</Text>
                    </View>
                  </View>
                  <View style={styles.qualityBadge}>
                    <Award size={12} color="#FDE047" />
                    <Text style={styles.qualityText}>{item.quality_score}% Qualité</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.reportTitle}>{item.title}</Text>

                {/* Meta Entities */}
                <View style={styles.metaRow}>
                  {item.school && (
                    <View style={styles.metaItem}>
                      <GraduationCap size={13} color="#A78BFA" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.school}
                      </Text>
                    </View>
                  )}
                  {item.company && (
                    <View style={styles.metaItem}>
                      <Building2 size={13} color="#34D399" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.company}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Abstract */}
                {item.abstract ? (
                  <Text style={styles.abstractText} numberOfLines={isExpanded ? 10 : 2}>
                    {item.abstract}
                  </Text>
                ) : null}

                {/* Expandable Table of Contents */}
                {toc.length > 0 && (
                  <View style={styles.tocSection}>
                    <Pressable
                      style={styles.tocToggle}
                      onPress={() => setExpandedReportId(isExpanded ? null : item.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Layers size={13} color="#818CF8" />
                        <Text style={styles.tocToggleText}>
                          Sommaire & Plan Académique ({toc.length} sections)
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#94A3B8" />
                      ) : (
                        <ChevronDown size={16} color="#94A3B8" />
                      )}
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.tocList}>
                        {toc.map((sec, idx) => (
                          <View key={idx} style={styles.tocItem}>
                            <View style={styles.tocDot} />
                            <Text style={styles.tocItemText}>{sec}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Actions Footer */}
                <View style={styles.cardActions}>
                  {item.file_url ? (
                    <Pressable
                      style={styles.openDocBtn}
                      onPress={() => handleOpenSource(item.file_url)}
                    >
                      <ExternalLink size={13} color="#FFFFFF" />
                      <Text style={styles.openDocBtnText}>Ouvrir l'exemplaire</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={styles.coachBtn}
                    onPress={() => setDefenseTargetReport(item)}
                  >
                    <Presentation size={13} color="#FDE047" />
                    <Text style={styles.coachBtnText}>Coach Soutenance</Text>
                  </Pressable>

                  {onUseStructure && (
                    <Pressable
                      style={styles.useStructureBtn}
                      onPress={() => onUseStructure(item)}
                    >
                      <Sparkles size={13} color="#A78BFA" />
                      <Text style={styles.useStructureBtnText}>Utiliser ce plan</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Defense Coach Modal */}
      {defenseTargetReport && (
        <DefenseCoachModal
          visible={!!defenseTargetReport}
          onClose={() => setDefenseTargetReport(null)}
          reportTitle={defenseTargetReport.title}
          field={defenseTargetReport.field}
          company={defenseTargetReport.company}
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#090714',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 58, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  refreshBtn: {
    padding: 6,
  },
  filterList: {
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 27, 58, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  chipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#8B5CF6',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#131024',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  platformBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  platformBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  levelBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelBadgeText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '600',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qualityText: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '700',
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  abstractText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  tocSection: {
    backgroundColor: 'rgba(19, 16, 36, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  tocToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  tocToggleText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  tocList: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tocDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#818CF8',
  },
  tocItemText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  openDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openDocBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  coachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
  },
  coachBtnText: {
    color: '#FDE047',
    fontSize: 12,
    fontWeight: '600',
  },
  useStructureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  useStructureBtnText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
  },
});
