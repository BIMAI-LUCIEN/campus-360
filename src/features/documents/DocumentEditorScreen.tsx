/**
 * Native Report & Thesis Editor — Campus 360
 * 100% Native, reliable, high-performance editor with instant typing,
 * working formatting toolbar, AI assistant, and clean modern styling.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, Pressable, SafeAreaView, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
  Platform, KeyboardAvoidingView
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { authFetch } from '../auth/betterAuth';
import { stitchColors } from '../../theme/stitch';
import { EditorAiChat } from './EditorAiChat';
import {
  Sparkles, Bold, Italic, Underline, Heading2, Heading3,
  List, ListOrdered, Table, Lightbulb, Network, Send,
  ArrowLeft, Plus, Trash2
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

// Clean HTML to plain text for native editing
function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Convert plain/markdown text to structured HTML for export
function plainTextToHtml(text: string): string {
  if (!text || !text.trim()) return '<p><br></p>';
  const blocks = text.split(/\n\n+/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) {
      return `<h2>${trimmed.slice(3).trim()}</h2>`;
    }
    if (trimmed.startsWith('### ')) {
      return `<h3>${trimmed.slice(4).trim()}</h3>`;
    }
    if (trimmed.startsWith('> ')) {
      return `<blockquote style="margin: 16px 0; padding: 12px 16px; background: #F8FAFC; border-left: 4px solid #4F46E5; font-style: italic; color: #334155; border-radius: 0 8px 8px 0;">${trimmed.slice(2).trim()}</blockquote>`;
    }
    if (trimmed.includes('|') && trimmed.includes('\n')) {
      return `<div style="margin: 14px 0; overflow-x: auto;">${trimmed}</div>`;
    }
    let formatted = trimmed
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return `<p>${formatted}</p>`;
  }).join('\n');
}

export function DocumentEditorScreen({ documentId, onClose, subscriptionTier, onUpgrade }: DocumentEditorScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Document | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Content for current editable section
  const [sectionText, setSectionText] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

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

  const textInputRef = useRef<TextInput | null>(null);

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
        setSectionText(htmlToPlainText(currentSec?.content_html || ''));
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
      saveSectionContent(currentSectionId, sectionText);
    }
    setCurrentSectionId(sectionId);
    const sec = sections.find(s => s.id === sectionId);
    setSectionText(htmlToPlainText(sec?.content_html || ''));
    setSelection({ start: 0, end: 0 });
  };

  // Debounced auto-save for current section text
  const handleTextChange = (text: string) => {
    setSectionText(text);
    if (!currentSectionId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveSectionContent(currentSectionId, text);
    }, 1200);
  };

  const saveSectionContent = async (secId: string, textToSave: string) => {
    setSaving(true);
    try {
      const htmlContent = plainTextToHtml(textToSave);
      const res = await authFetch(`/api/mobile/documents/${documentId}/sections/${secId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: htmlContent }),
      });
      if (res.ok) {
        setSections(prev => prev.map(s => s.id === secId ? { ...s, content_html: htmlContent } : s));
      }
    } catch (e) {
      console.warn('Auto-save error:', e);
    } finally {
      setSaving(false);
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

  // Toolbar action helpers that actually work directly on the text!
  const applyFormatting = (type: 'bold' | 'italic' | 'underline' | 'h2' | 'h3' | 'ul' | 'ol' | 'table' | 'callout' | 'diagram') => {
    const { start, end } = selection;
    const before = sectionText.substring(0, start);
    const selected = sectionText.substring(start, end);
    const after = sectionText.substring(end);

    let newText = sectionText;

    switch (type) {
      case 'bold': {
        const text = selected || 'texte en gras';
        newText = `${before}**${text}**${after}`;
        break;
      }
      case 'italic': {
        const text = selected || 'texte en italique';
        newText = `${before}*${text}*${after}`;
        break;
      }
      case 'underline': {
        const text = selected || 'texte souligné';
        newText = `${before}<u>${text}</u>${after}`;
        break;
      }
      case 'h2': {
        const heading = selected || 'Titre de Section';
        newText = `${before}\n\n## ${heading}\n\n${after}`;
        break;
      }
      case 'h3': {
        const heading = selected || 'Sous-Titre';
        newText = `${before}\n\n### ${heading}\n\n${after}`;
        break;
      }
      case 'ul': {
        newText = `${before}\n- ${selected || 'Élément de liste'}\n${after}`;
        break;
      }
      case 'ol': {
        newText = `${before}\n1. ${selected || 'Premier point'}\n${after}`;
        break;
      }
      case 'callout': {
        newText = `${before}\n\n> **Remarque académique :** ${selected || 'Précision méthodologique importante pour le jury.'}\n\n${after}`;
        break;
      }
      case 'table': {
        const tableBlock = `\n\n| Critère d'Analyse | Description Technique | Validation |\n| :--- | :--- | :--- |\n| Architecture | Microservices & Base Postgres | Conforme |\n| Sécurité | Tokens chiffrés JWT | Validé |\n\n`;
        newText = `${before}${tableBlock}${after}`;
        break;
      }
      case 'diagram': {
        const diagramBlock = `\n\n[Schéma : Architecture Technique Système]\n(Couche Client Mobile) <---> (Serveur API Next.js) <---> (PostgreSQL Pool)\n\n`;
        newText = `${before}${diagramBlock}${after}`;
        break;
      }
    }

    handleTextChange(newText);
    textInputRef.current?.focus();
  };

  // AI Prompt generation
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

      const generatedPlainText = htmlToPlainText(data.html || data.text || '');
      if (generatedPlainText) {
        const updated = sectionText
          ? `${sectionText}\n\n${generatedPlainText}`
          : generatedPlainText;
        handleTextChange(updated);
        setAiPrompt('');
        Alert.alert('✨ IA', 'Contenu généré et inséré avec succès !');
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

  const wordCount = sectionText.trim() ? sectionText.trim().split(/\s+/).length : 0;

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

      {/* ── Workspace Area (Cover Form vs Native Text Editor) ────────── */}
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
          /* ── 3. NATIVE TEXT EDITOR (SECTIONS ACADÉMIQUES) ─────────────── */
          <View style={styles.editorFlex}>
            {/* Formatting Toolbar — 100% Native & Functional */}
            <View style={styles.toolbar}>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('bold')}>
                <Bold size={16} color="#F8FAFC" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('italic')}>
                <Italic size={16} color="#F8FAFC" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('underline')}>
                <Underline size={16} color="#F8FAFC" />
              </Pressable>

              <View style={styles.toolDivider} />

              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('h2')}>
                <Heading2 size={16} color="#818CF8" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('h3')}>
                <Heading3 size={16} color="#818CF8" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('ul')}>
                <List size={16} color="#F8FAFC" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('ol')}>
                <ListOrdered size={16} color="#F8FAFC" />
              </Pressable>

              <View style={styles.toolDivider} />

              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('table')}>
                <Table size={16} color="#34D399" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('callout')}>
                <Lightbulb size={16} color="#FBBF24" />
              </Pressable>
              <Pressable style={styles.toolBtn} onPress={() => applyFormatting('diagram')}>
                <Network size={16} color="#38BDF8" />
              </Pressable>
            </View>

            {/* Quick AI Suggestions & Section Header */}
            <View style={styles.editorMetaRow}>
              <Text style={styles.currentSectionTitle}>{currentTitle}</Text>
              <Text style={styles.wordCountBadge}>{wordCount} mots</Text>
            </View>

            {/* Main Native TextInput Area */}
            <View style={styles.textInputBox}>
              <TextInput
                ref={textInputRef}
                style={styles.nativeEditorInput}
                multiline
                textAlignVertical="top"
                placeholder="Rédigez votre texte ici... Utilisez la barre d'outils au-dessus pour structurer vos paragraphes, tableaux et citations."
                placeholderTextColor="#64748B"
                value={sectionText}
                onChangeText={handleTextChange}
                onSelectionChange={e => setSelection(e.nativeEvent.selection)}
                autoCorrect={false}
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
            const added = htmlToPlainText(html);
            handleTextChange(sectionText ? `${sectionText}\n\n${added}` : added);
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

  // Native Text Editor
  editorFlex: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 90,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 8,
    marginBottom: 10,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#182030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 2,
  },
  editorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  currentSectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  wordCountBadge: {
    color: '#64748B',
    fontSize: 12,
  },
  textInputBox: {
    flex: 1,
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
  },
  nativeEditorInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 24,
  },
  aiDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
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
