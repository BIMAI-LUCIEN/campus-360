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
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';

import { authClient } from '@/lib/auth-client';

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

type Report = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  font_family: string;
  line_spacing: number;
  margins: string;
  cover_template: string;
  cover_data: Record<string, any>;
};

type ReportSection = {
  id: string;
  title: string;
  content_html: string;
  content_json?: any;
  sort_order: number;
  is_system: boolean;
};

export default function ReportEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobileMode = searchParams.get('mode') === 'mobile';

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [report, setReport] = useState<Report | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
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

  // Debounced auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Report and Sections
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
        const res = await fetch(`/api/mobile/reports/${reportId}`);
        if (!res.ok) {
          // 404 means the report doesn't exist yet — likely a /new hit.
          // Surface a friendly error instead of looping on the loader.
          if (res.status === 404) {
            setError(`Rapport "${reportId}" introuvable. Il a peut-être été supprimé, ou l'identifiant est invalide.`);
          } else {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Impossible de charger le rapport (HTTP ${res.status}).`);
          }
          return;
        }
        const data = await res.json();
        setReport(data.report);
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
  }, [reportId, session, sessionLoading, router, isMobileMode]);

  const activeSection = sections.find((s) => s.id === activeSectionId);

  // 2. Initialize TipTap Editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: activeSection?.content_html || '',
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
  }, [activeSectionId]);

  // Load section content when active section changes
  useEffect(() => {
    if (editor && activeSection && activeSection.id === activeSectionId) {
      if (editor.getHTML() !== activeSection.content_html) {
        editor.commands.setContent(activeSection.content_html);
      }
    }
  }, [activeSectionId, editor, activeSection]);

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
      await fetch(`/api/mobile/reports/${reportId}/sections/${sectionId}`, {
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

  // 4. Update Report Settings (Font, Margins, Spacing, Cover fields)
  const updateSettings = async (updates: Partial<Report>) => {
    if (!report) return;
    const oldReport = report;
    const newReport = { ...report, ...updates } as Report;
    setReport(newReport);

    try {
      setSaving(true);
      const res = await fetch(`/api/mobile/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
    } catch {
      setReport(oldReport); // rollback
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
      const res = await fetch(`/api/mobile/reports/${reportId}/sections`, {
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
      const res = await fetch(`/api/mobile/reports/${reportId}/sections/${sectionId}`, {
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

  // 7. AI Operations
  const runAiAssistant = async (action: 'draft' | 'improve') => {
    if (!aiPrompt.trim()) return;
    const sectionTitle = activeSection?.title || 'Section';
    const textToImprove = action === 'improve' && editor ? editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' '
    ) : undefined;

    if (action === 'improve' && !textToImprove) {
      ssrAlert('Veuillez d\'abord surbriller ou sélectionner du texte dans l\'éditeur pour l\'améliorer.');
      return;
    }

    try {
      setAiLoading(true);
      const res = await fetch('/api/mobile/reports/ai', {
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
    if (!report) return;

    try {
      const c = report.cover_data;
      const school = c.school || 'Établissement';
      const title = c.title || report.title;
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

      // Parse and map html nodes to docx elements
      sections.forEach((sec) => {
        const lower = sec.title.toLowerCase();
        if (lower === 'page de garde') return;

        docElements.push(new Paragraph({
          text: sec.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }));

        if (lower === 'sommaire') {
          sections.filter(s => s.title.toLowerCase() !== 'page de garde' && s.title.toLowerCase() !== 'sommaire')
            .forEach(s => {
              docElements.push(new Paragraph({ text: `- ${s.title}` }));
            });
        } else {
          const content = sec.content_html || '';
          // Strip HTML tags for simplicity in word
          const plainText = content.replace(/<[^>]+>/g, '').trim();
          if (plainText) {
            docElements.push(new Paragraph({ text: plainText }));
          } else {
            docElements.push(new Paragraph({ text: '...' }));
          }
        }

        docElements.push(new Paragraph({ children: [new PageBreak()] }));
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: docElements,
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_${report.title.replace(/\s+/g, '_')}.docx`;
      a.click();
    } catch (err: any) {
      ssrAlert(`Erreur d'export Word : ${err.message}`);
    }
  };

  // 9. PDF Exporter
  const handleExportPdf = () => {
    window.open(`/api/mobile/reports/${reportId}/export/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-semibold">Chargement de votre éditeur de rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200">
        <div className="max-w-md text-center">
          <p className="text-red-400 font-bold mb-4">Erreur : {error || 'Rapport introuvable.'}</p>
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
              <h1 className="text-base font-bold text-slate-200">{report.title}</h1>
              <p className="text-xs text-slate-400">Modèle {report.template_type.toUpperCase()} • Modifié récemment</p>
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
        {/* Left Sidebar - Plan/Structure */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/20 flex flex-col">
          <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan du rapport</span>
            <button 
              onClick={() => setShowAddSection(!showAddSection)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 transition text-emerald-500"
            >
              <Plus size={16} />
            </button>
          </div>

          {showAddSection && (
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex gap-2">
              <input 
                type="text" 
                placeholder="Titre de la section..."
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button 
                onClick={handleAddSection}
                className="bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded text-xs font-bold"
              >
                Ajouter
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((sec) => (
              <div 
                key={sec.id}
                className={`group flex items-center justify-between rounded px-3 py-2.5 text-sm cursor-pointer transition ${
                  activeSectionId === sec.id 
                    ? 'bg-slate-800/80 border-l-2 border-emerald-500 text-slate-100 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
                onClick={() => setActiveSectionId(sec.id)}
              >
                <span className="truncate flex items-center gap-2">
                  <BookOpen size={14} className={activeSectionId === sec.id ? 'text-emerald-500' : 'text-slate-500'} />
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
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Central Editor View */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Editor Header Toolbar (TipTap action) */}
          {activeSection && activeSection.title.toLowerCase() !== 'page de garde' && activeSection.title.toLowerCase() !== 'sommaire' && editor && (
            <div className="flex h-11 items-center gap-1 border-b border-slate-800 bg-slate-900/30 px-4">
              <button 
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bold') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Bold size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('italic') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Italic size={16} />
              </button>
              <span className="w-px h-5 bg-slate-800 mx-1"></span>
              <button 
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Heading1 size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Heading2 size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bulletList') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <List size={16} />
              </button>
              <span className="w-px h-5 bg-slate-800 mx-1"></span>
              <button 
                onClick={() => editor.chain().focus().undo().run()}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              >
                <Undo size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().redo().run()}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              >
                <Redo size={16} />
              </button>
            </div>
          )}

          {/* Core Content Box */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-900/10">
            <div className="w-full max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 shadow-2xl flex flex-col">
              {activeSection ? (
                activeSection.title.toLowerCase() === 'page de garde' ? (
                  // Cover Page Form Editor
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 className="text-lg font-bold text-slate-200">Page de Garde - Informations</h2>
                      <p className="text-xs text-slate-400">Remplissez ces champs pour structurer automatiquement la couverture de votre rapport.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Établissement / École</label>
                        <input 
                          type="text"
                          value={report.cover_data.school || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, school: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Année Académique</label>
                        <input 
                          type="text"
                          value={report.cover_data.year || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, year: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Titre du Rapport</label>
                      <input 
                        type="text"
                        value={report.cover_data.title || ''}
                        onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, title: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Sujet / Sous-titre</label>
                      <textarea 
                        value={report.cover_data.subtitle || ''}
                        onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, subtitle: e.target.value } })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 h-16"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Prénom & Nom Étudiant</label>
                        <input 
                          type="text"
                          value={report.cover_data.studentName || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, studentName: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Entreprise d'Accueil</label>
                        <input 
                          type="text"
                          value={report.cover_data.company || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, company: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Maître de Stage (Entreprise)</label>
                        <input 
                          type="text"
                          value={report.cover_data.tutorCorporate || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, tutorCorporate: e.target.value } })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Tuteur Académique (École)</label>
                        <input 
                          type="text"
                          value={report.cover_data.tutorAcademic || ''}
                          onChange={(e) => updateSettings({ cover_data: { ...report.cover_data, tutorAcademic: e.target.value } })}
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
                  <div className="flex-1 flex flex-col min-h-[400px]">
                    <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-slate-800 pb-2">{activeSection.title}</h2>
                    <EditorContent editor={editor} className="flex-1 text-slate-300 font-serif leading-relaxed text-base focus:outline-none prose prose-invert max-w-none" />
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

        {/* Right Sidebar - Styling & AI Assistant */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/20 p-5 flex flex-col gap-6 overflow-y-auto">
          {/* Style Configuration */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Settings2 size={16} />
              <h3 className="text-xs font-bold uppercase tracking-wider">Mise en forme</h3>
            </div>
            
            <div className="space-y-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-lg">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase">Police de texte</label>
                <select 
                  value={report.font_family}
                  onChange={(e) => updateSettings({ font_family: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Times New Roman">Times New Roman (Classique)</option>
                  <option value="Arial">Arial (Standard)</option>
                  <option value="Inter">Inter (Moderne)</option>
                  <option value="Calibri">Calibri (Microsoft)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase">Interligne</label>
                <select 
                  value={report.line_spacing}
                  onChange={(e) => updateSettings({ line_spacing: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="1.15">1.15</option>
                  <option value="1.5">1.5 (Conseillé)</option>
                  <option value="2">2.0 (Double)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase">Marges de page</label>
                <select 
                  value={report.margins}
                  onChange={(e) => updateSettings({ margins: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="normal">Normale (2.5 cm)</option>
                  <option value="narrow">Étroite (1.5 cm)</option>
                  <option value="wide">Large (3.0 cm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase">Thème page de garde</label>
                <select 
                  value={report.cover_template}
                  onChange={(e) => updateSettings({ cover_template: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="classic">Classique Universitaire</option>
                  <option value="minimalist">Minimaliste Épuré</option>
                  <option value="tech">Technique Moderne (Sombre)</option>
                </select>
              </div>
            </div>
          </div>

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
