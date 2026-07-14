'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  BookOpen, ChevronLeft, Download, Sparkles, Settings2, 
  Plus, Trash2, ArrowUpDown, AlignLeft, Bold, Italic, 
  Heading1, Heading2, List, Undo, Redo, FileText, CheckCircle2 
} from 'lucide-react';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';

import { authClient } from '@/lib/auth-client';
import { ImagePlaceholder } from './extensions/ImagePlaceholder';
import { htmlToDocxParagraphs } from './lib/html-to-docx';

/**
 * Helper: convert a margin preset name into the editor padding (in pixels).
 * Mirrors what the export PDF will use; keep in sync with export-css.ts.
 */
const MARGIN_PADDING: Record<string, string> = {
  narrow: '1.5cm',
  normal: '2.5cm',
  wide: '3cm',
};

/**
 * Helper: convert a margin preset name into the editor padding value.
 */
function marginToCss(m: string): string {
  return MARGIN_PADDING[m] ?? MARGIN_PADDING.normal;
}

// SSR-safe alert/confirm — `window.alert` / `window.confirm` don't exist
// during server rendering. We silently no-op on the server; the user will
// see the message on the client.
const ssrAlert = (message: string) => {
  if (typeof window !== 'undefined') window.alert(message);
};
const ssrConfirm = (message: string): boolean => {
  if (typeof window === 'undefined') return true;
  return window.confirm(message);
};

type Document = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, any>;
  // Theme colors are optional and may be missing from older rows.
  primary_color?: string | null;
  secondary_color?: string | null;
};

type DocumentSection = {
  id: string;
  title: string;
  content_html: string;
  content_json?: any;
  sort_order: number;
  is_system: boolean;
};

export default function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobileMode = searchParams.get('mode') === 'mobile';

  // Sync token from URL query params to document cookies (crucial for mobile WebView session persistence)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = searchParams.get('token');
      if (token) {
        window.document.cookie = `better-auth.session_token=${token}; path=/; max-age=604800; secure; samesite=lax`;
      }
    }
  }, [searchParams]);

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Mobile view: 0 = control panel (chat/style/cover), 1 = editor. The two
  // 380px sidebars from desktop don't fit on a phone, so we collapse them
  // into a single tabbed pane that the user toggles.
  const [mobileTab, setMobileTab] = useState<'panel' | 'editor'>('editor');

  const [document, setDocument] = useState<Document | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRemainingCredits, setAiRemainingCredits] = useState<number | null>(null);

  // New Section State
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Chat d'onboarding IA & UI Tabs
  const [leftTab, setLeftTab] = useState<'onboarding' | 'sections' | 'cover' | 'style'>('onboarding');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "Bonjour ! Je suis ton assistant de rédaction Campus 360. Dis-moi : as-tu effectué un stage ? Quel est le thème de ton document et dans quelle entreprise ou université ?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Debounced auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Image Placeholders Upload References
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clickedPlaceholderRef = useRef<HTMLElement | null>(null);

  // 1. Fetch Document and Sections
  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      // Not authenticated — send users to the admin login (mobile mode
      // is launched from the WebView with a session cookie already, so
      // a missing session there means the cookie expired).
      if (!isMobileMode) router.push('/admin/login');
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/mobile/documents/${documentId}`);
        if (!res.ok) {
          // 404 means the document doesn't exist yet — likely a /new hit.
          // Surface a friendly error instead of looping on the loader.
          if (res.status === 404) {
            setError(`Document "${documentId}" introuvable. Il a peut-être été supprimé, ou l'identifiant est invalide.`);
          } else {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Impossible de charger le document (HTTP ${res.status}).`);
          }
          return;
        }
        const data = await res.json();
        setDocument(data.document);
        setSections(data.sections);
        if (data.sections.length > 0) {
          setActiveSectionId(data.sections[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [documentId, session, sessionLoading, router, isMobileMode]);

  const activeSection = sections.find((s) => s.id === activeSectionId);

  // 2. Initialize TipTap Editor — create ONCE, mutate content on section change.
  const editor = useEditor({
    extensions: [StarterKit, ImagePlaceholder],
    content: '',
    onUpdate: ({ editor }) => {
      if (!activeSectionId) return;
      const html = editor.getHTML();
      const json = editor.getJSON();

      // Local state update
      setSections((prev) =>
        prev.map((s) => (s.id === activeSectionId ? { ...s, content_html: html, content_json: json } : s))
      );

      // Trigger debounced auto-save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveSectionContent(activeSectionId, html, json);
      }, 1500);
    },
    // No deps — we manage content sync manually in the effect below.
  });

  // Load section content when active section changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (!activeSection) return;
    if (activeSection.id !== activeSectionId) return;
    try {
      if (editor.getHTML() !== activeSection.content_html) {
        editor.commands.setContent(activeSection.content_html || '');
      }
    } catch {
      // Editor not ready yet (TipTap schema still loading) — wait for next render.
    }
  }, [activeSectionId, editor, activeSection]);

  // Safe wrapper for editor commands — guards against destroyed / null editor
  // so toolbar buttons don't crash mid-render when sections are swapped quickly.
  const safeEditorRun = (fn: () => void) => {
    if (!editor || editor.isDestroyed) return;
    try {
      fn();
    } catch {
      // Swallow transient TipTap errors during section transitions.
    }
  };

  // Clean up timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // 3. Save Section Content API
  const saveSectionContent = async (sectionId: string, html: string, json: any) => {
    try {
      setSaving(true);
      await fetch(`/api/mobile/documents/${documentId}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: html, content_json: json }),
      });
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // 4. Update Document Settings (Font, Margins, Spacing, Cover fields)
  const updateSettings = async (updates: Partial<Document>) => {
    if (!document) return;
    const oldDocument = document;
    const newDocument = { ...document, ...updates } as Document;
    setDocument(newDocument);

    try {
      setSaving(true);
      const res = await fetch(`/api/mobile/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
    } catch {
      setDocument(oldDocument); // rollback
    } finally {
      setSaving(false);
    }
  };

  // 5. Add New Section
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      setSaving(true);
      const nextSortOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order)) + 1 : 0;
      const res = await fetch(`/api/mobile/documents/${documentId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSectionTitle, sort_order: nextSortOrder }),
      });

      if (!res.ok) throw new Error('Impossible d\'ajouter la section.');
      const data = await res.json();
      setSections([...sections, data.section]);
      setActiveSectionId(data.section.id);
      setNewSectionTitle('');
      setShowAddSection(false);
    } catch (err: any) {
      ssrAlert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 6. Delete Section
  const handleDeleteSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    if (section.is_system) {
      ssrAlert('Cette section est obligatoire pour le modèle et ne peut pas être supprimée.');
      return;
    }

    if (!ssrConfirm(`Supprimer la section "${section.title}" ?`)) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/mobile/documents/${documentId}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      const newSections = sections.filter(s => s.id !== sectionId);
      setSections(newSections);
      if (activeSectionId === sectionId && newSections.length > 0) {
        setActiveSectionId(newSections[0].id);
      }
    } catch {
      ssrAlert('Impossible de supprimer la section.');
    } finally {
      setSaving(false);
    }
  };

  // 6.5 Onboarding Chatbot Logic
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user' as const, content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/mobile/documents/onboard-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          documentType: document?.template_type ?? 'stage'
        }),
      });

      if (!res.ok) throw new Error('Impossible de contacter l\'IA.');
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      ssrAlert(err.message || 'Une erreur est survenue.');
    } finally {
      setChatLoading(false);
    }
  };

  const generateFullDocument = async () => {
    if (chatMessages.length < 2) {
      ssrAlert('Commencez à discuter pour donner quelques informations d\'onboarding à l\'IA.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/mobile/documents/generate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          documentId,
          documentType: document?.template_type ?? 'stage'
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la génération.');
      }

      ssrAlert('Rédaction complète réussie ! Rechargement des sections...');
      // Reload document sections
      const reloadRes = await fetch(`/api/mobile/documents/${documentId}`);
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        setSections(data.sections);
        if (data.sections.length > 0) {
          setActiveSectionId(data.sections[0].id);
        }
      }
      setLeftTab('sections'); // Swtich tab to preview sections
    } catch (err: any) {
      ssrAlert(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 6.7 Interactive Image Placeholder Handlers
  //
  // The placeholder is now a real TipTap node (ImagePlaceholder extension).
  // Clicking it opens a file picker; we resolve the clicked node's ProseMirror
  // position and use setUploadedSrc to swap it for the uploaded image.
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // The DOM may contain either a fresh placeholder (the one rendered by our
    // extension) or an uploaded figure. We treat both as "open picker".
    const placeholder = target.closest('.image-placeholder') as HTMLElement | null;
    if (!placeholder || !editor || editor.isDestroyed) return;

    // Walk up to the nearest ProseMirror node DOM element to find the position.
    // We use a small heuristic: scan the doc to find a node whose DOM matches.
    const dom = placeholder.closest('[data-node]') as HTMLElement | null;
    if (!dom) {
      // Fallback: just open the picker. The user can still replace via toolbar.
      clickedPlaceholderRef.current = placeholder;
      fileInputRef.current?.click();
      return;
    }
    const pos = editor.view.posAtDOM(dom, 0);
    clickedPlaceholderRef.current = placeholder;
    (clickedPlaceholderRef.current as any).__pos = pos;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor || editor.isDestroyed) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const pos = (clickedPlaceholderRef.current as any)?.__pos as number | undefined;

      if (typeof pos === 'number' && pos >= 0) {
        editor.commands.setUploadedSrc(pos, base64);
      } else if (clickedPlaceholderRef.current) {
        // Fallback: insert as a new image node (legacy path).
        editor.commands.insertContent(`<img src="${base64}" alt="Image" />`);
      }

      clickedPlaceholderRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // 7. AI Operations
  const runAiAssistant = async (action: 'draft' | 'improve') => {
    if (!aiPrompt.trim()) return;
    const sectionTitle = activeSection?.title || 'Section';
    let textToImprove: string | undefined = undefined;
    if (action === 'improve' && editor && !editor.isDestroyed && editor.state?.doc) {
      try {
        const { from, to } = editor.state.selection;
        textToImprove = editor.state.doc.textBetween(from, to, ' ');
      } catch {
        textToImprove = undefined;
      }
    }

    if (action === 'improve' && !textToImprove) {
      ssrAlert('Veuillez d\'abord surbriller ou sélectionner du texte dans l\'éditeur pour l\'améliorer.');
      return;
    }

    try {
      setAiLoading(true);
      const res = await fetch('/api/mobile/documents/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          prompt: aiPrompt,
          text: textToImprove,
          sectionTitle,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur d\'assistant IA.');
      }

      const data = await res.json();
      setAiRemainingCredits(data.remainingCredits);

      if (action === 'draft' && editor) {
        editor.commands.insertContent(data.html);
      } else if (action === 'improve' && editor) {
        editor.commands.insertContent(data.html); // replaces selection
      }

      setAiPrompt('');
      ssrAlert('IA : Contenu inséré avec succès ! (1 crédit IA déduit)');
    } catch (err: any) {
      ssrAlert(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 8. DOCX Exporter
  const handleExportDocx = async () => {
    if (!document) return;

    try {
      const c = document.cover_data;
      const school = c.school || 'Établissement';
      const title = c.title || document.title;
      const subtitle = c.subtitle || '';
      const studentName = c.studentName || '';
      const company = c.company || '';
      const tutorCorporate = c.tutorCorporate || '';
      const tutorAcademic = c.tutorAcademic || '';
      const year = c.year || '';

      const docElements: any[] = [
        // Title page
        new Paragraph({ text: school, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: '\n\n\n\n\n' }),
        new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
        new Paragraph({ text: subtitle, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: '\n\n\n\n\n' }),
        new Paragraph({ text: `Présenté par : ${studentName}` }),
        new Paragraph({ text: `Entreprise d'accueil : ${company}` }),
        new Paragraph({ text: `Maitre de stage : ${tutorCorporate}` }),
        new Paragraph({ text: `Encadreur académique : ${tutorAcademic}` }),
        new Paragraph({ text: `Année académique : ${year}` }),
        new Paragraph({ children: [new PageBreak()] }),
      ];

      sections.forEach((sec) => {
        const lower = sec.title.toLowerCase();
        if (lower === 'page de garde') return;

        docElements.push(new Paragraph({
          text: sec.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }));

        if (lower === 'sommaire') {
          sections
            .filter((s) => s.title.toLowerCase() !== 'page de garde' && s.title.toLowerCase() !== 'sommaire')
            .forEach((s) => {
              docElements.push(new Paragraph({ text: `- ${s.title}` }));
            });
        } else {
          const html = sec.content_html || '';
          if (html.trim()) {
            docElements.push(...htmlToDocxParagraphs(html));
          } else {
            docElements.push(new Paragraph({ text: '...' }));
          }
        }

        docElements.push(new Paragraph({ children: [new PageBreak()] }));
      });

      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: docElements,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `Document_${document.title.replace(/\s+/g, '_')}.docx`;
      a.click();
    } catch (err: any) {
      ssrAlert(`Erreur d'export Word : ${err.message}`);
    }
  };

  // 9. PDF Exporter
  const handleExportPdf = () => {
    window.open(`/api/mobile/documents/${documentId}/export/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-semibold">Chargement de votre éditeur de document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200">
        <div className="max-w-md text-center">
          <p className="text-red-400 font-bold mb-4">Erreur : {error || 'Document introuvable.'}</p>
          <button
            onClick={() => router.push('/admin/analytics')}
            className="rounded bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 transition"
          >
            Retour au Tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-slate-950 text-slate-100 font-sans ${isMobileMode ? 'mobile-webview-override' : ''}`}>
      {/* 1. Header Toolbar */}
      {!isMobileMode && (
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()} 
              className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 hover:bg-slate-700 transition text-slate-300"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-200">{document.title}</h1>
              <p className="text-xs text-slate-400">Modèle {document.template_type.toUpperCase()} • Modifié récemment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Sauvegarde auto...</span>}
            <button 
              onClick={handleExportDocx}
              className="flex items-center gap-2 rounded bg-slate-800 hover:bg-slate-700 transition text-sm font-semibold text-slate-200 px-4 py-2"
            >
              <FileText size={16} /> Exporter Word (.docx)
            </button>
            <button 
              onClick={handleExportPdf}
              className="flex items-center gap-2 rounded bg-emerald-600 hover:bg-emerald-500 transition text-sm font-semibold text-white px-4 py-2"
            >
              <Download size={16} /> Télécharger PDF
            </button>
          </div>
        </header>
      )}

      {/* 2. Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile tab toggle */}
        {isMobileMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex bg-slate-900 border border-slate-800 rounded-full p-1 text-[10px] font-bold shadow-lg">
            <button
              onClick={() => setMobileTab('panel')}
              className={`px-3 py-1 rounded-full transition ${mobileTab === 'panel' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              ⚙️ Panneau
            </button>
            <button
              onClick={() => setMobileTab('editor')}
              className={`px-3 py-1 rounded-full transition ${mobileTab === 'editor' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              ✍️ Éditeur
            </button>
          </div>
        )}

        {/* Left Control Panel - Onboarding Chat, Structure, Cover & Style.
            In mobile mode we hide it when the editor tab is active. */}
        <aside
          className={`${
            isMobileMode
              ? mobileTab === 'panel'
                ? 'flex w-full'
                : 'hidden'
              : 'flex w-[380px]'
          } border-r border-slate-800 bg-slate-900/30 flex-col shrink-0`}
        >
          {/* Tabs Selector */}
          <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/50 p-1 text-[11px] font-bold">
            <button
              onClick={() => setLeftTab('onboarding')}
              className={`py-2 text-center rounded transition-colors ${leftTab === 'onboarding' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              🤖 Chat IA
            </button>
            <button
              onClick={() => setLeftTab('sections')}
              className={`py-2 text-center rounded transition-colors ${leftTab === 'sections' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              📋 Chapitres
            </button>
            <button
              onClick={() => setLeftTab('cover')}
              className={`py-2 text-center rounded transition-colors ${leftTab === 'cover' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              📖 Couverture
            </button>
            <button
              onClick={() => setLeftTab('style')}
              className={`py-2 text-center rounded transition-colors ${leftTab === 'style' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              🎨 Design
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 1. Onboarding Chat Tab */}
            {leftTab === 'onboarding' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 text-xs">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 self-end ml-auto'
                          : 'bg-slate-800 text-slate-300 self-start'
                      }`}
                    >
                      <TextFormatted text={msg.content} />
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="bg-slate-800 p-2.5 rounded-lg max-w-[85%] self-start flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 delay-100"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 delay-200"></div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Répondez ici..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={chatLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 px-3 rounded text-xs font-bold text-white transition"
                    >
                      Envoi
                    </button>
                  </div>
                  <button
                    onClick={generateFullDocument}
                    disabled={aiLoading}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    {aiLoading ? 'Génération en cours...' : '🤖 Rédiger le document à 90% (5 cr)'}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Chapters Tab */}
            {leftTab === 'sections' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections</span>
                  <button
                    onClick={() => setShowAddSection(!showAddSection)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-500 transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {showAddSection && (
                  <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nom du chapitre..."
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={handleAddSection}
                      className="bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded text-xs font-bold"
                    >
                      OK
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {sections.map((sec) => (
                    <div
                      key={sec.id}
                      className={`group flex items-center justify-between rounded px-2.5 py-2 text-xs cursor-pointer transition ${
                        activeSectionId === sec.id
                          ? 'bg-slate-800/80 border-l-2 border-emerald-500 text-slate-100 font-semibold'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                      onClick={() => setActiveSectionId(sec.id)}
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <BookOpen size={12} className={activeSectionId === sec.id ? 'text-emerald-500' : 'text-slate-500'} />
                        {sec.title}
                      </span>
                      {!sec.is_system && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(sec.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Cover page inputs */}
            {leftTab === 'cover' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Établissement / École</label>
                  <input
                    type="text"
                    value={document.cover_data.school || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, school: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Titre du document</label>
                  <input
                    type="text"
                    value={document.cover_data.title || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, title: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Sous-titre</label>
                  <textarea
                    value={document.cover_data.subtitle || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, subtitle: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 h-16 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Étudiant (Nom complet)</label>
                  <input
                    type="text"
                    value={document.cover_data.studentName || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, studentName: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Entreprise d'accueil</label>
                  <input
                    type="text"
                    value={document.cover_data.company || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, company: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Maitre de stage (Entreprise)</label>
                  <input
                    type="text"
                    value={document.cover_data.tutorCorporate || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, tutorCorporate: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Tuteur académique (École)</label>
                  <input
                    type="text"
                    value={document.cover_data.tutorAcademic || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, tutorAcademic: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Année académique</label>
                  <input
                    type="text"
                    value={document.cover_data.year || ''}
                    onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, year: e.target.value } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 4. Design & Style Tab */}
            {leftTab === 'style' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Police de texte</label>
                  <select
                    value={document.font_family}
                    onChange={(e) => updateSettings({ font_family: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Times New Roman">Times New Roman (Classique)</option>
                    <option value="Arial">Arial (Standard)</option>
                    <option value="Inter">Inter (Moderne)</option>
                    <option value="Calibri">Calibri (Microsoft)</option>
                    <option value="Georgia">Georgia (Élégant)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Interligne</label>
                  <select
                    value={document.line_spacing}
                    onChange={(e) => updateSettings({ line_spacing: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="1.15">1.15</option>
                    <option value="1.5">1.5 (Conseillé)</option>
                    <option value="2">2.0 (Double)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Marges de page</label>
                  <select
                    value={document.margins}
                    onChange={(e) => updateSettings({ margins: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="normal">Normale (2.5 cm)</option>
                    <option value="narrow">Étroite (1.5 cm)</option>
                    <option value="wide">Large (3.0 cm)</option>
                  </select>
                </div>

                {/* Theme colors — apply live to H1 / H2 in the preview */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">
                      Couleur primaire (titres H1)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={document.primary_color || '#10B981'}
                        onChange={(e) => updateSettings({ primary_color: e.target.value })}
                        className="h-8 w-10 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={document.primary_color || '#10B981'}
                        onChange={(e) => updateSettings({ primary_color: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">
                      Couleur secondaire (sous-titres H2)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={document.secondary_color || '#64748B'}
                        onChange={(e) => updateSettings({ secondary_color: e.target.value })}
                        className="h-8 w-10 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={document.secondary_color || '#64748B'}
                        onChange={(e) => updateSettings({ secondary_color: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Thème page de garde</label>
                  <select
                    value={document.cover_template}
                    onChange={(e) => updateSettings({ cover_template: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="classic">Classique Universitaire</option>
                    <option value="minimalist">Minimaliste Épuré</option>
                    <option value="tech">Technique Moderne (Sombre)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Central Editor View */}
        <main
          className={`${
            isMobileMode
              ? mobileTab === 'editor'
                ? 'flex w-full'
                : 'hidden'
              : 'flex flex-1'
          } flex-col bg-slate-950 overflow-hidden`}
        >
          {/* Editor Header Toolbar (TipTap action) */}
          {activeSection && activeSection.title.toLowerCase() !== 'page de garde' && activeSection.title.toLowerCase() !== 'sommaire' && editor && (
            <div className="flex h-11 items-center gap-1 border-b border-slate-800 bg-slate-900/30 px-4">
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().toggleBold().run())}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bold') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().toggleItalic().run())}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('italic') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Italic size={16} />
              </button>
              <span className="w-px h-5 bg-slate-800 mx-1"></span>
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Heading1 size={16} />
              </button>
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Heading2 size={16} />
              </button>
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().toggleBulletList().run())}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bulletList') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <List size={16} />
              </button>
              <span className="w-px h-5 bg-slate-800 mx-1"></span>
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().undo().run())}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={() => safeEditorRun(() => editor.chain().focus().redo().run())}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              >
                <Redo size={16} />
              </button>
            </div>
          )}

          {/* Core Content Box — preview applies the user's style choices live */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-900/10">
            <div
              className="w-full max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 shadow-2xl flex flex-col"
              style={{
                // Live preview reflects the user's design choices instantly.
                fontFamily: document.font_family,
                lineHeight: document.line_spacing,
                // Inject the theme colors as CSS variables; consumed by headings.
                // --doc-primary / --doc-secondary are read in the prose CSS below.
                ['--doc-primary' as any]: document.primary_color || '#10B981',
                ['--doc-secondary' as any]: document.secondary_color || '#64748B',
                padding: marginToCss(document.margins),
              }}
            >
              {activeSection ? (
                activeSection.title.toLowerCase() === 'page de garde' ? (
                  // Cover Page Form Editor
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 className="text-lg font-bold text-slate-200">Page de Garde - Informations</h2>
                      <p className="text-xs text-slate-400">Remplissez ces champs pour structurer automatiquement la couverture de votre document.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Établissement / École</label>
                        <input 
                          type="text"
                          value={document.cover_data.school || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, school: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Année Académique</label>
                        <input 
                          type="text"
                          value={document.cover_data.year || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, year: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Titre du Document</label>
                      <input 
                        type="text"
                        value={document.cover_data.title || ''}
                        onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Sujet / Sous-titre</label>
                      <textarea 
                        value={document.cover_data.subtitle || ''}
                        onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, subtitle: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 h-16"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Prénom & Nom Étudiant</label>
                        <input 
                          type="text"
                          value={document.cover_data.studentName || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, studentName: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Entreprise d'Accueil</label>
                        <input 
                          type="text"
                          value={document.cover_data.company || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, company: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Maître de Stage (Entreprise)</label>
                        <input 
                          type="text"
                          value={document.cover_data.tutorCorporate || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, tutorCorporate: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Tuteur Académique (École)</label>
                        <input 
                          type="text"
                          value={document.cover_data.tutorAcademic || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...document.cover_data, tutorAcademic: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : activeSection.title.toLowerCase() === 'sommaire' ? (
                  // Summary Preview
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 className="text-lg font-bold text-slate-200">Table des Matières (Sommaire)</h2>
                      <p className="text-xs text-slate-400">Ce sommaire est généré automatiquement lors de l'exportation finale PDF ou Word.</p>
                    </div>

                    <div className="space-y-4 pt-4 border border-dashed border-slate-800 rounded-lg p-6 bg-slate-950/40">
                      {sections
                        .filter(s => s.title.toLowerCase() !== 'page de garde' && s.title.toLowerCase() !== 'sommaire')
                        .map((s, idx) => (
                          <div key={s.id} className="flex justify-between items-center text-sm text-slate-400 border-b border-slate-900 pb-2">
                            <span>{s.title}</span>
                            <span className="flex-1 border-b border-dotted border-slate-800 mx-3"></span>
                            <span className="text-xs text-slate-500">Page {idx + 3}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  // TipTap Editor Content
                  <div className="flex-1 flex flex-col min-h-[400px]" onClick={handleEditorClick}>
                    <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-slate-800 pb-2">{activeSection.title}</h2>
                    <EditorContent
                      editor={editor}
                      className="flex-1 text-slate-300 leading-relaxed text-base focus:outline-none max-w-none document-editor-prose"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-1 items-center justify-center text-slate-500">
                  Sélectionnez un chapitre à modifier
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - AI Assistant only (Style moved to left "Design" tab).
            Hidden in mobile mode: the AI assistant is reachable from the
            left panel tab, so we keep one pane at a time. */}
        <aside
          className={`${
            isMobileMode ? 'hidden' : 'flex'
          } w-80 border-l border-slate-800 bg-slate-900/20 p-5 flex-col gap-6 overflow-y-auto`}
        >
          {/* AI Assistant Editor Panel */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Sparkles size={16} />
              <h3 className="text-xs font-bold uppercase tracking-wider">Assistant IA Rédacteur</h3>
            </div>
            
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-lg flex-1 flex flex-col justify-between min-h-[220px]">
              <div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Utilise tes crédits IA pour enrichir ton texte. Sélectionne une phrase à modifier ou demande une idée.
                </p>
                <textarea 
                  placeholder="Décris ce que tu veux rédiger ou la consigne d'amélioration (ex: 'Reformule ça de manière professionnelle', 'Rédige un paragraphe de conclusion sur...')"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 h-24 resize-none"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/50">
                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                  <span>Coût : 1 crédit IA</span>
                  {aiRemainingCredits !== null && <span>Restant : {aiRemainingCredits} cr</span>}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => runAiAssistant('draft')}
                    disabled={aiLoading}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 transition text-[11px] font-bold text-slate-950 py-2 rounded flex items-center justify-center gap-1"
                  >
                    {aiLoading ? 'Rdaction...' : 'Rédiger brouillon'}
                  </button>
                  <button 
                    onClick={() => runAiAssistant('improve')}
                    disabled={aiLoading}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 border border-amber-600/30 transition text-[11px] font-bold text-slate-200 py-2 rounded flex items-center justify-center gap-1"
                  >
                    {aiLoading ? 'Amélioration...' : 'Améliorer sélection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Toolbar Fallback (for WebViews) */}
      {isMobileMode && (
        <div className="h-14 border-t border-slate-800 bg-slate-900 flex items-center justify-around px-4">
          <button 
            onClick={handleExportDocx}
            className="flex flex-col items-center justify-center text-[10px] text-slate-400 font-semibold hover:text-slate-200"
          >
            <FileText size={16} className="mb-0.5 text-slate-300" /> Word
          </button>
          <button 
            onClick={handleExportPdf}
            className="flex flex-col items-center justify-center text-[10px] text-slate-400 font-semibold hover:text-slate-200"
          >
            <Download size={16} className="mb-0.5 text-emerald-400" /> PDF
          </button>
        </div>
      )}
    </div>
  );
}

function TextFormatted({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, idx) => (
        <p key={idx} className="min-h-[1.2em]">
          {line}
        </p>
      ))}
    </div>
  );
}
