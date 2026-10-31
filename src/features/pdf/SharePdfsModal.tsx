import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, FileText, Square, Upload, X } from 'lucide-react-native';

import { SecondaryButton, SiennaButton } from '../../ui/GlassComponents';
import { fontFamilies, stitchColors, stitchRadius, stitchSpacing } from '../../theme/stitch';
import { ContributionStatusChip } from './ContributionStatus';
import {
  MAX_FILES,
  newBatchId,
  pickPdfs,
  updateContributionSheet,
  uploadContribution,
  type Contribution,
  type ContributionSheet,
  type PickedPdf,
} from './contributionsApi';

type Row = { key: string; file: PickedPdf; progress: number; upload: Contribution | null; error: string | null };

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenContributions: () => void;
  onOpenDocument?: (documentId: string) => void;
};

// "Partager des PDF" (Module 27): up to 10 PDF, analysed and checked for
// duplicates one by one; each published PDF earns 10 coins.
export function SharePdfsModal({ visible, onClose, onOpenContributions, onOpenDocument }: Props) {
  const [rights, setRights] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const reset = () => {
    setRows([]);
    setError(null);
    setRights(false);
  };

  const close = () => {
    if (sending) return;
    reset();
    onClose();
  };

  const chooseAndSend = async () => {
    setError(null);
    let files: PickedPdf[] | null;
    try {
      files = await pickPdfs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sélection impossible.');
      return;
    }
    if (!files) return;
    const batchId = newBatchId();
    const fresh = files.map((file, i) => ({ key: `${batchId}-${i}`, file, progress: 0, upload: null, error: null }));
    setRows(fresh);
    setSending(true);
    // One at a time: each file is compared with the ones already sent in the batch.
    for (const row of fresh) {
      try {
        const upload = await uploadContribution(row.file, batchId, (progress) => patchRow(row.key, { progress }));
        patchRow(row.key, { upload, progress: 1 });
      } catch (e) {
        patchRow(row.key, { error: e instanceof Error ? e.message : 'Envoi impossible.' });
      }
    }
    setSending(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>+10 coins par PDF publié</Text>
              <Text style={styles.title}>Partager des PDF</Text>
            </View>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Fermer">
              <X size={20} color={stitchColors.inkSubtle} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {rows.length === 0 ? (
              <>
                <Text style={styles.lead}>
                  Annales, cours, TD ou corrigés : choisis jusqu’à {MAX_FILES} PDF (20 Mo maximum chacun). Chaque
                  document est analysé, comparé au catalogue, puis validé par l’équipe avant publication.
                </Text>
                <Pressable style={styles.rightsRow} onPress={() => setRights((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: rights }}>
                  {rights ? <Check size={20} color={stitchColors.sienna} /> : <Square size={20} color={stitchColors.inkSubtle} />}
                  <Text style={styles.rightsText}>J’ai le droit de partager ces documents (pas de livre ni de support payant).</Text>
                </Pressable>
                {error && <Text style={styles.error}>{error}</Text>}
                <SiennaButton
                  label="Choisir des PDF"
                  icon={<Upload size={18} color={stitchColors.paper} />}
                  onPress={chooseAndSend}
                  disabled={!rights}
                  fluid
                />
              </>
            ) : (
              <>
                {rows.map((row) => (
                  <UploadRow key={row.key} row={row} onOpenDocument={onOpenDocument} />
                ))}
                {sending ? (
                  <View style={styles.sendingRow}>
                    <ActivityIndicator color={stitchColors.sienna} />
                    <Text style={styles.lead}>Analyse en cours, garde l’application ouverte…</Text>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <SiennaButton label="Mes contributions" onPress={() => { reset(); onOpenContributions(); }} fluid />
                    <SecondaryButton label="Partager d’autres PDF" onPress={reset} fluid />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function UploadRow({ row, onOpenDocument }: { row: Row; onOpenDocument?: (documentId: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [sheet, setSheet] = React.useState<ContributionSheet>(row.upload?.sheet ?? {});
  const [saved, setSaved] = React.useState<string | null>(null);
  const upload = row.upload;
  const editable = upload && ['pending_review', 'probable_duplicate'].includes(upload.status);

  const save = async () => {
    if (!upload) return;
    try {
      await updateContributionSheet(upload.id, sheet);
      setSaved('Fiche enregistrée.');
      setEditing(false);
    } catch (e) {
      setSaved(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <FileText size={18} color={stitchColors.inkMuted} />
        <Text style={styles.rowName} numberOfLines={1}>
          {upload?.sheet?.title || row.file.name}
        </Text>
      </View>
      {upload ? (
        <ContributionStatusChip status={upload.status} />
      ) : row.error ? (
        <Text style={styles.error}>{row.error}</Text>
      ) : (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(row.progress * 100)}%` }]} />
        </View>
      )}
      {upload?.status === 'duplicate' && (
        <Text style={styles.note}>
          Déjà disponible{upload.duplicateOf?.title ? ` : « ${upload.duplicateOf.title} »` : ''}.
          {upload.duplicateOf?.kind === 'document' && onOpenDocument ? '' : ' Aucun coin pour un doublon.'}
        </Text>
      )}
      {upload?.status === 'duplicate' && upload.duplicateOf?.kind === 'document' && onOpenDocument && (
        <Pressable onPress={() => onOpenDocument(upload.duplicateOf!.id)}>
          <Text style={styles.link}>Ouvrir le document existant</Text>
        </Pressable>
      )}
      {upload?.rejectReason && <Text style={styles.note}>{upload.rejectReason}</Text>}
      {upload?.personalDataFlag && (
        <Text style={styles.warning}>Ce PDF semble contenir des noms ou des matricules : l’équipe le vérifiera avant publication.</Text>
      )}
      {editable && !editing && (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.link}>Corriger la fiche</Text>
        </Pressable>
      )}
      {editable && editing && (
        <View style={styles.form}>
          {(['title', 'subject', 'school', 'year', 'level'] as const).map((field) => (
            <TextInput
              key={field}
              style={styles.input}
              placeholder={{ title: 'Titre', subject: 'Matière', school: 'École ou concours', year: 'Année', level: 'Niveau' }[field]}
              placeholderTextColor={stitchColors.inkSubtle}
              value={sheet[field] ?? ''}
              onChangeText={(value) => setSheet((s) => ({ ...s, [field]: value }))}
            />
          ))}
          <SiennaButton label="Enregistrer" onPress={save} fluid />
        </View>
      )}
      {saved && <Text style={styles.note}>{saved}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: stitchColors.paper,
    borderTopLeftRadius: stitchRadius.xl,
    borderTopRightRadius: stitchRadius.xl,
    paddingBottom: stitchSpacing.safeAreaBottom,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: stitchSpacing.containerMargin,
    paddingBottom: stitchSpacing.stackSm,
  },
  kicker: { fontFamily: fontFamilies.interSemi, fontSize: 12, color: stitchColors.sienna },
  title: { fontFamily: fontFamilies.display, fontSize: 22, color: stitchColors.ink, marginTop: 2 },
  body: { paddingHorizontal: stitchSpacing.containerMargin, paddingBottom: stitchSpacing.stackLg, gap: stitchSpacing.stackMd },
  lead: { fontFamily: fontFamilies.inter, fontSize: 14, lineHeight: 21, color: stitchColors.inkMuted, flexShrink: 1 },
  rightsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rightsText: { flex: 1, fontFamily: fontFamilies.interMedium, fontSize: 14, lineHeight: 20, color: stitchColors.ink },
  error: { fontFamily: fontFamilies.interMedium, fontSize: 13, color: stitchColors.error },
  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { gap: stitchSpacing.stackSm },
  row: {
    gap: 8,
    padding: 14,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    backgroundColor: stitchColors.paper,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { flex: 1, fontFamily: fontFamilies.interSemi, fontSize: 14, color: stitchColors.ink },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: stitchColors.paperSoft, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: stitchColors.sienna },
  note: { fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 19, color: stitchColors.inkMuted },
  warning: { fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 19, color: stitchColors.warningDeep },
  link: { fontFamily: fontFamilies.interSemi, fontSize: 13, color: stitchColors.sienna },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: stitchColors.outline,
    borderRadius: stitchRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    color: stitchColors.ink,
  },
});
