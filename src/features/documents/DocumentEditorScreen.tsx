/**
 * Word-like WYSIWYG Report & Thesis Editor — Campus 360
 * Authentic Rich Text Editor with real Bold, Headings (H2, H3),
 * genuine bullet and numbered lists, tables, callouts, and native Cover Page.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, Pressable, SafeAreaView, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
  Platform, KeyboardAvoidingView
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { authFetch } from '../auth/betterAuth';
import { EditorAiChat } from './EditorAiChat';
import {
  Sparkles, Send, ArrowLeft, Plus, Trash2
} from 'lucide-react-native';

type Document = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, string>;
};

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
  subscriptionTier: 'free' | 'basic' | 'premium';
  onUpgrade: () => void;
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

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Builds a standalone, self-contained Word-like WYSIWYG HTML document.
 * Toolbar buttons use event.preventDefault() on mousedown/touchstart
 * to ensure the editable sheet never loses text selection.
 */
function buildWysiwygHtml(initialContentHtml: string, title: string = 'Section'): string {
  const content = initialContentHtml && initialContentHtml.trim()
    ? initialContentHtml
    : `<p>Commencez à rédiger votre ${escapeHtml(title)} ici comme dans Word...</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0;
    padding: 0;
    background-color: #0B0F17;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #F8FAFC;
    height: 100%;
    overflow-x: hidden;
  }
  
  /* Word Toolbar (Sticky on Top) */
  .toolbar-container {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: #111622;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  
  .tool-btn {
    background: #182030;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #E2E8F0;
    border-radius: 8px;
    height: 36px;
    min-width: 36px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }
  
  .tool-btn:active {
    background: #4F46E5;
    color: #FFFFFF;
    border-color: #4F46E5;
  }
  
  .tool-divider {
    width: 1px;
    height: 22px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0 2px;
  }

  /* Sheet Container */
  .sheet-wrapper {
    padding: 14px 10px 100px;
    display: flex;
    justify-content: center;
  }

  /* Authentic Word Document Page */
  .document-sheet {
    width: 100%;
    max-width: 820px;
    min-height: 540px;
    background: #111622;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px 20px;
    outline: none;
    font-size: 15.5px;
    line-height: 1.75;
    color: #F1F5F9;
    word-break: break-word;
  }
  
  .document-sheet:focus {
    border-color: rgba(99, 102, 241, 0.5);
  }

  /* Academic Headings */
  .document-sheet h1 {
    font-size: 26px;
    font-weight: 800;
    color: #FFFFFF;
    margin: 22px 0 12px;
    border-bottom: 2px solid rgba(99, 102, 241, 0.4);
    padding-bottom: 8px;
    line-height: 1.3;
  }

  .document-sheet h2 {
    font-size: 22px;
    font-weight: 700;
    color: #818CF8;
    margin: 22px 0 10px;
    line-height: 1.35;
  }

  .document-sheet h3 {
    font-size: 18px;
    font-weight: 600;
    color: #38BDF8;
    margin: 18px 0 8px;
    line-height: 1.4;
  }

  .document-sheet p {
    margin: 0 0 14px 0;
  }

  .document-sheet b, .document-sheet strong {
    font-weight: 700;
    color: #FFFFFF;
  }

  .document-sheet i, .document-sheet em {
    font-style: italic;
    color: #E2E8F0;
  }

  .document-sheet u {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Real Indented Lists */
  .document-sheet ul {
    list-style-type: disc;
    margin: 10px 0 16px 26px;
    padding: 0;
  }

  .document-sheet ol {
    list-style-type: decimal;
    margin: 10px 0 16px 26px;
    padding: 0;
  }

  .document-sheet li {
    margin-bottom: 6px;
    line-height: 1.6;
    padding-left: 4px;
  }

  /* Academic Callouts */
  .document-sheet blockquote {
    margin: 16px 0;
    padding: 12px 16px;
    background: rgba(99, 102, 241, 0.08);
    border-left: 4px solid #4F46E5;
    border-radius: 0 8px 8px 0;
    color: #CBD5E1;
    font-style: italic;
  }

  /* Academic Tables */
  .document-sheet table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 14px;
  }

  .document-sheet th, .document-sheet td {
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 10px 12px;
    text-align: left;
  }

  .document-sheet th {
    background: #1E283C;
    color: #818CF8;
    font-weight: 700;
  }

  .document-sheet td {
    background: rgba(255, 255, 255, 0.02);
  }
</style>
</head>
<body>
  <div class="toolbar-container">
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('bold')" ontouchstart="event.preventDefault(); execCmd('bold')"><b>B</b></button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('italic')" ontouchstart="event.preventDefault(); execCmd('italic')"><i>I</i></button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('underline')" ontouchstart="event.preventDefault(); execCmd('underline')"><u>U</u></button>
    
    <div class="tool-divider"></div>
    
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); formatBlock('h2')" ontouchstart="event.preventDefault(); formatBlock('h2')"><span style="font-weight:700; color:#818CF8;">H2</span></button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); formatBlock('h3')" ontouchstart="event.preventDefault(); formatBlock('h3')"><span style="font-weight:600; color:#38BDF8;">H3</span></button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); formatBlock('p')" ontouchstart="event.preventDefault(); formatBlock('p')">¶</button>
    
    <div class="tool-divider"></div>
    
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('insertUnorderedList')" ontouchstart="event.preventDefault(); execCmd('insertUnorderedList')">•— Liste</button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('insertOrderedList')" ontouchstart="event.preventDefault(); execCmd('insertOrderedList')">1. Num</button>
    
    <div class="tool-divider"></div>
    
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); insertTable()" ontouchstart="event.preventDefault(); insertTable()">📊 Tableau</button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); insertCallout()" ontouchstart="event.preventDefault(); insertCallout()">💡 Note</button>
    
    <div class="tool-divider"></div>
    
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('justifyLeft')" ontouchstart="event.preventDefault(); execCmd('justifyLeft')">⇤</button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('justifyCenter')" ontouchstart="event.preventDefault(); execCmd('justifyCenter')">≡</button>
    <button type="button" class="tool-btn" onmousedown="event.preventDefault(); execCmd('justifyFull')" ontouchstart="event.preventDefault(); execCmd('justifyFull')">⇥</button>
  </div>

  <div class="sheet-wrapper">
    <div id="editor" class="document-sheet" contenteditable="true" spellcheck="true">${content}</div>
  </div>

  <script>
    const editor = document.getElementById('editor');
    
    function execCmd(command, value = null) {
      document.execCommand(command, false, value);
      editor.focus();
      notifyChange();
    }
    
    function formatBlock(tag) {
      document.execCommand('formatBlock', false, '<' + tag + '>');
      editor.focus();
      notifyChange();
    }
    
    function insertTable() {
      const tableHtml = '<table><thead><tr><th>Critère</th><th>Description</th><th>Statut</th></tr></thead><tbody><tr><td>Analyse</td><td>Conforme aux exigences</td><td>Validé</td></tr><tr><td>Mise en oeuvre</td><td>Développement complété</td><td>En cours</td></tr></tbody></table><p><br></p>';
      document.execCommand('insertHTML', false, tableHtml);
      editor.focus();
      notifyChange();
    }
    
    function insertCallout() {
      const calloutHtml = '<blockquote><b>Remarque académique :</b> Précisez ici votre réflexion méthodologique ou vos observations de stage.</blockquote><p><br></p>';
      document.execCommand('insertHTML', false, calloutHtml);
      editor.focus();
      notifyChange();
    }
    
    function insertAiContent(html) {
      editor.focus();
      document.execCommand('insertHTML', false, html);
      notifyChange();
    }

    function setEditorContent(html) {
      editor.innerHTML = html;
      notifyChange();
    }
    
    function getWordCount(text) {
      const trimmed = text.trim();
      if (!trimmed) return 0;
      return trimmed.split(/\\s+/).length;
    }
    
    function notifyChange() {
      const html = editor.innerHTML;
      const text = editor.innerText || editor.textContent || '';
      const wordCount = getWordCount(text);
      
      const payload = JSON.stringify({
        type: 'change',
        html: html,
        text: text,
        wordCount: wordCount
      });
      
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(payload, '*');
      }
    }
    
    editor.addEventListener('input', notifyChange);
    editor.addEventListener('keyup', notifyChange);
    editor.addEventListener('paste', () => setTimeout(notifyChange, 50));
    
    // Initial notify
    setTimeout(notifyChange, 100);
  </script>
</body>
</html>`;
}

type EditorSurfaceHandle = {
  injectJavaScript: (script: string) => void;
};

type EditorSurfaceProps = {
  html: string;
  onMessage: (event: any) => void;
};

const EditorSurface = React.forwardRef<EditorSurfaceHandle, EditorSurfaceProps>(
  ({ html, onMessage }, forwardedRef) => {
    const nativeRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow || !event.data) return;
        const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        onMessage({ nativeEvent: { data } });
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onMessage]);

    React.useImperativeHandle(forwardedRef, () => ({
      injectJavaScript(script: string) {
        if (Platform.OS === 'web') {
          (iframeRef.current?.contentWindow as any)?.eval(script);
          return;
        }
        nativeRef.current?.injectJavaScript(script);
      },
    }), []);

    if (Platform.OS === 'web') {
      return React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'Éditeur WYSIWYG Campus 360',
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          backgroundColor: '#0B0F17',
        },
      });
    }

    return (
      <WebView
        ref={nativeRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        textZoom={100}
        keyboardDisplayRequiresUserAction={false}
      />
    );
  }
);

export function DocumentEditorScreen({ documentId, onClose, subscriptionTier, onUpgrade }: DocumentEditorScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Document | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Content & word count for current section
  const [currentHtml, setCurrentHtml] = useState('');
  const [wordCount, setWordCount] = useState(0);

  // Save status
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  // Section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [exporting, setExporting] = useState(false);

  const editorSurfaceRef = useRef<EditorSurfaceHandle | null>(null);

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
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // When switching section
  const handleSelectSection = (sectionId: string) => {
    if (currentSectionId && currentSectionId !== sectionId) {
      saveSectionContent(currentSectionId, currentHtml);
    }
    setCurrentSectionId(sectionId);
    const sec = sections.find(s => s.id === sectionId);
    setCurrentHtml(sec?.content_html || '');
  };

  // Debounced auto-save for current section text
  const saveSectionContent = async (secId: string, htmlToSave: string) => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/mobile/documents/${documentId}/sections/${secId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: htmlToSave }),
      });
      if (res.ok) {
        setSections(prev => prev.map(s => s.id === secId ? { ...s, content_html: htmlToSave } : s));
      }
    } catch (e) {
      console.warn('Auto-save error:', e);
    } finally {
      setSaving(false);
    }
  };

  // Message handler from WYSIWYG editor
  const handleEditorMessage = (event: any) => {
    try {
      const rawData = event.nativeEvent.data;
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (data.type === 'change') {
        const updatedHtml = data.html || '';
        setCurrentHtml(updatedHtml);
        setWordCount(data.wordCount || 0);

        if (!currentSectionId) return;
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
  const handleCoverDataChange = (field: string, value: string) => {
    if (!report) return;
    const updatedCover = { ...(report.cover_data || {}), [field]: value };
    setReport(prev => prev ? { ...prev, cover_data: updatedCover } : prev);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await authFetch(`/api/mobile/documents/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover_data: updatedCover }),
        });
      } finally {
        setSaving(false);
      }
    }, 1200);
  };

  // AI Prompt generation with WYSIWYG HTML insertion
  const handleRunAi = async (promptToSend: string) => {
    const prompt = promptToSend.trim();
    if (!prompt) {
      Alert.alert('Prompt requis', 'Décrivez ce que vous souhaitez rédiger.');
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
        Alert.alert('✨ IA', 'Contenu rédigé et inséré dans votre document !');
      }
    } catch (err: any) {
      Alert.alert('Erreur IA', err.message);
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
      Alert.alert('Erreur', err.message);
    } finally {
      setAddingSection(false);
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    if (sec.is_system) {
      Alert.alert('Section obligatoire', 'Cette section fait partie du modèle officiel.');
      return;
    }
    Alert.alert(
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
              Alert.alert('Erreur', 'Impossible de supprimer cette section.');
            }
          }
        }
      ]
    );
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!report || sections.length === 0) return;
    if (subscriptionTier === 'free') {
      Alert.alert(
        'Export PDF',
        'Passez à Basic pour un export PDF filigrané, ou à Premium pour un export officiel sans filigrane.',
        [{ text: 'Plus tard', style: 'cancel' }, { text: 'Voir les offres', onPress: onUpgrade }],
      );
      return;
    }

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
      Alert.alert('Erreur', error.message || 'Impossible de générer le PDF.');
    } finally {
      setExporting(false);
    }
  };

  // Export Word
  const handleExportDocx = async () => {
    if (!report) return;
    if (subscriptionTier !== 'premium') {
      Alert.alert(
        'Export Word Premium',
        "L'export Word (.docx) modifiable est réservé à l'abonnement Premium.",
        [{ text: 'Plus tard', style: 'cancel' }, { text: 'Voir Premium', onPress: onUpgrade }],
      );
      return;
    }

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
      Alert.alert('Erreur', error.message || 'Impossible de générer le document Word.');
    } finally {
      setExporting(false);
    }
  };

  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentTitle = currentSection?.title ?? '';
  const isCoverSection = currentTitle.toLowerCase().includes('page de garde');
  const isTocSection = currentTitle.toLowerCase().includes('sommaire');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
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
            <ArrowLeft size={18} color="#F8FAFC" />
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
        <Pressable style={styles.headerBtn} onPress={onClose}>
          <ArrowLeft size={18} color="#F8FAFC" />
          <Text style={styles.headerBtnText}>Fermer</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {report?.title || 'Rapport de stage'}
          </Text>
          <Text style={styles.saveStatus}>
            {saving ? 'Sauvegarde...' : '✓ Enregistré'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerActionBtn, styles.wordBtn]}
            onPress={handleExportDocx}
            disabled={exporting}
          >
            <Text style={styles.actionBtnText}>{subscriptionTier === 'premium' ? 'Word' : 'Word 🔒'}</Text>
          </Pressable>
          <Pressable
            style={[styles.headerActionBtn, styles.pdfBtn]}
            onPress={handleExportPdf}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>{subscriptionTier === 'free' ? 'PDF 🔒' : 'PDF'}</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Horizontal Section Tabs ─────────────────────────────────── */}
      <View style={styles.sectionTabsWrap}>
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
            <Plus size={14} color="#818CF8" />
            <Text style={styles.addTabBtnText}>Section</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── Workspace Area (Native Cover vs Native TOC vs Word-like WYSIWYG) */}
      <KeyboardAvoidingView
        style={styles.workspace}
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Établissement / Université / École</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ex: Institut National Polytechnique"
                placeholderTextColor="#64748B"
                value={cover.school || ''}
                onChangeText={v => handleCoverDataChange('school', v)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Titre du Document</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ex: Rapport de Stage de Fin d'Études"
                placeholderTextColor="#64748B"
                value={cover.title || ''}
                onChangeText={v => handleCoverDataChange('title', v)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Sous-titre / Thème de Recherche</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextArea]}
                multiline
                numberOfLines={3}
                placeholder="Ex: Mise en place d'une architecture d'automatisation IA..."
                placeholderTextColor="#64748B"
                value={cover.subtitle || ''}
                onChangeText={v => handleCoverDataChange('subtitle', v)}
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Nom & Prénom Étudiant</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: Jean Dupont"
                  placeholderTextColor="#64748B"
                  value={cover.studentName || ''}
                  onChangeText={v => handleCoverDataChange('studentName', v)}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Entreprise d'Accueil</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: Orange / MTN"
                  placeholderTextColor="#64748B"
                  value={cover.company || ''}
                  onChangeText={v => handleCoverDataChange('company', v)}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Tuteur en Entreprise</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: M. Paul Martin"
                  placeholderTextColor="#64748B"
                  value={cover.tutorCorporate || ''}
                  onChangeText={v => handleCoverDataChange('tutorCorporate', v)}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Tuteur Académique</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: Dr. Samuel Eto"
                  placeholderTextColor="#64748B"
                  value={cover.tutorAcademic || ''}
                  onChangeText={v => handleCoverDataChange('tutorAcademic', v)}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Filière / Spécialité</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: Génie Logiciel"
                  placeholderTextColor="#64748B"
                  value={cover.specialty || ''}
                  onChangeText={v => handleCoverDataChange('specialty', v)}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Année Académique</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: 2024-2025"
                  placeholderTextColor="#64748B"
                  value={cover.year || ''}
                  onChangeText={v => handleCoverDataChange('year', v)}
                />
              </View>
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
                html={buildWysiwygHtml(currentHtml, currentTitle)}
                onMessage={handleEditorMessage}
              />
            </View>

            {/* Bottom Quick AI Action Bar */}
            <View style={styles.aiDock}>
              <TextInput
                style={styles.aiDockInput}
                placeholder="Demande à l'IA de rédiger, compléter ou corriger..."
                placeholderTextColor="#64748B"
                value={aiPrompt}
                onChangeText={setAiPrompt}
              />
              <Pressable
                style={[styles.aiDockBtn, aiLoading && { opacity: 0.5 }]}
                disabled={aiLoading}
                onPress={() => handleRunAi(aiPrompt)}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={16} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Floating AI Chat Assistant Trigger ──────────────────────── */}
      <Pressable style={styles.floatingAiFab} onPress={() => setChatVisible(true)}>
        <Sparkles size={18} color="#FFFFFF" />
        <Text style={styles.floatingAiFabText}>Assistant IA</Text>
      </Pressable>

      {/* ── Add Section Modal ───────────────────────────────────────── */}
      <Modal visible={showAddSection} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle Section</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Analyse des besoins, Conclusion..."
              placeholderTextColor="#64748B"
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

      {/* ── Full Interactive AI Chat Drawer ─────────────────────────── */}
      {chatVisible && (
        <EditorAiChat
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
          documentId={documentId}
          currentSectionTitle={currentTitle}
          onInsert={(html: string) => {
            editorSurfaceRef.current?.injectJavaScript(`insertAiContent(${JSON.stringify(html)}); true;`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
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
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0B0F17',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  saveStatus: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 54,
    alignItems: 'center',
  },
  wordBtn: {
    backgroundColor: '#1E283C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pdfBtn: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Section Tabs
  sectionTabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0E131F',
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
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabPillActive: {
    backgroundColor: '#1E283C',
    borderColor: '#4F46E5',
  },
  tabPillText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '600',
    maxWidth: 160,
  },
  tabPillTextActive: {
    color: '#FFFFFF',
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
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  addTabBtnText: {
    color: '#818CF8',
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
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#F8FAFC',
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
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tocItemNumber: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 14,
    width: 26,
  },
  tocItemTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  tocItemArrow: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },

  // WYSIWYG Editor
  editorFlex: {
    flex: 1,
    paddingBottom: 85,
  },
  editorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0E131F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  currentSectionTitle: {
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: '700',
  },
  wordCountBadge: {
    color: '#64748B',
    fontSize: 12,
  },
  wysiwygContainer: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  aiDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiDockInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 6,
  },
  aiDockBtn: {
    backgroundColor: '#4F46E5',
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating AI FAB
  floatingAiFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingAiFabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#182030',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#1E283C',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
