/**
 * Word-like WYSIWYG Report & Thesis Editor — Campus 360
 * Authentic Rich Text Editor with real Bold, Headings (H2, H3),
 * genuine bullet and numbered lists, tables, callouts, and native Cover Page.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { mobileApiFetch as authFetch } from '../auth/betterAuth';
import { EditorAiChat } from './EditorAiChat';
import { DocumentSourcesPanel } from './DocumentSourcesModal';
import { DocumentImagesModal, type InsertFigurePayload } from './DocumentImagesModal';
import { listDocumentImages, resolveFileUrls, type DocumentFile } from './documentFilesApi';
import { buildPreviewHtml, buildWysiwygHtml } from './editorTemplate';
import { applyStylePatch, resolveStyle, type DocumentStylePatch } from './documentStyle';
import { classifySection } from './documentRender';
import { DocumentStylePanel } from './DocumentStylePanel';
import { EditorSurface, type EditorSurfaceHandle } from './EditorSurface';
import {
  Sparkles, Send, ArrowLeft, Plus, Trash2, FileText, Image as ImageIcon, BookOpen, Eye
} from 'lucide-react-native';
import { stitchColors } from '../../theme/stitch';
import { AppAlert } from '../../ui/AppAlert';

type Document = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, string | boolean>;
  // Raw stored style; read through resolveStyle().
  document_style?: unknown;
};

// Cover fields. Examples are generic: nothing here is printed unless the student types it.
const COVER_FIELDS: { key: string; label: string; placeholder: string; multiline?: boolean; stageOnly?: boolean }[] = [
  { key: 'university', label: 'Université', placeholder: 'Ex. : Université de …' },
  { key: 'school', label: 'École / Institut', placeholder: 'Ex. : Institut universitaire de technologie' },
  { key: 'faculty', label: 'Faculté / Département', placeholder: 'Ex. : Département de génie informatique' },
  { key: 'degree', label: 'Diplôme préparé', placeholder: 'Ex. : Licence professionnelle' },
  { key: 'title', label: 'Titre (thème)', placeholder: 'Ex. : Mise en place d’un tableau de bord qualité' },
  { key: 'subtitle', label: 'Sous-titre', placeholder: 'Ex. : Cas du service qualité de …', multiline: true },
  { key: 'studentName', label: 'Nom et prénom', placeholder: 'Votre nom complet' },
  { key: 'matricule', label: 'Matricule', placeholder: 'Votre matricule' },
  { key: 'specialty', label: 'Filière / spécialité', placeholder: 'Ex. : Gestion des entreprises' },
  { key: 'company', label: 'Entreprise d’accueil', placeholder: 'Nom de l’entreprise', stageOnly: true },
  { key: 'period', label: 'Période du stage', placeholder: 'Ex. : du 3 juin au 30 août 2026', stageOnly: true },
  { key: 'tutorCorporate', label: 'Encadreur professionnel', placeholder: 'Nom et fonction', stageOnly: true },
  { key: 'tutorAcademic', label: 'Encadreur académique', placeholder: 'Ex. : Dr …' },
  { key: 'year', label: 'Année académique', placeholder: 'Ex. : 2025-2026' },
];

type DocumentSection = {
  id: string;
  title: string;
  content_html: string;
  sort_order: number;
  is_system: boolean;
};

type DocumentEditorScreenProps = {
  documentId: string;
  onClose: () => void;
};

const downloadBlobOnWeb = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

export function DocumentEditorScreen({ documentId, onClose }: DocumentEditorScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Document | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Content & word count for current section. `editorSeed` is the HTML the
  // WebView is built from: it only changes when a section is (re)opened, never
  // on keystrokes, otherwise the editor would reload and lose the cursor.
  const [currentHtml, setCurrentHtml] = useState('');
  const [editorSeed, setEditorSeed] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [editorTab, setEditorTab] = useState<'document' | 'sources' | 'assistant'>('document');
  const [selectedSources, setSelectedSources] = useState<DocumentFile[]>([]);

  // Save status
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest unsaved text of a section; cleared once that exact content is saved.
  const dirtyRef = useRef<{ sectionId: string; html: string } | null>(null);

  // AI states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Images modal
  const [imagesModalVisible, setImagesModalVisible] = useState(false);
  const [imagesCount, setImagesCount] = useState(0);

  // Section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [styleVisible, setStyleVisible] = useState(false);
  const [coverLogoUrls, setCoverLogoUrls] = useState<{ school?: string | null; company?: string | null; department?: string | null }>({});
  const [exportVisible, setExportVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const previewSurfaceRef = useRef<EditorSurfaceHandle | null>(null);

  const editorSurfaceRef = useRef<EditorSurfaceHandle | null>(null);
  const pendingEditorScripts = useRef<string[]>([]);

  // Runs the commands queued while another tab was shown, once the editor is visible again.
  useEffect(() => {
    if (editorTab !== 'document' || pendingEditorScripts.current.length === 0) return;
    const timer = setTimeout(() => {
      const scripts = pendingEditorScripts.current.splice(0);
      scripts.forEach((script) => editorSurfaceRef.current?.injectJavaScript(script));
    }, 80);
    return () => clearTimeout(timer);
  }, [editorTab]);

  // Source count comes from the Sources panel (always mounted); images are counted here.
  const loadCounts = useCallback(() => {
    listDocumentImages(documentId)
      .then((images) => setImagesCount(images.length))
      .catch(() => {});
  }, [documentId]);

  // Signed URLs for the images of the open section, pushed into the editor once it is ready.
  const resolveEditorImages = useCallback(async (html: string) => {
    const ids = Array.from(html.matchAll(/data-file-id="([0-9a-fA-F-]{36})"/g), (m) => m[1].toLowerCase());
    if (ids.length === 0) return;
    try {
      const urls = await resolveFileUrls(ids);
      editorSurfaceRef.current?.injectJavaScript(`applyImageUrls(${JSON.stringify(urls)}); true;`);
    } catch (e) {
      console.warn('[editor] image URL resolution failed:', e);
    }
  }, []);

  // Load report data
  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch(`/api/mobile/documents/${documentId}`);
      if (!res.ok) throw new Error('Impossible de charger le document.');
      const data = await res.json();
      setReport(data.document);
      const fetchedSections: DocumentSection[] = data.sections || [];
      setSections(fetchedSections);

      // Open first section
      const initialId = fetchedSections[0]?.id ?? null;
      setCurrentSectionId(initialId);
      if (initialId) {
        const currentSec = fetchedSections.find(s => s.id === initialId);
        setCurrentHtml(currentSec?.content_html || '');
        setEditorSeed(currentSec?.content_html || '');
      }
      loadCounts();
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [documentId, loadCounts]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Saves the pending text right away (section switch, close, retry).
  const flushPendingSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const pending = dirtyRef.current;
    if (pending) return saveSectionContent(pending.sectionId, pending.html);
    return Promise.resolve();
  };

  const handleClose = () => {
    flushPendingSave();
    onClose();
  };

  // When switching section
  const handleSelectSection = (sectionId: string) => {
    if (currentSectionId === sectionId) return;
    flushPendingSave();
    setCurrentSectionId(sectionId);
    const sec = sections.find(s => s.id === sectionId);
    setCurrentHtml(sec?.content_html || '');
    setEditorSeed(sec?.content_html || '');
    setEditorTab('document');
  };

  // Debounced auto-save for current section text
  const saveSectionContent = async (secId: string, htmlToSave: string) => {
    setSaveState('saving');
    try {
      await authFetch(`/api/mobile/documents/${documentId}/sections/${secId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: htmlToSave }),
      });
      setSections(prev => prev.map(s => s.id === secId ? { ...s, content_html: htmlToSave } : s));
      const pending = dirtyRef.current;
      if (pending && pending.sectionId === secId && pending.html === htmlToSave) dirtyRef.current = null;
      setSaveState(dirtyRef.current ? 'saving' : 'saved');
    } catch (e) {
      console.warn('Auto-save error:', e);
      setSaveState('error');
    }
  };

  // Message handler from WYSIWYG editor
  const handleEditorMessage = (event: any) => {
    try {
      const rawData = event.nativeEvent.data;
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (data.type === 'ready') {
        resolveEditorImages(editorSeed);
        return;
      }
      if (data.type === 'stats') {
        setWordCount(data.wordCount || 0);
        return;
      }
      if (data.type === 'change') {
        const updatedHtml = data.html || '';
        setCurrentHtml(updatedHtml);
        setWordCount(data.wordCount || 0);

        if (!currentSectionId) return;
        dirtyRef.current = { sectionId: currentSectionId, html: updatedHtml };
        setSaveState('saving');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveSectionContent(currentSectionId, updatedHtml);
        }, 1200);
      }
    } catch (e) {
      // Ignored
    }
  };

  // Debounced auto-save for cover data
  const handleCoverDataChange = (field: string, value: string | boolean) => {
    if (!report) return;
    const updatedCover = { ...(report.cover_data || {}), [field]: value };
    setReport(prev => prev ? { ...prev, cover_data: updatedCover } : prev);

    setSaveState('saving');
    if (coverTimeoutRef.current) clearTimeout(coverTimeoutRef.current);
    coverTimeoutRef.current = setTimeout(async () => {
      try {
        await authFetch(`/api/mobile/documents/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover_data: updatedCover }),
        });
        setSaveState(dirtyRef.current ? 'saving' : 'saved');
      } catch {
        setSaveState('error');
      }
    }, 1200);
  };

  // AI Prompt generation with WYSIWYG HTML insertion
  const handleRunAi = async (promptToSend: string) => {
    const prompt = promptToSend.trim();
    if (!prompt) {
      AppAlert.alert('Prompt requis', 'Décrivez ce que vous souhaitez rédiger.');
      return;
    }

    setAiLoading(true);
    try {
      const currentSec = sections.find(s => s.id === currentSectionId);
      const res = await authFetch('/api/mobile/documents/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          prompt: prompt,
          sectionTitle: currentSec ? currentSec.title : 'Section',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur IA.');

      const generatedHtml = data.html || (data.text ? `<p>${data.text.replace(/\\n/g, '<br/>')}</p>` : '');
      if (generatedHtml) {
        editorSurfaceRef.current?.injectJavaScript(`insertAiContent(${JSON.stringify(generatedHtml)}); true;`);
        setAiPrompt('');
        AppAlert.alert('✨ IA', 'Contenu rédigé et inséré dans votre document !');
      }
    } catch (err: any) {
      AppAlert.alert('Erreur IA', err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Add new section
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    setAddingSection(true);
    try {
      const nextOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order)) + 1 : 0;
      const res = await authFetch(`/api/mobile/documents/${documentId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSectionTitle.trim(), sort_order: nextOrder }),
      });
      if (!res.ok) throw new Error("Impossible d'ajouter la section.");
      const data = await res.json();
      const newSec = data.section;
      setSections(prev => [...prev, newSec]);
      setNewSectionTitle('');
      setShowAddSection(false);
      handleSelectSection(newSec.id);
    } catch (err: any) {
      AppAlert.alert('Erreur', err.message);
    } finally {
      setAddingSection(false);
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    if (sec.is_system) {
      AppAlert.alert('Section obligatoire', 'Cette section fait partie du modèle officiel.');
      return;
    }
    AppAlert.alert(
      'Supprimer la section',
      `Voulez-vous supprimer "${sec.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await authFetch(`/api/mobile/documents/${documentId}/sections/${sectionId}`, {
                method: 'DELETE',
              });
              const remaining = sections.filter(s => s.id !== sectionId);
              setSections(remaining);
              if (currentSectionId === sectionId) {
                handleSelectSection(remaining[0]?.id ?? '');
              }
            } catch {
              AppAlert.alert('Erreur', 'Impossible de supprimer cette section.');
            }
          }
        }
      ]
    );
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!report || sections.length === 0) return;

    setExporting(true);
    try {
      const response = await authFetch(`/api/mobile/documents/${documentId}/export/pdf`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Erreur lors de la génération du PDF.');
      }
      const blob = await response.blob();
      const safeName = `${String(report.title || 'document').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60)}.pdf`;
      if (Platform.OS === 'web') {
        downloadBlobOnWeb(blob, safeName);
        return;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('read-failed'));
        reader.readAsDataURL(blob);
      });
      const fileUri = `${FileSystem.cacheDirectory}${safeName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exporter le PDF',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error: any) {
      AppAlert.alert('Erreur', error.message || 'Impossible de générer le PDF.');
    } finally {
      setExporting(false);
    }
  };

  // Export Word
  const handleExportDocx = async () => {
    if (!report) return;

    setExporting(true);
    try {
      const response = await authFetch(`/api/mobile/documents/${documentId}/export/docx`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Erreur lors de l'export Word.");
      }
      const blob = await response.blob();
      const safeName = `${String(report.title || 'document').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60)}.docx`;
      if (Platform.OS === 'web') {
        downloadBlobOnWeb(blob, safeName);
        return;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('read-failed'));
        reader.readAsDataURL(blob);
      });
      const fileUri = `${FileSystem.cacheDirectory}${safeName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: 'Exporter le document Word',
          UTI: 'org.openxmlformats.wordprocessingml.document',
        });
      }
    } catch (error: any) {
      AppAlert.alert('Erreur', error.message || 'Impossible de générer le document Word.');
    } finally {
      setExporting(false);
    }
  };

  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentTitle = currentSection?.title ?? '';
  const style = useMemo(() => resolveStyle(report?.document_style), [report?.document_style]);
  const styleKey = useMemo(() => JSON.stringify(style), [style]);
  const editorHtml = useMemo(
    () => buildWysiwygHtml(editorSeed, currentTitle, style),
    // styleKey: rebuild only when a style value really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorSeed, currentTitle, styleKey],
  );

  // Cover logos shown in the preview.
  useEffect(() => {
    if (!previewVisible) return;
    const ids = [style.cover.schoolLogoFileId, style.cover.companyLogoFileId, style.cover.departmentLogoFileId].filter((v): v is string => Boolean(v));
    if (ids.length === 0) {
      setCoverLogoUrls({});
      return;
    }
    resolveFileUrls(ids)
      .then((urls) => setCoverLogoUrls({
        school: style.cover.schoolLogoFileId ? urls[style.cover.schoolLogoFileId] : null,
        company: style.cover.companyLogoFileId ? urls[style.cover.companyLogoFileId] : null,
        department: style.cover.departmentLogoFileId ? urls[style.cover.departmentLogoFileId] : null,
      }))
      .catch(() => setCoverLogoUrls({}));
  }, [previewVisible, style.cover.schoolLogoFileId, style.cover.companyLogoFileId, style.cover.departmentLogoFileId]);

  // Whole document, read-only, with the section being edited at its latest state.
  const previewHtml = useMemo(() => {
    if (!previewVisible || !report) return '';
    return buildPreviewHtml(
      { title: report.title, template_type: report.template_type, cover_data: report.cover_data || {} },
      sections.map((s) => ({ title: s.title, html: s.id === currentSectionId ? currentHtml : s.content_html || '' })),
      style,
      coverLogoUrls,
    );
  }, [previewVisible, report, sections, currentSectionId, currentHtml, style, coverLogoUrls]);

  // Document style: applied at once (optimistic), saved in the background.
  const updateStyle = async (patch: DocumentStylePatch) => {
    if (!report) return;
    flushPendingSave();
    setEditorSeed(currentHtml);
    setReport({ ...report, document_style: applyStylePatch(report.document_style, patch) });
    try {
      await authFetch(`/api/mobile/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_style: patch }),
      });
    } catch (err) {
      AppAlert.alert('Style du document', err instanceof Error ? err.message : 'Réglage non enregistré.');
    }
  };

  // Editing commands need a visible editor (a hidden one cannot take focus), so
  // commands sent from another tab are queued and run once Document is shown.
  const runInEditor = (script: string) => {
    if (editorTab === 'document') {
      editorSurfaceRef.current?.injectJavaScript(script);
      return;
    }
    pendingEditorScripts.current.push(script);
    setEditorTab('document');
  };

  const insertFigure = (figure: InsertFigurePayload) =>
    runInEditor(
      `insertFigure(${JSON.stringify(figure.fileId)}, ${JSON.stringify(figure.displayUrl)}, ${JSON.stringify(figure.caption)}, ${JSON.stringify(figure.width)}); true;`
    );

  const replaceSectionContent = (html: string) => {
    runInEditor(`setEditorContent(${JSON.stringify(html)}); true;`);
    if (currentSectionId) saveSectionContent(currentSectionId, html);
  };

  const insertAtCursor = (html: string) => runInEditor(`insertAiContent(${JSON.stringify(html)}); true;`);
  const isCoverSection = currentTitle.toLowerCase().includes('page de garde');
  const isTocSection = currentTitle.toLowerCase().includes('sommaire');
  const isListsSection = classifySection(currentTitle).kind === 'lists';
  // Sections written through the interview: everything the student writes in
  // prose (not the cover, the generated pages, references or appendices).
  const interviewSectionId =
    currentSectionId && !isCoverSection && !isTocSection && !isListsSection &&
    (report?.template_type === 'stage' || report?.template_type === 'memoire') &&
    !/^(bibliographie|webographie|annexe|liste des abr)/i.test(currentTitle.trim())
      ? currentSectionId
      : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={stitchColors.primary} />
          <Text style={styles.loadingText}>Ouverture de votre document...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose}>
            <ArrowLeft size={18} color={stitchColors.ink} />
            <Text style={styles.headerBtnText}>Retour</Text>
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadReport}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cover = report?.cover_data || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Close + title/status, exports on the right (the title truncates first). */}
        <View style={styles.headerTopRow}>
          <Pressable style={styles.headerBtn} onPress={handleClose} accessibilityLabel="Fermer l’éditeur">
            <ArrowLeft size={18} color={stitchColors.ink} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {report?.title || 'Rapport de stage'}
            </Text>
            {saveState === 'error' ? (
              <Pressable onPress={() => flushPendingSave()} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.saveStatus, styles.saveStatusError]}>⚠ Non enregistré · Réessayer</Text>
              </Pressable>
            ) : (
              <Text style={styles.saveStatus}>{saveState === 'saving' ? 'Enregistrement…' : '✓ Enregistré'}</Text>
            )}
          </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerActionBtn, styles.layoutBtn]}
            onPress={() => setStyleVisible(true)}
            accessibilityLabel="Style du document"
          >
            <Text style={styles.layoutBtnText}>Aa</Text>
          </Pressable>
          <Pressable
            style={[styles.headerActionBtn, styles.layoutBtn]}
            onPress={() => {
              flushPendingSave();
              setPreviewVisible(true);
            }}
            accessibilityLabel="Aperçu du document"
          >
            <Eye size={16} color={stitchColors.siennaDeep} />
          </Pressable>
          <Pressable
            style={[styles.headerActionBtn, styles.pdfBtn]}
            onPress={() => setExportVisible(true)}
            disabled={exporting}
            accessibilityLabel="Exporter"
          >
            {exporting ? (
              <ActivityIndicator size="small" color={stitchColors.white} />
            ) : (
              <Text style={styles.actionBtnText}>Exporter</Text>
            )}
          </Pressable>
        </View>
        </View>
      </View>

      {/* ── Horizontal Section Tabs (Document tab only) ─────────────── */}
      <View style={[styles.sectionTabsWrap, editorTab !== 'document' && styles.hidden]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionTabsContent}
        >
          {sections.map(sec => {
            const active = currentSectionId === sec.id;
            return (
              <Pressable
                key={sec.id}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => handleSelectSection(sec.id)}
              >
                <Text
                  style={[styles.tabPillText, active && styles.tabPillTextActive]}
                  numberOfLines={1}
                >
                  {sec.title}
                </Text>
                {!sec.is_system && active && (
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleDeleteSection(sec.id)}
                    style={styles.tabDeleteBtn}
                  >
                    <Trash2 size={13} color="#F87171" />
                  </Pressable>
                )}
              </Pressable>
            );
          })}

          <Pressable style={styles.addTabBtn} onPress={() => setShowAddSection(true)}>
            <Plus size={14} color={stitchColors.secondary} />
            <Text style={styles.addTabBtnText}>Section</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── Workspace Area (Native Cover vs Native TOC vs Word-like WYSIWYG) */}
      {/* All three tabs stay mounted (hidden when inactive) so the editor keeps
          its cursor, the chat its conversation and the sources their state. */}
      <KeyboardAvoidingView
        style={[styles.workspace, editorTab !== 'document' && styles.hidden]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isCoverSection ? (
          /* ── 1. NATIVE COVER PAGE FORM ──────────────────────────────── */
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📄 Page de Garde</Text>
              <Text style={styles.cardSubtitle}>
                Renseignez les informations officielles de présentation de votre établissement.
              </Text>
            </View>

            {COVER_FIELDS.filter((f) => !(f.stageOnly && report?.template_type === 'memoire')).map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.fieldInput, field.multiline && styles.fieldTextArea]}
                  multiline={field.multiline}
                  placeholder={field.placeholder}
                  placeholderTextColor={stitchColors.inkMuted}
                  value={typeof cover[field.key] === 'string' ? (cover[field.key] as string) : ''}
                  onChangeText={(v) => handleCoverDataChange(field.key, v)}
                />
              </View>
            ))}

            <View style={styles.coverToggle}>
              <Text style={styles.coverToggleText}>En-tête « République du Cameroun » (modèles Classique et Institutionnel)</Text>
              <Switch
                value={cover.nationalHeader !== false}
                onValueChange={(value) => handleCoverDataChange('nationalHeader', value)}
                trackColor={{ true: stitchColors.siennaSoft, false: stitchColors.glassBorder }}
                thumbColor={cover.nationalHeader !== false ? stitchColors.primary : stitchColors.surface}
              />
            </View>

            <Pressable style={styles.coverStyleBtn} onPress={() => setStyleVisible(true)}>
              <Text style={styles.coverStyleBtnText}>Modèle de page de garde, logos et lignes du jury →</Text>
            </Pressable>
          </ScrollView>
        ) : isListsSection ? (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.formContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Listes des figures et des tableaux</Text>
              <Text style={styles.cardSubtitle}>
                Générées automatiquement à l’export, avec les numéros de page, à partir des légendes de vos images et de vos tableaux.
                Pour ajouter une légende à un tableau : placez le curseur dans le tableau, puis « + Légende ».
              </Text>
            </View>
          </ScrollView>
        ) : isTocSection ? (
          /* ── 2. TABLE DES MATIÈRES (SOMMAIRE) ────────────────────────── */
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.formContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📑 Sommaire du Document</Text>
              <Text style={styles.cardSubtitle}>
                Cliquez sur une section pour y accéder et rédiger son contenu directement.
              </Text>
            </View>

            <View style={styles.tocList}>
              {sections.map((sec, index) => (
                <Pressable
                  key={sec.id}
                  style={styles.tocItem}
                  onPress={() => handleSelectSection(sec.id)}
                >
                  <Text style={styles.tocItemNumber}>{index + 1}.</Text>
                  <Text style={styles.tocItemTitle}>{sec.title}</Text>
                  <Text style={styles.tocItemArrow}>Ouvrir →</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          /* ── 3. WORD-LIKE WYSIWYG SHEET EDITOR ────────────────────────── */
          <View style={styles.editorFlex}>
            {/* Meta info: Section title & Word count */}
            <View style={styles.editorMetaRow}>
              <Text style={styles.currentSectionTitle}>{currentTitle}</Text>
              <Text style={styles.wordCountBadge}>{wordCount} mots</Text>
            </View>

            {/* WYSIWYG Surface */}
            <View style={styles.wysiwygContainer}>
              <EditorSurface
                key={currentSectionId || 'default-editor'}
                ref={editorSurfaceRef}
                html={editorHtml}
                onMessage={handleEditorMessage}
              />
            </View>

            {/* Document actions: section, image from the phone, assistant */}
            <View style={styles.docActions}>
              <Pressable style={styles.docActionBtn} onPress={() => setShowAddSection(true)}>
                <Plus size={14} color={stitchColors.primary} />
                <Text style={styles.docActionText}>Section</Text>
              </Pressable>
              <Pressable style={styles.docActionBtn} onPress={() => setImagesModalVisible(true)}>
                <ImageIcon size={14} color={stitchColors.primary} />
                <Text style={styles.docActionText}>Image{imagesCount > 0 ? ` (${imagesCount})` : ''}</Text>
              </Pressable>
              <Pressable style={styles.docActionBtn} onPress={() => setEditorTab('assistant')}>
                <Sparkles size={14} color={stitchColors.primary} />
                <Text style={styles.docActionText}>Assistant</Text>
              </Pressable>
            </View>

            {/* Bottom Quick AI Action Bar */}
            <View style={styles.aiDock}>
              <TextInput
                style={styles.aiDockInput}
                placeholder="Demande à l'IA de rédiger, compléter ou corriger..."
                placeholderTextColor={stitchColors.inkMuted}
                value={aiPrompt}
                onChangeText={setAiPrompt}
              />
              <Pressable
                style={[styles.aiDockBtn, aiLoading && { opacity: 0.5 }]}
                disabled={aiLoading}
                onPress={() => handleRunAi(aiPrompt)}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color={stitchColors.white} />
                ) : (
                  <Send size={16} color={stitchColors.white} />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Sources tab ─────────────────────────────────────────────── */}
      <View style={[styles.workspace, editorTab !== 'sources' && styles.hidden]}>
        <DocumentSourcesPanel documentId={documentId} onSelectionChange={setSelectedSources} />
      </View>

      {/* ── Assistant tab ───────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={[styles.workspace, editorTab !== 'assistant' && styles.hidden]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <EditorAiChat
          documentId={documentId}
          currentSectionTitle={currentTitle}
          interviewSectionId={interviewSectionId}
          selectedSources={selectedSources}
          onInsert={insertAtCursor}
          onReplaceSection={isCoverSection || isTocSection ? undefined : replaceSectionContent}
          onOpenSources={() => setEditorTab('sources')}
        />
      </KeyboardAvoidingView>

      {/* ── Editor tabs: Document | Sources | Assistant ─────────────── */}
      <View style={styles.editorTabBar}>
        {([
          { key: 'document', label: 'Document', Icon: FileText },
          { key: 'sources', label: selectedSources.length > 0 ? `Sources (${selectedSources.length})` : 'Sources', Icon: BookOpen },
          { key: 'assistant', label: 'Assistant', Icon: Sparkles },
        ] as const).map(({ key, label, Icon }) => {
          const active = editorTab === key;
          return (
            <Pressable
              key={key}
              style={[styles.editorTab, active && styles.editorTabActive]}
              onPress={() => setEditorTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Icon size={17} color={active ? stitchColors.primary : stitchColors.inkMuted} />
              <Text style={[styles.editorTabText, active && styles.editorTabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Add Section Modal ───────────────────────────────────────── */}
      <Modal visible={showAddSection} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle Section</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Analyse des besoins, Conclusion..."
              placeholderTextColor={stitchColors.inkMuted}
              value={newSectionTitle}
              onChangeText={setNewSectionTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setShowAddSection(false)}>
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnConfirm, addingSection && { opacity: 0.6 }]}
                disabled={addingSection}
                onPress={handleAddSection}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {addingSection ? 'Ajout...' : 'Créer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Export: PDF or Word ─────────────────────────────────────── */}
      <Modal visible={exportVisible} transparent animationType="slide" onRequestClose={() => setExportVisible(false)}>
        <Pressable style={styles.layoutBackdrop} onPress={() => setExportVisible(false)}>
          <Pressable style={styles.layoutSheet} onPress={() => undefined}>
            <Text style={styles.layoutTitle}>Exporter le document</Text>
            <Text style={styles.layoutHint}>Mise en page, images et sommaire inclus.</Text>
            <Pressable
              style={styles.layoutDone}
              onPress={() => {
                setExportVisible(false);
                flushPendingSave().then(handleExportPdf);
              }}
            >
              <Text style={styles.layoutDoneText}>PDF — pour imprimer ou envoyer</Text>
            </Pressable>
            <Pressable
              style={[styles.layoutDone, styles.exportSecondary]}
              onPress={() => {
                setExportVisible(false);
                flushPendingSave().then(handleExportDocx);
              }}
            >
              <Text style={[styles.layoutDoneText, styles.exportSecondaryText]}>Word (.docx) — pour continuer à modifier</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Read-only preview of the whole document ─────────────────── */}
      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.previewHeader}>
            <Pressable style={styles.headerBtn} onPress={() => setPreviewVisible(false)} accessibilityLabel="Fermer l’aperçu">
              <ArrowLeft size={18} color={stitchColors.ink} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>Aperçu du document</Text>
          </View>
          {previewVisible ? (
            <EditorSurface
              ref={previewSurfaceRef}
              html={previewHtml}
              onMessage={(event: any) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type !== 'ready') return;
                  const ids = Array.from(previewHtml.matchAll(/data-file-id="([0-9a-fA-F-]{36})"/g), (m) => m[1].toLowerCase());
                  if (ids.length === 0) return;
                  resolveFileUrls(ids)
                    .then((urls) => previewSurfaceRef.current?.injectJavaScript(`applyImageUrls(${JSON.stringify(urls)}); true;`))
                    .catch(() => undefined);
                } catch {
                  // Ignored
                }
              }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* ── Document style ──────────────────────────────────────────── */}
      <DocumentStylePanel
        visible={styleVisible}
        onClose={() => setStyleVisible(false)}
        documentId={documentId}
        style={style}
        onChange={updateStyle}
        onTemplateApplied={loadReport}
        establishment={report?.cover_data?.university as string | undefined}
      />

      {/* ── Images from the phone ───────────────────────────────────── */}
      <DocumentImagesModal
        visible={imagesModalVisible}
        onClose={() => setImagesModalVisible(false)}
        documentId={documentId}
        onInsertFigure={insertFigure}
        onImagesUpdated={setImagesCount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: stitchColors.inkSubtle,
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: stitchColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: stitchColors.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.background,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: stitchColors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: stitchColors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  layoutBtn: {
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  layoutBtnText: {
    color: stitchColors.siennaDeep,
    fontWeight: '800',
    fontSize: 14,
  },
  layoutBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: stitchColors.glassOverlay,
  },
  layoutSheet: {
    backgroundColor: stitchColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    gap: 8,
  },
  layoutTitle: {
    color: stitchColors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  layoutHint: {
    color: stitchColors.inkMuted,
    fontSize: 12.5,
    marginBottom: 6,
  },
  layoutLabel: {
    color: stitchColors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  layoutChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  layoutChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.paperDeep,
  },
  layoutChipActive: {
    borderColor: stitchColors.primary,
    backgroundColor: stitchColors.siennaBg,
  },
  layoutChipText: {
    color: stitchColors.inkSoft,
    fontSize: 13.5,
    fontWeight: '600',
  },
  layoutChipTextActive: {
    color: stitchColors.siennaDeep,
    fontWeight: '800',
  },
  layoutDone: {
    marginTop: 16,
    backgroundColor: stitchColors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  layoutDoneText: {
    color: stitchColors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  exportSecondary: {
    marginTop: 10,
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
  },
  exportSecondaryText: {
    color: stitchColors.siennaDeep,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.background,
  },
  coverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  coverToggleText: {
    flex: 1,
    color: stitchColors.inkSoft,
    fontSize: 13,
  },
  coverStyleBtn: {
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
    borderRadius: 10,
    padding: 12,
  },
  coverStyleBtnText: {
    color: stitchColors.siennaDeep,
    fontWeight: '700',
    fontSize: 13,
  },
  saveStatusError: {
    color: stitchColors.error,
  },
  saveStatus: {
    color: stitchColors.emeraldDeep,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  pdfBtn: {
    backgroundColor: stitchColors.siennaDeep,
  },
  actionBtnText: {
    color: stitchColors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Section Tabs
  sectionTabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
  },
  sectionTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  tabPillActive: {
    backgroundColor: stitchColors.paperSoft,
    borderColor: stitchColors.primary,
  },
  tabPillText: {
    color: stitchColors.inkSubtle,
    fontSize: 12.5,
    fontWeight: '600',
    maxWidth: 160,
  },
  tabPillTextActive: {
    color: stitchColors.primary,
    fontWeight: '700',
  },
  tabDeleteBtn: {
    padding: 2,
  },
  addTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  addTabBtnText: {
    color: stitchColors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Workspace
  workspace: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  formContainer: {
    padding: 18,
    paddingBottom: 100,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    color: stitchColors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: stitchColors.inkSubtle,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: stitchColors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: stitchColors.ink,
    fontSize: 14,
  },
  fieldTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // TOC
  tocList: {
    gap: 8,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tocItemNumber: {
    color: stitchColors.secondary,
    fontWeight: '700',
    fontSize: 14,
    width: 26,
  },
  tocItemTitle: {
    flex: 1,
    color: stitchColors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  tocItemArrow: {
    color: stitchColors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },

  // WYSIWYG Editor
  editorFlex: {
    flex: 1,
    paddingBottom: 10,
  },
  editorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
  },
  currentSectionTitle: {
    color: stitchColors.ink,
    fontSize: 14.5,
    fontWeight: '700',
  },
  wordCountBadge: {
    color: stitchColors.inkMuted,
    fontSize: 12,
  },
  wysiwygContainer: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  aiDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiDockInput: {
    flex: 1,
    color: stitchColors.ink,
    fontSize: 13,
    paddingVertical: 6,
  },
  aiDockBtn: {
    backgroundColor: stitchColors.primary,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inactive tabs stay mounted but take no space.
  hidden: {
    display: 'none',
  },

  // Document actions row (above the quick AI dock)
  docActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: stitchColors.background,
  },
  docActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: stitchColors.siennaSoft,
    backgroundColor: stitchColors.siennaBg,
  },
  docActionText: {
    color: stitchColors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Editor tabs: Document | Sources | Assistant
  editorTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
  },
  editorTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 9,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  editorTabActive: {
    borderTopColor: stitchColors.primary,
  },
  editorTabText: {
    color: stitchColors.inkMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  editorTabTextActive: {
    color: stitchColors.primary,
    fontWeight: '800',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    color: stitchColors.ink,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: stitchColors.ink,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: stitchColors.paperSoft,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: stitchColors.inkSubtle,
    fontWeight: '600',
    fontSize: 13,
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: stitchColors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: stitchColors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
