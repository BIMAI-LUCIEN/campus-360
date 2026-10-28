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
import { stitchColors } from '../../theme/stitch';
import { AppAlert } from '../AppAlert';

const FIELDS = [
  'Tous',
  'Informatique / Génie Logiciel',
  'Réseaux & Télécoms',
  'Gestion & Comptabilité',
  'Marketing & Commerce',
  'Génie Civil',
];

// A report example must be a document. Social posts (TikTok, Facebook…) were
// scraped with AI-written titles that do not match the video: never shown.
const SOCIAL_HOST = /(tiktok\.com|facebook\.com|fb\.watch|instagram\.com|linkedin\.com|youtube\.com|youtu\.be)/i;
const SOCIAL_PLATFORMS = new Set(['TIKTOK', 'FACEBOOK', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE']);

export const isUsefulReport = (report: ScrapedStageReport) =>
  !SOCIAL_PLATFORMS.has(String(report.source_platform || '').toUpperCase()) &&
  !SOCIAL_HOST.test(report.file_url || '');

// Some scraped rows store the literal text "null" for a missing school or company.
const present = (value?: string | null) => (value && value.trim().toLowerCase() !== 'null' ? value : '');

interface ScrapedReportsViewProps {
  onUseStructure?: (report: ScrapedStageReport) => void;
}

export function ScrapedReportsView({ onUseStructure }: ScrapedReportsViewProps) {
  const [reports, setReports] = useState<ScrapedStageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeField, setActiveField] = useState('Tous');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [defenseTargetReport, setDefenseTargetReport] = useState<ScrapedStageReport | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setLoadError(false);
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
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (data?.success && Array.isArray(data.reports)) {
        setReports((data.reports as ScrapedStageReport[]).filter(isUsefulReport));
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.warn('Failed to load scraped reports:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeField]);

  const handleOpenSource = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() =>
        AppAlert.alert('Lien indisponible', "Impossible d'ouvrir ce document pour le moment."),
      );
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
          <Search size={16} color={stitchColors.inkSubtle} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un rapport, école, entreprise..."
            placeholderTextColor={stitchColors.inkMuted}
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

      {/* Reports List: the screen scrolls in AppShell, no nested scroll here. */}
      <View style={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={stitchColors.secondary} />
            <Text style={styles.loadingText}>Récupération des rapports de référence...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerBox}>
            <BookOpen size={36} color={stitchColors.inkMuted} />
            <Text style={styles.emptyTitle}>Rapports indisponibles</Text>
            <Text style={styles.emptySubtitle}>Impossible de charger les rapports pour le moment.</Text>
            <Pressable style={[styles.openDocBtn, { marginTop: 14 }]} onPress={loadReports}>
              <RefreshCw size={13} color={stitchColors.white} />
              <Text style={styles.openDocBtnText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.centerBox}>
            <BookOpen size={36} color={stitchColors.inkMuted} />
            <Text style={styles.emptyTitle}>Pas encore d'exemplaire vérifié</Text>
            <Text style={styles.emptySubtitle}>
              Seuls les vrais rapports (PDF, Word) vérifiés sont affichés ici. Essaie un autre domaine ou d'autres mots-clés.
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
                    <Award size={12} color={stitchColors.warningDeep} />
                    <Text style={styles.qualityText}>{item.quality_score}% Qualité</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.reportTitle} numberOfLines={3}>{item.title}</Text>

                {/* Meta Entities */}
                <View style={styles.metaRow}>
                  {present(item.school) ? (
                    <View style={styles.metaItem}>
                      <GraduationCap size={13} color={stitchColors.secondary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.school}
                      </Text>
                    </View>
                  ) : null}
                  {present(item.company) ? (
                    <View style={styles.metaItem}>
                      <Building2 size={13} color={stitchColors.emeraldDeep} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.company}
                      </Text>
                    </View>
                  ) : null}
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
                        <Layers size={13} color={stitchColors.secondary} />
                        <Text style={styles.tocToggleText}>
                          Sommaire & Plan Académique ({toc.length} sections)
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={16} color={stitchColors.inkSubtle} />
                      ) : (
                        <ChevronDown size={16} color={stitchColors.inkSubtle} />
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
                      <ExternalLink size={13} color={stitchColors.white} />
                      <Text style={styles.openDocBtnText}>Ouvrir l'exemplaire</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={styles.coachBtn}
                    onPress={() => setDefenseTargetReport(item)}
                  >
                    <Presentation size={13} color={stitchColors.soleilInk} />
                    <Text style={styles.coachBtnText}>Coach Soutenance</Text>
                  </Pressable>

                  {onUseStructure && (
                    <Pressable
                      style={styles.useStructureBtn}
                      onPress={() => onUseStructure(item)}
                    >
                      <Sparkles size={13} color={stitchColors.primary} />
                      <Text style={styles.useStructureBtnText}>Utiliser ce plan</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Defense Coach Modal */}
      {defenseTargetReport && (
        <DefenseCoachModal
          visible={!!defenseTargetReport}
          onClose={() => setDefenseTargetReport(null)}
          reportTitle={defenseTargetReport.title}
          field={defenseTargetReport.field}
          company={present(defenseTargetReport.company) || undefined}
          level={defenseTargetReport.level}
          abstract={defenseTargetReport.abstract}
          tableOfContents={
            Array.isArray(defenseTargetReport.table_of_contents) ? defenseTargetReport.table_of_contents : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: stitchColors.background,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: stitchColors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  searchInput: {
    flex: 1,
    color: stitchColors.ink,
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
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  chipActive: {
    backgroundColor: stitchColors.primary,
    borderColor: stitchColors.secondary,
  },
  chipText: {
    color: stitchColors.inkSubtle,
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: stitchColors.white,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: stitchColors.inkSubtle,
    fontSize: 13,
  },
  emptyTitle: {
    marginTop: 12,
    color: stitchColors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: 6,
    color: stitchColors.inkMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    backgroundColor: stitchColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    backgroundColor: stitchColors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qualityText: {
    color: stitchColors.warningDeep,
    fontSize: 10,
    fontWeight: '700',
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
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
    flexShrink: 1,
  },
  metaText: {
    color: stitchColors.inkSubtle,
    fontSize: 12,
    flexShrink: 1,
  },
  abstractText: {
    color: stitchColors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  tocSection: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
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
    color: stitchColors.primary,
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
    backgroundColor: stitchColors.secondary,
  },
  tocItemText: {
    color: stitchColors.inkSoft,
    fontSize: 12,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  openDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 140,
    gap: 6,
    backgroundColor: stitchColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openDocBtnText: {
    color: stitchColors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  coachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 140,
    gap: 6,
    backgroundColor: stitchColors.soleilBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.soleil,
  },
  coachBtnText: {
    color: stitchColors.soleilInk,
    fontSize: 12,
    fontWeight: '600',
  },
  useStructureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 140,
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  useStructureBtnText: {
    color: stitchColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
