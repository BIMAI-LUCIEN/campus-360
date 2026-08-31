import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { BookOpen, Sparkles, FileText, Layers } from 'lucide-react-native';
import { ExploreScreen } from './ExploreScreen';
import { LibraryScreen } from './LibraryScreen';
import type { CampusDocument, CampusPdfPack } from '../../types';

import { WritingWorkshopModal } from './WritingWorkshopModal';

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
  const [activeSubTab, setActiveSubTab] = useState<'catalogue' | 'library'>('catalogue');
  const [writingModalVisible, setWritingModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Sub-tabs header for secondary features */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Ressources & Révisions</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.writingBtn} onPress={() => setWritingModalVisible(true)}>
              <FileText size={13} color="#C084FC" />
              <Text style={styles.writingBtnText}>Atelier Écriture</Text>
            </Pressable>
            {onOpenAssistant && (
              <Pressable style={styles.assistantBtn} onPress={onOpenAssistant}>
                <Sparkles size={13} color="#A855F7" />
                <Text style={styles.assistantBtnText}>IA Chat</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTab, activeSubTab === 'catalogue' && styles.subTabActive]}
            onPress={() => setActiveSubTab('catalogue')}
          >
            <Layers size={14} color={activeSubTab === 'catalogue' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.subTabText, activeSubTab === 'catalogue' && styles.subTabTextActive]}>
              Catalogue d'Épreuves
            </Text>
          </Pressable>

          <Pressable
            style={[styles.subTab, activeSubTab === 'library' && styles.subTabActive]}
            onPress={() => setActiveSubTab('library')}
          >
            <BookOpen size={14} color={activeSubTab === 'library' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.subTabText, activeSubTab === 'library' && styles.subTabTextActive]}>
              Mes Documents ({ownedDocuments.length || purchasedDocumentIds.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content depending on sub-tab */}
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
          />
        ) : (
          <LibraryScreen
            ownedDocuments={ownedDocuments}
            onOpenDocument={onOpenPdf}
            onExplore={() => setActiveSubTab('catalogue')}
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
    backgroundColor: '#090D16',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  writingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  writingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C084FC',
  },
  assistantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  assistantBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: '#3B82F6',
  },
  subTabText: {
    fontSize: 12,
    color: '#94A3B8',
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
