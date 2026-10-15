import { stitchColors } from '../../theme/stitch';
import {
  chapterLabel,
  chapterNumberOf,
  classifySection,
  coverCss,
  coverDataFrom,
  coverHtml,
  escapeHtml,
  normalizeHeadings,
  styleToCss,
  textColorOn,
  toRoman,
  type CoverLogos,
} from './documentRender';
import type { DocumentStyle, HeaderFooterSlot } from './documentStyle';

// HTML pages loaded in WebViews/iframes: the section editor, the whole-document
// preview and the small style sample. Content styles come from the document
// style (documentRender.ts, shared with the PDF export) so the screen and the
// printed page match. Editing commands live in the page and are called by the
// app through injectJavaScript.

// Same font stacks as the PDF export (mobile-api export/pdf).
export const EDITOR_FONTS: Record<string, string> = {
  'Times New Roman': "'Times New Roman', Times, serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Lora: "Georgia, 'Times New Roman', serif",
  Arial: 'Arial, Helvetica, sans-serif',
  Calibri: 'Calibri, Carlito, Arial, sans-serif',
  'Courier New': "'Courier New', Courier, monospace",
};

const SHEET_PADDING: Record<string, string> = {
  narrow: '20px 14px',
  normal: '28px 22px',
  wide: '34px 30px',
};

// Older editor versions saved their hint as real content.
const LEGACY_PLACEHOLDER = /Commencez à rédiger votre [^<]*? ici comme dans Word\.\.\./g;

export const stripLegacyPlaceholder = (html: string) =>
  (html || '').replace(LEGACY_PLACEHOLDER, '').replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim();

const escapeAttr = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const c = stitchColors;

// Sheet frame (white page on a grey desk) for the editor and the preview.
const frameCss = (style: DocumentStyle) => `
  .sheet-wrapper { padding: 12px 8px 120px; display: flex; justify-content: center; }
  .document-sheet {
    position: relative;
    width: 100%;
    max-width: 820px;
    min-height: 60vh;
    background: ${c.surface};
    border: 1px solid ${c.glassBorder};
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    padding: ${SHEET_PADDING[style.page.margins] || SHEET_PADDING.normal};
    outline: none;
  }
  .document-sheet.is-empty::before {
    content: attr(data-placeholder);
    position: absolute;
    left: 0;
    right: 0;
    padding: inherit;
    padding-bottom: 0;
    top: 0;
    color: ${c.inkSubtle};
    font-style: italic;
    pointer-events: none;
  }
  /* On a phone, justified text leaves wide gaps between words: read left-aligned.
     Exports stay justified; an explicit alignment (inline style) still applies. */
  @media (max-width: 560px) {
    .doc-body p { text-align: left; }
  }
  .doc-body img[data-file-id]:not([src]) { display: inline-block; width: 60%; min-height: 140px; background: rgba(15, 23, 42, 0.05); }
  .doc-body td, .doc-body th { min-width: 48px; }
  .doc-body figure.fig-selected img { outline: 2px solid ${c.sienna}; outline-offset: 3px; }
  .doc-body .academic-page-break {
    margin: 26px 0;
    border-top: 2px dashed ${c.outline};
    text-align: center;
    user-select: none;
    line-height: 1;
  }
  .doc-body .break-tag {
    position: relative;
    top: -9px;
    background: ${c.surface};
    color: ${c.inkMuted};
    font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
`;

export type EditorSectionInfo = { title: string };

// data-kind / data-chapter attributes drive heading and caption numbering.
const sectionAttributes = (title: string, style: DocumentStyle) => {
  const { kind } = classifySection(title);
  const chapter = kind === 'body' ? chapterNumberOf(title) : null;
  const label = chapter ? chapterLabel(chapter, style) : null;
  return `data-kind="${kind}"${label ? ` data-chapter="${escapeHtml(label)}" style="--chapter: '${escapeHtml(label)}'"` : ''}`;
};

export function buildWysiwygHtml(initialContentHtml: string, title: string, style: DocumentStyle): string {
  const cleaned = normalizeHeadings(stripLegacyPlaceholder(initialContentHtml));
  const content = cleaned || '<p><br></p>';
  const placeholder = escapeAttr(`Rédigez ici « ${title} »…`);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0;
    padding: 0;
    background: ${c.paperSoft};
    color: ${c.ink};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    overflow-x: hidden;
  }

  /* Toolbar: one horizontally scrolling row; table tools appear only inside a table. */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: ${c.surface};
    border-bottom: 1px solid ${c.glassBorder};
  }
  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .toolbar-row::-webkit-scrollbar { display: none; }
  .table-bar {
    display: none;
    border-top: 1px solid ${c.glassBorder};
    background: ${c.paperDeep};
  }
  .table-bar.visible { display: flex; }
  .table-bar .label {
    font-size: 12px;
    font-weight: 700;
    color: ${c.inkMuted};
    padding: 0 4px;
    flex: 0 0 auto;
  }
  .tb {
    flex: 0 0 auto;
    height: 36px;
    min-width: 36px;
    padding: 0 9px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: ${c.inkSoft};
    font-size: 14px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    white-space: nowrap;
  }
  .tb:active { background: ${c.siennaSoft}; }
  .tb.active { background: ${c.siennaBg}; border-color: ${c.siennaSoft}; color: ${c.siennaDeep}; }
  .tb.text { font-size: 13px; }
  .tb .serif { font-family: Georgia, serif; font-size: 16px; }
  .sep { flex: 0 0 auto; width: 1px; height: 22px; background: ${c.glassBorder}; margin: 0 3px; }

${frameCss(style)}
${styleToCss(style, { cssNumbering: true })}
</style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-row" id="mainBar">
      <span class="tb" data-action="undo" title="Annuler">↶</span>
      <span class="tb" data-action="redo" title="Rétablir">↷</span>
      <span class="sep"></span>
      <span class="tb" data-cmd="bold" title="Gras"><b class="serif">G</b></span>
      <span class="tb" data-cmd="italic" title="Italique"><i class="serif">I</i></span>
      <span class="tb" data-cmd="underline" title="Souligné"><u class="serif">S</u></span>
      <span class="sep"></span>
      <span class="tb text" data-block="h1" title="Titre 1">Titre 1</span>
      <span class="tb text" data-block="h2" title="Titre 2">Titre 2</span>
      <span class="tb text" data-block="h3" title="Titre 3">Titre 3</span>
      <span class="tb text" data-block="p" title="Texte normal">Texte</span>
      <span class="sep"></span>
      <span class="tb" data-cmd="insertUnorderedList" title="Liste à puces">•≡</span>
      <span class="tb" data-cmd="insertOrderedList" title="Liste numérotée">1≡</span>
      <span class="sep"></span>
      <span class="tb" data-cmd="justifyLeft" title="Aligner à gauche">⇤</span>
      <span class="tb" data-cmd="justifyCenter" title="Centrer">↔</span>
      <span class="tb" data-cmd="justifyRight" title="Aligner à droite">⇥</span>
      <span class="tb" data-cmd="justifyFull" title="Justifier">☰</span>
      <span class="sep"></span>
      <span class="tb text" data-action="table" title="Insérer un tableau">⊞ Tableau</span>
      <span class="tb text" data-action="callout" title="Encadré">❝ Encadré</span>
      <span class="tb text" data-action="pagebreak" title="Saut de page">⤓ Saut de page</span>
      <span class="tb text" data-action="clear" title="Effacer la mise en forme">⌫ Effacer</span>
    </div>
    <div class="toolbar-row table-bar" id="tableBar">
      <span class="label">Tableau</span>
      <span class="tb text" data-action="rowAdd">+ Ligne</span>
      <span class="tb text" data-action="colAdd">+ Colonne</span>
      <span class="tb text" data-action="rowDel">− Ligne</span>
      <span class="tb text" data-action="colDel">− Colonne</span>
      <span class="tb text" data-action="tableCaption">+ Légende</span>
      <span class="tb text" data-action="tableDel">Supprimer</span>
    </div>
    <div class="toolbar-row table-bar" id="figureBar">
      <span class="label">Image</span>
      <span class="tb text" data-figure-width="fig-full">Pleine largeur</span>
      <span class="tb text" data-figure-width="fig-half">Moitié</span>
      <span class="tb text" data-figure-width="fig-small">Petite</span>
      <span class="tb text" data-action="figureDel">Supprimer</span>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="doc-section" ${sectionAttributes(title, style)} style="width: 100%; max-width: 820px;">
      <div id="editor" class="document-sheet doc-body" contenteditable="true" spellcheck="true" lang="fr" data-placeholder="${placeholder}">${content}</div>
    </div>
  </div>

  <script>
    const editor = document.getElementById('editor');
    const tableBar = document.getElementById('tableBar');
    const figureBar = document.getElementById('figureBar');
    let selectedFigure = null;

    // Captions are numbered automatically: drop the number older captions carry.
    editor.querySelectorAll('figcaption, .doc-table-caption').forEach(function (cap) {
      const text = (cap.textContent || '').trim();
      const cleaned = text.replace(/^(figure|fig\.?|tableau|tab\.?)\s*[\dIVXivx.]*\s*[:.\-–]\s*/i, '');
      if (cleaned !== text) cap.textContent = cleaned;
    });

    function selectFigure(figure) {
      if (selectedFigure) selectedFigure.classList.remove('fig-selected');
      selectedFigure = figure;
      if (figure) figure.classList.add('fig-selected');
      figureBar.classList.toggle('visible', !!figure);
    }
    editor.addEventListener('click', function (event) {
      const figure = event.target && event.target.closest ? event.target.closest('figure') : null;
      selectFigure(figure && editor.contains(figure) ? figure : null);
    });
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    // Semantic tags (<b>, <i>…) rather than inline CSS spans.
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}

    // The browser copies computed styles (e.g. the paragraph indent) onto inline
    // elements while editing; only alignment on blocks is meant to be kept.
    function cleanInlineStyles() {
      editor.querySelectorAll('b, strong, i, em, u, span, sub, sup, font, a').forEach(function (el) {
        if (el.hasAttribute('style')) el.removeAttribute('style');
      });
      editor.querySelectorAll('[style]').forEach(function (el) {
        el.style.removeProperty('text-indent');
        el.style.removeProperty('font-family');
        el.style.removeProperty('font-size');
        el.style.removeProperty('line-height');
        el.style.removeProperty('color');
        el.style.removeProperty('background-color');
        if (!el.getAttribute('style')) el.removeAttribute('style');
      });
    }

    function post(payload) {
      const data = JSON.stringify(payload);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(data);
      else if (window.parent && window.parent.postMessage) window.parent.postMessage(data, '*');
    }

    function isEmptyContent() {
      const text = (editor.innerText || '').replace(/\\u00a0/g, ' ').trim();
      return !text && !editor.querySelector('img, table, figure, hr, .academic-page-break');
    }

    function refreshPlaceholder() {
      editor.classList.toggle('is-empty', isEmptyContent());
    }

    // Keeps the last caret inside the editor so toolbar taps act where the student was.
    let lastRange = null;
    document.addEventListener('selectionchange', function () {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) lastRange = sel.getRangeAt(0).cloneRange();
      updateToolbar();
    });

    function ensureCaret() {
      editor.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) return;
      sel.removeAllRanges();
      if (lastRange) {
        sel.addRange(lastRange);
      } else {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        sel.addRange(range);
      }
    }

    function getSelectedCell() {
      const sel = window.getSelection();
      let node = sel && sel.anchorNode;
      while (node && node !== editor) {
        if (node.nodeName === 'TD' || node.nodeName === 'TH') return node;
        node = node.parentNode;
      }
      return null;
    }

    function currentBlock() {
      try { return String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); } catch (e) { return ''; }
    }

    function updateToolbar() {
      document.querySelectorAll('[data-cmd]').forEach(function (btn) {
        let active = false;
        try { active = document.queryCommandState(btn.getAttribute('data-cmd')); } catch (e) {}
        btn.classList.toggle('active', !!active);
      });
      const block = currentBlock();
      document.querySelectorAll('[data-block]').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-block') === block);
      });
      tableBar.classList.toggle('visible', !!getSelectedCell());
      if (selectedFigure && !editor.contains(selectedFigure)) selectFigure(null);
    }

    function execCmd(command, value) {
      ensureCaret();
      document.execCommand(command, false, value === undefined ? null : value);
      notifyChange();
      updateToolbar();
    }

    // Tapping the active heading again turns it back into normal text.
    function formatBlock(tag) {
      ensureCaret();
      const target = tag !== 'p' && currentBlock() === tag ? 'p' : tag;
      document.execCommand('formatBlock', false, '<' + target + '>');
      notifyChange();
      updateToolbar();
    }

    function insertHtmlAtCaret(html) {
      ensureCaret();
      document.execCommand('insertHTML', false, html);
      notifyChange();
      updateToolbar();
    }

    function emptyCells(tag, count) {
      let out = '';
      for (let i = 0; i < count; i++) out += '<' + tag + '><br></' + tag + '>';
      return out;
    }

    function insertTable() {
      insertHtmlAtCaret('<table><thead><tr>' + emptyCells('th', 3) + '</tr></thead><tbody><tr>' + emptyCells('td', 3) + '</tr><tr>' + emptyCells('td', 3) + '</tr></tbody></table><p><br></p>');
    }

    function tableAddRow() {
      const cell = getSelectedCell();
      if (!cell) return insertTable();
      const tr = cell.closest('tr');
      const newTr = document.createElement('tr');
      newTr.innerHTML = emptyCells('td', tr.children.length);
      const target = tr.parentNode.nodeName === 'THEAD' ? tr.closest('table').querySelector('tbody') : null;
      if (target) target.insertBefore(newTr, target.firstChild);
      else tr.parentNode.insertBefore(newTr, tr.nextSibling);
      notifyChange();
    }

    function tableAddCol() {
      const cell = getSelectedCell();
      if (!cell) return insertTable();
      const table = cell.closest('table');
      const index = cell.cellIndex;
      Array.from(table.rows).forEach(function (row) {
        const header = row.parentNode.nodeName === 'THEAD';
        const newCell = document.createElement(header ? 'th' : 'td');
        newCell.innerHTML = '<br>';
        if (index + 1 < row.cells.length) row.insertBefore(newCell, row.cells[index + 1]);
        else row.appendChild(newCell);
      });
      notifyChange();
    }

    function tableDeleteRow() {
      const cell = getSelectedCell();
      if (!cell) return;
      const tr = cell.closest('tr');
      const table = tr.closest('table');
      if (table.rows.length <= 1) table.remove(); else tr.remove();
      notifyChange();
      updateToolbar();
    }

    function tableDeleteCol() {
      const cell = getSelectedCell();
      if (!cell) return;
      const table = cell.closest('table');
      const index = cell.cellIndex;
      if (table.rows[0].cells.length <= 1) { table.remove(); }
      else Array.from(table.rows).forEach(function (row) { if (row.cells[index]) row.deleteCell(index); });
      notifyChange();
      updateToolbar();
    }

    function tableDelete() {
      const cell = getSelectedCell();
      if (!cell) return;
      cell.closest('table').remove();
      notifyChange();
      updateToolbar();
    }

    function insertPageBreak() {
      insertHtmlAtCaret('<div class="academic-page-break" contenteditable="false"><span class="break-tag">Saut de page</span></div><p><br></p>');
    }

    function insertCallout() {
      insertHtmlAtCaret('<blockquote><p><br></p></blockquote><p><br></p>');
    }

    function clearFormatting() {
      ensureCaret();
      document.execCommand('removeFormat', false, null);
      document.execCommand('formatBlock', false, '<p>');
      notifyChange();
      updateToolbar();
    }

    // Uploaded images are stored by id (data-file-id); src is a short-lived URL
    // resolved by the app. Built with DOM APIs so the caption is never parsed as HTML.
    function insertFigure(fileId, url, caption, width) {
      const figure = document.createElement('figure');
      figure.className = 'academic-figure' + (width ? ' ' + width : '');
      figure.setAttribute('contenteditable', 'false');
      const img = document.createElement('img');
      if (fileId) img.setAttribute('data-file-id', fileId);
      img.setAttribute('src', url);
      img.setAttribute('alt', caption);
      const figcaption = document.createElement('figcaption');
      figcaption.setAttribute('contenteditable', 'true');
      figcaption.textContent = caption;
      figure.appendChild(img);
      figure.appendChild(figcaption);
      const holder = document.createElement('div');
      holder.appendChild(figure);
      insertHtmlAtCaret(holder.innerHTML + '<p><br></p>');
    }

    function applyImageUrls(urls) {
      editor.querySelectorAll('img[data-file-id]').forEach(function (img) {
        const url = urls[img.getAttribute('data-file-id')];
        if (url) img.setAttribute('src', url);
      });
    }

    function insertAiContent(html) {
      insertHtmlAtCaret(html);
    }

    function setEditorContent(html) {
      editor.innerHTML = html || '<p><br></p>';
      notifyChange();
    }

    // Pasted content keeps its structure (headings, lists, tables, bold…) but
    // loses fonts, colours, classes and Word/Docs markup.
    const PASTE_TAGS = { P: 'p', H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h4', H6: 'h4', B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', UL: 'ul', OL: 'ol', LI: 'li', TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', TR: 'tr', TD: 'td', TH: 'th', BLOCKQUOTE: 'blockquote', SUB: 'sub', SUP: 'sup' };
    const DROP_TAGS = { SCRIPT: 1, STYLE: 1, META: 1, LINK: 1, TITLE: 1, IMG: 1, SVG: 1, OBJECT: 1, IFRAME: 1, BUTTON: 1, INPUT: 1 };
    function escapeText(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function cleanNode(node) {
      let out = '';
      node.childNodes.forEach(function (child) {
        if (child.nodeType === 3) { out += escapeText(child.textContent || ''); return; }
        if (child.nodeType !== 1 || DROP_TAGS[child.tagName]) return;
        const tag = child.tagName;
        const style = (child.getAttribute('style') || '').toLowerCase();
        const inner = cleanNode(child);
        if (tag === 'BR') { out += '<br>'; return; }
        // Google Docs wraps everything in <b style="font-weight:normal">.
        if (tag === 'B' && /font-weight\\s*:\\s*(normal|400)/.test(style)) { out += inner; return; }
        const mapped = PASTE_TAGS[tag];
        if (mapped) { out += '<' + mapped + '>' + inner + '</' + mapped + '>'; return; }
        if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') { out += '<p>' + inner + '</p>'; return; }
        if (/font-weight\\s*:\\s*(bold|[6-9]00)/.test(style)) { out += '<strong>' + inner + '</strong>'; return; }
        if (/font-style\\s*:\\s*italic/.test(style)) { out += '<em>' + inner + '</em>'; return; }
        out += inner;
      });
      return out;
    }
    function textToParagraphs(text) {
      return text.replace(/\\r\\n?/g, '\\n').split(/\\n{2,}/).map(function (para) {
        return '<p>' + escapeText(para).replace(/\\n/g, '<br>') + '</p>';
      }).join('');
    }
    editor.addEventListener('paste', function (event) {
      const data = event.clipboardData;
      if (!data) return;
      event.preventDefault();
      const html = data.getData('text/html');
      const text = data.getData('text/plain');
      let clean = '';
      if (html) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        clean = cleanNode(parsed.body).replace(/<p>\\s*<\\/p>/g, '');
      }
      document.execCommand('insertHTML', false, clean || textToParagraphs(text || ''));
      notifyChange();
    });

    function setFigureWidth(width) {
      if (!selectedFigure) return;
      selectedFigure.classList.remove('fig-full', 'fig-half', 'fig-small');
      selectedFigure.classList.add(width);
      notifyChange();
    }

    function deleteFigure() {
      if (!selectedFigure) return;
      const figure = selectedFigure;
      selectFigure(null);
      figure.remove();
      notifyChange();
    }

    // Caption paragraph above the table; « Tableau 2.1 : » is added automatically.
    function tableCaption() {
      const cell = getSelectedCell();
      if (!cell) return;
      const table = cell.closest('table');
      const previous = table.previousElementSibling;
      if (previous && previous.classList && previous.classList.contains('doc-table-caption')) return;
      const caption = document.createElement('p');
      caption.className = 'doc-table-caption';
      caption.textContent = 'Titre du tableau';
      table.parentNode.insertBefore(caption, table);
      const range = document.createRange();
      range.selectNodeContents(caption);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      notifyChange();
      updateToolbar();
    }

    const ACTIONS = {
      undo: function () { ensureCaret(); document.execCommand('undo'); notifyChange(); updateToolbar(); },
      redo: function () { ensureCaret(); document.execCommand('redo'); notifyChange(); updateToolbar(); },
      table: insertTable,
      callout: insertCallout,
      pagebreak: insertPageBreak,
      clear: clearFormatting,
      rowAdd: tableAddRow,
      colAdd: tableAddCol,
      rowDel: tableDeleteRow,
      colDel: tableDeleteCol,
      tableDel: tableDelete,
      tableCaption: tableCaption,
      figureDel: deleteFigure,
    };

    function runButton(btn) {
      if (btn.hasAttribute('data-cmd')) execCmd(btn.getAttribute('data-cmd'));
      else if (btn.hasAttribute('data-block')) formatBlock(btn.getAttribute('data-block'));
      else if (btn.hasAttribute('data-figure-width')) setFigureWidth(btn.getAttribute('data-figure-width'));
      else if (ACTIONS[btn.getAttribute('data-action')]) ACTIONS[btn.getAttribute('data-action')]();
    }

    // Mouse: act on mousedown so the editor keeps its selection.
    // Touch: act on touchend unless the finger moved (the toolbar scrolls sideways).
    let touchStart = null;
    document.querySelectorAll('.tb').forEach(function (btn) {
      btn.addEventListener('mousedown', function (event) { event.preventDefault(); runButton(btn); });
      btn.addEventListener('touchstart', function (event) {
        const t = event.touches[0];
        touchStart = { x: t.clientX, y: t.clientY };
      }, { passive: true });
      btn.addEventListener('touchend', function (event) {
        const t = event.changedTouches[0];
        const moved = touchStart && (Math.abs(t.clientX - touchStart.x) > 8 || Math.abs(t.clientY - touchStart.y) > 8);
        touchStart = null;
        if (moved) return;
        event.preventDefault();
        runButton(btn);
      });
    });

    function getWordCount(text) {
      const trimmed = text.trim();
      return trimmed ? trimmed.split(/\\s+/).length : 0;
    }

    function notifyChange() {
      cleanInlineStyles();
      refreshPlaceholder();
      const empty = isEmptyContent();
      const text = empty ? '' : (editor.innerText || editor.textContent || '');
      post({ type: 'change', html: empty ? '' : editor.innerHTML, text: text, wordCount: getWordCount(text) });
    }

    editor.addEventListener('input', notifyChange);
    editor.addEventListener('keyup', updateToolbar);
    refreshPlaceholder();
    updateToolbar();

    // Reports the initial word count without saving anything, then tells the app it can send image URLs.
    setTimeout(function () {
      const text = isEmptyContent() ? '' : (editor.innerText || '');
      post({ type: 'stats', wordCount: getWordCount(text) });
      post({ type: 'ready' });
    }, 100);
  </script>
</body>
</html>`;
}

export type PreviewSection = { title: string; html: string };
export type PreviewDocument = { title: string; template_type: string; cover_data: Record<string, unknown> | null };

// The preview shows one sheet per section, so its page numbers count sheets:
// close enough to show the format, the export computes the real ones.
const formatPageNumber = (format: DocumentStyle['headerFooter']['numberFormat'], page: number, total: number) =>
  format === 'page-n' ? `Page ${page}` : format === 'n-of-total' ? `${page} / ${total}` : String(page);

// Header and footer strip shown above/below body sections: what the export prints.
const runningStrip = (slots: HeaderFooterSlot[], values: Record<HeaderFooterSlot, string>) => {
  const parts = slots.map((slot) => `<span>${escapeHtml(values[slot] || '')}</span>`).join('');
  return slots.some((slot) => values[slot]) ? `<div class="run-strip">${parts}</div>` : '';
};

// Read-only view of the whole document, laid out like the export: cover,
// table of contents, then every section on its own page.
export function buildPreviewHtml(
  doc: PreviewDocument,
  sections: PreviewSection[],
  style: DocumentStyle,
  logos: CoverLogos = {},
): string {
  const cover = coverDataFrom(doc.cover_data, doc, style);
  const hf = style.headerFooter;
  const visible = sections.filter((s) => classifySection(s.title).kind !== 'cover');

  const bodyTotal = visible.filter((s) => classifySection(s.title).kind === 'body').length;
  let prelimPage = 0;
  let bodyPage = 0;
  const body = visible
    .map((section) => {
      const { kind } = classifySection(section.title);
      const isBody = kind === 'body';
      if (isBody) bodyPage += 1;
      else prelimPage += 1;
      let content = normalizeHeadings(stripLegacyPlaceholder(section.html)) || '<p class="empty-section">Section encore vide.</p>';
      if (kind === 'toc') {
        content = '<ol class="toc">' + visible
          .filter((item) => classifySection(item.title).kind !== 'toc')
          .map((item) => '<li>' + escapeHtml(item.title) + '</li>')
          .join('') + '</ol><p class="auto-note">Les numéros de page sont ajoutés à l’export.</p>';
      }
      if (kind === 'lists') content = '<p class="auto-note">Liste générée automatiquement à l’export, à partir des légendes des figures et des tableaux.</p>';
      const values: Record<HeaderFooterSlot, string> = {
        none: '',
        title: cover.title,
        chapter: section.title,
        author: cover.studentName || '',
        school: cover.school || cover.university || '',
        page: isBody ? formatPageNumber(hf.numberFormat, bodyPage, bodyTotal) : toRoman(prelimPage).toLowerCase(),
      };
      const header = isBody ? runningStrip([hf.headerLeft, hf.headerRight], values) : '';
      const footer = runningStrip([hf.footerLeft, hf.footerCenter, hf.footerRight], isBody ? values : { ...values, title: '', chapter: '', author: '', school: '' });
      return `<section class="document-sheet preview-page doc-section" ${sectionAttributes(section.title, style)}>
        ${header}
        <h1 class="doc-section-title">${escapeHtml(section.title)}</h1>
        <div class="doc-body">${content}</div>
        ${footer}
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${c.paperSoft}; color: ${c.ink}; }
  .pages { padding: 14px 10px 60px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
${frameCss(style)}
${styleToCss(style, { cssNumbering: true })}
${coverCss(style, 'auto', true)}
  .preview-page { min-height: auto; }
  .preview-page.cover-page { padding: 18px; }
  .run-strip { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: ${c.inkMuted}; border-bottom: 1px solid ${c.glassBorder}; padding-bottom: 4px; margin-bottom: 14px; font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; }
  .run-strip span:empty { display: none; }
  .doc-body ~ .run-strip { border-bottom: none; border-top: 1px solid ${c.glassBorder}; padding-top: 4px; margin: 14px 0 0; }
  .empty-section, .auto-note { color: ${c.inkSubtle}; font-style: italic; text-indent: 0 !important; }
  .toc { padding-left: 22px; }
  .toc li { margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="pages">
    <section class="document-sheet preview-page cover-page">${coverHtml(cover, style, logos)}</section>
    ${body}
  </div>
  <script>
    function applyImageUrls(urls) {
      document.querySelectorAll('img[data-file-id]').forEach(function (img) {
        const url = urls[img.getAttribute('data-file-id')];
        if (url) img.setAttribute('src', url);
      });
    }
    setTimeout(function () {
      const data = JSON.stringify({ type: 'ready' });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(data);
      else if (window.parent && window.parent.postMessage) window.parent.postMessage(data, '*');
    }, 50);
  </script>
</body>
</html>`;
}

// Small sample page for the style panel: heading, paragraph, table, caption.
export function buildStyleSampleHtml(style: DocumentStyle): string {
  const headerColor = textColorOn(style.tables.headerColor);
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  html, body { margin: 0; padding: 0; background: ${c.paperSoft}; overflow: hidden; }
  .sample { margin: 8px; background: ${c.surface}; border: 1px solid ${c.glassBorder}; border-radius: 6px; padding: 14px 16px; }
  ${styleToCss(style, { cssNumbering: true })}
  .doc-body { font-size: ${Math.max(9, style.typography.bodySize - 2)}pt; }
  .doc-section-title { font-size: 15pt; margin-bottom: 8px; }
  .legend { color: ${headerColor}; }
</style></head>
<body>
  <div class="sample doc-section" data-kind="body" data-chapter="${style.headings.numbering === 'roman-alpha' ? 'II' : '2'}" style="--chapter: '${style.headings.numbering === 'roman-alpha' ? 'II' : '2'}'">
    <h1 class="doc-section-title">Chapitre 2 : Missions</h1>
    <div class="doc-body">
      <h1>Analyse du besoin</h1>
      <p>J’ai d’abord rencontré les responsables du service pour recenser leurs attentes, puis j’ai classé les demandes par priorité.</p>
      <p class="doc-table-caption">Demandes recensées</p>
      <table><thead><tr><th>Demande</th><th>Priorité</th></tr></thead><tbody><tr><td>Suivi des réclamations</td><td>Haute</td></tr><tr><td>Tableau de bord</td><td>Moyenne</td></tr></tbody></table>
    </div>
  </div>
</body></html>`;
}
