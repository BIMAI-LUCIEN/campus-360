/**
 * Native Report Editor — bundled HTML editor rendered in a local WebView.
 * No admin-server dependency for the editing UI itself.
 * Only AI calls and data persistence require the server.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, Pressable, SafeAreaView, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
  Platform, Linking, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { WebView } from 'react-native-webview';
import { authFetch, authBaseUrl, authClient } from '../auth/betterAuth';

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
};

// ─── HTML Editor (bundled) ───────────────────────────────────────────────────

const EDITOR_HTML = (sectionTitles: string[]) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0F172A;
  color: #CBD5E1;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  padding: 16px 20px;
  -webkit-user-select: text;
  user-select: text;
}

/* Toolbar */
.toolbar {
  position: sticky; top: 0;
  display: flex; gap: 4px; flex-wrap: wrap;
  background: #1E293B;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  z-index: 10;
}
.tool-btn {
  width: 36px; height: 36px;
  border: none; border-radius: 8px;
  background: #334155; color: #94A3B8;
  font-size: 14px; font-weight: 700;
  cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.tool-btn:active { background: #475569; }
.tool-btn.active { background: #10B981; color: #fff; }
.sep { width: 1px; height: 28px; background: #334155; margin: 4px 2px; }

/* Section nav pills */
.section-nav {
  display: flex; gap: 6px; flex-wrap: wrap;
  background: #1E293B;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 12px;
}
.sec-pill {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px; font-weight: 600;
  background: #334155; color: #94A3B8;
  border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.sec-pill.active { background: #2563EB; color: #fff; }

/* Cover form */
.cover-form { display: flex; flex-direction: column; gap: 12px; }
.cover-form h2 {
  color: #F8FAFC; font-size: 18px; font-weight: 800;
  margin-bottom: 4px;
}
.cover-form label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: #64748B; margin-bottom: 4px; display: block;
}
.cover-form input, .cover-form textarea {
  width: 100%;
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #F8FAFC;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;
}
.cover-form input:focus, .cover-form textarea:focus {
  border-color: #10B981;
}
.cover-form textarea { resize: none; height: 64px; }
.cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-group { display: flex; flex-direction: column; }

/* Rich editor area */
.editor-area {
  background: #1E293B;
  border-radius: 14px;
  padding: 16px;
  min-height: 300px;
  border: 1px solid #334155;
}
.editor-area:focus-within { border-color: #10B981; }
.section-heading {
  font-size: 18px; font-weight: 800;
  color: #F8FAFC; margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #334155;
}
#editor {
  min-height: 240px;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
  color: #CBD5E1;
  font-size: 15px;
  line-height: 1.7;
}
#editor:empty:before {
  content: 'Commencez à rédiger ici...';
  color: #475569;
}
#editor p { margin-bottom: 8px; }
#editor h2 { font-size: 18px; font-weight: 800; color: #F8FAFC; margin: 12px 0 6px; }
#editor h3 { font-size: 16px; font-weight: 700; color: #E2E8F0; margin: 10px 0 4px; }
#editor ul, #editor ol { padding-left: 20px; margin-bottom: 8px; }
#editor li { margin-bottom: 4px; }
#editor strong, #editor b { color: #F8FAFC; font-weight: 700; }
#editor em, #editor i { color: #94A3B8; font-style: italic; }

/* AI panel */
.ai-panel {
  background: #1E293B;
  border-radius: 14px;
  padding: 14px;
  margin-top: 16px;
  border: 1px solid #334155;
}
.ai-panel h3 { color: #FCD34D; font-size: 13px; font-weight: 800; margin-bottom: 8px; }
.ai-panel textarea {
  width: 100%; background: #0F172A;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #CBD5E1; font-size: 13px;
  padding: 10px 12px; resize: none; height: 70px;
  outline: none;
}
.ai-panel textarea:focus { border-color: #FCD34D; }
.ai-btns { display: flex; gap: 8px; margin-top: 8px; }
.ai-btn {
  flex: 1; padding: 10px;
  border-radius: 10px; border: none;
  font-size: 12px; font-weight: 700;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.ai-btn-draft { background: #FCD34D; color: #1E293B; }
.ai-btn-improve { background: #334155; color: #CBD5E1; }
.ai-credit-note {
  font-size: 11px; color: #64748B;
  margin-top: 6px; text-align: center;
}

/* Settings panel */
.settings-panel {
  background: #1E293B; border-radius: 14px;
  padding: 14px; margin-top: 16px; border: 1px solid #334155;
}
.settings-panel h3 { color: #10B981; font-size: 13px; font-weight: 800; margin-bottom: 10px; }
.settings-row { margin-bottom: 10px; }
.settings-row label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: #64748B; margin-bottom: 4px; display: block;
}
.settings-row select {
  width: 100%;
  background: #0F172A;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #CBD5E1; font-size: 13px;
  padding: 8px 10px;
  outline: none;
}

/* TOC section */
.toc-list { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
.toc-item {
  display: flex; justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #334155;
  font-size: 13px; color: #94A3B8;
}
.toc-item span:last-child { font-size: 11px; color: #475569; }

/* Auto-save indicator */
.save-indicator {
  position: fixed; bottom: 20px; right: 20px;
  background: #10B981; color: #fff;
  padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
  opacity: 0; transition: opacity 0.3s;
  z-index: 100;
}
.save-indicator.show { opacity: 1; }
</style>
</head>
<body>

<!-- Section Navigation -->
<div class="section-nav" id="sectionNav"></div>

<!-- Toolbar -->
<div class="toolbar" id="toolbar">
  <button class="tool-btn" id="btnBold" title="Gras">B</button>
  <button class="tool-btn" id="btnItalic" title="Italique"><i>I</i></button>
  <div class="sep"></div>
  <button class="tool-btn" id="btnH2" title="Titre 2">H2</button>
  <button class="tool-btn" id="btnH3" title="Titre 3">H3</button>
  <button class="tool-btn" id="btnUl" title="Liste">•—</button>
  <div class="sep"></div>
  <button class="tool-btn" id="btnUndo" title="Annuler">↩</button>
  <button class="tool-btn" id="btnRedo" title="Refaire">↪</button>
</div>

<!-- Main content area -->
<div id="mainContent">
  <!-- Dynamic content injected by React Native -->
</div>

<!-- Auto-save indicator -->
<div class="save-indicator" id="saveIndicator">✓ Sauvegardé</div>

<script>
const sections = ${JSON.stringify(sectionTitles)};
let currentSectionId = null;
let reportData = null;
let saveTimer = null;
let historyStack = [];
let redoStack = [];

// ── Section nav ────────────────────────────────────────────────────────────
function renderSectionNav() {
  const nav = document.getElementById('sectionNav');
  if (!reportData) return;
  nav.innerHTML = reportData.sections.map(s =>
    '<button class="sec-pill' + (s.id === currentSectionId ? ' active' : '') + '" data-id="' + s.id + '">' + s.title + '</button>'
  ).join('');
  nav.querySelectorAll('.sec-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSection(btn.dataset.id);
    });
  });
}

// ── Switch section ──────────────────────────────────────────────────────────
function switchSection(sectionId) {
  // Save current first
  saveCurrentSection();

  currentSectionId = sectionId;
  const section = reportData.sections.find(s => s.id === sectionId);
  if (!section) return;

  const lower = section.title.toLowerCase();

  if (lower === 'page de garde') {
    renderCoverPage();
    document.getElementById('toolbar').style.display = 'none';
  } else if (lower === 'sommaire') {
    renderTOC();
    document.getElementById('toolbar').style.display = 'none';
  } else {
    renderRichEditor(section);
    document.getElementById('toolbar').style.display = 'flex';
  }

  renderSectionNav();
}

// ── Cover page ──────────────────────────────────────────────────────────────
function renderCoverPage() {
  const cd = reportData.report.cover_data || {};
  document.getElementById('mainContent').innerHTML = \`
    <div class="cover-form">
      <h2>📄 Page de Garde</h2>
      <p style="font-size:12px;color:#64748B;margin-bottom:8px;">Remplissez les champs ci-dessous pour personnaliser votre couverture.</p>
      <div class="form-group">
        <label>Établissement / École</label>
        <input type="text" id="cd_school" value="\${cd.school || ''}" placeholder="Université de Douala">
      </div>
      <div class="form-group">
        <label>Titre du Rapport</label>
        <input type="text" id="cd_title" value="\${cd.title || ''}" placeholder="Rapport de Stage">
      </div>
      <div class="form-group">
        <label>Sous-titre / Sujet</label>
        <textarea id="cd_subtitle" placeholder="Stage de fin d'études...">\${cd.subtitle || ''}</textarea>
      </div>
      <div class="cover-grid">
        <div class="form-group">
          <label>Prénom & Nom Étudiant</label>
          <input type="text" id="cd_studentName" value="\${cd.studentName || ''}">
        </div>
        <div class="form-group">
          <label>Entreprise d'Accueil</label>
          <input type="text" id="cd_company" value="\${cd.company || ''}">
        </div>
      </div>
      <div class="cover-grid">
        <div class="form-group">
          <label>Maître de Stage</label>
          <input type="text" id="cd_tutorCorporate" value="\${cd.tutorCorporate || ''}">
        </div>
        <div class="form-group">
          <label>Tuteur Académique</label>
          <input type="text" id="cd_tutorAcademic" value="\${cd.tutorAcademic || ''}">
        </div>
      </div>
      <div class="form-group">
        <label>Année Académique</label>
        <input type="text" id="cd_year" value="\${cd.year || ''}" placeholder="2024-2025">
      </div>
    </div>
  \`;

  // Auto-save cover data
  ['school','title','subtitle','studentName','company','tutorCorporate','tutorAcademic','year'].forEach(field => {
    const el = document.getElementById('cd_' + field);
    if (el) {
      el.addEventListener('input', () => {
        reportData.report.cover_data = reportData.report.cover_data || {};
        reportData.report.cover_data[field] = el.value;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'updateCoverData',
            data: reportData.report.cover_data
          }));
          showSaveIndicator();
        }, 1500);
      });
    }
  });
}

// ── TOC ────────────────────────────────────────────────────────────────────
function renderTOC() {
  const items = reportData.sections
    .filter(s => !['page de garde','sommaire'].includes(s.title.toLowerCase()));
  document.getElementById('mainContent').innerHTML = \`
    <div class="cover-form">
      <h2>📑 Table des Matières</h2>
      <p style="font-size:12px;color:#64748B;margin-bottom:12px;">Générée automatiquement à l'export.</p>
      <div class="toc-list">
        \${items.map((s, i) => \`
          <div class="toc-item">
            <span>\${i + 1}. \${s.title}</span>
            <span>Page \${i + 3}</span>
          </div>
        \`).join('')}
      </div>
    </div>
  \`;
}

// ── Rich text editor ────────────────────────────────────────────────────────
function renderRichEditor(section) {
  const heading = section.title === 'page de garde' ? '' : \`<div class="section-heading">\${section.title}</div>\`;
  document.getElementById('mainContent').innerHTML = \`
    \${heading}
    <div class="editor-area">
      <div id="editor" contenteditable="true">\${section.content_html || ''}</div>
    </div>
    <div class="ai-panel">
      <h3>✨ Assistant IA</h3>
      <textarea id="aiPrompt" placeholder="Décris ce que tu veux rédiger (ex: 'Rédige une intro sur...')"></textarea>
      <div class="ai-btns">
        <button class="ai-btn ai-btn-draft" id="aiDraft">Rédiger</button>
        <button class="ai-btn ai-btn-improve" id="aiImprove">Améliorer sélection</button>
      </div>
      <p class="ai-credit-note" id="aiCreditNote">Coût : 1 crédit IA</p>
    </div>
    <div class="settings-panel">
      <h3>⚙️ Mise en forme</h3>
      <div class="settings-row">
        <label>Police</label>
        <select id="selFont">
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>
      <div class="settings-row">
        <label>Interligne</label>
        <select id="selSpacing">
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>
      </div>
    </div>
  \`;

  const editor = document.getElementById('editor');
  const selFont = document.getElementById('selFont');
  const selSpacing = document.getElementById('selSpacing');

  if (selFont) selFont.value = reportData.report.font_family || 'Times New Roman';
  if (selSpacing) selSpacing.value = String(reportData.report.line_spacing || '1.5');

  // Auto-save on input
  editor.addEventListener('input', () => {
    const html = editor.innerHTML;
    const sec = reportData.sections.find(s => s.id === currentSectionId);
    if (sec) sec.content_html = html;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCurrentSection();
    }, 1500);
  });

  // History
  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) { document.execCommand('redo'); } else { document.execCommand('undo'); }
      e.preventDefault();
    }
  });

  // AI buttons
  document.getElementById('aiDraft').addEventListener('click', () => runAI('draft'));
  document.getElementById('aiImprove').addEventListener('click', () => runAI('improve'));

  // Settings
  if (selFont) selFont.addEventListener('change', () => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'updateFont', data: selFont.value }));
  });
  if (selSpacing) selSpacing.addEventListener('change', () => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'updateSpacing', data: parseFloat(selSpacing.value) }));
  });
}

// ── Save current section ────────────────────────────────────────────────────
function saveCurrentSection() {
  if (!currentSectionId) return;
  const section = reportData.sections.find(s => s.id === currentSectionId);
  if (!section) return;
  const editor = document.getElementById('editor');
  if (editor) section.content_html = editor.innerHTML;
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'saveSection',
    sectionId: currentSectionId,
    content: section.content_html
  }));
  showSaveIndicator();
}

// ── Toolbar actions ─────────────────────────────────────────────────────────
document.getElementById('btnBold').addEventListener('click', () => {
  document.execCommand('bold', false, null);
  updateToolbarState();
});
document.getElementById('btnItalic').addEventListener('click', () => {
  document.execCommand('italic', false, null);
  updateToolbarState();
});
document.getElementById('btnH2').addEventListener('click', () => {
  document.execCommand('formatBlock', false, '<h2>');
});
document.getElementById('btnH3').addEventListener('click', () => {
  document.execCommand('formatBlock', false, '<h3>');
});
document.getElementById('btnUl').addEventListener('click', () => {
  document.execCommand('insertUnorderedList', false, null);
});
document.getElementById('btnUndo').addEventListener('click', () => document.execCommand('undo'));
document.getElementById('btnRedo').addEventListener('click', () => document.execCommand('redo'));

function updateToolbarState() {
  document.getElementById('btnBold').classList.toggle('active', document.queryCommandState('bold'));
  document.getElementById('btnItalic').classList.toggle('active', document.queryCommandState('italic'));
}

// Update toolbar on selection change
document.addEventListener('selectionchange', () => {
  if (document.activeElement === document.getElementById('editor')) {
    updateToolbarState();
  }
});

// ── AI ─────────────────────────────────────────────────────────────────────
async function runAI(action) {
  const prompt = document.getElementById('aiPrompt').value.trim();
  if (!prompt) { alert('Décris ce que tu veux rédiger.'); return; }
  const section = reportData.sections.find(s => s.id === currentSectionId);
  const editor = document.getElementById('editor');

  let textToImprove = '';
  if (action === 'improve' && editor) {
    const sel = window.getSelection();
    textToImprove = sel ? sel.toString() : '';
    if (!textToImprove) { alert('Sélectionne du texte à améliorer.'); return; }
  }

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'aiRequest',
    action,
    prompt,
    text: textToImprove,
    sectionTitle: section ? section.title : 'Section'
  }));
}

// ── Save indicator ─────────────────────────────────────────────────────────
function showSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ── Load data from React Native ─────────────────────────────────────────────
window.loadReportData = function(data) {
  reportData = data;
  const firstEditable = data.sections.find(s =>
    !['page de garde','sommaire'].includes(s.title.toLowerCase())
  );
  switchSection(firstEditable ? firstEditable.id : (data.sections[0] ? data.sections[0].id : null));
};

window.insertAIHtml = function(html) {
  const editor = document.getElementById('editor');
  if (editor) {
    editor.focus();
    document.execCommand('insertHTML', false, html);
    saveCurrentSection();
  }
};
</script>
</body>
</html>
`;

// ─── React Native Component ───────────────────────────────────────────────────

export function DocumentEditorScreen({ documentId, onClose }: DocumentEditorScreenProps) {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Document | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCredits, setAiCredits] = useState<number | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [activeTab, setActiveTab] = useState<'edit' | 'settings'>('edit');

  // Fetch report + sections
  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch(`/api/mobile/documents/${documentId}`);
      if (!res.ok) throw new Error('Impossible de charger le document.');
      const data = await res.json();
      setReport(data.document);
      setSections(data.sections || []);
      const firstEditable = (data.sections || []).find((s: DocumentSection) =>
        !['page de garde', 'sommaire'].includes(s.title.toLowerCase())
      );
      setCurrentSectionId(firstEditable?.id ?? (data.sections || [])[0]?.id ?? null);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // Inject data into WebView once loaded
  useEffect(() => {
    if (!loading && report && sections.length > 0 && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.loadReportData(${JSON.stringify({ report, sections })}); true;`
      );
    }
  }, [loading, report, sections]);

  // Handle messages from WebView
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'saveSection') {
        setSaving(true);
        try {
          await authFetch(`/api/mobile/documents/${documentId}/sections/${msg.sectionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content_html: msg.content }),
          });
          setSections(prev =>
            prev.map(s => s.id === msg.sectionId ? { ...s, content_html: msg.content } : s)
          );
        } finally {
          setSaving(false);
        }
      }

      if (msg.type === 'updateCoverData') {
        setSaving(true);
        try {
          await authFetch(`/api/mobile/documents/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cover_data: msg.data }),
          });
          setReport(prev => prev ? { ...prev, cover_data: msg.data } : prev);
        } finally {
          setSaving(false);
        }
      }

      if (msg.type === 'updateFont') {
        setSaving(true);
        try {
          await authFetch(`/api/mobile/documents/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ font_family: msg.data }),
          });
          setReport(prev => prev ? { ...prev, font_family: msg.data } : prev);
        } finally {
          setSaving(false);
        }
      }

      if (msg.type === 'updateSpacing') {
        setSaving(true);
        try {
          await authFetch(`/api/mobile/documents/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line_spacing: msg.data }),
          });
          setReport(prev => prev ? { ...prev, line_spacing: msg.data } : prev);
        } finally {
          setSaving(false);
        }
      }

      if (msg.type === 'aiRequest') {
        setAiLoading(true);
        try {
          const res = await authFetch('/api/mobile/documents/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: msg.action,
              prompt: msg.prompt,
              text: msg.text,
              sectionTitle: msg.sectionTitle,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur IA.');
          if (data.remainingCredits !== undefined) setAiCredits(data.remainingCredits);
          if (data.html && webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `window.insertAIHtml(${JSON.stringify(data.html)}); true;`
            );
          }
          Alert.alert('✨ IA', 'Contenu inséré avec succès ! (1 crédit IA déduit)');
        } catch (err: any) {
          Alert.alert('Erreur IA', err.message);
        } finally {
          setAiLoading(false);
        }
      }

    } catch (err) {
      console.warn('[DocumentEditor] Message parse error:', err);
    }
  }, [documentId]);

  // Add new section
  const handleAddSection = useCallback(async () => {
    if (!newSectionTitle.trim()) return;
    setAddingSection(true);
    try {
      const nextOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order)) + 1 : 0;
      const res = await authFetch(`/api/mobile/documents/${documentId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSectionTitle.trim(), sort_order: nextOrder }),
      });
      if (!res.ok) throw new Error('Impossible d\'ajouter la section.');
      const data = await res.json();
      const newSection = data.section;
      setSections(prev => [...prev, newSection]);
      setNewSectionTitle('');
      setShowAddSection(false);
      // Switch to new section in WebView
      if (webViewRef.current && report) {
        const updatedSections = [...sections, newSection];
        webViewRef.current.injectJavaScript(
          `window.loadReportData(${JSON.stringify({ report, sections: updatedSections })}); true;`
        );
      }
      setCurrentSectionId(newSection.id);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setAddingSection(false);
    }
  }, [newSectionTitle, sections, documentId, report]);

  // Delete section
  const handleDeleteSection = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    if (section.is_system) {
      Alert.alert('Non supprimable', 'Cette section est obligatoire pour le modèle.');
      return;
    }
    Alert.alert(
      'Supprimer la section',
      `Voulez-vous supprimer "${section.title}" ?`,
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
                setCurrentSectionId(remaining[0]?.id ?? null);
                if (report && webViewRef.current) {
                  webViewRef.current.injectJavaScript(
                    `window.loadReportData(${JSON.stringify({ report, sections: remaining })}); true;`
                  );
                }
              }
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la section.');
            }
          },
        },
      ]
    );
  }, [sections, currentSectionId, documentId, report]);

  // Export PDF
  const handleExportPdf = useCallback(() => {
    setExporting(true);
    const token = authClient.getCookie();
    Linking.openURL(`${authBaseUrl}/api/mobile/documents/${documentId}/export/pdf${token ? `?token=${token}` : ''}`)
      .catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir l\'export PDF.'))
      .finally(() => setExporting(false));
  }, [documentId]);

  // Get current section title
  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentTitle = currentSection?.title ?? 'Rapport';

  const isSpecialSection = ['page de garde', 'sommaire'].includes(currentTitle.toLowerCase());

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Chargement de l'éditeur...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose}>
            <Text style={styles.headerBtnText}>← Retour</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Erreur</Text>
          <View style={{ width: 60 }} />
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

  const sectionTitles = sections.map(s => s.title);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Native Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={onClose}>
          <Text style={styles.headerBtnText}>← Fermer</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{report?.title ?? 'Rapport'}</Text>
          {saving && <Text style={styles.saveStatus}>Sauvegarde...</Text>}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerActionBtn, styles.pdfBtn]}
            onPress={handleExportPdf}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.pdfBtnText}>📄 PDF</Text>
            }
          </Pressable>
        </View>
      </View>

      {/* ── Section tabs (native nav) ─────────────────────────────────── */}
      <View style={styles.sectionTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabsContent}>
          {sections.map(section => (
            <Pressable
              key={section.id}
              style={[
                styles.sectionTab,
                currentSectionId === section.id && styles.sectionTabActive,
              ]}
              onPress={() => {
                setCurrentSectionId(section.id);
                if (webViewRef.current && report) {
                  webViewRef.current.injectJavaScript(
                    `window.loadReportData(${JSON.stringify({ report, sections })}); true;`
                  );
                }
              }}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  currentSectionId === section.id && styles.sectionTabTextActive,
                ]}
                numberOfLines={1}
              >
                {section.title}
              </Text>
              {!section.is_system && currentSectionId !== section.id && (
                <Pressable
                  hitSlop={8}
                  onPress={() => handleDeleteSection(section.id)}
                  style={styles.deleteSectionBtn}
                >
                  <Text style={styles.deleteSectionBtnText}>✕</Text>
                </Pressable>
              )}
            </Pressable>
          ))}

          {/* Add section button */}
          <Pressable
            style={styles.addSectionBtn}
            onPress={() => setShowAddSection(true)}
          >
            <Text style={styles.addSectionBtnText}>+ Ajouter</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── WebView Editor ─────────────────────────────────────────────── */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: EDITOR_HTML(sectionTitles) }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebViewMessage}
          onLoadEnd={() => {
            if (report && sections.length > 0 && webViewRef.current) {
              webViewRef.current.injectJavaScript(
                `window.loadReportData(${JSON.stringify({ report, sections })}); true;`
              );
            }
          }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          textZoom={100}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={false}
        />
      </View>

      {/* ── Add Section Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showAddSection}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSection(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAddSection(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Nouvelle section</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Titre de la section..."
              placeholderTextColor="#64748B"
              value={newSectionTitle}
              onChangeText={setNewSectionTitle}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setShowAddSection(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, addingSection && styles.modalConfirmDisabled]}
                onPress={handleAddSection}
                disabled={addingSection}
              >
                {addingSection
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>Ajouter</Text>
                }
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── AI Loading Overlay ─────────────────────────────────────────── */}
      {aiLoading && (
        <View style={styles.aiLoadingOverlay}>
          <ActivityIndicator size="large" color="#FCD34D" />
          <Text style={styles.aiLoadingText}>Assistant IA en cours...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Header
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
    minWidth: 60,
  },
  headerBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  saveStatus: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionBtn: {
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pdfBtn: {
    backgroundColor: '#10B981',
    minWidth: 56,
  },
  pdfBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Section tabs
  sectionTabs: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectionTabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#334155',
    gap: 4,
    maxWidth: 140,
  },
  sectionTabActive: {
    backgroundColor: '#2563EB',
  },
  sectionTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: '#fff',
  },
  deleteSectionBtn: {
    padding: 2,
  },
  deleteSectionBtnText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  addSectionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  addSectionBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },

  // WebView
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Add section modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeading: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F8FAFC',
    marginBottom: 16,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirm: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // AI loading
  aiLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  aiLoadingText: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '700',
  },
});
