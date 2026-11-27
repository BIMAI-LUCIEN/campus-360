import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { stitchColors } from '../../theme/stitch';
import { STAGE_JURY_PRICE } from './stagePricing';

export function StageJuryPromptModal({ busy, error, balanceCoins, onAccept, onSkip }: {
  busy: boolean;
  error: string | null;
  balanceCoins?: number | null;
  onAccept: () => void;
  onSkip: () => void;
}) {
  const lowBalance = balanceCoins !== null && balanceCoins !== undefined && balanceCoins < STAGE_JURY_PRICE;
  return (
    <View accessibilityViewIsModal testID="stage-jury-prompt" style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Faire juger ton CV avant vérification ?</Text>
        <Text style={styles.copy}>{STAGE_JURY_PRICE} FCFA. Évaluation par 7 juges + réécriture corrective et seconde relecture incluses.</Text>
        {balanceCoins !== null && balanceCoins !== undefined ? (
          <Text testID="stage-jury-balance" style={styles.balanceCopy}>
            Solde actuel : {balanceCoins} FCFA
            {lowBalance ? ' · Solde insuffisant : une recharge te sera proposée.' : ''}
          </Text>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text testID="stage-jury-error" accessibilityRole="alert" style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Pressable testID="stage-jury-accept" onPress={onAccept} disabled={busy} style={styles.primary}>
          {busy ? <ActivityIndicator color={stitchColors.white} /> : <Text style={styles.primaryText}>Faire juger mon CV · {STAGE_JURY_PRICE} FCFA</Text>}
        </Pressable>
        <Pressable testID="stage-jury-skip" onPress={onSkip} disabled={busy} style={styles.secondary}>
          <Text style={styles.copy}>Passer sans Jury · Vérifier mon dossier</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', padding: 18, backgroundColor: stitchColors.paperSoft },
  card: { backgroundColor: stitchColors.white, borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: stitchColors.glassBorder },
  title: { fontSize: 20, fontWeight: '700', color: stitchColors.ink },
  copy: { fontSize: 14, color: stitchColors.ink },
  balanceCopy: { fontSize: 13, color: stitchColors.inkMuted },
  errorBox: { backgroundColor: stitchColors.errorBg, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 13, fontWeight: '600', color: stitchColors.error },
  primary: { padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: stitchColors.primary },
  primaryText: { color: stitchColors.white, fontWeight: '700', textAlign: 'center' },
  secondary: { padding: 10, alignItems: 'center' },
});
