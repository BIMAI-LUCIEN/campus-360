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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { authFetch, authBaseUrl, authClient } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import { EditorAiChat } from './EditorAiChat';
import { Sparkles } from 'lucide-react-native';

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
  background: #EDEEF2;
  color: #1F2937;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.6;
  padding: 14px 16px 32px;
  -webkit-user-select: text;
  user-select: text;
}

/* Toolbar */
.toolbar {
  position: sticky; top: 0;
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  background: #FFFFFF;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 4px 14px -6px rgba(15,23,42,0.14);
  margin-bottom: 14px;
  z-index: 10;
}
.tool-btn {
  width: 38px; height: 38px;
  border: none; border-radius: 10px;
  background: #F1F3F7; color: #334155;
  font-size: 15px; font-weight: 700;
  cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s;
}
.tool-btn:active { background: #E2E6EE; }
.tool-btn.active { background: #7C3AED; color: #FFFFFF; }
.sep { width: 1px; height: 24px; background: #E5E7EB; margin: 0 3px; }

/* Section nav pills — hidden: the native RN tabs above are the single nav now */
.section-nav { display: none; }
.sec-pill {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px; font-weight: 600;
  background: #EEF0F4; color: #475569;
  border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.sec-pill.active { background: #7C3AED; color: #FFFFFF; }

/* Cover form — white paper card */
.cover-form {
  display: flex; flex-direction: column; gap: 14px;
  background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px;
  padding: 22px 20px;
  box-shadow: 0 10px 30px -12px rgba(0,0,0,0.45);
}
.cover-form h2 {
  color: #111827; font-size: 19px; font-weight: 800;
  margin-bottom: 2px; letter-spacing: -0.02em;
}
.cover-form label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: #6B7280; margin-bottom: 5px; display: block;
}
.cover-form input, .cover-form textarea {
  width: 100%;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  color: #1F2937;
  font-size: 14px;
  padding: 11px 13px;
  outline: none;
}
.cover-form input:focus, .cover-form textarea:focus {
  border-color: #7C3AED; background: #FFFFFF;
}
.cover-form textarea { resize: none; height: 64px; }
.cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-group { display: flex; flex-direction: column; }

/* Rich editor area — a real white "paper" page floating on the dark desk */
.editor-area {
  background: #FFFFFF;
  border-radius: 14px;
  padding: 28px 26px;
  min-height: 340px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 10px 30px -12px rgba(0,0,0,0.45);
}
.editor-area:focus-within { border-color: #C4B5FD; box-shadow: 0 10px 30px -10px rgba(124,58,237,0.28); }
.section-heading {
  font-size: 20px; font-weight: 800;
  color: #111827; margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #EEF0F3;
  letter-spacing: -0.02em;
}
#editor {
  min-height: 260px;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
  color: #1F2937;
  font-size: 16px;
  line-height: 1.75;
}
#editor:empty:before {
  content: 'Commencez à rédiger ici…';
  color: #9CA3AF;
}
#editor p { margin-bottom: 12px; }
#editor h2 { font-size: 19px; font-weight: 800; color: #111827; margin: 18px 0 8px; letter-spacing: -0.01em; }
#editor h3 { font-size: 16px; font-weight: 700; color: #374151; margin: 14px 0 6px; }
#editor ul, #editor ol { padding-left: 22px; margin-bottom: 12px; }
#editor li { margin-bottom: 6px; }
#editor strong, #editor b { color: #111827; font-weight: 700; }
#editor em, #editor i { color: #4B5563; font-style: italic; }
#editor img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block; }

/* AI panel — quick section-level draft/improve */
.ai-panel {
  background: #FFFFFF;
  border-radius: 14px;
  padding: 16px;
  margin-top: 14px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 4px 14px -8px rgba(15,23,42,0.12);
}
.ai-panel h3 { color: #7C3AED; font-size: 13px; font-weight: 800; margin-bottom: 10px; }
.ai-panel textarea {
  width: 100%; background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  color: #1F2937; font-size: 13px;
  padding: 11px 13px; resize: none; height: 70px;
  outline: none;
}
.ai-panel textarea:focus { border-color: #7C3AED; background: #FFFFFF; }
.ai-btns { display: flex; gap: 8px; margin-top: 10px; }
.ai-btn {
  flex: 1; padding: 11px;
  border-radius: 10px; border: none;
  font-size: 12.5px; font-weight: 800;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.ai-btn-draft { background: #7C3AED; color: #FFFFFF; }
.ai-btn-improve { background: #F1F3F7; color: #334155; }
.ai-credit-note {
  font-size: 11px; color: #9CA3AF;
  margin-top: 8px; text-align: center;
}

/* Settings panel */
.settings-panel {
  background: #FFFFFF; border-radius: 14px;
  padding: 16px; margin-top: 14px; border: 1px solid #E5E7EB;
  box-shadow: 0 4px 14px -8px rgba(15,23,42,0.12);
}
.settings-panel h3 { color: #059669; font-size: 13px; font-weight: 800; margin-bottom: 12px; }
.settings-row { margin-bottom: 12px; }
.settings-row label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: #6B7280; margin-bottom: 5px; display: block;
}
.settings-row select {
  width: 100%;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  color: #1F2937; font-size: 13px;
  padding: 10px 12px;
  outline: none;
}

/* TOC section */
.toc-list { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
.toc-item {
  display: flex; justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px dashed #E5E7EB;
  font-size: 13px; color: #374151;
}
.toc-item span:last-child { font-size: 11px; color: #9CA3AF; }

/* Auto-save indicator */
.save-indicator {
  position: fixed; bottom: 20px; right: 20px;
  background: #059669; color: #FFFFFF;
  padding: 8px 16px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
  box-shadow: 0 6px 18px -6px rgba(5,150,105,0.5);
  opacity: 0; transform: translateY(6px);
  transition: opacity 0.25s, transform 0.25s;
  z-index: 100;
}
.save-indicator.show { opacity: 1; transform: translateY(0); }
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
  <button class="tool-btn" id="btnImage" title="Insérer une image">🖼️</button>
  <div class="sep"></div>
  <button class="tool-btn" id="btnUndo" title="Annuler">↩</button>
  <button class="tool-btn" id="btnRedo" title="Refaire">↪</button>
</div>
<input type="file" id="imgInput" accept="image/*" style="display:none">
<canvas id="imgCanvas" style="display:none"></canvas>

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

function sendToApp(payload) {
  try {
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  } catch (err) {
    console.warn('[WebView] sendToApp error:', err);
  }
}

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
          sendToApp({
            type: 'updateCoverData',
            data: reportData.report.cover_data
          });
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
    sendToApp({ type: 'updateFont', data: selFont.value });
  });
  if (selSpacing) selSpacing.addEventListener('change', () => {
    sendToApp({ type: 'updateSpacing', data: parseFloat(selSpacing.value) });
  });
}

// ── Save current section ────────────────────────────────────────────────────
function saveCurrentSection() {
  if (!currentSectionId) return;
  const section = reportData.sections.find(s => s.id === currentSectionId);
  if (!section) return;
  const editor = document.getElementById('editor');
  if (editor) section.content_html = editor.innerHTML;
  sendToApp({
    type: 'saveSection',
    sectionId: currentSectionId,
    content: section.content_html
  });
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

// ── Image insertion (pick from device → downscale in-canvas → embed) ─────────
document.getElementById('btnImage').addEventListener('click', () => {
  document.getElementById('imgInput').click();
});
document.getElementById('imgInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file || !file.type || file.type.indexOf('image/') !== 0) { e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1000;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.getElementById('imgCanvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      let dataUrl;
      try { dataUrl = canvas.toDataURL('image/jpeg', 0.72); }
      catch (err) { dataUrl = reader.result; }
      const editor = document.getElementById('editor');
      if (editor) {
        editor.focus();
        document.execCommand('insertHTML', false, '<img src="' + dataUrl + '" alt="image"/><p><br></p>');
        saveCurrentSection();
      }
      e.target.value = '';
    };
    img.onerror = () => { e.target.value = ''; };
    img.src = reader.result;
  };
  reader.onerror = () => { e.target.value = ''; };
  reader.readAsDataURL(file);
});

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

  sendToApp({
    type: 'aiRequest',
    action,
    prompt,
    text: textToImprove,
    sectionTitle: section ? section.title : 'Section'
  });
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
  const [chatVisible, setChatVisible] = useState(false);

  const currentSectionTitle = sections.find(s => s.id === currentSectionId)?.title;
  const insertIntoSection = useCallback((html: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.insertAIHtml(${JSON.stringify(html)}); true;`
      );
    }
  }, []);

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

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebMsg = (e: MessageEvent) => {
        if (!e.data) return;
        try {
          const parsed = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (parsed && parsed.type) {
            handleWebViewMessage({ nativeEvent: { data: typeof e.data === 'string' ? e.data : JSON.stringify(e.data) } } as any);
          }
        } catch {}
      };
      window.addEventListener('message', handleWebMsg);
      return () => window.removeEventListener('message', handleWebMsg);
    }
  }, [handleWebViewMessage]);

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

  // Export PDF natively
  const handleExportPdf = useCallback(async () => {
    if (!report || sections.length === 0) return;
    setExporting(true);
    try {
      const safeName = `${String(report.title || 'document')
        .replace(/[^\p{L}\p{N}_-]+/gu, '_')
        .slice(0, 60)}.pdf`;

      // Primary: server-rendered PDF (Puppeteer) — pro cover templates, TOC and
      // real footer page numbers, which the on-device print engine can't do.
      try {
        const res = await authFetch(`/api/mobile/documents/${documentId}/export/pdf`);
        if (res.ok) {
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
            fr.onerror = () => reject(new Error('read-failed'));
            fr.readAsDataURL(blob);
          });
          const fileUri = `${FileSystem.cacheDirectory}${safeName}`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Exporter le document',
              UTI: 'com.adobe.pdf',
            });
          } else {
            Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur cet appareil.");
          }
          return;
        }
        // Non-OK (e.g. 503 cold Chromium) → fall through to the local fallback.
      } catch {
        // Network/parse failure → fall through to the local fallback below.
      }

      // Fallback: local expo-print rendering (works offline; no page numbers).
      // Build a clean, print-ready document from the actual content — the old
      // code printed the editor UI shell (EDITOR_HTML) instead of the report.
      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const font = report.font_family || 'Georgia, serif';
      const lineHeight = report.line_spacing || 1.5;
      const cd = (report.cover_data || {}) as Record<string, string>;
      // Content sections = everything except the generated cover/TOC placeholders.
      const contentSections = sections.filter(
        s => !['page de garde', 'sommaire'].includes(s.title.toLowerCase()),
      );
      const bodySections = contentSections
        .map(
          s =>
            `<section><h1>${esc(s.title)}</h1><div class="content">${s.content_html || '<p></p>'}</div></section>`,
        )
        .join('');
      // Cover page built from the cover_data the student filled in.
      const metaRow = (labelText: string, value?: string) =>
        value ? `<p><strong>${labelText} :</strong> ${esc(value)}</p>` : '';
      const coverHtml = `
        <div class="cover">
          <div class="cover-top">${esc(cd.school || '')}</div>
          <div class="cover-mid">
            <h1>${esc(cd.title || report.title || 'Document')}</h1>
            ${cd.subtitle ? `<p class="subtitle">${esc(cd.subtitle)}</p>` : ''}
          </div>
          <div class="cover-meta">
            ${metaRow('Réalisé par', cd.studentName)}
            ${metaRow("Entreprise d'accueil", cd.company)}
            ${metaRow('Maître de stage', cd.tutorCorporate)}
            ${metaRow('Tuteur académique', cd.tutorAcademic)}
            ${metaRow('Année académique', cd.year)}
          </div>
        </div>`;
      // Numbered table of contents (real page numbers aren't available from the
      // system print engine, so we list the actual sections in order).
      const tocHtml = contentSections.length
        ? `<div class="toc">
            <h1>Sommaire</h1>
            <ol class="toc-list">
              ${contentSections.map(s => `<li>${esc(s.title)}</li>`).join('')}
            </ol>
          </div>`
        : '';
      const htmlContent = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
        <style>
          @page { margin: 2.2cm; }
          * { box-sizing: border-box; }
          body { font-family: ${font}; line-height: ${lineHeight}; color: #111827; font-size: 12pt; margin: 0; }
          .cover { min-height: 88vh; display: flex; flex-direction: column; justify-content: space-between; text-align: center; padding: 5vh 0; page-break-after: always; }
          .cover-top { font-size: 12.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #374151; }
          .cover-mid h1 { font-size: 26pt; font-weight: 800; margin: 0 0 10pt; }
          .cover-mid .subtitle { font-size: 13pt; color: #4b5563; }
          .cover-meta { text-align: left; display: inline-block; margin: 0 auto; font-size: 12pt; }
          .cover-meta p { margin: 5pt 0; }
          .toc { page-break-after: always; }
          .toc h1 { font-size: 20pt; font-weight: 800; margin: 0 0 16pt; }
          .toc-list { padding-left: 22pt; }
          .toc-list li { margin: 7pt 0; font-size: 12.5pt; }
          section { page-break-after: always; }
          section:last-child { page-break-after: auto; }
          h1 { font-size: 17pt; font-weight: 800; margin: 0 0 10pt; color: #111827; }
          .content { text-align: justify; }
          img { max-width: 100%; height: auto; }
          p { margin: 0 0 8pt; }
        </style></head><body>
        ${coverHtml}
        ${tocHtml}
        ${bodySections}
      </body></html>`;

      Alert.alert('Génération', 'Préparation du PDF en cours...');

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exporter le document',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Partage indisponible', 'Le partage n\'est pas disponible sur cet appareil.');
      }
    } catch (err) {
      console.warn(err);
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setExporting(false);
    }
  }, [documentId, report, sections]);

  // Get current section title
  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentTitle = currentSection?.title ?? 'Rapport';

  const isSpecialSection = ['page de garde', 'sommaire'].includes(currentTitle.toLowerCase());

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
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
              ? <ActivityIndicator size="small" color={stitchColors.white} />
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
                // Switch the WebView to this exact section (loadReportData always
                // reset to the first section, so the tabs never actually moved).
                webViewRef.current?.injectJavaScript(
                  `window.switchSection(${JSON.stringify(section.id)}); true;`
                );
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

        {/* ── Floating AI assistant button ───────────────────────────── */}
        <Pressable
          style={styles.aiFab}
          onPress={() => setChatVisible(true)}
          accessibilityLabel="Ouvrir l'assistant IA"
        >
          <Sparkles size={20} color={stitchColors.white} strokeWidth={2.2} />
          <Text style={styles.aiFabText}>Assistant IA</Text>
        </Pressable>
      </View>

      {/* ── AI chat assistant ─────────────────────────────────────────── */}
      <EditorAiChat
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        documentId={documentId}
        currentSectionTitle={currentSectionTitle}
        onInsert={insertIntoSection}
      />

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
                  ? <ActivityIndicator size="small" color={stitchColors.white} />
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
          <ActivityIndicator size="large" color="#C4B5FD" />
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
    backgroundColor: '#EDEEF2',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  loadingText: {
    color: stitchColors.inkSubtle,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#F1F3F7',
    minWidth: 60,
  },
  headerBtnText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  saveStatus: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionBtn: {
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pdfBtn: {
    backgroundColor: '#059669',
    minWidth: 58,
  },
  pdfBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  // Section tabs
  sectionTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
    alignItems: 'center',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#F1F3F7',
    gap: 5,
    maxWidth: 150,
  },
  sectionTabActive: {
    backgroundColor: '#7C3AED',
  },
  sectionTabText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
  },
  deleteSectionBtn: {
    padding: 2,
  },
  deleteSectionBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  addSectionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
  },
  addSectionBtnText: {
    color: '#7C3AED',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // WebView
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#EDEEF2',
  },
  aiFab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: stitchColors.siennaDeep,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  aiFabText: {
    color: stitchColors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalHeading: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // AI loading
  aiLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  aiLoadingText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '700',
  },
});
