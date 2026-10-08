import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { BookOpen, Sparkles, FileText, Layers, GraduationCap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreScreen } from './ExploreScreen';
import { LibraryScreen } from './LibraryScreen';
import { ScrapedReportsView } from './ScrapedReportsView';
import type { CampusDocument, CampusPdfPack } from '../../types';
import { WritingWorkshopModal } from './WritingWorkshopModal';
import { stitchColors } from '../../theme/stitch';

interface ResourcesScreenProps {
  documents: CampusDocument[];
  packs: CampusPdfPack[];
  purchasedDocumentIds: string[];
  purchasedPackIds: string[];
  ownedDocuments: CampusDocument[];
  documentsLoading?: boolean;
  documentsError?: string;
  purchasingDocumentId?: string | null;
  purchasingPackId?: string | null;
  onBuyDocument?: (doc: CampusDocument) => void;
  onBuyPack?: (pack: CampusPdfPack) => void;
  onOpenPdf: (doc: CampusDocument) => void;
  onRefreshDocuments?: () => void;
  onOpenAssistant?: () => void;
}

export function ResourcesScreen({
  documents = [],
  packs = [],
  purchasedDocumentIds = [],
  purchasedPackIds = [],
  ownedDocuments = [],
  documentsLoading = false,
  documentsError = '',
  purchasingDocumentId = null,
  purchasingPackId = null,
  onBuyDocument = () => {},
  onBuyPack = () => {},
  onOpenPdf,
  onRefreshDocuments = () => {},
  onOpenAssistant,
}: ResourcesScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'catalogue' | 'library' | 'reports'>('catalogue');
  const [writingModalVisible, setWritingModalVisible] = useState(false);

  const ownedCount = ownedDocuments.length || purchasedDocumentIds.length;

  return (
    <View style={styles.container}>
      {/* Background ambient glow */}
      <View style={styles.glowTop} />

      {/* ── Refined Obsidian Violet Header ───────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.titleBadgeRow}>
              <GraduationCap size={18} color="#A78BFA" />
              <Text style={styles.title}>Ressources Académiques</Text>
            </View>
            <Text style={styles.subtitle}>
              Annales d'examens, fiches de révision et rapports de référence
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.writingBtn}
              onPress={() => setWritingModalVisible(true)}
            >
              <FileText size={13} color="#C4B5FD" />
              <Text style={styles.writingBtnText}>Atelier IA</Text>
            </Pressable>

            {onOpenAssistant && (
              <Pressable style={styles.assistantBtn} onPress={onOpenAssistant}>
                <Sparkles size={13} color="#34D399" />
                <Text style={styles.assistantBtnText}>Chat IA</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Modern Sub-Tab Pill Bar */}
        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTab, activeSubTab === 'catalogue' && styles.subTabActive]}
            onPress={() => setActiveSubTab('catalogue')}
          >
            <Layers
              size={14}
              color={activeSubTab === 'catalogue' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'catalogue' && styles.subTabTextActive,
              ]}
            >
              Épreuves ({documents.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.subTab, activeSubTab === 'library' && styles.subTabActive]}
            onPress={() => setActiveSubTab('library')}
          >
            <BookOpen
              size={14}
              color={activeSubTab === 'library' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'library' && styles.subTabTextActive,
              ]}
            >
              Bibliothèque ({ownedCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.subTab, activeSubTab === 'reports' && styles.subTabActive]}
            onPress={() => setActiveSubTab('reports')}
          >
            <FileText
              size={14}
              color={activeSubTab === 'reports' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'reports' && styles.subTabTextActive,
              ]}
            >
              Rapports de Stage
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Screen Body (without duplicate nested headers) ──────── */}
      <View style={styles.body}>
        {activeSubTab === 'catalogue' ? (
          <ExploreScreen
            documents={documents}
            packs={packs}
            purchasedDocumentIds={purchasedDocumentIds}
            loading={documentsLoading}
            error={documentsError}
            onBuyDocument={onBuyDocument}
            onBuyPack={onBuyPack}
            purchasingDocumentId={purchasingDocumentId}
            purchasingPackId={purchasingPackId}
            onRefresh={onRefreshDocuments}
            hideHeader={true}
          />
        ) : activeSubTab === 'library' ? (
          <LibraryScreen
            ownedDocuments={ownedDocuments}
            onOpenDocument={onOpenPdf}
            onExplore={() => setActiveSubTab('catalogue')}
            hideHeader={true}
          />
        ) : (
          <ScrapedReportsView
            onUseStructure={() => setWritingModalVisible(true)}
          />
        )}
      </View>

      {/* Writing Workshop Modal */}
      <WritingWorkshopModal
        visible={writingModalVisible}
        onClose={() => setWritingModalVisible(false)}
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
    top: -50,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  writingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  writingBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  assistantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  assistantBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: stitchColors.primary,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  subTabText: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
});
