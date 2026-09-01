/**
 * Native Report Editor — bundled HTML editor rendered in a local WebView.
 * No admin-server dependency for the editing UI itself.
 * Only AI calls and data persistence require the server.
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, Pressable, SafeAreaView, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
  Platform, Linking, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { WebView } from 'react-native-webview';
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
  subscriptionTier: 'free' | 'basic' | 'premium';
  onUpgrade: () => void;
};

type EditorSurfaceHandle = {
  injectJavaScript: (script: string) => void;
};

type EditorSurfaceProps = {
  html: string;
  onMessage: (event: any) => void;
  onLoadEnd: () => void;
};

const EditorSurface = React.forwardRef<EditorSurfaceHandle, EditorSurfaceProps>(
  ({ html, onMessage, onLoadEnd }, forwardedRef) => {
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
        title: 'Éditeur de document Campus 360',
        onLoad: onLoadEnd,
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          backgroundColor: '#EDEEF2',
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
        onLoadEnd={onLoadEnd}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        textZoom={100}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
      />
    );
  },
);

EditorSurface.displayName = 'EditorSurface';

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

// ─── HTML Editor (bundled) ───────────────────────────────────────────────────

const EDITOR_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #EDEEF2;
  color: #1F2937;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  padding: 14px 16px 40px;
  -webkit-user-select: text;
  user-select: text;
  min-height: 100vh;
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
  z-index: 100;
  -webkit-user-select: none;
  user-select: none;
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
  user-select: none;
  -webkit-user-select: none;
}
.tool-btn:active { background: #E2E6EE; }
.tool-btn.active { background: #7C3AED !important; color: #FFFFFF !important; }
.sep { width: 1px; height: 24px; background: #E5E7EB; margin: 0 3px; }

/* Cover form card */
.cover-card {
  display: flex; flex-direction: column; gap: 14px;
  background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px;
  padding: 22px 20px;
  box-shadow: 0 6px 20px -8px rgba(15,23,42,0.12);
  margin-bottom: 20px;
}
.cover-card h2 {
  color: #111827; font-size: 19px; font-weight: 800;
  margin-bottom: 2px; letter-spacing: -0.02em;
}
.subtitle-note {
  font-size: 12px; color: #64748B; margin-bottom: 8px;
}
.cover-card label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: #6B7280; margin-bottom: 5px; display: block;
}
.cover-card input, .cover-card textarea {
  width: 100%;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  color: #1F2937;
  font-size: 14px;
  padding: 11px 13px;
  outline: none;
}
.cover-card input:focus, .cover-card textarea:focus {
  border-color: #7C3AED; background: #FFFFFF;
}
.cover-card textarea { resize: none; height: 64px; }
.cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-group { display: flex; flex-direction: column; }

/* Rich Editor Area */
.editor-container {
  display: flex; flex-direction: column;
}
.section-heading {
  font-size: 20px; font-weight: 800;
  color: #111827; margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 2px solid #EEF0F3;
  letter-spacing: -0.02em;
}
.editor-area {
  background: #FFFFFF;
  border-radius: 14px;
  padding: 24px 22px;
  min-height: 360px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 6px 20px -8px rgba(15,23,42,0.12);
  margin-bottom: 16px;
}
.editor-area:focus-within { border-color: #C4B5FD; box-shadow: 0 8px 24px -6px rgba(124,58,237,0.22); }
#editor {
  min-height: 300px;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
  color: #1F2937;
  font-size: 16px;
  line-height: 1.75;
}
#editor:empty:before {
  content: 'Commencez à rédiger votre texte ici...';
  color: #9CA3AF;
  font-style: italic;
}
#editor p { margin-bottom: 12px; }
#editor h2 { font-size: 19px; font-weight: 800; color: #111827; margin: 18px 0 8px; letter-spacing: -0.01em; }
#editor h3 { font-size: 16px; font-weight: 700; color: #374151; margin: 14px 0 6px; }
#editor ul, #editor ol { padding-left: 22px; margin-bottom: 12px; }
#editor li { margin-bottom: 6px; }
#editor strong, #editor b { color: #111827; font-weight: 700; }
#editor em, #editor i { color: #4B5563; font-style: italic; }
#editor u { text-decoration: underline; }
#editor img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; }
#editor table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
#editor th, #editor td { border: 1px solid #CBD5E1; padding: 8px 12px; }
#editor blockquote { margin: 14px 0; padding: 12px 16px; background: #F8FAFC; border-left: 4px solid #7C3AED; font-style: italic; color: #334155; border-radius: 0 8px 8px 0; }

/* AI Panel */
.ai-panel {
  background: #FFFFFF;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
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
  padding: 16px; margin-bottom: 20px; border: 1px solid #E5E7EB;
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
  padding: 10px 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px; color: #1E293B;
  cursor: pointer;
}
.toc-item span:last-child { font-size: 12px; color: #7C3AED; font-weight: 700; }

/* Auto-save indicator */
.save-indicator {
  position: fixed; bottom: 20px; right: 20px;
  background: #059669; color: #FFFFFF;
  padding: 8px 16px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
  box-shadow: 0 6px 18px -6px rgba(5,150,105,0.5);
  opacity: 0; transform: translateY(6px);
  transition: opacity 0.25s, transform 0.25s;
  z-index: 200;
}
.save-indicator.show { opacity: 1; transform: translateY(0); }
</style>
</head>
<body>

<!-- Toolbar -->
<div class="toolbar" id="toolbar">
  <button type="button" class="tool-btn" id="btnBold" title="Gras"><b>B</b></button>
  <button type="button" class="tool-btn" id="btnItalic" title="Italique"><i>I</i></button>
  <button type="button" class="tool-btn" id="btnUnderline" title="Souligné"><u>U</u></button>
  <div class="sep"></div>
  <button type="button" class="tool-btn" id="btnH2" title="Titre 2">H2</button>
  <button type="button" class="tool-btn" id="btnH3" title="Titre 3">H3</button>
  <button type="button" class="tool-btn" id="btnUl" title="Liste à puces">•—</button>
  <button type="button" class="tool-btn" id="btnOl" title="Liste numérotée">1.</button>
  <div class="sep"></div>
  <button type="button" class="tool-btn" id="btnImage" title="Insérer une image">🖼️</button>
  <button type="button" class="tool-btn" id="btnDiagram" title="Insérer un schéma vectoriel">📐</button>
  <button type="button" class="tool-btn" id="btnTable" title="Insérer un tableau académique">📊</button>
  <button type="button" class="tool-btn" id="btnCallout" title="Insérer une remarque / note">💡</button>
  <div class="sep"></div>
  <button type="button" class="tool-btn" id="btnUndo" title="Annuler">↩</button>
  <button type="button" class="tool-btn" id="btnRedo" title="Refaire">↪</button>
</div>
<input type="file" id="imgInput" accept="image/*" style="display:none">
<canvas id="imgCanvas" style="display:none"></canvas>

<!-- 1. Cover Page Container -->
<div id="coverContainer" class="cover-card" style="display:none;">
  <h2>📄 Page de Garde</h2>
  <p class="subtitle-note">Remplissez les champs ci-dessous pour personnaliser votre couverture universitaire.</p>
  <div class="form-group">
    <label>Établissement / Université / École</label>
    <input type="text" id="cd_school" placeholder="Ex: Université de Douala / IUT">
  </div>
  <div class="form-group">
    <label>Titre du Rapport / Document</label>
    <input type="text" id="cd_title" placeholder="Ex: Rapport de Stage de Fin d'Études">
  </div>
  <div class="form-group">
    <label>Sous-titre / Sujet du Stage</label>
    <textarea id="cd_subtitle" placeholder="Ex: Conception et Déploiement d'une Infrastructure Cloud Hybride..."></textarea>
  </div>
  <div class="cover-grid">
    <div class="form-group">
      <label>Prénom & Nom Étudiant</label>
      <input type="text" id="cd_studentName" placeholder="Ex: Jean Dupont">
    </div>
    <div class="form-group">
      <label>Entreprise d'Accueil</label>
      <input type="text" id="cd_company" placeholder="Ex: MTN Cameroon">
    </div>
  </div>
  <div class="cover-grid">
    <div class="form-group">
      <label>Maître de Stage / Tuteur Entreprise</label>
      <input type="text" id="cd_tutorCorporate" placeholder="Ex: M. Paul Martin">
    </div>
    <div class="form-group">
      <label>Tuteur Académique</label>
      <input type="text" id="cd_tutorAcademic" placeholder="Ex: Dr. Samuel Eto">
    </div>
  </div>
  <div class="cover-grid">
    <div class="form-group">
      <label>Filière / Spécialité</label>
      <input type="text" id="cd_specialty" placeholder="Ex: Génie Logiciel">
    </div>
    <div class="form-group">
      <label>Année Académique</label>
      <input type="text" id="cd_year" placeholder="Ex: 2024-2025">
    </div>
  </div>
</div>

<!-- 2. Table of Contents Container -->
<div id="tocContainer" class="cover-card" style="display:none;">
  <h2>📑 Table des Matières</h2>
  <p class="subtitle-note">Générée automatiquement et paginée à l'exportation PDF.</p>
  <div id="tocList" class="toc-list"></div>
</div>

<!-- 3. Rich Text Editor Container -->
<div id="editorContainer" class="editor-container" style="display:none;">
  <div id="sectionHeading" class="section-heading"></div>
  <div class="editor-area">
    <div id="editor" contenteditable="true" spellcheck="false"></div>
  </div>

  <!-- In-Editor AI Panel -->
  <div class="ai-panel">
    <h3>✨ Assistant IA de Section</h3>
    <textarea id="aiPrompt" placeholder="Décris ce que tu souhaites rédiger (ex: 'Rédige une introduction méthodologique...')"></textarea>
    <div class="ai-btns">
      <button type="button" class="ai-btn ai-btn-draft" id="aiDraft">✨ Rédiger avec IA</button>
      <button type="button" class="ai-btn ai-btn-improve" id="aiImprove">Améliorer sélection</button>
    </div>
    <p class="ai-credit-note">Coût : 1 crédit IA • Intégré directement dans la section</p>
  </div>

  <!-- Settings Panel -->
  <div class="settings-panel">
    <h3>⚙️ Mise en forme du document</h3>
    <div class="settings-row">
      <label>Police de caractère</label>
      <select id="selFont">
        <option value="Times New Roman">Times New Roman (Standard Universitaire)</option>
        <option value="Arial">Arial (Moderne & Lisible)</option>
        <option value="Georgia">Georgia (Sérif Élégant)</option>
        <option value="Courier New">Courier New (Code & Technique)</option>
      </select>
    </div>
    <div class="settings-row">
      <label>Interligne</label>
      <select id="selSpacing">
        <option value="1.15">1.15 (Compact)</option>
        <option value="1.5">1.5 (Standard Académique CAMES)</option>
        <option value="2">2.0 (Double interligne)</option>
      </select>
    </div>
  </div>
</div>

<!-- Auto-save indicator -->
<div class="save-indicator" id="saveIndicator">✓ Sauvegardé</div>

<script>
let reportData = null;
let currentSectionId = null;
let saveTimer = null;
let lastSavedContent = {};
let savedRange = null;

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

// ── Selection management ───────────────────────────────────────────────────
function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const editor = document.getElementById('editor');
    if (editor && (editor === range.commonAncestorContainer || editor.contains(range.commonAncestorContainer))) {
      savedRange = range.cloneRange();
    }
  }
}

function restoreSelection() {
  const editor = document.getElementById('editor');
  if (!editor) return false;
  editor.focus();
  if (savedRange) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
      return true;
    }
  }
  return false;
}

function execFormat(cmd, val = null) {
  const editor = document.getElementById('editor');
  if (!editor) return;
  editor.focus();
  restoreSelection();
  try {
    document.execCommand(cmd, false, val);
  } catch (err) {
    console.warn('[Editor] execCommand error:', cmd, err);
  }
  saveSelection();
  updateToolbarState();
  saveCurrentSection();
}

function toggleHeading(tag) {
  const editor = document.getElementById('editor');
  if (!editor) return;
  editor.focus();
  restoreSelection();
  const currentBlock = document.queryCommandValue('formatBlock');
  if (currentBlock && currentBlock.toLowerCase() === tag.toLowerCase()) {
    document.execCommand('formatBlock', false, '<p>');
  } else {
    document.execCommand('formatBlock', false, '<' + tag + '>');
  }
  saveSelection();
  updateToolbarState();
  saveCurrentSection();
}

function insertHtmlAtCursor(html) {
  const editor = document.getElementById('editor');
  if (!editor) return;
  editor.focus();
  restoreSelection();
  let inserted = false;
  try {
    inserted = document.execCommand('insertHTML', false, html);
  } catch (e) {}

  if (!inserted) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) {
      editor.appendChild(temp.firstChild);
    }
  }
  saveSelection();
  saveCurrentSection();
}

function updateToolbarState() {
  try {
    const btnBold = document.getElementById('btnBold');
    if (btnBold) btnBold.classList.toggle('active', !!document.queryCommandState('bold'));
    const btnItalic = document.getElementById('btnItalic');
    if (btnItalic) btnItalic.classList.toggle('active', !!document.queryCommandState('italic'));
    const btnUnderline = document.getElementById('btnUnderline');
    if (btnUnderline) btnUnderline.classList.toggle('active', !!document.queryCommandState('underline'));
    const btnUl = document.getElementById('btnUl');
    if (btnUl) btnUl.classList.toggle('active', !!document.queryCommandState('insertUnorderedList'));
    const btnOl = document.getElementById('btnOl');
    if (btnOl) btnOl.classList.toggle('active', !!document.queryCommandState('insertOrderedList'));
  } catch (e) {}
}

function getSectionStarterHtml(section) {
  if (section.content_html && section.content_html.trim().length > 0) {
    return section.content_html;
  }
  return '<p><br></p>';
}

function applyDocumentStyles() {
  const rep = (reportData && (reportData.report || reportData.document)) || {};
  const editor = document.getElementById('editor');
  if (!editor) return;
  editor.style.fontFamily = rep.font_family || 'Times New Roman';
  editor.style.lineHeight = String(rep.line_spacing || 1.5);
}

// ── Switch Section Logic ────────────────────────────────────────────────────
function switchSection(sectionId, shouldSave = true) {
  if (!sectionId || !reportData || !reportData.sections) return;

  // Save current active section if needed
  if (shouldSave && currentSectionId && currentSectionId !== sectionId) {
    saveCurrentSection(false);
  }

  currentSectionId = sectionId;
  sendToApp({ type: 'sectionChanged', sectionId: sectionId });

  const section = reportData.sections.find(s => s.id === sectionId);
  if (!section) return;

  const lower = (section.title || '').toLowerCase().trim();
  const coverContainer = document.getElementById('coverContainer');
  const tocContainer = document.getElementById('tocContainer');
  const editorContainer = document.getElementById('editorContainer');
  const toolbar = document.getElementById('toolbar');

  if (lower === 'page de garde') {
    if (coverContainer) coverContainer.style.display = 'flex';
    if (tocContainer) tocContainer.style.display = 'none';
    if (editorContainer) editorContainer.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';

    // Populate cover inputs
    const rep = (reportData && (reportData.report || reportData.document)) || {};
    const cd = rep.cover_data || {};
    ['school','title','subtitle','studentName','company','tutorCorporate','tutorAcademic','specialty','year'].forEach(field => {
      const el = document.getElementById('cd_' + field);
      if (el) el.value = cd[field] || '';
    });
  } else if (lower === 'sommaire') {
    if (coverContainer) coverContainer.style.display = 'none';
    if (tocContainer) tocContainer.style.display = 'flex';
    if (editorContainer) editorContainer.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';

    // Populate TOC list
    const items = (reportData.sections || []).filter(s => !['page de garde','sommaire'].includes((s.title || '').toLowerCase().trim()));
    const tocList = document.getElementById('tocList');
    if (tocList) {
      tocList.innerHTML = items.map((s, i) =>
        '<div class="toc-item" onclick="window.switchSection(\'' + s.id + '\')">' +
          '<span><strong>' + (i + 1) + '.</strong> ' + s.title + '</span>' +
          '<span>Ouvrir &rarr;</span>' +
        '</div>'
      ).join('');
    }
  } else {
    if (coverContainer) coverContainer.style.display = 'none';
    if (tocContainer) tocContainer.style.display = 'none';
    if (editorContainer) editorContainer.style.display = 'block';
    if (toolbar) toolbar.style.display = 'flex';

    // Populate Editor
    const heading = document.getElementById('sectionHeading');
    if (heading) heading.textContent = section.title;

    const editor = document.getElementById('editor');
    if (editor) {
      editor.innerHTML = getSectionStarterHtml(section);
    }

    const rep = (reportData && (reportData.report || reportData.document)) || {};
    const selFont = document.getElementById('selFont');
    if (selFont) selFont.value = rep.font_family || 'Times New Roman';
    const selSpacing = document.getElementById('selSpacing');
    if (selSpacing) selSpacing.value = String(rep.line_spacing || '1.5');
    applyDocumentStyles();
  }
}

// ── Save Current Section ────────────────────────────────────────────────────
function saveCurrentSection(showIndicator = true) {
  if (!currentSectionId || !reportData || !reportData.sections) return;
  const section = reportData.sections.find(s => s.id === currentSectionId);
  if (!section) return;
  const editor = document.getElementById('editor');
  if (editor && !['page de garde', 'sommaire'].includes((section.title || '').toLowerCase().trim())) {
    section.content_html = editor.innerHTML;
    if (lastSavedContent[currentSectionId] === section.content_html) {
      return;
    }
    lastSavedContent[currentSectionId] = section.content_html;
    sendToApp({
      type: 'saveSection',
      sectionId: currentSectionId,
      content: section.content_html
    });
    if (showIndicator) {
      showSaveIndicator();
    }
  }
}

function showSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  if (el) {
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
  }
}

// ── AI Action ───────────────────────────────────────────────────────────────
async function runAI(action) {
  const promptEl = document.getElementById('aiPrompt');
  const prompt = promptEl ? promptEl.value.trim() : '';
  if (!prompt) { alert('Décris ce que tu souhaites rédiger.'); return; }
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

function attachBtn(id, action) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    action();
  });
  el.addEventListener('touchend', (e) => {
    e.preventDefault();
    action();
  });
  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
}

function initEditor() {
  // Toolbar Buttons
  attachBtn('btnBold', () => execFormat('bold'));
  attachBtn('btnItalic', () => execFormat('italic'));
  attachBtn('btnUnderline', () => execFormat('underline'));
  attachBtn('btnH2', () => toggleHeading('h2'));
  attachBtn('btnH3', () => toggleHeading('h3'));
  attachBtn('btnUl', () => execFormat('insertUnorderedList'));
  attachBtn('btnOl', () => execFormat('insertOrderedList'));
  attachBtn('btnUndo', () => execFormat('undo'));
  attachBtn('btnRedo', () => execFormat('redo'));

  // Diagram & Table & Callout
  attachBtn('btnDiagram', () => {
    const diagramHtml = '<div class="figure-container" style="text-align: center; margin: 20px 0; page-break-inside: avoid;"><svg width="100%" height="220" viewBox="0 0 650 220" xmlns="http://www.w3.org/2000/svg" style="max-width: 600px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;"><rect x="30" y="30" width="160" height="150" rx="8" fill="#38BDF8"/><text x="110" y="65" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Couche Client</text><text x="110" y="105" font-family="sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">Application Mobile</text><line x1="190" y1="105" x2="260" y2="105" stroke="#64748B" stroke-width="2" stroke-dasharray="4,4"/><rect x="260" y="30" width="160" height="150" rx="8" fill="#818CF8"/><text x="340" y="65" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Serveur API</text><text x="340" y="105" font-family="sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">Next.js & Auth JWT</text><line x1="420" y1="105" x2="490" y2="105" stroke="#64748B" stroke-width="2"/><rect x="490" y="30" width="140" height="150" rx="8" fill="#34D399"/><text x="560" y="65" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Base Données</text><text x="560" y="105" font-family="sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">PostgreSQL Pool</text></svg><div style="font-size: 9.5pt; font-style: italic; color: #475569; margin-top: 6px;"><strong>Figure :</strong> Sch&eacute;ma d\'Architecture Technique Syst&egrave;me</div></div><p><br></p>';
    insertHtmlAtCursor(diagramHtml);
  });

  attachBtn('btnTable', () => {
    const tableHtml = '<div style="margin: 18px 0; overflow-x: auto; page-break-inside: avoid;"><table style="width: 100%; border-collapse: collapse; font-size: 10pt; text-align: left; background: #FFFFFF; border: 1px solid #CBD5E1;"><thead><tr style="background: #0F172A; color: #FFFFFF;"><th style="padding: 8px 12px; border: 1px solid #334155;">Crit&egrave;re</th><th style="padding: 8px 12px; border: 1px solid #334155;">Description Technique</th><th style="padding: 8px 12px; border: 1px solid #334155;">Statut</th></tr></thead><tbody><tr style="background: #F8FAFC;"><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">S&eacute;curit&eacute; Auth</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Tokens chiffr&eacute;s et sessions s&eacute;curis&eacute;es</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0; color: #059669; font-weight: bold;">Valid&eacute;</td></tr><tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Exportation PDF</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Moteur vectoriel A4 conforme CAMES</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0; color: #059669; font-weight: bold;">Valid&eacute;</td></tr></tbody></table><div style="font-size: 9pt; font-style: italic; color: #64748B; margin-top: 6px; text-align: center;"><strong>Tableau :</strong> Synth&egrave;se Comparative des Modules</div></div><p><br></p>';
    insertHtmlAtCursor(tableHtml);
  });

  attachBtn('btnCallout', () => {
    const calloutHtml = '<blockquote style="margin: 16px 0; padding: 12px 16px; background: #F8FAFC; border-left: 4px solid #7C3AED; font-style: italic; color: #334155; border-radius: 0 8px 8px 0;"><strong>Remarque Acad&eacute;mique :</strong> Ce paragraphe met en lumi&egrave;re les points cl&eacute;s de l\'analyse m&eacute;thodologique.</blockquote><p><br></p>';
    insertHtmlAtCursor(calloutHtml);
  });

  // Image Upload
  attachBtn('btnImage', () => {
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
        insertHtmlAtCursor('<img src="' + dataUrl + '" alt="Figure" style="max-width:100%; border-radius:8px; margin:10px 0;"/><p><br></p>');
        e.target.value = '';
      };
      img.onerror = () => { e.target.value = ''; };
      img.src = reader.result;
    };
    reader.onerror = () => { e.target.value = ''; };
    reader.readAsDataURL(file);
  });

  // Editor Input & Selection
  const editor = document.getElementById('editor');
  ['keyup', 'mouseup', 'touchend', 'input', 'focus'].forEach(evt => {
    editor.addEventListener(evt, () => {
      saveSelection();
      updateToolbarState();
    });
  });

  editor.addEventListener('input', () => {
    const html = editor.innerHTML;
    const sec = reportData.sections.find(s => s.id === currentSectionId);
    if (sec) sec.content_html = html;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCurrentSection();
    }, 1200);
  });

  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); execFormat('bold'); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); execFormat('italic'); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); execFormat('underline'); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) { execFormat('redo'); } else { execFormat('undo'); } }
  });

  // In-Editor AI Buttons
  attachBtn('aiDraft', () => runAI('draft'));
  attachBtn('aiImprove', () => runAI('improve'));

  // Settings
  document.getElementById('selFont').addEventListener('change', (e) => {
    if (reportData && reportData.report) reportData.report.font_family = e.target.value;
    applyDocumentStyles();
    sendToApp({ type: 'updateFont', data: e.target.value });
  });
  document.getElementById('selSpacing').addEventListener('change', (e) => {
    const spacing = parseFloat(e.target.value);
    if (reportData && reportData.report) reportData.report.line_spacing = spacing;
    applyDocumentStyles();
    sendToApp({ type: 'updateSpacing', data: spacing });
  });

  // Cover Page Auto-Save
  ['school','title','subtitle','studentName','company','tutorCorporate','tutorAcademic','specialty','year'].forEach(field => {
    const el = document.getElementById('cd_' + field);
    if (el) {
      el.addEventListener('input', () => {
        if (!reportData) return;
        if (!reportData.report) reportData.report = {};
        reportData.report.cover_data = reportData.report.cover_data || {};
        reportData.report.cover_data[field] = el.value;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          sendToApp({
            type: 'updateCoverData',
            data: reportData.report.cover_data
          });
          showSaveIndicator();
        }, 1200);
      });
    }
  });

  // Render initial section if reportData is present
  if (reportData && reportData.sections) {
    let sectionToOpen = currentSectionId;
    if (!sectionToOpen || !(reportData.sections || []).some(s => s.id === sectionToOpen)) {
      const firstEditable = (reportData.sections || []).find(s =>
        !['page de garde','sommaire'].includes((s.title || '').toLowerCase().trim())
      );
      sectionToOpen = firstEditable ? firstEditable.id : (reportData.sections && reportData.sections[0] ? reportData.sections[0].id : null);
    }
    if (sectionToOpen) {
      switchSection(sectionToOpen, false);
    }
  }
}

// ── Global Interface API ────────────────────────────────────────────────────
window.loadReportData = function(data, targetSectionId) {
  if (!data || !data.sections) return;
  reportData = data;
  data.sections.forEach(s => {
    if (lastSavedContent[s.id] === undefined) {
      lastSavedContent[s.id] = s.content_html || '';
    }
  });
  const sectionToOpen = targetSectionId || currentSectionId || (data.sections[0] ? data.sections[0].id : null);
  if (sectionToOpen) {
    switchSection(sectionToOpen, false);
  }
};

window.switchSection = function(sectionId) {
  switchSection(sectionId, true);
};

window.insertAIHtml = function(html) {
  insertHtmlAtCursor(html);
  showSaveIndicator();
};

document.addEventListener('DOMContentLoaded', () => {
  initEditor();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initEditor();
}
</script>
</body>
</html>
`;

// ─── React Native Component ───────────────────────────────────────────────────

export function DocumentEditorScreen({ documentId, onClose, subscriptionTier, onUpgrade }: DocumentEditorScreenProps) {
  const webViewRef = useRef<EditorSurfaceHandle | null>(null);
  const webViewLoadedRef = useRef(false);
  const initialDataSentRef = useRef(false);
  const editorHtml = useMemo(() => EDITOR_HTML, []);

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

  // Inject initial data into WebView once loaded and report is ready
  useEffect(() => {
    if (!loading && report && sections.length > 0 && webViewRef.current && webViewLoadedRef.current && !initialDataSentRef.current) {
      webViewRef.current.injectJavaScript(
        `window.loadReportData(${JSON.stringify({ report, sections })}, ${JSON.stringify(currentSectionId)}); true;`
      );
      initialDataSentRef.current = true;
    }
  }, [loading, report, sections, currentSectionId]);

  // Handle messages from WebView
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'sectionChanged') {
        setCurrentSectionId(msg.sectionId);
      }

      if (msg.type === 'saveSection') {
        setSaving(true);
        try {
          const response = await authFetch(`/api/mobile/documents/${documentId}/sections/${msg.sectionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content_html: msg.content }),
          });
          if (!response.ok) throw new Error('La sauvegarde de la section a échoué.');
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
          const response = await authFetch(`/api/mobile/documents/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cover_data: msg.data }),
          });
          if (!response.ok) throw new Error('La sauvegarde de la page de garde a échoué.');
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
      const updatedSections = [...sections, newSection];
      setSections(updatedSections);
      setNewSectionTitle('');
      setShowAddSection(false);
      setCurrentSectionId(newSection.id);
      if (webViewRef.current && report) {
        webViewRef.current.injectJavaScript(
          `window.loadReportData(${JSON.stringify({ report, sections: updatedSections })}, ${JSON.stringify(newSection.id)}); true;`
        );
      }
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
              const nextId = currentSectionId === sectionId ? (remaining[0]?.id ?? null) : currentSectionId;
              setCurrentSectionId(nextId);
              if (report && webViewRef.current) {
                webViewRef.current.injectJavaScript(
                  `window.loadReportData(${JSON.stringify({ report, sections: remaining })}, ${JSON.stringify(nextId)}); true;`
                );
              }
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la section.');
            }
          },
        },
      ]
    );
  }, [sections, currentSectionId, documentId, report]);

  // Export PDF through the server so subscription rules cannot be bypassed.
  const handleExportPdf = useCallback(async () => {
    if (!report || sections.length === 0) return;
    if (subscriptionTier === 'free') {
      Alert.alert(
        'Export réservé aux abonnés',
        'Passe à Basic pour un PDF filigrané, ou à Premium pour un export sans filigrane.',
        [{ text: 'Plus tard', style: 'cancel' }, { text: 'Voir les offres', onPress: onUpgrade }],
      );
      return;
    }

    setExporting(true);
    try {
      const response = await authFetch(`/api/mobile/documents/${documentId}/export/pdf`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Le serveur a refusé cet export PDF.');
      }

      const blob = await response.blob();
      const safeName = `${String(report.title || 'document')
        .replace(/[^\p{L}\p{N}_-]+/gu, '_')
        .slice(0, 60)}.pdf`;
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

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Le partage n'est pas disponible sur cet appareil.");
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exporter le document',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de générer le PDF.');
    } finally {
      setExporting(false);
    }
  }, [documentId, onUpgrade, report, sections, subscriptionTier]);

  const handleExportDocx = useCallback(async () => {
    if (!report) return;
    if (subscriptionTier !== 'premium') {
      Alert.alert(
        'Export Word Premium',
        "L'export Word sans filigrane est réservé à l'abonnement Premium.",
        [{ text: 'Plus tard', style: 'cancel' }, { text: 'Voir Premium', onPress: onUpgrade }],
      );
      return;
    }

    setExporting(true);
    try {
      const response = await authFetch(`/api/mobile/documents/${documentId}/export/docx`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Le serveur a refusé l'export Word.");
      }
      const blob = await response.blob();
      const safeName = `${String(report.title || 'document')
        .replace(/[^\p{L}\p{N}_-]+/gu, '_')
        .slice(0, 60)}.docx`;
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
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Le partage n'est pas disponible sur cet appareil.");
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: 'Exporter le document Word',
        UTI: 'org.openxmlformats.wordprocessingml.document',
      });
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : "Impossible de générer le document Word.");
    } finally {
      setExporting(false);
    }
  }, [documentId, onUpgrade, report, subscriptionTier]);

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
            style={[styles.headerActionBtn, styles.wordBtn]}
            onPress={handleExportDocx}
            disabled={exporting}
          >
            <Text style={styles.wordBtnText}>{subscriptionTier === 'premium' ? 'Word' : 'Word 🔒'}</Text>
          </Pressable>
          <Pressable
            style={[styles.headerActionBtn, styles.pdfBtn]}
            onPress={handleExportPdf}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color={stitchColors.white} />
              : <Text style={styles.pdfBtnText}>{subscriptionTier === 'basic' ? 'PDF filigrané' : subscriptionTier === 'free' ? 'PDF 🔒' : 'PDF'}</Text>
            }
          </Pressable>
        </View>
      </View>

      {subscriptionTier !== 'premium' && (
        <View pointerEvents="none" style={styles.previewWatermark}>
          <Text style={styles.previewWatermarkText}>CAMPUS 360 • APERÇU {subscriptionTier.toUpperCase()}</Text>
        </View>
      )}

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
        <EditorSurface
          ref={webViewRef}
          html={editorHtml}
          onMessage={handleWebViewMessage}
          onLoadEnd={() => {
            webViewLoadedRef.current = true;
            if (report && sections.length > 0 && webViewRef.current) {
              webViewRef.current.injectJavaScript(
                `window.loadReportData(${JSON.stringify({ report, sections })}, ${JSON.stringify(currentSectionId)}); true;`
              );
              initialDataSentRef.current = true;
            }
          }}
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
  wordBtn: {
    backgroundColor: '#2563EB',
    minWidth: 64,
  },
  wordBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  pdfBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  previewWatermark: {
    position: 'absolute',
    top: '48%',
    left: '-12%',
    width: '124%',
    zIndex: 20,
    transform: [{ rotate: '-28deg' }],
    alignItems: 'center',
  },
  previewWatermarkText: {
    color: 'rgba(15, 23, 42, 0.14)',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2,
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
