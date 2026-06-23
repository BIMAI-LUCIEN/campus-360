import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { createElement, useEffect, useMemo, useState } from 'react';
import { authBaseUrl } from '../auth/betterAuth';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import type { CampusDocument, CampusPdfPack } from '../../types';
import { createSignedPdfUrl, recordPdfAnalyticsEvent } from './pdfApi';
import { askPdfAssistant, type PdfAssistantMessage } from './pdfAssistant';
import { FileText, Sparkles, Calendar, HelpCircle, MessageSquare, Lock } from 'lucide-react-native';
type PdfStudentSectionProps = {
  documents: CampusDocument[];
  packs: CampusPdfPack[];
  purchasedDocumentIds: string[];
  purchasedPackIds: string[];
  onBuyDocument: (document: CampusDocument) => void;
  onBuyPack: (pack: CampusPdfPack) => void;
  formatCoins: (value: number) => string;
  accessToken?: string;
  loading?: boolean;
  error?: string;
  purchasingDocumentId?: string | null;
  purchasingPackId?: string | null;
  onRefresh?: () => void;
  externalTab?: TabKey;
};

type TabKey = 'packs' | 'catalog' | 'library';

const allValue = 'Tous';

const uniqueOptions = (values: string[]) => [
  allValue,
  ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
];

const getPackPriority = (pack: CampusPdfPack) => {
  const byType: Record<CampusPdfPack['packType'], number> = {
    exam_prep: 5,
    semester: 4,
    corrections: 4,
    course_bundle: 3,
    catch_up: 2,
    transversal: 1,
  };

  return byType[pack.packType] + Math.min(3, Math.round(pack.discountPercent / 10));
};

const getPackBadges = (pack: CampusPdfPack) => {
  const badges: string[] = [];

  if (pack.packType === 'exam_prep') badges.push('Ideal examen');
  if (pack.packType === 'semester') badges.push('Base semestre');
  if (pack.packType === 'corrections') badges.push('Revision rapide');
  if (pack.discountPercent >= 15) badges.push(`-${pack.discountPercent}%`);
  if (pack.documentCount >= 3) badges.push('Multi PDF');
  if (!badges.length) badges.push('Selection IA');

  return badges.slice(0, 3);
};

const getDocumentPriority = (document: CampusDocument) => {
  let score = 0;
  if (document.rating >= 4) score += 4;
  if (document.pageCount >= 30) score += 2;
  if (document.aiDifficulty === 'medium') score += 2;
  if (document.aiDifficulty === 'hard') score += 3;
  if ((document.aiTags?.length ?? 0) >= 3) score += 1;
  if (document.sales >= 10) score += 2;
  return score;
};

const getDocumentBadges = (document: CampusDocument) => {
  const badges: string[] = [];
  if (document.aiDifficulty === 'easy') badges.push('Lecture simple');
  if (document.aiDifficulty === 'medium') badges.push('Bon niveau');
  if (document.aiDifficulty === 'hard') badges.push('Niveau avance');
  if (document.rating >= 4) badges.push('Bien note');
  if (document.pageCount >= 30) badges.push('Complet');
  if (document.quiz?.length) badges.push('Quiz IA');
  if (!badges.length) badges.push('Selection PDF');
  return badges.slice(0, 3);
};

export function PdfStudentSection({
  documents,
  packs,
  purchasedDocumentIds,
  purchasedPackIds,
  onBuyDocument,
  onBuyPack,
  formatCoins,
  accessToken,
  loading = false,
  error = '',
  purchasingDocumentId = null,
  purchasingPackId = null,
  onRefresh,
  externalTab,
}: PdfStudentSectionProps) {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [activeTab, setActiveTab] = useState<TabKey>('packs');
  const isLibraryView = externalTab === 'library';
  const [activeTool, setActiveTool] = useState<'pdf' | 'summary' | 'plan' | 'quiz' | 'assistant'>('pdf');
  const [query, setQuery] = useState('');
  const [university, setUniversity] = useState(allValue);
  const [faculty, setFaculty] = useState(allValue);
  const [subject, setSubject] = useState(allValue);
  const [level, setLevel] = useState(allValue);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<CampusDocument | null>(null);
  const [selectedPack, setSelectedPack] = useState<CampusPdfPack | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [readerDocument, setReaderDocument] = useState<CampusDocument | null>(null);
  const [readerUrl, setReaderUrl] = useState('');
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState('');
  const [isReaderPreview, setIsReaderPreview] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<PdfAssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [isFullscreenReader, setIsFullscreenReader] = useState(false);
  const [pdfLayoutMode, setPdfLayoutMode] = useState<'pdf' | 'split' | 'chat'>('split');

  useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
    }
  }, [externalTab]);

  const publishedDocuments = useMemo(
    () => documents.filter((document) => document.status === 'published'),
    [documents],
  );
  const publishedPacks = useMemo(
    () => packs.filter((pack) => pack.status === 'published'),
    [packs],
  );
  const packUnlockedDocumentIds = useMemo(
    () =>
      publishedPacks
        .filter((pack) => purchasedPackIds.includes(pack.id))
        .flatMap((pack) => pack.documentIds),
    [publishedPacks, purchasedPackIds],
  );
  const ownedDocumentIds = useMemo(
    () => Array.from(new Set([...purchasedDocumentIds, ...packUnlockedDocumentIds])),
    [packUnlockedDocumentIds, purchasedDocumentIds],
  );

  const subjects = useMemo(() => {
    const fromDocs = uniqueOptions(publishedDocuments.map((d) => d.subject)).filter(s => s !== 'Tous');
    const defaults = [
      'Algèbre', 'Analyse Mathématique', 'Programmation C/C++', 'Droit Administratif', 
      'Microéconomie', 'Macroéconomie', 'Biologie Cellulaire', 'Réseaux Informatiques', 
      'Comptabilité Générale', 'Physique Quantique'
    ];
    return ['Tous', ...Array.from(new Set([...fromDocs, ...defaults]))];
  }, [publishedDocuments]);

  const universities = useMemo(() => {
    const fromDocs = uniqueOptions(publishedDocuments.map((d) => d.university)).filter(u => u !== 'Tous');
    const defaults = [
      'Université de Douala', 'Université de Yaoundé I', 'Université de Yaoundé II', 
      'Université de Dschang', 'Université de Buea', 'Université de Bamenda', 
      'Université de Ngaoundéré', 'Université de Maroua', 'ENSP (Polytechnique)', 
      'ENAM', 'IUC', 'IUT', 'IUG', 'UCAC'
    ];
    return ['Tous', ...Array.from(new Set([...fromDocs, ...defaults]))];
  }, [publishedDocuments]);

  const faculties = useMemo(() => {
    const fromDocs = uniqueOptions(publishedDocuments.map((d) => d.faculty)).filter(f => f !== 'Tous');
    const defaults = [
      'Informatique et Génie Logiciel', 'Génie Informatique', 'Génie Réseaux et Télécommunications',
      'Génie Électrique', 'Génie Civil', 'Génie Mécanique', 'Techniques de Commercialisation', 
      'Logistique Industrielle', 'Gestion Comptable et Financière', 'Médecine et Pharmacie', 
      'Droit et Sciences Politiques', 'Sciences Économiques et Gestion', 'Ingénierie et Technologies', 
      'Lettres et Sciences Humaines', 'Mathématiques et Physique', 'Comptabilité et Finance', 
      'Communication', 'Agronomie'
    ];
    return ['Tous', ...Array.from(new Set([...fromDocs, ...defaults]))];
  }, [publishedDocuments]);

  const levels = useMemo(() => {
    const fromDocs = uniqueOptions(publishedDocuments.map((d) => d.level)).filter(l => l !== 'Tous');
    const defaults = [
      'Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2', 
      'BTS 1ère année', 'BTS 2ème année', 'Cycle Ingénieur'
    ];
    return ['Tous', ...Array.from(new Set([...fromDocs, ...defaults]))];
  }, [publishedDocuments]);

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = publishedDocuments.filter((document) => {
      const owned = ownedDocumentIds.includes(document.id);
      const matchesTab = activeTab === 'catalog' || owned;
      const matchesUniversity = university === allValue || document.university === university;
      const matchesFaculty = faculty === allValue || document.faculty === faculty;
      const matchesSubject = subject === allValue || document.subject === subject;
      const matchesLevel = level === allValue || document.level === level;
      const matchesQuery =
        !normalizedQuery ||
        [
          document.title,
          document.description,
          document.subject,
          document.teacher,
          document.level,
          document.faculty,
          document.university,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesTab && matchesUniversity && matchesFaculty && matchesSubject && matchesLevel && matchesQuery;
    });

    return filtered.sort((left, right) => {
      const leftOwned = ownedDocumentIds.includes(left.id) ? 1 : 0;
      const rightOwned = ownedDocumentIds.includes(right.id) ? 1 : 0;
      if (activeTab === 'library' && leftOwned !== rightOwned) return rightOwned - leftOwned;

      const leftScore = getDocumentPriority(left);
      const rightScore = getDocumentPriority(right);
      if (leftScore !== rightScore) return rightScore - leftScore;

      return right.pageCount - left.pageCount;
    });
  }, [activeTab, faculty, level, ownedDocumentIds, publishedDocuments, query, subject, university]);

  const visiblePacks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = publishedPacks.filter((pack) => {
      const owned = purchasedPackIds.includes(pack.id);
      const matchesTab = activeTab === 'packs' || (activeTab === 'library' && owned);
      const matchesUniversity = university === allValue || pack.university === university || pack.university === 'Multi-etablissements';
      const matchesFaculty = faculty === allValue || pack.faculty === faculty || pack.faculty === 'Transversal';
      const matchesLevel = level === allValue || pack.level === level || pack.level === 'Tous niveaux';
      const matchesQuery =
        !normalizedQuery ||
        [pack.title, pack.description, pack.university, pack.faculty, pack.level, pack.semester]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesTab && matchesUniversity && matchesFaculty && matchesLevel && matchesQuery;
    });

    return filtered.sort((left, right) => {
      const leftOwned = purchasedPackIds.includes(left.id) ? 1 : 0;
      const rightOwned = purchasedPackIds.includes(right.id) ? 1 : 0;
      if (activeTab === 'library' && leftOwned !== rightOwned) return rightOwned - leftOwned;

      const leftScore = getPackPriority(left);
      const rightScore = getPackPriority(right);
      if (leftScore !== rightScore) return rightScore - leftScore;

      return right.documentCount - left.documentCount;
    });
  }, [activeTab, faculty, level, publishedPacks, purchasedPackIds, query, university]);

  const featuredPack = activeTab === 'packs' ? visiblePacks[0] ?? null : null;
  const featuredDocument = activeTab === 'catalog' ? visibleDocuments[0] ?? null : null;

  const purchasedCount = publishedDocuments.filter((document) =>
    ownedDocumentIds.includes(document.id),
  ).length;
  const ownedPageCount = publishedDocuments
    .filter((document) => ownedDocumentIds.includes(document.id))
    .reduce((sum, document) => sum + document.pageCount, 0);
  const hasActiveFilters =
    Boolean(query.trim()) ||
    university !== allValue ||
    faculty !== allValue ||
    subject !== allValue ||
    level !== allValue;
  const activeFilterCount = [university, faculty, subject, level].filter((item) => item !== allValue).length;
  const filterSections = [
    { key: 'university', label: 'Universite', options: universities, value: university, onChange: setUniversity },
    { key: 'faculty', label: 'Filiere', options: faculties, value: faculty, onChange: setFaculty },
    { key: 'subject', label: 'Matiere', options: subjects, value: subject, onChange: setSubject },
    { key: 'level', label: 'Niveau', options: levels, value: level, onChange: setLevel },
  ] as const;
  const filterSummary = filterSections.filter((section) => section.value !== allValue);

  useEffect(() => {
    if (loading || !hasActiveFilters) return;

    const timeoutId = setTimeout(() => {
      recordPdfAnalyticsEvent({
        eventType: 'search',
        accessToken,
        metadata: {
          tab: activeTab,
          query: query.trim(),
          university,
          faculty,
          subject,
          level,
          resultCount: visibleDocuments.length,
        },
      });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [
    accessToken,
    activeTab,
    faculty,
    hasActiveFilters,
    level,
    loading,
    query,
    subject,
    university,
    visibleDocuments.length,
  ]);

  const resetFilters = () => {
    setQuery('');
    setUniversity(allValue);
    setFaculty(allValue);
    setSubject(allValue);
    setLevel(allValue);
  };

  const getPackDocuments = (pack: CampusPdfPack) =>
    pack.documentIds
      .map((documentId) => publishedDocuments.find((document) => document.id === documentId))
      .filter((document): document is CampusDocument => Boolean(document));

  const openPreview = async (document: CampusDocument) => {
    setReaderDocument(document);
    setIsReaderPreview(true);
    setReaderUrl('');
    setReaderError('');
    setReaderLoading(true);
    recordPdfAnalyticsEvent({
      eventType: 'preview_open',
      documentId: document.id,
      accessToken,
      metadata: {
        hasPreview: Boolean(document.previewPath),
        subject: document.subject,
        level: document.level,
      },
    });

    if (!document.previewPath) {
      setReaderError("Aperçu non disponible pour ce document.");
      setReaderLoading(false);
      return;
    }

    try {
      const url = await createSignedPdfUrl('document-previews', document.previewPath, accessToken, 900);
      setReaderUrl(url);
    } catch (openError) {
      setReaderError(openError instanceof Error ? openError.message : 'Preview indisponible.');
    } finally {
      setReaderLoading(false);
    }
  };

  const closeReader = () => {
    setReaderDocument(null);
    setReaderUrl('');
    setReaderError('');
    setReaderLoading(false);
    setIsFullscreenReader(false);
    setActiveTool('pdf');
    setIsReaderPreview(false);
  };

  const openDocument = async (document: CampusDocument) => {
    if (ownedDocumentIds.includes(document.id)) {
      setReaderDocument(document);
      setIsReaderPreview(false);
      setReaderUrl('');
      setReaderError('');
      recordPdfAnalyticsEvent({
        eventType: 'reader_open',
        documentId: document.id,
        accessToken,
        metadata: {
          subject: document.subject,
          level: document.level,
        },
      });
      setAssistantMessages([
        {
          id: `assistant-${document.id}`,
          role: 'assistant',
          content: `Que veux-tu reviser sur "${document.title}" ?`,
        },
      ]);
      if (!accessToken) {
        setReaderError('Connexion requise pour ouvrir le PDF.');
        return;
      }

      setReaderLoading(true);
      try {
        const url = await createSignedPdfUrl('documents', document.filePath, accessToken, 1800);
        setReaderUrl(url);
      } catch (openError) {
        setReaderError(openError instanceof Error ? openError.message : 'PDF indisponible.');
      } finally {
        setReaderLoading(false);
      }
      return;
    }

    await openPreview(document);
  };

  const askAssistant = async (question: string) => {
    const document = readerDocument;
    const cleanQuestion = question.trim();
    if (!document || !cleanQuestion || assistantLoading) return;

    const userMessage: PdfAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanQuestion,
    };
    const nextMessages = [...assistantMessages, userMessage];
    setAssistantMessages(nextMessages);
    setAssistantInput('');
    setAssistantLoading(true);
    recordPdfAnalyticsEvent({
      eventType: 'assistant_question',
      documentId: document.id,
      accessToken,
      metadata: {
        questionLength: cleanQuestion.length,
      },
    });

    try {
      const answer = await askPdfAssistant({ document, question: cleanQuestion, messages: nextMessages });
      setAssistantMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: answer },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Je ne peux pas joindre le serveur IA maintenant. Reessaie dans un instant.';
      setAssistantMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <View>
      {isLibraryView ? (
        <View style={styles.libraryHeadingSection}>
          <Text style={styles.libraryHeadingTitle}>Mes Achats</Text>
          <Text style={styles.libraryHeadingSubtitle}>
            Retrouve ici tous les PDF et Packs que tu as débloqués.
          </Text>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.resultRow}>
            <Text style={styles.resultText}>
              {activeTab === 'packs' ? `${visiblePacks.length} packs` : `${visibleDocuments.length} PDF`}
            </Text>
            {hasActiveFilters ? (
              <Pressable style={styles.clearButton} onPress={resetFilters}>
                <Text style={styles.clearButtonText}>Effacer</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.segment}>
            {([
              ['packs', `Packs (${publishedPacks.length})`],
              ['catalog', 'PDF'],
            ] as Array<[TabKey, string]>).map(([key, label]) => {
              const active = activeTab === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => setActiveTab(key)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Titre, matiere, prof..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <View style={styles.filterToolbar}>
            <Pressable style={styles.filterTrigger} onPress={() => setFiltersVisible(true)}>
              <Text style={styles.filterTriggerText}>Filtres</Text>
              {activeFilterCount ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterSummaryRow}
            >
              {filterSummary.length ? (
                filterSummary.map((section) => (
                  <Pressable key={section.key} style={styles.summaryChip} onPress={() => setFiltersVisible(true)}>
                    <Text style={styles.summaryChipLabel}>{section.label}</Text>
                    <Text style={styles.summaryChipValue} numberOfLines={1}>{section.value}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.summaryChipMuted}>
                  <Text style={styles.summaryChipMutedText}>Tous les etablissements</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.statePanel}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeText}>...</Text>
          </View>
          <Text style={styles.stateTitle}>Chargement du catalogue</Text>
          <Text style={styles.bodyMuted}>On recupere les PDF, packs et filtres disponibles.</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.statePanel}>
          <View style={[styles.stateBadge, styles.stateBadgeAlert]}>
            <Text style={styles.stateBadgeText}>!</Text>
          </View>
          <Text style={styles.stateTitle}>Catalogue indisponible</Text>
          <Text style={styles.bodyMuted}>{error}</Text>
          {onRefresh ? (
            <Pressable style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Reessayer</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !error && activeTab === 'packs' && visiblePacks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeText}>+</Text>
          </View>
          <Text style={styles.stateTitle}>Aucun pack</Text>
          <Text style={styles.bodyMuted}>
            Essaie une autre recherche ou regarde les PDF.
          </Text>
        </View>
      ) : null}

      {!loading && !error && activeTab === 'catalog' && visibleDocuments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeText}>0</Text>
          </View>
          <Text style={styles.stateTitle}>Aucun PDF</Text>
          <Text style={styles.bodyMuted}>Essaie une autre recherche.</Text>
        </View>
      ) : null}

      {!loading && !error && activeTab === 'library' && visiblePacks.length === 0 && visibleDocuments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeText}>0</Text>
          </View>
          <Text style={styles.stateTitle}>Aucun achat</Text>
          <Text style={styles.bodyMuted}>Tu n'as pas encore de PDF ou de Pack acheté.</Text>
        </View>
      ) : null}

      {!loading && !error && activeTab === 'library' && (visiblePacks.length > 0 || visibleDocuments.length > 0) ? (
        <View style={styles.sectionStrip}>
          <View style={styles.flex}>
            <Text style={styles.sectionStripEyebrow}>Bibliotheque</Text>
            <Text style={styles.sectionStripTitle}>Tes contenus debloques</Text>
            <Text style={styles.bodyMuted}>
              {purchasedCount} PDF, {purchasedPackIds.length} packs et {ownedPageCount} pages disponibles pour reprendre vite.
            </Text>
          </View>
        </View>
      ) : null}

      {!loading && !error && activeTab === 'packs' && visiblePacks.length > 0 ? (
        <View style={[styles.sectionStrip, { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }]}>
          <View style={styles.flex}>
            <Text style={[styles.sectionStripEyebrow, { fontSize: 13, textTransform: 'none', color: '#64748B', marginBottom: 4 }]}>💼 Packs academiques</Text>
            <Text style={[styles.sectionStripTitle, { fontSize: 18, color: '#1E293B', marginBottom: 6 }]}>Des lots plus rentables pour ton semestre</Text>
            <Text style={[styles.bodyMuted, { fontSize: 13, color: '#94A3B8' }]}>
              {visiblePacks.length} packs disponibles et {formatCoins(
                Math.max(0, visiblePacks.reduce((sum, pack) => sum + Math.max(0, pack.originalPrice - pack.price), 0)),
              )} C d economie potentielle.
            </Text>
          </View>
          {featuredPack ? (
            <Pressable style={styles.sectionStripLink} onPress={() => setSelectedPack(featuredPack)}>
              <Text style={styles.sectionStripLinkText}>Voir le recommande</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !error && activeTab === 'catalog' && visibleDocuments.length > 0 ? (
        <View style={[styles.sectionStrip, { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }]}>
          <View style={styles.flex}>
            <Text style={[styles.sectionStripEyebrow, { fontSize: 13, textTransform: 'none', color: '#64748B', marginBottom: 4 }]}>📖 Ton catalogue</Text>
            <Text style={[styles.sectionStripTitle, { fontSize: 18, color: '#1E293B', marginBottom: 6 }]}>Trouve rapidement le bon support</Text>
            <Text style={[styles.bodyMuted, { fontSize: 13, color: '#94A3B8' }]}>
              {visibleDocuments.length} PDF visibles, {subjects.length - 1} matieres et des filtres pour aller droit au bon document.
            </Text>
          </View>
          {featuredDocument ? (
            <Pressable style={styles.sectionStripLink} onPress={() => openPreview(featuredDocument)}>
              <Text style={styles.sectionStripLinkText}>Preview du recommande</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !error && activeTab !== 'catalog' ? (
        visiblePacks.map((pack) => {
          const owned = purchasedPackIds.includes(pack.id);
          const purchasing = purchasingPackId === pack.id;
          const packDocuments = getPackDocuments(pack);
          const readCount = packDocuments.filter((document) => ownedDocumentIds.includes(document.id)).length;
          const inLibrary = activeTab === 'library';
          const savings = Math.max(0, pack.originalPrice - pack.price);

          return (
            <LinearGradient
              key={pack.id}
              colors={inLibrary ? ['#F4FAFF', '#FFFFFF'] : ['#FFFFFF', '#F8FCFF']}
              style={[styles.packCard, inLibrary && styles.libraryPackCard, { flexDirection: 'column', gap: 16, padding: 20, borderRadius: 24, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: inLibrary ? '#E0F2FE' : '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: inLibrary ? '#0284C7' : '#475569', fontSize: 24 }}>💼</Text>
                </View>

                <View style={[styles.flex]}>
                  <View style={[styles.titleRow, { justifyContent: 'space-between' }]}>
                    <Text style={[styles.cardTitle, { flex: 1, fontSize: 18, color: '#1E293B', fontWeight: '700', lineHeight: 24 }]} numberOfLines={2}>{pack.title}</Text>
                    <View style={{ backgroundColor: owned ? '#ECFDF5' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12, alignSelf: 'flex-start' }}>
                      <Text style={{ color: owned ? '#059669' : '#1D4ED8', fontSize: 13, fontWeight: 'bold' }}>
                        {owned ? 'Achete' : `${formatCoins(pack.price)} C`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.bodyMuted, { fontSize: 14, color: '#64748B', marginTop: 4 }]}>{pack.university} • {pack.level}</Text>
                  
                  {pack.description ? (
                    <Text style={[styles.description, { fontSize: 13, color: '#94A3B8', marginTop: 8, lineHeight: 20 }]} numberOfLines={2}>{pack.description}</Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.badgeRow, { marginTop: 4, gap: 8 }]}>
                {getPackBadges(pack).map((badge) => (
                  <View key={badge} style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>{badge}</Text>
                  </View>
                ))}
                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{pack.documentCount} PDF</Text>
                </View>
                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{pack.pageCount} p.</Text>
                </View>
                <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#059669', fontSize: 12, fontWeight: 'bold' }}>-{pack.discountPercent}%</Text>
                </View>
              </View>

              <View style={[styles.packProgressTrack, { backgroundColor: '#F1F5F9', height: 6, borderRadius: 3, marginTop: 4 }]}>
                <View
                  style={[
                    styles.packProgressFill,
                    { height: 6, borderRadius: 3, backgroundColor: '#3B82F6', width: `${pack.documentCount ? Math.min(100, Math.round((readCount / pack.documentCount) * 100)) : 0}%` },
                  ]}
                />
              </View>
              <Text style={[styles.metaText, { fontSize: 12, color: '#94A3B8', marginTop: -4 }]}>
                {owned
                  ? `${readCount}/${pack.documentCount} PDF lus`
                  : `Economie: ${formatCoins(Math.max(0, pack.originalPrice - pack.price))} C`}
              </Text>

              <View style={[styles.actionRow, { marginTop: 8, gap: 12 }]}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, { flex: 1, backgroundColor: 'transparent', borderColor: '#E2E8F0', borderWidth: 1, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => setSelectedPack(pack)} 
                >
                  <Text style={[styles.secondaryButtonText, { color: '#1E293B', fontWeight: '700' }]}>{inLibrary ? 'Contenu' : 'Details'}</Text>
                </Pressable>
                <Pressable
                  disabled={purchasing}
                  style={({ pressed }) => [styles.primaryButton, { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, backgroundColor: purchasing ? '#94A3B8' : (owned && inLibrary ? '#1E3A8A' : '#2563EB'), opacity: pressed || purchasing ? 0.8 : 1 }]}
                  onPress={() => (owned ? setSelectedPack(pack) : onBuyPack(pack))}
                >
                  <Text style={[styles.primaryButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>{purchasing ? 'Achat...' : owned ? (inLibrary ? 'Continuer' : 'Ouvrir') : 'Acheter pack'}</Text>
                </Pressable>
              </View>
            </LinearGradient>
          );
        })
      ) : null}

      {!loading && !error && activeTab !== 'packs' ? (
        visibleDocuments.map((document) => {
          const owned = ownedDocumentIds.includes(document.id);
          const purchasing = purchasingDocumentId === document.id;
          const inLibrary = activeTab === 'library';
          return (
            <LinearGradient
              key={document.id}
              colors={inLibrary ? ['#F4FAFF', '#FFFFFF'] : ['#FFFFFF', '#F8FCFF']}
              style={[styles.documentCard, inLibrary && styles.libraryDocumentCard, { flexDirection: 'column', gap: 16, padding: 20, borderRadius: 24, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: inLibrary ? '#E0F2FE' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: inLibrary ? '#0284C7' : '#64748B', fontSize: 20, fontWeight: 'bold' }}>
                    {document.subject.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.documentBody, compact && styles.documentBodyCompact]}>
                  <View style={[styles.titleRow, { justifyContent: 'space-between' }]}>
                    <Text style={[styles.cardTitle, { flex: 1, fontSize: 18, color: '#1E293B', fontWeight: '700', lineHeight: 24 }]} numberOfLines={2}>{document.title}</Text>
                    <View style={{ backgroundColor: owned ? '#ECFDF5' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12, alignSelf: 'flex-start' }}>
                      <Text style={{ color: owned ? '#059669' : '#1D4ED8', fontSize: 13, fontWeight: 'bold' }}>
                        {owned ? 'Achete' : `${formatCoins(document.price)} C`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.bodyMuted, { fontSize: 14, color: '#64748B', marginTop: 4 }]}>{document.subject} • {document.level}</Text>
                  <Text style={[styles.metaText, { fontSize: 13, color: '#94A3B8', marginTop: 2 }]}>{document.teacher} • {document.university}</Text>
                  {inLibrary ? <Text style={[styles.libraryResume, { color: '#0284C7', fontSize: 13, fontWeight: '600', marginTop: 8 }]}>🚀 Pret pour la lecture securisee.</Text> : null}
                </View>
              </View>

              <View style={[styles.badgeRow, { marginTop: 4, gap: 8 }]}>
                {getDocumentBadges(document).map((badge) => (
                  <View key={badge} style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>{badge}</Text>
                  </View>
                ))}
                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{document.pageCount} p.</Text>
                </View>
                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{document.fileSize}</Text>
                </View>
                {document.rating > 0 ? (
                  <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#D97706', fontSize: 12, fontWeight: 'bold' }}>⭐ {document.rating}</Text>
                  </View>
                ) : null}
              </View>

              <View style={[styles.actionRow, { marginTop: 8, gap: 12 }]}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, { flex: 1, backgroundColor: 'transparent', borderColor: '#E2E8F0', borderWidth: 1, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => openPreview(document)} 
                >
                  <Text style={[styles.secondaryButtonText, { color: '#1E293B', fontWeight: '700' }]}>{inLibrary ? 'Apercu' : 'Voir details'}</Text>
                </Pressable>
                <Pressable
                  disabled={purchasing}
                  style={({ pressed }) => [styles.primaryButton, { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, backgroundColor: purchasing ? '#94A3B8' : (owned && inLibrary ? '#1E3A8A' : '#2563EB'), opacity: pressed || purchasing ? 0.8 : 1 }]}
                  onPress={() => (owned ? openDocument(document) : onBuyDocument(document))}
                >
                  <Text style={[styles.primaryButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>{purchasing ? 'Achat...' : owned ? (inLibrary ? 'Continuer' : "Lire") : 'Acheter'}</Text>
                </Pressable>
              </View>
            </LinearGradient>
          );
        })
      ) : null}



      <Modal transparent animationType="slide" visible={Boolean(selectedPack)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedPack ? (
              <>
                <Text style={styles.modalTitle}>{selectedPack.title}</Text>
                <Text style={styles.bodyMuted}>
                  {selectedPack.university} - {selectedPack.faculty} - {selectedPack.level}
                </Text>
                <View style={styles.badgeRow}>
                  {getPackBadges(selectedPack).map((badge) => (
                    <Text key={badge} style={styles.packBadge}>{badge}</Text>
                  ))}
                </View>
                <View style={styles.packHero}>
                  <Text style={styles.packHeroNumber}>{selectedPack.documentCount}</Text>
                  <Text style={styles.packHeroLabel}>PDF inclus</Text>
                  <Text style={styles.packHeroSave}>-{selectedPack.discountPercent}%</Text>
                </View>
                <Text style={styles.description}>{selectedPack.description}</Text>
                <View style={styles.packBenefitRow}>
                  <View style={styles.packBenefitCard}>
                    <Text style={styles.packBenefitValue}>{selectedPack.documentCount}</Text>
                    <Text style={styles.packBenefitLabel}>Documents</Text>
                  </View>
                  <View style={styles.packBenefitCard}>
                    <Text style={styles.packBenefitValue}>{formatCoins(Math.max(0, selectedPack.originalPrice - selectedPack.price))} C</Text>
                    <Text style={styles.packBenefitLabel}>Economie</Text>
                  </View>
                  <View style={styles.packBenefitCard}>
                    <Text style={styles.packBenefitValue}>{selectedPack.pageCount}</Text>
                    <Text style={styles.packBenefitLabel}>Pages</Text>
                  </View>
                </View>
                <View style={styles.chipRow}>
                  <Text style={styles.chip}>{selectedPack.pageCount} pages</Text>
                  <Text style={styles.chip}>{selectedPack.semester}</Text>
                  <Text style={styles.chip}>{selectedPack.packType.replace('_', ' ')}</Text>
                </View>
                <View style={styles.packDocumentsList}>
                  {getPackDocuments(selectedPack).map((document) => {
                    const owned = ownedDocumentIds.includes(document.id);
                    return (
                      <Pressable key={document.id} style={styles.packDocumentRow} onPress={() => openPreview(document)}>
                        <View style={styles.packDocumentIcon}>
                          <Text style={styles.packDocumentIconText}>{document.subject.slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{document.title}</Text>
                          <Text style={styles.metaText}>{document.pageCount} pages - {document.subject}</Text>
                        </View>
                        <Text style={owned ? styles.ownedMini : styles.priceMini}>
                          {owned ? 'OK' : `${formatCoins(document.price)} C`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={() => setSelectedPack(null)}>
                    <Text style={styles.secondaryButtonText}>Fermer</Text>
                  </Pressable>
                  <Pressable
                    disabled={purchasingPackId === selectedPack.id}
                    style={[
                      purchasedPackIds.includes(selectedPack.id) ? styles.ownedButton : styles.primaryButton,
                      purchasingPackId === selectedPack.id && styles.disabledButton,
                    ]}
                    onPress={() => {
                      if (!purchasedPackIds.includes(selectedPack.id)) onBuyPack(selectedPack);
                      setSelectedPack(null);
                    }}
                  >
                    <Text
                      style={
                        purchasedPackIds.includes(selectedPack.id)
                          ? styles.ownedButtonText
                          : styles.primaryButtonText
                      }
                    >
                      {purchasedPackIds.includes(selectedPack.id)
                        ? 'Deja achete'
                        : `${formatCoins(selectedPack.price)} Coins`}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" visible={Boolean(readerDocument)}>
        <View style={styles.readerScreen}>
          {readerDocument ? (
            <>
              <View style={styles.readerTopBar}>
                <Pressable style={styles.readerClose} onPress={closeReader}>
                  <Text style={styles.readerCloseText}>Fermer</Text>
                </Pressable>
                <View style={styles.flex}>
                  <Text style={styles.readerTitle} numberOfLines={1}>{readerDocument.title}</Text>
                  <Text style={styles.readerMeta}>{readerDocument.subject} - {readerDocument.level}</Text>
                </View>
              </View>

              {/* Tab Switcher / Preview Mode Badge always visible under top bar */}
              {!isReaderPreview ? (
                <View style={styles.toolSegment}>
                  {(['pdf', 'summary', 'plan', 'quiz', 'assistant'] as const).map((tool) => {
                    const active = activeTool === tool;
                    const iconColor = active ? '#2563EB' : '#6B7280';
                    const label =
                      tool === 'pdf'
                        ? 'PDF'
                        : tool === 'summary'
                          ? 'Résumé'
                          : tool === 'plan'
                            ? 'Plan'
                            : tool === 'quiz'
                              ? 'Quiz'
                              : 'Chat';
                    const IconComponent =
                      tool === 'pdf'
                        ? FileText
                        : tool === 'summary'
                          ? Sparkles
                          : tool === 'plan'
                            ? Calendar
                            : tool === 'quiz'
                              ? HelpCircle
                              : MessageSquare;
                    return (
                      <Pressable
                        key={tool}
                        style={[styles.toolSegmentButton, active && styles.toolSegmentButtonActive]}
                        onPress={() => setActiveTool(tool)}
                      >
                        <IconComponent size={15} color={iconColor} style={{ marginBottom: 2 }} />
                        <Text style={[styles.toolSegmentText, active && styles.toolSegmentTextActive, { fontSize: 11 }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.previewModeBadge, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
                  <Lock size={14} color="#FFFFFF" />
                  <Text style={styles.previewModeBadgeText}>MODE APERÇU (PAGE 1)</Text>
                </View>
              )}

              {activeTool === 'pdf' ? (
                /* Fullscreen PDF Reader viewport directly under top bar / tab switcher */
                <View style={styles.fullscreenPdfReaderWrapper}>
                  {readerLoading ? (
                    <View style={styles.pdfFrameFallback}>
                      <ActivityIndicator color={colors.primary} size="large" />
                      <Text style={styles.bodyMuted}>Ouverture du PDF...</Text>
                    </View>
                  ) : readerError ? (
                    <View style={styles.pdfFrameFallback}>
                      <Text style={styles.cardTitle}>PDF indisponible</Text>
                      <Text style={styles.bodyMuted}>{readerError}</Text>
                    </View>
                  ) : readerUrl ? (
                    Platform.OS === 'web' ? (
                      createElement('iframe', {
                        src: `${authBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(readerUrl)}`,
                        title: readerDocument.title,
                        style: {
                          width: '100%',
                          height: '100%',
                          border: '0',
                          backgroundColor: '#F8FAFC',
                        },
                      })
                    ) : (
                      <WebView
                        source={{ uri: `${authBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(readerUrl)}` }}
                        style={styles.inAppWebViewFull}
                        startInLoadingState
                        renderLoading={() => (
                          <View style={styles.webViewLoading}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={styles.bodyMuted}>Chargement du cours...</Text>
                          </View>
                        )}
                        javaScriptEnabled
                        domStorageEnabled
                        scalesPageToFit
                      />
                    )
                  ) : null}

                  {/* Floating unlock banner in preview mode */}
                  {isReaderPreview && (
                    <View style={styles.previewUnlockBanner}>
                      <Lock size={24} color="#9D174D" style={{ marginBottom: 6 }} />
                      <Text style={styles.previewUnlockText}>
                        Ce document contient {readerDocument.pageCount} pages. Débloque-le pour y accéder et utiliser les outils IA (Résumé, Quiz, Chat).
                      </Text>
                      <Pressable
                        style={styles.previewUnlockButton}
                        onPress={() => {
                          onBuyDocument(readerDocument);
                          closeReader();
                        }}
                      >
                        <Text style={styles.previewUnlockButtonText}>
                          Acheter pour {formatCoins(readerDocument.price)}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : activeTool === 'assistant' ? (
                <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={[styles.aiHeader, { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Sparkles size={20} color="#2563EB" />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.aiTitle, { fontSize: 16, color: '#1E293B' }]}>Campus AI</Text>
                      <Text style={[styles.aiSubtitle, { fontSize: 13, color: '#64748B', marginTop: 2 }]}>
                        Ton assistant personnel de révision.
                      </Text>
                    </View>
                  </View>

                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 }}>
                    {assistantMessages.length === 0 ? (
                      <View style={[styles.quickPromptRow, { marginTop: 8 }]}>
                        {['Fais-moi un résumé', 'Génère un quiz de 5 questions', 'Explique-moi les concepts clés'].map((prompt) => (
                          <Pressable key={prompt} style={[styles.quickPrompt, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 }]} onPress={() => askAssistant(prompt)}>
                            <Text style={[styles.quickPromptText, { color: '#475569', fontSize: 13, fontWeight: '600' }]}>{prompt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {assistantMessages.map((message) => (
                      <View
                        key={message.id}
                        style={{ flexDirection: 'row', marginBottom: 16, justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
                      >
                        {message.role === 'assistant' && (
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4 }}>
                            <Sparkles size={16} color="#2563EB" />
                          </View>
                        )}
                        <View
                          style={[
                            message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                            {
                              maxWidth: '80%',
                              padding: 14,
                              borderRadius: 20,
                              borderTopLeftRadius: message.role === 'assistant' ? 4 : 20,
                              borderTopRightRadius: message.role === 'user' ? 4 : 20,
                              backgroundColor: message.role === 'user' ? '#2563EB' : '#FFFFFF',
                              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
                            }
                          ]}
                        >
                          <Text style={[
                            message.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText,
                            { color: message.role === 'user' ? '#FFFFFF' : '#334155', fontSize: 15, lineHeight: 22 }
                          ]}>
                            {message.content}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {assistantLoading && (
                      <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: 'flex-start' }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4 }}>
                          <Sparkles size={16} color="#2563EB" />
                        </View>
                        <View style={[styles.assistantBubble, { padding: 14, borderRadius: 20, borderTopLeftRadius: 4, backgroundColor: '#FFFFFF' }]}>
                          <Text style={{ color: '#94A3B8', fontSize: 14, fontStyle: 'italic' }}>L'IA réfléchit...</Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>

                  <View style={[styles.aiInputRow, { backgroundColor: '#FFFFFF', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', margin: 0, gap: 12 }]}>
                    <TextInput
                      value={assistantInput}
                      onChangeText={setAssistantInput}
                      placeholder="Pose une question au doc..."
                      placeholderTextColor={colors.muted}
                      style={[styles.aiInput, { backgroundColor: '#F8FAFC', borderRadius: 24, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#E2E8F0' }]}
                      multiline
                    />
                    <Pressable 
                      style={[styles.aiSendButton, { width: 48, height: 48, borderRadius: 24, alignItems: 'center', paddingHorizontal: 0, opacity: assistantLoading || !assistantInput.trim() ? 0.5 : 1 }]} 
                      onPress={() => askAssistant(assistantInput)}
                      disabled={assistantLoading || !assistantInput.trim()}
                    >
                      <Text style={{ fontSize: 20 }}>{assistantLoading ? '⏳' : '↑'}</Text>
                    </Pressable>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                <ScrollView style={styles.readerBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.readerBodyContainer}>
                    {activeTool === 'summary' ? (
                      <View style={styles.toolContent}>
                        {readerDocument.aiSummary ? (
                          <View style={[styles.studyBox, styles.studyBoxFeatured]}>
                            <Text style={styles.studyBoxTitle}>Résumé de l'IA</Text>
                            <Text style={styles.readerParagraph}>{readerDocument.aiSummary}</Text>
                          </View>
                        ) : null}
                        <View style={styles.studyBox}>
                          <Text style={styles.studyBoxTitle}>Description du document</Text>
                          <Text style={styles.readerParagraph}>{readerDocument.description}</Text>
                        </View>
                      </View>
                    ) : null}

                    {activeTool === 'plan' ? (
                      <View style={styles.toolContent}>
                        {readerDocument.studyPlan?.length ? (
                          <View style={styles.studyBox}>
                            <Text style={styles.studyBoxTitle}>Plan de révision recommandé</Text>
                            {readerDocument.studyPlan.map((step, index) => (
                              <Text style={styles.readerParagraph} key={step}>{index + 1}. {step}</Text>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.studyBox}>
                            <Text style={styles.bodyMuted}>Aucun plan de révision disponible pour ce document.</Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    {activeTool === 'quiz' ? (
                      <View style={styles.toolContent}>
                        {readerDocument.quiz?.length ? (
                          <View style={styles.studyBox}>
                            <Text style={styles.studyBoxTitle}>Quiz rapide d'auto-évaluation</Text>
                            {readerDocument.quiz.map((item) => (
                              <View key={item.question} style={styles.quizItem}>
                                <Text style={styles.quizQuestion}>{item.question}</Text>
                                <Text style={styles.metaText}>{item.answer}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.studyBox}>
                            <Text style={styles.bodyMuted}>Aucun quiz disponible pour ce document.</Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    <Text style={styles.readerWatermark}>CAMPUS-BORDES</Text>
                  </View>
                </ScrollView>
              )}
            </>
          ) : null}
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={filtersVisible} onRequestClose={() => setFiltersVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.filterSheet}>
            <View style={[styles.filterSheetHeader, { alignItems: 'center' }]}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>Filtres PDF</Text>
                <Text style={[styles.bodyMuted, { marginTop: 4 }]}>Affiche seulement les PDF qui collent a ton besoin.</Text>
              </View>
              <Pressable style={styles.filterSheetClose} onPress={() => setFiltersVisible(false)}>
                <Text style={styles.filterSheetCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filterSections.map((section) => (
                <FilterRow
                  key={section.key}
                  label={section.label}
                  options={section.options}
                  value={section.value}
                  onChange={section.onChange}
                />
              ))}
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetGhostButton} onPress={resetFilters}>
                <Text style={styles.sheetGhostButtonText}>Reinitialiser</Text>
              </Pressable>
              <Pressable style={styles.sheetPrimaryButton} onPress={() => setFiltersVisible(false)}>
                <Text style={styles.sheetPrimaryButtonText}>Afficher les resultats</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {options.map((option) => {
          if (option === 'Tous') return null; // Hide the 'Tous' pill
          const active = option === value;
          return (
            <Pressable 
              key={option} 
              style={[styles.filterChip, active && styles.filterChipActive]} 
              onPress={() => onChange(active ? 'Tous' : option)} // Toggle off if already active
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const colors = {
  ink: '#0F172A',         // Slate 900
  muted: '#64748B',       // Slate 500
  line: '#E2E8F0',        // Slate 200
  surface: '#FFFFFF',
  soft: '#F8FAFC',        // Slate 50
  primary: '#3B82F6',     // Premium Electric Blue
  primaryDeep: '#1E40AF', // Deep Royal Blue
  primarySoft: '#EFF6FF', // Soft Sky Tint
  blue: '#3B82F6',
};

const styles = StyleSheet.create({
  libraryHeadingSection: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
    borderRadius: 16,
  },
  libraryHeadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  libraryHeadingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  controls: {
    backgroundColor: 'transparent',
  },
  resultRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  resultText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  clearButton: {
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearButtonText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  flex: {
    flex: 1,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: '#EEF2F7',
    padding: 4,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  segmentText: {
    color: '#64748B',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  searchInput: {
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  filterToolbar: {
    marginTop: 14,
    gap: 10,
  },
  filterTrigger: {
    minHeight: 46,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTriggerText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700',
  },
  filterBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  filterSummaryRow: {
    gap: 8,
    paddingRight: 10,
  },
  summaryChip: {
    maxWidth: 168,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryChipLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryChipValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryChipMuted: {
    borderRadius: 18,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryChipMutedText: {
    color: colors.muted,
    fontWeight: '700',
  },
  filterBlock: {
    marginTop: 16,
  },
  filterLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyState: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    
    
    padding: 18,
    marginTop: 14,
    gap: 6,
  },
  statePanel: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    
    
    padding: 18,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  sectionStrip: {
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionStripEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionStripTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionStripLink: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionStripLinkText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  stateBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBadgeAlert: {
    backgroundColor: '#FFF3F3',
  },
  stateBadgeText: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  retryButton: {
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  packsHero: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    marginTop: 14,
    gap: 14,
  },
  packsHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  packsHeroEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  packsHeroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  packsHeroBadge: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#E7F3FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packsHeroBadgeValue: {
    color: colors.primaryDeep,
    fontSize: 28,
    fontWeight: '900',
  },
  packsHeroBadgeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  packsHeroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  packsHeroStatCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
    minHeight: 84,
    justifyContent: 'space-between',
  },
  packsHeroStatValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  packsHeroStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  featuredPackCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    gap: 10,
  },
  featuredPackTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featuredPackEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  featuredPackTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  featuredPackPrice: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  featuredPackButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featuredPackButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  explorerHero: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    marginTop: 14,
    gap: 14,
  },
  explorerHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  explorerHeroEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  explorerHeroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  explorerHeroBadge: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#E7F3FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerHeroBadgeValue: {
    color: colors.primaryDeep,
    fontSize: 28,
    fontWeight: '900',
  },
  explorerHeroBadgeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  explorerHeroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  explorerHeroStatCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
    minHeight: 84,
    justifyContent: 'space-between',
  },
  explorerHeroStatValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  explorerHeroStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  featuredDocumentCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    gap: 10,
  },
  featuredDocumentTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featuredDocumentEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  featuredDocumentTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  featuredDocumentPrice: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  libraryHero: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    marginTop: 14,
    gap: 14,
  },
  libraryHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  libraryEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  libraryTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  libraryCountBubble: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: '#E7F3FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryCountBubbleValue: {
    color: colors.primaryDeep,
    fontSize: 28,
    fontWeight: '900',
  },
  libraryCountBubbleLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  libraryStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  libraryStatCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 12,
    minHeight: 78,
    justifyContent: 'space-between',
  },
  libraryStatValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  libraryStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  documentCard: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    
    marginTop: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  libraryDocumentCard: {
    borderRadius: 20,
    
    padding: 14,
    shadowColor: '#168CF2',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  packCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    
    
    marginTop: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#168CF2',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  libraryPackCard: {
    
    shadowOpacity: 0.09,
  },
  packRibbonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  packRibbon: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#EAF5FF',
    color: colors.primaryDeep,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  packRibbonMuted: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  packBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F3F8FF',
    color: colors.primaryDeep,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
  },
  featuredBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#EAF5FF',
    color: colors.primaryDeep,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '900',
  },
  packTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#DDF2FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryPackIcon: {
    backgroundColor: '#F3FAFF',
    
  },
  packIconText: {
    color: colors.primaryDeep,
    fontSize: 20,
    fontWeight: '900',
  },
  packTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  packProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E7F3FF',
    overflow: 'hidden',
  },
  packProgressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  packBenefitRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  packBenefitCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 10,
    minHeight: 72,
    justifyContent: 'space-between',
  },
  packBenefitValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  packBenefitLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  packHero: {
    borderRadius: 18,
    backgroundColor: '#F0F8FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    marginTop: 14,
    alignItems: 'center',
  },
  packHeroNumber: {
    color: colors.primaryDeep,
    fontSize: 42,
    fontWeight: '900',
  },
  packHeroLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  packHeroSave: {
    color: '#0F8A5F',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
  packDocumentsList: {
    marginTop: 12,
    gap: 8,
  },
  packDocumentRow: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: '#F8FCFF',
    
    borderColor: colors.line,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  packDocumentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packDocumentIconText: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
  },
  ownedMini: {
    color: '#0F8A5F',
    fontSize: 12,
    fontWeight: '900',
  },
  priceMini: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  documentCardCompact: {
    flexDirection: 'row',
  },
  preview: {
    width: 92,
    minHeight: 138,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  previewCompact: {
    width: 82,
    minHeight: 124,
  },
  libraryPreview: {
    backgroundColor: '#FFFFFF',
    
  },
  previewTop: {
    position: 'absolute',
    top: 9,
    color: colors.primaryDeep,
    fontSize: 10,
    fontWeight: '900',
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  previewFoot: {
    position: 'absolute',
    bottom: 9,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  libraryResume: {
    color: colors.primaryDeep,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '700',
  },
  documentBody: {
    flex: 1,
  },
  documentBodyCompact: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  bodyMuted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  description: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  priceBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    color: colors.primaryDeep,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '900',
  },
  ownedBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    color: colors.primaryDeep,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  chip: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    color: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: '900',
  },
  ownedButton: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ownedButtonText: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.32)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  filterSheet: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    
    padding: 18,
    maxHeight: '80%',
    gap: 10,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterSheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSheetCloseText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sheetGhostButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetGhostButtonText: {
    color: '#475569',
    fontWeight: '700',
  },
  sheetPrimaryButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheetPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  largePreview: {
    minHeight: 210,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderColor: colors.line,
    
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  largePreviewLabel: {
    position: 'absolute',
    top: 14,
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  largePreviewTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
  },
  largePreviewText: {
    color: colors.muted,
    marginTop: 8,
    fontWeight: '800',
  },
  watermark: {
    color: '#CBD5E1',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 22,
  },
  readerScreen: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  fullscreenPdfReaderWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  readerTopBar: {
    paddingTop: 52,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readerClose: {
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  readerCloseText: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  readerTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  readerMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  readerBody: {
    flex: 1,
    padding: 14,
  },
  readerHero: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  readerHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  readerHeroEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readerHeroTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  readerHeroText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    fontWeight: '600',
  },
  readerHeroBadge: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#E7F3FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readerHeroBadgeValue: {
    color: colors.primaryDeep,
    fontSize: 28,
    fontWeight: '900',
  },
  readerHeroBadgeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  readerStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readerStatCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 12,
    minHeight: 76,
    justifyContent: 'space-between',
  },
  readerStatValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  readerStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  readerPage: {
    minHeight: 430,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    marginBottom: 14,
  },
  layoutModeBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  layoutModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  layoutModeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  layoutModeText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 13,
  },
  layoutModeTextActive: {
    color: '#3B82F6',
  },
  readerPageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  readerPageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pdfFrameFallback: {
    minHeight: 220,
    borderRadius: 18,
    
    borderColor: colors.line,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 14,
  },
  readerSecureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#E0F2FE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  expandButtonText: {
    color: '#0369A1',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 0.5,
    
    gap: 12,
  },
  fullscreenCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  fullscreenCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fullscreenTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fullscreenWebViewWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
  },
  fullscreenWebView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  inAppPdfPreview: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  readerBodyContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  androidFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  androidFallbackEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  androidFallbackTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  androidFallbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inAppPdfReader: {
    width: '100%',
    height: 520,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: '#F8FAFC',
    marginVertical: 14,
  },
  inAppWebView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  inAppWebViewFull: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    zIndex: 10,
    gap: 10,
  },
  readerPageLabel: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  readerPageTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  readerSecurePill: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readerSecurePillText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  readerParagraph: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  readerWatermark: {
    color: '#CBD5E1',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 32,
    textAlign: 'center',
  },
  studyBox: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    
    borderColor: colors.line,
    padding: 12,
    marginTop: 10,
  },
  studyBoxFeatured: {
    backgroundColor: '#F3FAFF',
    
  },
  studyBoxTitle: {
    color: colors.primaryDeep,
    fontWeight: '900',
    marginBottom: 8,
  },
  readerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  readerTag: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    color: colors.primaryDeep,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '900',
  },
  quizItem: {
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
    paddingTop: 8,
    marginTop: 8,
  },
  quizQuestion: {
    color: colors.ink,
    fontWeight: '900',
    marginBottom: 4,
  },
  aiPanel: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    marginBottom: 28,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  aiTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  aiSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: '600',
  },
  aiBadge: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiBadgeText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  quickPromptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  quickPrompt: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickPromptText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    
    borderColor: colors.line,
    padding: 10,
    marginBottom: 8,
  },
  assistantBubbleText: {
    color: colors.ink,
    lineHeight: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '92%',
    borderRadius: 16,
    backgroundColor: colors.primary,
    padding: 10,
    marginBottom: 8,
  },
  userBubbleText: {
    color: '#FFFFFF',
    lineHeight: 20,
    fontWeight: '700',
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  aiInput: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    
    borderColor: colors.line,
    paddingHorizontal: 12,
    color: colors.ink,
  },
  aiSendButton: {
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  aiSendText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  toolSegment: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#EEF2F7',
    padding: 3,
    marginVertical: 14,
    flexWrap: 'wrap',
    gap: 4,
  },
  toolSegmentButton: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toolSegmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolSegmentText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  toolSegmentTextActive: {
    color: '#2563EB',
    fontWeight: '900',
  },
  toolContent: {
    marginTop: 6,
  },
  androidFallbackMini: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    
    
    alignItems: 'center',
    marginVertical: 14,
  },
  androidFallbackMiniText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  androidFallbackMiniButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  androidFallbackMiniButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  previewModeBadge: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  previewModeBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  previewUnlockBanner: {
    backgroundColor: '#FDF2F8',
    
    
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginVertical: 14,
    gap: 12,
  },
  previewUnlockText: {
    color: '#9D174D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewUnlockButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    shadowColor: '#EC4899',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  previewUnlockButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
