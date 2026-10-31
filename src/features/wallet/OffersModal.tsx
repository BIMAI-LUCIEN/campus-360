import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { stitchColors, stitchComponents } from '../../theme/stitch';
import {
  fetchOffers,
  formatOfferDate,
  InsufficientBalanceError,
  purchaseOffer,
  type Offer,
  type OfferCode,
  type OffersState,
} from './offersApi';
import { PaymentModal } from './PaymentModal';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Only packs, only passes, or both. */
  focus?: 'pack' | 'pass' | 'all';
  reasonMessage?: string;
  onPurchased?: (state: OffersState) => void;
};

const formatFcfa = (amount: number) => `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;

export function OffersModal({ visible, onClose, focus = 'all', reasonMessage, onPurchased }: Props) {
  const [state, setState] = useState<OffersState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<OfferCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [topUpFor, setTopUpFor] = useState<Offer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await fetchOffers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les offres.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setNotice(null);
      void load();
    }
  }, [visible, load]);

  const buy = async (offer: Offer) => {
    if (buying) return;
    setBuying(offer.code);
    setError(null);
    setNotice(null);
    try {
      const next = await purchaseOffer(offer.code);
      setState(next);
      setNotice(`${offer.label} activé. Solde restant : ${formatFcfa(next.balance)}.`);
      onPurchased?.(next);
    } catch (err) {
      if (err instanceof InsufficientBalanceError) setTopUpFor(offer);
      else setError(err instanceof Error ? err.message : "L'achat n'a pas abouti.");
    } finally {
      setBuying(null);
    }
  };

  const offers = (state?.offers ?? []).filter((offer) => focus === 'all' || offer.kind === focus);
  const creditsUntil = formatOfferDate(state?.creditsExpireAt ?? null);
  const passUntil = formatOfferDate(state?.passUntil ?? null);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={stitchComponents.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Packs et Pass</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          </View>
          {reasonMessage ? <Text style={styles.reason}>{reasonMessage}</Text> : null}

          {state ? (
            <View style={styles.status}>
              <Text style={styles.statusLine}>
                {state.credits > 0
                  ? `${state.credits} crédit${state.credits > 1 ? 's' : ''} de candidature${creditsUntil ? `, jusqu'au ${creditsUntil}` : ''}`
                  : 'Aucun crédit de candidature'}
              </Text>
              <Text style={styles.statusLine}>
                {passUntil ? `Pass Révision actif jusqu'au ${passUntil}` : 'Pas de Pass Révision actif'}
              </Text>
            </View>
          ) : null}

          {loading && !state ? <ActivityIndicator color={stitchColors.sienna} style={styles.spinner} /> : null}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              {!state ? (
                <Pressable onPress={() => void load()}>
                  <Text style={styles.retry}>Réessayer</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {state && offers.length === 0 ? <Text style={styles.empty}>Aucune offre disponible pour le moment.</Text> : null}

          <ScrollView contentContainerStyle={styles.list}>
            {offers.map((offer) => (
              <View key={offer.code} style={styles.card}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{offer.label}</Text>
                  <Text style={styles.cardDesc}>{offer.description}</Text>
                </View>
                <Pressable
                  style={[styles.buy, buying === offer.code && styles.buyBusy]}
                  onPress={() => void buy(offer)}
                  disabled={Boolean(buying)}
                  accessibilityRole="button"
                  accessibilityLabel={`Acheter ${offer.label} pour ${formatFcfa(offer.priceCoins)}`}
                >
                  {buying === offer.code ? (
                    <ActivityIndicator color={stitchColors.onPrimary} />
                  ) : (
                    <Text style={styles.buyText}>{formatFcfa(offer.priceCoins)}</Text>
                  )}
                </Pressable>
              </View>
            ))}
            <Text style={styles.footnote}>Payé une seule fois depuis ton solde. Aucun renouvellement automatique.</Text>
          </ScrollView>
        </View>
      </View>

      <PaymentModal
        visible={Boolean(topUpFor)}
        onClose={() => setTopUpFor(null)}
        reasonMessage={topUpFor ? `Recharge ton solde pour prendre « ${topUpFor.label} » (${formatFcfa(topUpFor.priceCoins)}).` : undefined}
        onPaymentSuccess={() => {
          const offer = topUpFor;
          setTopUpFor(null);
          if (offer) void buy(offer);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '88%',
    backgroundColor: stitchColors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: stitchColors.ink },
  close: { fontSize: 15, color: stitchColors.sienna, fontWeight: '600' },
  reason: { fontSize: 14, color: stitchColors.inkSoft, lineHeight: 20 },
  status: { backgroundColor: stitchColors.siennaBg, borderRadius: 12, padding: 12, gap: 4 },
  statusLine: { fontSize: 14, color: stitchColors.ink },
  spinner: { marginVertical: 24 },
  errorBox: { backgroundColor: stitchColors.errorBg, borderRadius: 12, padding: 12, gap: 6 },
  errorText: { color: stitchColors.error, fontSize: 14 },
  retry: { color: stitchColors.sienna, fontWeight: '600' },
  notice: { color: stitchColors.emeraldDeep, fontSize: 14, fontWeight: '600' },
  empty: { color: stitchColors.inkMuted, fontSize: 14 },
  list: { gap: 10, paddingBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: stitchColors.outline,
    borderRadius: 14,
    padding: 14,
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: stitchColors.ink },
  cardDesc: { fontSize: 13, color: stitchColors.inkMuted, lineHeight: 18 },
  buy: {
    minWidth: 92,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: stitchColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buyBusy: { opacity: 0.7 },
  buyText: { color: stitchColors.onPrimary, fontWeight: '700', fontSize: 15 },
  footnote: { fontSize: 12, color: stitchColors.inkMuted, textAlign: 'center', marginTop: 4 },
});
