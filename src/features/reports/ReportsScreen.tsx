import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, Pressable, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';

import { authFetch, type StudentAccount } from '../auth/betterAuth';

const REPORT_PRICE = 3000;

type Report = {
  id: string;
  title: string;
  description?: string;
  template_type: string;
  created_at: string;
  updated_at: string;
};

type ReportsScreenProps = {
  onEditReport: (id: string) => void;
  balance: number;
  reportCredits: number;
  subscriptionTier: 'free' | 'basic' | 'premium';
  onRefreshAccount: () => void;
};

export function ReportsScreen({
  onEditReport,
  balance,
  reportCredits,
  subscriptionTier,
  onRefreshAccount,
}: ReportsScreenProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplate, setNewTemplate] = useState<'stage' | 'memoire' | 'blank'>('stage');
  const [creating, setCreating] = useState(false);

  // Insufficient balance modal
  const [insufficientModal, setInsufficientModal] = useState(false);

  const isSubscriber = subscriptionTier === 'basic' || subscriptionTier === 'premium';
  const hasFreeCredit = reportCredits > 0;

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch('/api/mobile/reports');
      if (!res.ok) throw new Error('Impossible de récupérer vos rapports.');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour votre rapport.');
      return;
    }

    // Check: does user have free credits?
    if (!hasFreeCredit && balance < REPORT_PRICE) {
      setCreateModalVisible(false);
      setInsufficientModal(true);
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/mobile/reports', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          templateType: newTemplate,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 402) {
          // Insufficient balance
          setInsufficientModal(true);
          return;
        }
        throw new Error(data.error || 'Impossible de créer le rapport.');
      }

      setNewTitle('');
      setNewDesc('');
      setNewTemplate('stage');
      setCreateModalVisible(false);
      await fetchReports();
      onRefreshAccount(); // sync updated credits/balance
      if (data.report?.id) {
        onEditReport(data.report.id);
      }
    } catch (err: any) {
      Alert.alert('Erreur de création', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (reportId: string, title: string) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authFetch(`/api/mobile/reports/${reportId}`, { method: 'DELETE' });
              if (!res.ok) throw new Error();
              setReports((prev) => prev.filter((r) => r.id !== reportId));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer le rapport.');
            }
          },
        },
      ]
    );
  };

  const templateLabels: Record<string, string> = {
    stage: 'Rapport de stage',
    memoire: 'Mémoire de recherche',
    blank: 'Document personnalisé',
  };

  return (
    <View style={styles.container}>
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>📝 Éditeur de Rapports</Text>
          <Text style={styles.heroDesc}>
            Rédige ton rapport de stage ou mémoire avec un assistant IA intégré.
          </Text>

          {/* Pricing / credits info */}
          <View style={styles.creditBadge}>
            {hasFreeCredit ? (
              <>
                <Text style={styles.creditBadgeText}>🎁 {reportCredits} rapport{reportCredits > 1 ? 's' : ''} gratuit{reportCredits > 1 ? 's' : ''}</Text>
              </>
            ) : (
              <>
                <Text style={styles.creditBadgeText}>💰 {REPORT_PRICE} C par rapport</Text>
              </>
            )}
            {isSubscriber && (
              <View style={styles.subscriberBadge}>
                <Text style={styles.subscriberBadgeText}>⭐ {subscriptionTier === 'premium' ? 'Premium' : 'Basic'}</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.createButton, !hasFreeCredit && balance < REPORT_PRICE && styles.createButtonDisabled]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ Nouveau</Text>
        </Pressable>
      </View>

      {/* ── Section Title ─────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mes documents</Text>
        <Text style={styles.sectionCount}>{reports.length} rapport{reports.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* ── Content ──────────────────────────────────────────── */}
      {loading && reports.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchReports}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>Aucun rapport créé</Text>
          <Text style={styles.emptyText}>
            {hasFreeCredit
              ? 'Tu as des crédits gratuits — crée ton premier rapport maintenant !'
              : 'Crée ton premier rapport pour 3 000 C.'}
          </Text>
          <Pressable style={styles.emptyCreateBtn} onPress={() => setCreateModalVisible(true)}>
            <Text style={styles.emptyCreateBtnText}>Commencer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {reports.map((report) => {
            const dateStr = new Date(report.updated_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });

            return (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.cardTop}>
                  <View style={styles.templateChip}>
                    <Text style={styles.templateChipText}>
                      {templateLabels[report.template_type] ?? 'Rapport'}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>{dateStr}</Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>{report.title}</Text>
                {report.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{report.description}</Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.editBtn}
                    onPress={() => onEditReport(report.id)}
                  >
                    <Text style={styles.editBtnText}>✏️ Modifier</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(report.id, report.title)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Create Report Modal ─────────────────────────────────── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => !creating && setCreateModalVisible(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Nouveau rapport</Text>
              {!creating && (
                <Pressable onPress={() => setCreateModalVisible(false)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Credit info strip */}
            <View style={[styles.creditStrip, hasFreeCredit ? styles.creditStripFree : styles.creditStripPaid]}>
              {hasFreeCredit ? (
                <Text style={styles.creditStripText}>
                  🎁 Tu utilises 1 crédit gratuit ({reportCredits - 1} restant{reportCredits - 1 !== 1 ? 's' : ''})
                </Text>
              ) : (
                <Text style={styles.creditStripText}>
                  💰 Coût : {REPORT_PRICE} C (solde : {balance.toLocaleString()} C)
                </Text>
              )}
            </View>

            <Text style={styles.inputLabel}>Titre du document</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Rapport de stage - Informatique"
              placeholderTextColor="#64748B"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Description (optionnel)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Ex: Stage chez NextGen Tech, parcours GI..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={2}
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <Text style={styles.inputLabel}>Modèle de structure</Text>
            <View style={styles.templatesRow}>
              {[
                { key: 'stage', label: 'Rapport Stage', emoji: '🏢' },
                { key: 'memoire', label: 'Mémoire', emoji: '🎓' },
                { key: 'blank', label: 'Personnalisé', emoji: '📋' },
              ].map((t) => (
                <Pressable
                  key={t.key}
                  style={[
                    styles.templateCard,
                    newTemplate === t.key && styles.templateCardActive,
                  ]}
                  onPress={() => setNewTemplate(t.key as typeof newTemplate)}
                >
                  <Text style={styles.templateEmoji}>{t.emoji}</Text>
                  <Text style={[
                    styles.templateLabel,
                    newTemplate === t.key && styles.templateLabelActive,
                  ]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, creating && styles.confirmBtnDisabled]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {hasFreeCredit ? 'Créer (gratuit)' : `Créer (${REPORT_PRICE} C)`}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Insufficient Balance Modal ─────────────────────────── */}
      <Modal
        visible={insufficientModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInsufficientModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setInsufficientModal(false)}>
          <View style={[styles.modalCard, styles.insufficientCard]} onStartShouldSetResponder={() => true}>
            <Text style={styles.insufficientIcon}>💸</Text>
            <Text style={styles.insufficientTitle}>Solde insuffisant</Text>
            <Text style={styles.insufficientText}>
              Tu as besoin de <Text style={styles.insufficientBold}>{REPORT_PRICE.toLocaleString()} C</Text> pour créer un rapport.
              {'\n'}Solde actuel : <Text style={styles.insufficientBalance}>{balance.toLocaleString()} C</Text>
            </Text>

            {isSubscriber ? (
              <View style={styles.subInfoBox}>
                <Text style={styles.subInfoText}>⭐ Tu es abonné — recharge ton wallet pour continuer.</Text>
              </View>
            ) : (
              <View style={styles.subInfoBox}>
                <Text style={styles.subInfoText}>
                  💡abonnes-toi pour bénéficier de crédits gratuits каждый mois !
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setInsufficientModal(false)}>
                <Text style={styles.cancelBtnText}>Plus tard</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={() => {
                setInsufficientModal(false);
                // Open recharge — this will be handled by parent
              }}>
                <Text style={styles.confirmBtnText}>Recharger wallet</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },

  // Hero
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  heroLeft: { flex: 1 },
  heroTitle: {
    color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginBottom: 4,
  },
  heroDesc: {
    color: '#94A3B8', fontSize: 12, lineHeight: 17, marginBottom: 10,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  creditBadgeText: {
    backgroundColor: '#10B981',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  subscriberBadge: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  subscriberBadgeText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '700',
  },
  heroRight: {},
  createButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  createButtonDisabled: {
    backgroundColor: '#475569',
  },
  createButtonText: {
    color: '#fff', fontSize: 14, fontWeight: '800',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#1E293B', fontSize: 16, fontWeight: '800',
  },
  sectionCount: {
    color: '#94A3B8', fontSize: 12, fontWeight: '600',
  },

  // Center states
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 60,
  },
  loadingText: {
    color: '#64748B', fontSize: 14, fontWeight: '600',
  },
  errorIcon: { fontSize: 40 },
  errorText: {
    color: '#EF4444', fontSize: 14, textAlign: 'center', paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    color: '#1E293B', fontSize: 17, fontWeight: '800',
  },
  emptyText: {
    color: '#64748B', fontSize: 13, textAlign: 'center',
    paddingHorizontal: 30, lineHeight: 19,
  },
  emptyCreateBtn: {
    backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCreateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // List
  listContainer: { gap: 14, paddingBottom: 40 },

  // Report card
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  templateChipText: {
    color: '#2563EB', fontSize: 11, fontWeight: '700',
  },
  cardDate: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  cardTitle: {
    color: '#1E293B', fontSize: 15, fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#64748B', fontSize: 12, lineHeight: 17, marginBottom: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    width: 44,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 16 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    color: '#1E293B', fontSize: 18, fontWeight: '800',
  },
  modalClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { color: '#64748B', fontSize: 14, fontWeight: '700' },

  // Credit strip
  creditStrip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  creditStripFree: { backgroundColor: '#D1FAE5' },
  creditStripPaid: { backgroundColor: '#FEF3C7' },
  creditStripText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Input
  inputLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 6, marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1E293B',
    marginBottom: 12,
  },
  textArea: { height: 72, textAlignVertical: 'top' },

  // Template cards
  templatesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  templateCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    gap: 6,
  },
  templateCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  templateEmoji: { fontSize: 20 },
  templateLabel: {
    fontSize: 11, fontWeight: '600', color: '#64748B', textAlign: 'center',
  },
  templateLabelActive: { color: '#2563EB', fontWeight: '700' },

  // Modal buttons
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  confirmBtn: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#A7F3D0' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Insufficient modal
  insufficientCard: { alignItems: 'center', gap: 12 },
  insufficientIcon: { fontSize: 52 },
  insufficientTitle: {
    color: '#1E293B', fontSize: 20, fontWeight: '800',
  },
  insufficientText: {
    color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20,
  },
  insufficientBold: { color: '#EF4444', fontWeight: '800' },
  insufficientBalance: { color: '#1E293B', fontWeight: '700' },
  subInfoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    width: '100%',
  },
  subInfoText: {
    color: '#2563EB', fontSize: 13, textAlign: 'center',
    fontWeight: '600',
  },
});
