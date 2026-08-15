import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { createElement, useEffect, useMemo, useState } from 'react';
import { authWebBaseUrl } from '../auth/betterAuth';
import {
  ActivityIndicator,
  Alert,
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
import { loadPdfChatHistory, savePdfChatHistory, clearPdfChatHistory } from './chatHistoryStorage';
import { FormattedMarkdown } from '../../components/FormattedMarkdown';
import { FileText, Sparkles, Calendar, HelpCircle, MessageSquare, Lock, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { stitchColors, brandGradient } from '../../theme/stitch';

// ─── Editorial colour tokens — aliased onto the shared theme, not duplicated ──
const $ = {
  ink:    stitchColors.ink,
  paper:  stitchColors.paper,
  sienna: stitchColors.sienna,
  emd:    stitchColors.emerald,   // emerald-deep: owned / success
  muted:  stitchColors.inkMuted,
  soft:   stitchColors.inkSubtle,
  line:   stitchColors.inkFaint,
  surface:stitchColors.surface,
  // pack icon BG: warm cream to contrast with paper
  cream:  stitchColors.paperDeep,
  // owned tint
  emdBg:  stitchColors.emeraldBg,
  // warning tint (quality/review badges)
  siennaBg: stitchColors.warningBg,
} as const;

// ─── Shared typography helpers ────────────────────────────────────────────────
const MONO = { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string, letterSpacing: 1.4 } as const;
const SERIF_TITLE = { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) as string, fontWeight: '700' as const };

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

// Folio index helper — gives a consistent two-digit number per item
const folioNum = (n: number) => String(n).padStart(2, '0');

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
  const viewMode = externalTab === 'library' ? 'library' : 'explore';
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

  useEffect(() => {
    if (externalTab) {
      if (externalTab === 'library') {
        setActiveTab('packs');
      } else {
        setActiveTab(externalTab);
      }
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
      const matchesTab = viewMode === 'library' ? (activeTab === 'catalog' && owned) : (activeTab === 'catalog');
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
      if (viewMode === 'library' && leftOwned !== rightOwned) return rightOwned - leftOwned;

      const leftScore = getDocumentPriority(left);
      const rightScore = getDocumentPriority(right);
      if (leftScore !== rightScore) return rightScore - leftScore;

      return right.pageCount - left.pageCount;
    });
  }, [activeTab, faculty, level, ownedDocumentIds, publishedDocuments, query, subject, university, viewMode]);

  const visiblePacks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = publishedPacks.filter((pack) => {
      const owned = purchasedPackIds.includes(pack.id);
      const matchesTab = viewMode === 'library' ? (activeTab === 'packs' && owned) : (activeTab === 'packs');
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
      if (viewMode === 'library' && leftOwned !== rightOwned) return rightOwned - leftOwned;

      const leftScore = getPackPriority(left);
      const rightScore = getPackPriority(right);
      if (leftScore !== rightScore) return rightScore - leftScore;

      return right.documentCount - left.documentCount;
    });
  }, [activeTab, faculty, level, publishedPacks, purchasedPackIds, query, university, viewMode]);

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
    { key: 'university', label: 'Université', options: universities, value: university, onChange: setUniversity },
    { key: 'faculty', label: 'Filière', options: faculties, value: faculty, onChange: setFaculty },
    { key: 'subject', label: 'Matière', options: subjects, value: subject, onChange: setSubject },
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
    setIsReaderPreview(document.price > 0 && !ownedDocumentIds.includes(document.id));
    setReaderUrl('');
    setReaderError('');
    setReaderLoading(true);

    // Load persistent chat history
    loadPdfChatHistory(document.id).then((saved) => {
      if (saved && saved.length > 0) {
        setAssistantMessages(saved);
      } else {
        setAssistantMessages([
          {
            id: `assistant-${document.id}`,
            role: 'assistant',
            content: `Que veux-tu réviser sur "${document.title}" ?`,
          },
        ]);
      }
    });

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

    const targetBucket = document.previewPath ? 'document-previews' : 'documents';
    const targetPath = document.previewPath || document.filePath;

    try {
      const url = await createSignedPdfUrl(targetBucket, targetPath, accessToken, 1800);
      setReaderUrl(url);
    } catch (openError) {
      if (document.filePath && targetPath !== document.filePath) {
        try {
          const fallbackUrl = await createSignedPdfUrl('documents', document.filePath, accessToken, 1800);
          setReaderUrl(fallbackUrl);
          return;
        } catch {
          // ignore secondary error
        }
      }
      const rawMsg = openError instanceof Error ? openError.message : 'PDF indisponible.';
      setReaderError(rawMsg);
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
    if (document.price === 0 || ownedDocumentIds.includes(document.id)) {
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

      // Load persistent chat history
      loadPdfChatHistory(document.id).then((saved) => {
        if (saved && saved.length > 0) {
          setAssistantMessages(saved);
        } else {
          setAssistantMessages([
            {
              id: `assistant-${document.id}`,
              role: 'assistant',
              content: `Que veux-tu réviser sur "${document.title}" ?`,
            },
          ]);
        }
      });

      setReaderLoading(true);
      try {
        const url = await createSignedPdfUrl('documents', document.filePath, accessToken, 1800);
        setReaderUrl(url);
      } catch (openError) {
        const rawMsg = openError instanceof Error ? openError.message : 'PDF indisponible.';
        if (rawMsg.includes('Object not found') || rawMsg.includes('404')) {
          setReaderError("Le fichier PDF physique de ce cours n'a pas encore été téléversé sur le serveur. Découvre le Résumé, le Plan de révision, le Quiz et échange avec l'IA ci-dessus !");
        } else if (rawMsg.includes('Invalid compact JWS') || rawMsg.includes('403')) {
          setReaderError("Accès sécurisé au document en cours de renouvellement.");
        } else {
          setReaderError(rawMsg);
        }
      } finally {
        setReaderLoading(false);
      }
      return;
    }

    await openPreview(document);
  };

  const handleClearChat = () => {
    if (!readerDocument || assistantMessages.length === 0) return;
    Alert.alert(
      'Nouvelle discussion',
      'Veux-tu réinitialiser cette discussion et effacer l’historique des messages pour ce document ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            void clearPdfChatHistory(readerDocument.id);
            setAssistantMessages([
              {
                id: `assistant-${readerDocument.id}`,
                role: 'assistant',
                content: `Que veux-tu réviser sur "${readerDocument.title}" ?`,
              },
            ]);
          },
        },
      ]
    );
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
    void savePdfChatHistory(document.id, nextMessages);

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
      const assistantMsg: PdfAssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
      };
      const updated = [...nextMessages, assistantMsg];
      setAssistantMessages(updated);
      void savePdfChatHistory(document.id, updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Je ne peux pas joindre le serveur IA maintenant. Réessaie dans un instant.';
      const errorMsg: PdfAssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
      };
      const updated = [...nextMessages, errorMsg];
      setAssistantMessages(updated);
      void savePdfChatHistory(document.id, updated);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Track item index for folio numbers
  const [packIndex, docIndex] = useState({ pack: 0, doc: 0 });

  return (
    <View style={styles.root}>

      {/* ── Library heading ─────────────────────────────────────────────── */}
      {viewMode === 'library' && (
        <View style={styles.libraryHeadingSection}>
          <Text style={styles.eyebrow}>Bibliothèque</Text>
          <View style={styles.rule} />
          <Text style={styles.editorialTitle}>Mes Achats</Text>
          <Text style={styles.editorialSubtitle}>
            Retrouve ici tous les PDF et Packs que tu as débloqués.
          </Text>
        </View>
      )}

      {/* ── Controls: result count, tabs, search, filter toolbar ──────────── */}
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

        {/* Editorial tab strip */}
        <View style={styles.editorialTabStrip}>
          {([
            ['packs',    viewMode === 'library' ? 'Mes packs' : 'Packs'],
            ['catalog',  viewMode === 'library' ? 'Mes PDF'  : 'Catalogue'],
          ] as Array<[TabKey, string]>).map(([key, label], i) => {
            const active = activeTab === key;
            const isFirst = i === 0;
            return (
              <Pressable
                key={key}
                style={[
                  styles.editorialTab,
                  active && styles.editorialTabActive,
                  !isFirst && styles.editorialTabRight,
                ]}
                onPress={() => setActiveTab(key)}
              >
                <Text style={[styles.editorialTabText, active && styles.editorialTabTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Titre, matière, prof…"
          placeholderTextColor={$.muted}
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
                <Text style={styles.summaryChipMutedText}>Tous les établissements</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.statePanel}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeMono}>...</Text>
          </View>
          <Text style={styles.stateTitle}>Chargement du catalogue</Text>
          <Text style={styles.bodyMuted}>On récupère les PDF, packs et filtres disponibles.</Text>
        </View>
      ) : null}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {!loading && error ? (
        <View style={styles.statePanel}>
          <View style={[styles.stateBadge, styles.stateBadgeAlert]}>
            <Text style={styles.stateBadgeMono}>!</Text>
          </View>
          <Text style={styles.stateTitle}>Catalogue indisponible</Text>
          <Text style={styles.bodyMuted}>{error}</Text>
          {onRefresh ? (
            <Pressable style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ── Empty: no packs found ─────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'packs' && visiblePacks.length === 0 ? (
        <View style={styles.statePanel}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeMono}>0</Text>
          </View>
          <Text style={styles.stateTitle}>
            {viewMode === 'library' ? 'aucun pack acheté' : 'aucun pack trouvé'}
          </Text>
          <Text style={styles.bodyMuted}>
            {viewMode === 'library' ? "Tu n'as pas encore acheté de pack." : "Essaie une autre recherche ou regarde les PDF."}
          </Text>
        </View>
      ) : null}

      {/* ── Empty: no PDFs found ──────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'catalog' && visibleDocuments.length === 0 ? (
        <View style={styles.statePanel}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeMono}>0</Text>
          </View>
          <Text style={styles.stateTitle}>
            {viewMode === 'library' ? 'aucun PDF débloqué' : 'aucun PDF trouvé'}
          </Text>
          <Text style={styles.bodyMuted}>
            {viewMode === 'library' ? "Tu n'as pas encore débloqué de PDF." : "Essaie une autre recherche."}
          </Text>
        </View>
      ) : null}

      {/* ── Empty: library has nothing ───────────────────────────────────── */}
      {!loading && !error && activeTab === 'library' && visiblePacks.length === 0 && visibleDocuments.length === 0 ? (
        <View style={styles.statePanel}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeMono}>0</Text>
          </View>
          <Text style={styles.stateTitle}>Aucun achat</Text>
          <Text style={styles.bodyMuted}>Tu n'as pas encore de PDF ou de Pack acheté.</Text>
        </View>
      ) : null}

      {/* ── Library content strip ────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'library' && (visiblePacks.length > 0 || visibleDocuments.length > 0) ? (
        <View style={styles.editorialSectionStrip}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>Bibliothèque</Text>
            <View style={styles.rule} />
            <Text style={styles.editorialTitle}>Tes contenus débloqués</Text>
            <Text style={styles.bodyMuted}>
              {purchasedCount} PDF, {purchasedPackIds.length} packs et {ownedPageCount} pages disponibles.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Packs hero strip ─────────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'packs' && visiblePacks.length > 0 ? (
        <View style={styles.editorialSectionStrip}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>Packs académiques</Text>
            <View style={styles.rule} />
            <Text style={[styles.editorialTitle, { fontSize: 17 }]}>Des lots plus rentables pour ton semestre</Text>
            <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
              {visiblePacks.length} packs · écon. potentielle {formatCoins(
                Math.max(0, visiblePacks.reduce((sum, pack) => sum + Math.max(0, pack.originalPrice - pack.price), 0)),
              )} C
            </Text>
          </View>
          {featuredPack ? (
            <Pressable style={styles.editorialLink} onPress={() => setSelectedPack(featuredPack)}>
              <Text style={styles.editorialLinkText}>Voir</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ── Catalog hero strip ───────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'catalog' && visibleDocuments.length > 0 ? (
        <View style={styles.editorialSectionStrip}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>Catalogue PDF</Text>
            <View style={styles.rule} />
            <Text style={[styles.editorialTitle, { fontSize: 17 }]}>Trouve rapidement le bon support</Text>
            <Text style={[styles.bodyMuted, { marginTop: 6 }]}>
              {visibleDocuments.length} PDF visibles, {subjects.length - 1} matières, filtres appliqués.
            </Text>
          </View>
          {featuredDocument ? (
            <Pressable style={styles.editorialLink} onPress={() => openPreview(featuredDocument)}>
              <Text style={styles.editorialLinkText}>Aperçu</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ── Pack cards ────────────────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'packs' ? (
        visiblePacks.map((pack, idx) => {
          const owned = purchasedPackIds.includes(pack.id);
          const purchasing = purchasingPackId === pack.id;
          const packDocuments = getPackDocuments(pack);
          const readCount = packDocuments.filter((document) => ownedDocumentIds.includes(document.id)).length;
          const inLibrary = viewMode === 'library';
          const savings = Math.max(0, pack.originalPrice - pack.price);
          const fi = folioNum(idx + 1);

          return (
            <View
              key={pack.id}
              style={[styles.editorialCard, inLibrary && styles.editorialCardOwned]}
            >
              {/* Card header row */}
              <View style={styles.cardHeaderRow}>
                {/* Folio icon */}
                <View style={styles.folioIconBox}>
                  <Text style={styles.folioDash}>—</Text>
                  <Text style={styles.folioNumber}>{fi}</Text>
                </View>

                <View style={styles.flex}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{pack.title}</Text>
                    <View style={[styles.priceBadge, owned ? styles.priceBadgeOwned : styles.priceBadgeBuy]}>
                      <Text style={[styles.priceBadgeText, owned ? styles.priceBadgeTextOwned : styles.priceBadgeTextBuy]}>
                        {owned ? 'Acheté' : `${formatCoins(pack.price)} C`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>{pack.university} · {pack.level}</Text>
                  {pack.description ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>{pack.description}</Text>
                  ) : null}
                </View>
              </View>

              {/* Badges row */}
              <View style={styles.badgeRow}>
                {getPackBadges(pack).map((badge) => (
                  <View key={badge} style={[styles.editorialBadge, styles.editorialBadgeMuted]}>
                    <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextMuted]}>{badge}</Text>
                  </View>
                ))}
                <View style={[styles.editorialBadge, styles.editorialBadgeMuted]}>
                  <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextMuted]}>{pack.documentCount} PDF</Text>
                </View>
                <View style={[styles.editorialBadge, styles.editorialBadgeMuted]}>
                  <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextMuted]}>{pack.pageCount} p.</Text>
                </View>
                <View style={[styles.editorialBadge, styles.editorialBadgeSienna]}>
                  <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextSienna]}>-{pack.discountPercent}%</Text>
                </View>
              </View>

              {/* Progress track */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pack.documentCount ? Math.min(100, Math.round((readCount / pack.documentCount) * 100)) : 0}%`,
                      backgroundColor: $.emd,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressMeta}>
                {owned
                  ? `${readCount}/${pack.documentCount} PDF lus`
                  : `Economie: ${formatCoins(savings)} C`}
              </Text>

              {/* Actions */}
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.btnSecondary,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => setSelectedPack(pack)}
                >
                  <Text style={styles.btnSecondaryText}>{inLibrary ? 'Contenu' : 'Details'}</Text>
                </Pressable>
                <Pressable
                  disabled={purchasing}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    purchasing && styles.btnDisabled,
                    owned && !inLibrary && styles.btnOwned,
                    owned && inLibrary && styles.btnOwnedLibrary,
                    (pressed || purchasing) && styles.btnPressed,
                  ]}
                  onPress={() => (owned ? setSelectedPack(pack) : onBuyPack(pack))}
                >
                  <Text style={styles.btnPrimaryText}>
                    {purchasing ? 'Achat...' : owned ? (inLibrary ? 'Continuer' : 'Ouvrir') : 'Acheter pack'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      ) : null}

      {/* ── Document cards ────────────────────────────────────────────────── */}
      {!loading && !error && activeTab === 'catalog' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          {visibleDocuments.map((document, idx) => {
            const owned = ownedDocumentIds.includes(document.id);
            const purchasing = purchasingDocumentId === document.id;
            const inLibrary = viewMode === 'library';
            const initials = document.subject.slice(0, 2).toUpperCase();

            return (
              <Pressable
                key={document.id}
                style={({ pressed }) => [
                  {
                    width: '48%',
                    backgroundColor: stitchColors.surface,
                    borderRadius: 16,
                    overflow: 'hidden',
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.05)',
                    shadowColor: stitchColors.ink,
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => (owned ? openDocument(document) : openPreview(document))}
              >
                {/* Square Cover */}
                <View style={{ aspectRatio: 1, backgroundColor: inLibrary ? stitchColors.emeraldBg : `${stitchColors.ink}0D`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <Text style={{ fontSize: 40, fontWeight: '900', color: inLibrary ? stitchColors.emerald : stitchColors.inkSubtle, opacity: 0.4 }}>
                    {initials}
                  </Text>
                  
                  {/* Badges */}
                  <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: owned ? stitchColors.emerald : stitchColors.sienna, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: stitchColors.paper, fontSize: 10, fontWeight: 'bold' }}>
                      {owned ? 'Acquis' : `${formatCoins(document.price)} C`}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: stitchColors.ink, marginBottom: 4 }} numberOfLines={2}>{document.title}</Text>
                  <Text style={{ fontSize: 12, color: stitchColors.inkMuted, marginBottom: 2 }} numberOfLines={1}>{document.subject}</Text>
                  <Text style={{ fontSize: 10, color: stitchColors.inkSubtle }} numberOfLines={1}>{document.level}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* ── Pack detail modal ─────────────────────────────────────────────── */}
      <Modal transparent animationType="slide" visible={Boolean(selectedPack)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editorialModalCard}>
            {selectedPack ? (
              <>
                <Text style={styles.eyebrow}>Détail du pack</Text>
                <View style={styles.rule} />
                <Text style={styles.editorialTitle}>{selectedPack.title}</Text>
                <Text style={[styles.bodyMuted, { marginTop: 4 }]}>
                  {selectedPack.university} — {selectedPack.faculty} — {selectedPack.level}
                </Text>

                {/* Hero stat */}
                <View style={styles.modalHeroRow}>
                  <View style={styles.modalHeroStat}>
                    <Text style={styles.modalHeroValue}>{selectedPack.documentCount}</Text>
                    <Text style={styles.modalHeroLabel}>PDF inclus</Text>
                  </View>
                  <View style={styles.modalHeroDivider} />
                  <View style={styles.modalHeroStat}>
                    <Text style={[styles.modalHeroValue, { color: $.emd }]}>-{selectedPack.discountPercent}%</Text>
                    <Text style={styles.modalHeroLabel}>Remise</Text>
                  </View>
                  <View style={styles.modalHeroDivider} />
                  <View style={styles.modalHeroStat}>
                    <Text style={styles.modalHeroValue}>{selectedPack.pageCount}</Text>
                    <Text style={styles.modalHeroLabel}>Pages</Text>
                  </View>
                </View>

                <Text style={styles.cardDescription}>{selectedPack.description}</Text>

                {/* Chips */}
                <View style={styles.chipRow}>
                  <View style={[styles.editorialBadge, styles.editorialBadgeMuted]}>
                    <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextMuted]}>{selectedPack.semester}</Text>
                  </View>
                  <View style={[styles.editorialBadge, styles.editorialBadgeMuted]}>
                    <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextMuted]}>{selectedPack.packType.replace('_', ' ')}</Text>
                  </View>
                  <View style={[styles.editorialBadge, styles.editorialBadgeMuted]}>
                    <Text style={[styles.editorialBadgeText, styles.editorialBadgeTextMuted]}>{selectedPack.pageCount} pages</Text>
                  </View>
                </View>

                {/* Document list */}
                <View style={styles.packDocumentsList}>
                  {getPackDocuments(selectedPack).map((doc) => {
                    const docOwned = ownedDocumentIds.includes(doc.id);
                    const docInitials = doc.subject.slice(0, 2).toUpperCase();
                    return (
                      <Pressable key={doc.id} style={styles.packDocumentRow} onPress={() => openPreview(doc)}>
                        <View style={styles.packDocIcon}>
                          <Text style={styles.packDocIconText}>{docInitials}</Text>
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{doc.title}</Text>
                          <Text style={styles.cardMeta}>{doc.pageCount} pages — {doc.subject}</Text>
                        </View>
                        <Text style={docOwned ? styles.ownedMini : styles.priceMini}>
                          {docOwned ? '— OK' : `${formatCoins(doc.price)} C`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <Pressable style={styles.btnSecondary} onPress={() => setSelectedPack(null)}>
                    <Text style={styles.btnSecondaryText}>Fermer</Text>
                  </Pressable>
                  {purchasedPackIds.includes(selectedPack.id) || purchasingPackId === selectedPack.id ? (
                    <View style={[styles.btnPrimary, purchasedPackIds.includes(selectedPack.id) ? styles.btnOwned : styles.btnDisabled]}>
                      <Text style={styles.btnPrimaryText}>
                        {purchasedPackIds.includes(selectedPack.id) ? 'Déjà acheté' : `${formatCoins(selectedPack.price)} Coins`}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => { onBuyPack(selectedPack); setSelectedPack(null); }}
                    >
                      <LinearGradient
                        colors={brandGradient.colors}
                        start={brandGradient.horizontal.start}
                        end={brandGradient.horizontal.end}
                        style={styles.btnPrimary}
                      >
                        <Text style={styles.btnPrimaryText}>{`${formatCoins(selectedPack.price)} Coins`}</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Reader / PDF view modal ───────────────────────────────────────── */}
      <Modal animationType="slide" visible={Boolean(readerDocument)}>
        <View style={styles.readerScreen}>
          {readerDocument ? (
            <>
              {/* Top bar */}
              <View style={styles.readerTopBar}>
                <Pressable style={styles.readerClose} onPress={closeReader}>
                  <Text style={styles.readerCloseText}>Fermer</Text>
                </Pressable>
                <View style={styles.flex}>
                  <Text style={styles.readerTitle} numberOfLines={1}>{readerDocument.title}</Text>
                  <Text style={styles.readerMeta}>{readerDocument.subject} — {readerDocument.level}</Text>
                </View>
              </View>

              {/* Tool segment — ALWAYS VISIBLE so the student can access Résumé, Plan, Quiz, Chat IA */}
              <View style={styles.toolSegment}>
                {(['pdf', 'summary', 'plan', 'quiz', 'assistant'] as const).map((tool) => {
                  const active = activeTool === tool;
                  const iconColor = active ? $.sienna : $.muted;
                  const label =
                    tool === 'pdf' ? 'PDF'
                    : tool === 'summary' ? 'Résumé'
                    : tool === 'plan' ? 'Plan'
                    : tool === 'quiz' ? 'Quiz'
                    : 'Chat IA';
                  const IconComponent =
                    tool === 'pdf' ? FileText
                    : tool === 'summary' ? Sparkles
                    : tool === 'plan' ? Calendar
                    : tool === 'quiz' ? HelpCircle
                    : MessageSquare;
                  return (
                    <Pressable
                      key={tool}
                      style={[styles.toolSegmentButton, active && styles.toolSegmentButtonActive]}
                      onPress={() => setActiveTool(tool)}
                    >
                      <IconComponent size={14} color={iconColor} style={{ marginBottom: 2 }} />
                      <Text style={[styles.toolSegmentText, active && styles.toolSegmentTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {isReaderPreview && (
                <View style={styles.previewModeBadge}>
                  <Lock size={12} color="#FFFFFF" />
                  <Text style={styles.previewModeBadgeText}>MODE APERÇU</Text>
                </View>
              )}

              {/* PDF viewport */}
              {activeTool === 'pdf' ? (
                <View style={styles.fullscreenPdfReaderWrapper}>
                  {readerLoading ? (
                    <View style={styles.pdfFrameFallback}>
                      <ActivityIndicator color={$.sienna} size="large" />
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
                        src: `/pdf-viewer.html?url=${encodeURIComponent(readerUrl)}`,
                        title: readerDocument.title,
                        style: {
                          width: '100%',
                          height: '100%',
                          border: '0',
                          backgroundColor: $.paper,
                        },
                      })
                    ) : (
                      <WebView
                        source={{ uri: `${authWebBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(readerUrl)}` }}
                        style={styles.inAppWebViewFull}
                        startInLoadingState
                        renderLoading={() => (
                          <View style={styles.webViewLoading}>
                            <ActivityIndicator color={$.sienna} size="large" />
                            <Text style={styles.bodyMuted}>Chargement du cours...</Text>
                          </View>
                        )}
                        javaScriptEnabled
                        domStorageEnabled
                        scalesPageToFit
                      />
                    )
                  ) : null}

                  {/* Preview unlock banner */}
                  {isReaderPreview && (
                    <View style={styles.previewUnlockBanner}>
                      <Lock size={20} color={$.sienna} style={{ marginBottom: 6 }} />
                      <Text style={styles.previewUnlockText}>
                        Ce document contient {readerDocument.pageCount} pages. Débloque-le pour y accéder et utiliser les outils IA.
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
                <KeyboardAvoidingView style={{ flex: 1, backgroundColor: $.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  {/* AI header */}
                  <View style={styles.aiHeader}>
                    <View style={[styles.aiHeaderIcon, { backgroundColor: $.cream, borderColor: $.line, borderWidth: 1 }]}>
                      <Sparkles size={18} color={$.sienna} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.aiTitle, { ...SERIF_TITLE, fontSize: 16, color: $.ink }]}>Campus AI</Text>
                      <Text style={[styles.aiSubtitle, { fontSize: 12, color: $.muted, marginTop: 2 }]}>
                        Ton assistant personnel de révision.
                      </Text>
                    </View>
                    {assistantMessages.length > 1 ? (
                      <Pressable
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: $.cream,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: $.line,
                        }}
                        onPress={handleClearChat}
                        accessibilityLabel="Réinitialiser la discussion"
                      >
                        <RotateCcw size={13} color={$.sienna} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: $.sienna }}>Nouveau</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 }}>
                    {assistantMessages.length === 0 ? (
                      <View style={{ marginTop: 8, gap: 8 }}>
                        {['Fais-moi un résumé', 'Génère un quiz de 5 questions', 'Explique-moi les concepts clés'].map((prompt) => (
                          <Pressable key={prompt} style={styles.quickPrompt} onPress={() => askAssistant(prompt)}>
                            <Text style={styles.quickPromptText}>{prompt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {assistantMessages.map((message) => (
                      <View
                        key={message.id}
                        style={{
                          flexDirection: 'row',
                          marginBottom: 14,
                          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {message.role === 'assistant' && (
                          <View style={[styles.aiBubbleIcon, { backgroundColor: $.cream, borderColor: $.line, borderWidth: 1 }]}>
                            <Sparkles size={14} color={$.sienna} />
                          </View>
                        )}
                        <View
                          style={[
                            styles.assistantBubble,
                            {
                              maxWidth: '85%',
                              backgroundColor: message.role === 'user' ? $.ink : $.surface,
                              borderWidth: message.role === 'assistant' ? 1 : 0,
                              borderColor: $.line,
                            },
                          ]}
                        >
                          {message.role === 'user' ? (
                            <Text style={[
                              styles.assistantBubbleText,
                              { color: $.paper, fontSize: 14, lineHeight: 21 },
                            ]}>
                              {message.content}
                            </Text>
                          ) : (
                            <FormattedMarkdown
                              content={message.content}
                              baseTextColor={$.ink}
                              isDark={false}
                            />
                          )}
                        </View>
                      </View>
                    ))}
                    {assistantLoading && (
                      <View style={{ flexDirection: 'row', marginBottom: 14, justifyContent: 'flex-start' }}>
                        <View style={[styles.aiBubbleIcon, { backgroundColor: $.cream, borderColor: $.line, borderWidth: 1 }]}>
                          <Sparkles size={14} color={$.sienna} />
                        </View>
                        <View style={[styles.assistantBubble, { backgroundColor: $.surface, borderWidth: 1, borderColor: $.line }]}>
                          <Text style={{ color: $.soft, fontSize: 13, fontStyle: 'italic' }}>L'IA reflechit...</Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.aiInputRow}>
                    <TextInput
                      value={assistantInput}
                      onChangeText={setAssistantInput}
                      placeholder="Pose une question au doc..."
                      placeholderTextColor={$.muted}
                      style={[
                        styles.aiInput,
                        {
                          backgroundColor: $.surface,
                          borderColor: $.line,
                          color: $.ink,
                        },
                      ]}
                      multiline
                    />
                    <Pressable
                      style={[
                        styles.aiSendButton,
                        (assistantLoading || !assistantInput.trim()) && styles.aiSendButtonDisabled,
                      ]}
                      onPress={() => askAssistant(assistantInput)}
                      disabled={assistantLoading || !assistantInput.trim()}
                    >
                      <Text style={styles.aiSendButtonText}>↑</Text>
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
                            <Text style={styles.studyBoxTitle}>Quiz rapide d'auto-evaluation</Text>
                            {readerDocument.quiz.map((item) => (
                              <View key={item.question} style={styles.quizItem}>
                                <Text style={styles.quizQuestion}>{item.question}</Text>
                                <Text style={styles.cardMeta}>{item.answer}</Text>
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

                    <Text style={styles.readerWatermark}>CAMPUS 360</Text>
                  </View>
                </ScrollView>
              )}
            </>
          ) : null}
        </View>
      </Modal>

      {/* ── Filters modal ─────────────────────────────────────────────────── */}
      <Modal transparent animationType="slide" visible={filtersVisible} onRequestClose={() => setFiltersVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editorialModalCard}>
            <View style={styles.filterSheetHeader}>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>Filtres PDF</Text>
                <View style={styles.rule} />
                <Text style={[styles.editorialTitle, { fontSize: 18 }]}>Affiner la recherche</Text>
                <Text style={[styles.bodyMuted, { marginTop: 4 }]}>Affiche seulement les PDF qui collent a ton besoin.</Text>
              </View>
              <Pressable style={styles.filterSheetClose} onPress={() => setFiltersVisible(false)}>
                <Text style={styles.filterSheetCloseText}>×</Text>
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
              <Pressable style={styles.btnSecondary} onPress={resetFilters}>
                <Text style={styles.btnSecondaryText}>Reinitialiser</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={() => setFiltersVisible(false)}>
                <Text style={styles.btnPrimaryText}>Afficher</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Filter row sub-component ──────────────────────────────────────────────────
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => {
          if (option === 'Tous') return null;
          const active = option === value;
          return (
            <Pressable
              key={option}
              style={[styles.editorialBadge, active ? styles.editorialBadgeActive : styles.editorialBadgeMuted]}
              onPress={() => onChange(active ? 'Tous' : option)}
            >
              <Text style={[styles.editorialBadgeText, active ? styles.editorialBadgeTextActive : styles.editorialBadgeTextMuted]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Root
  root: {
    backgroundColor: $.paper,
    flex: 1,
  },

  // ── Editorial atoms ──────────────────────────────────────────────────────
  eyebrow: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.sienna,
    textTransform: 'uppercase',
  },
  rule: {
    height: 1,
    backgroundColor: '#2E2E33',
    marginVertical: 6,
  },
  editorialTitle: {
    ...SERIF_TITLE,
    fontSize: 22,
    color: $.ink,
    lineHeight: 28,
  },
  editorialSubtitle: {
    color: $.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  bodyMuted: {
    color: $.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  flex: { flex: 1 },

  // ── Controls ────────────────────────────────────────────────────────────
  libraryHeadingSection: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: $.surface,
    borderBottomWidth: 1,
    borderBottomColor: $.line,
    marginBottom: 14,
  },
  controls: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  resultText: {
    ...MONO,
    fontSize: 11,
    fontWeight: '700',
    color: $.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  clearButton: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: $.surface,
  },
  clearButtonText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.sienna,
    textTransform: 'uppercase',
  },

  // ── Editorial tabs ──────────────────────────────────────────────────────
  editorialTabStrip: {
    flexDirection: 'row',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
  editorialTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialTabActive: {
    backgroundColor: '#2E2E33',
  },
  editorialTabRight: {
    borderLeftWidth: 1,
    borderLeftColor: $.line,
  },
  editorialTabText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  editorialTabTextActive: {
    color: '#FFFFFF',
  },

  // ── Search input ────────────────────────────────────────────────────────
  searchInput: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: $.ink,
    fontSize: 14,
    marginBottom: 12,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,

  // ── Filter toolbar ──────────────────────────────────────────────────────
  filterToolbar: {
    marginBottom: 16,
    gap: 10,
  },
  filterTrigger: {
    minHeight: 44,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTriggerText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 2,
    backgroundColor: $.sienna,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterSummaryRow: {
    gap: 8,
    paddingRight: 10,
    paddingBottom: 4,
  },
  summaryChip: {
    maxWidth: 168,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryChipLabel: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.sienna,
    textTransform: 'uppercase',
  },
  summaryChipValue: {
    ...MONO,
    fontSize: 11,
    fontWeight: '700',
    color: $.ink,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  summaryChipMuted: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryChipMutedText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.muted,
    textTransform: 'uppercase',
  },

  // ── State panels ───────────────────────────────────────────────────────
  statePanel: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    gap: 6,
  },
  emptyState: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    gap: 6,
  },
  stateBadge: {
    width: 40,
    height: 40,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBadgeAlert: {
    borderColor: $.sienna,
    backgroundColor: stitchColors.warningBg,
  },
  stateBadgeMono: {
    ...MONO,
    fontSize: 18,
    fontWeight: '700',
    color: $.sienna,
  },
  stateTitle: {
    ...SERIF_TITLE,
    fontSize: 18,
    color: $.ink,
    marginTop: 4,
  },
  retryButton: {
    borderRadius: 3,
    backgroundColor: $.sienna,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  retryButtonText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  // ── Editorial section strip (hero) ─────────────────────────────────────
  editorialSectionStrip: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  editorialLink: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  editorialLinkText: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.ink,
    textTransform: 'uppercase',
  },

  // ── Editorial card ──────────────────────────────────────────────────────
  editorialCard: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    gap: 12,
  },
  editorialCardOwned: {
    borderColor: $.emd,
    backgroundColor: stitchColors.emeraldBg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  folioIconBox: {
    width: 52,
    height: 52,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.cream,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  folioDash: {
    ...MONO,
    fontSize: 12,
    color: $.sienna,
    lineHeight: 14,
  },
  folioNumber: {
    ...MONO,
    fontSize: 13,
    fontWeight: '700',
    color: $.sienna,
    lineHeight: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    minWidth: 0,
    ...SERIF_TITLE,
    fontSize: 16,
    color: $.ink,
    lineHeight: 22,
  },
  cardMeta: {
    ...MONO,
    fontSize: 10,
    fontWeight: '600',
    color: $.muted,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardDescription: {
    color: $.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  priceBadge: {
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  priceBadgeBuy: {
    backgroundColor: $.paper,
    borderColor: $.line,
  },
  priceBadgeOwned: {
    backgroundColor: $.emdBg,
    borderColor: $.emd,
  },
  priceBadgeText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceBadgeTextBuy: {
    color: $.ink,
  },
  priceBadgeTextOwned: {
    color: $.emd,
  },

  // ── Badges ─────────────────────────────────────────────────────────────
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  editorialBadge: {
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  editorialBadgeMuted: {
    backgroundColor: $.paper,
    borderColor: $.line,
  },
  editorialBadgeSienna: {
    backgroundColor: stitchColors.warningBg,
    borderColor: stitchColors.warningTone,
  },
  editorialBadgeActive: {
    backgroundColor: stitchColors.siennaBg,
    borderColor: $.sienna,
  },
  editorialBadgeText: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  editorialBadgeTextMuted: {
    color: $.muted,
  },
  editorialBadgeTextSienna: {
    color: stitchColors.warning,
  },
  editorialBadgeTextActive: {
    color: '#FFFFFF',
  },

  // ── Progress ───────────────────────────────────────────────────────────
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: $.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressMeta: {
    ...MONO,
    fontSize: 9,
    fontWeight: '600',
    color: $.soft,
    marginTop: -4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Actions ────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: '#2E2E33',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  btnSecondary: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: $.surface,
    borderWidth: 1,
    borderColor: $.line,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  btnPressed: {
    opacity: 0.72,
  },
  btnDisabled: {
    backgroundColor: $.soft,
  },
  btnOwned: {
    backgroundColor: $.sienna,
  },
  btnOwnedLibrary: {
    backgroundColor: $.emd,
  },

  // ── Pack detail modal ──────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.48)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  editorialModalCard: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    padding: 16,
    gap: 14,
    maxHeight: '85%',
  },
  modalHeroRow: {
    flexDirection: 'row',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.paper,
    overflow: 'hidden',
  },
  modalHeroStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  modalHeroDivider: {
    width: 1,
    backgroundColor: $.line,
  },
  modalHeroValue: {
    ...SERIF_TITLE,
    fontSize: 22,
    color: $.ink,
  },
  modalHeroLabel: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.muted,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  packDocumentsList: {
    gap: 8,
  },
  packDocumentRow: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.paper,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  packDocIcon: {
    width: 34,
    height: 34,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.cream,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packDocIconText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.sienna,
  },
  ownedMini: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.emd,
    flexShrink: 0,
  },
  priceMini: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: $.ink,
    flexShrink: 0,
  },

  // ── Filter sheet ───────────────────────────────────────────────────────
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.paper,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterSheetCloseText: {
    ...MONO,
    fontSize: 18,
    fontWeight: '700',
    color: $.muted,
    lineHeight: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  filterBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: $.line,
  },
  filterLabel: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.sienna,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 10,
  },

  // ── Reader ──────────────────────────────────────────────────────────────
  readerScreen: {
    flex: 1,
    backgroundColor: $.paper,
  },
  fullscreenPdfReaderWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: $.paper,
    position: 'relative',
  },
  readerTopBar: {
    paddingTop: 52,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: $.surface,
    borderBottomWidth: 1,
    borderBottomColor: $.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readerClose: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.paper,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  readerCloseText: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  readerTitle: {
    ...SERIF_TITLE,
    fontSize: 15,
    color: $.ink,
  },
  readerMeta: {
    ...MONO,
    fontSize: 10,
    fontWeight: '600',
    color: $.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  readerBody: {
    flex: 1,
    padding: 14,
  },
  readerBodyContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: $.surface,
  },
  readerWatermark: {
    ...MONO,
    fontSize: 14,
    fontWeight: '700',
    color: $.line,
    marginTop: 28,
    textAlign: 'center',
    letterSpacing: 3,
  },

  // ── Tool segment ────────────────────────────────────────────────────────
  toolSegment: {
    flexDirection: 'row',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    marginVertical: 12,
    marginHorizontal: 14,
    overflow: 'hidden',
  },
  toolSegmentButton: {
    flex: 1,
    minWidth: '20%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolSegmentButtonActive: {
    backgroundColor: '#2E2E33',
  },
  toolSegmentText: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  toolSegmentTextActive: {
    color: '#FFFFFF',
  },

  // ── Preview badge ───────────────────────────────────────────────────────
  previewModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: $.sienna,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 2,
  },
  previewModeBadgeText: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  // ── PDF fallback / loading ──────────────────────────────────────────────
  pdfFrameFallback: {
    minHeight: 200,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    margin: 14,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: $.paper,
    zIndex: 10,
    gap: 10,
  },
  inAppWebViewFull: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // ── Preview unlock ─────────────────────────────────────────────────────
  previewUnlockBanner: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.sienna,
    backgroundColor: stitchColors.warningBg,
    padding: 16,
    marginHorizontal: 14,
    marginTop: 14,
    alignItems: 'center',
    gap: 10,
  },
  previewUnlockText: {
    color: stitchColors.warningDeep,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewUnlockButton: {
    borderRadius: 3,
    backgroundColor: $.sienna,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  previewUnlockButtonText: {
    ...MONO,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Study tool content ─────────────────────────────────────────────────
  toolContent: {
    marginTop: 6,
  },
  studyBox: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    padding: 12,
    marginTop: 10,
  },
  studyBoxFeatured: {
    borderColor: $.sienna,
    backgroundColor: stitchColors.warningBg,
  },
  studyBoxTitle: {
    ...MONO,
    fontSize: 9,
    fontWeight: '700',
    color: $.sienna,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  readerParagraph: {
    color: $.ink,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  quizItem: {
    borderTopWidth: 1,
    borderTopColor: $.line,
    paddingTop: 10,
    marginTop: 10,
  },
  quizQuestion: {
    ...SERIF_TITLE,
    fontSize: 14,
    color: $.ink,
    marginBottom: 4,
  },

  // ── AI chat ────────────────────────────────────────────────────────────
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: $.surface,
    borderBottomWidth: 1,
    borderBottomColor: $.line,
  },
  aiHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiTitle: {
    ...SERIF_TITLE,
    fontSize: 18,
  },
  aiSubtitle: {
    color: $.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  aiBubbleIcon: {
    width: 30,
    height: 30,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
    flexShrink: 0,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    borderRadius: 3,
    padding: 12,
    marginBottom: 6,
  },
  assistantBubbleText: {
    lineHeight: 20,
  },
  quickPrompt: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: $.line,
    backgroundColor: $.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  quickPromptText: {
    ...MONO,
    fontSize: 11,
    fontWeight: '600',
    color: $.muted,
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: $.surface,
    borderTopWidth: 1,
    borderTopColor: $.line,
  },
  aiInput: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
    maxHeight: 100,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
  aiSendButton: {
    width: 44,
    height: 44,
    borderRadius: 3,
    backgroundColor: '#2E2E33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiSendButtonDisabled: {
    backgroundColor: $.soft,
  },
  aiSendButtonText: {
    ...MONO,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
