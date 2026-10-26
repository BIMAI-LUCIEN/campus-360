import React from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AlertButton,
  type AlertOptions,
} from 'react-native';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react-native';
import { fontFamilies, stitchColors, stitchShadows } from '../theme/stitch';

type AlertTone = 'success' | 'info' | 'warning' | 'error';

type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
  tone: AlertTone;
};

const TONES: Record<AlertTone, { accent: string; tint: string; icon: LucideIcon }> = {
  success: { accent: stitchColors.emerald, tint: stitchColors.emeraldBg, icon: CheckCircle2 },
  info: { accent: stitchColors.sienna, tint: stitchColors.siennaBg, icon: Info },
  warning: { accent: stitchColors.warning, tint: stitchColors.warningBg, icon: AlertTriangle },
  error: { accent: stitchColors.error, tint: stitchColors.errorBg, icon: XCircle },
};

const ERROR_WORDS = /erreur|impossible|invalide|échec|echec|refus|rejet|non valid|dépassé|depasse|indisponible|introuvable|manquant|insuffisant|non transmis|bloqué/i;
const SUCCESS_WORDS = /succès|succes|réussi|reussi|connect[ée]|envoy[ée]|enregistr|confirm[ée]|prêt|pret|débloqu|copi[ée]|ajout[ée]|mis à jour|terminé|bravo|👍|🎉/i;

// The tone is guessed from the wording so existing Alert.alert calls keep their signature.
const inferTone = (title: string, message: string | undefined, buttons: AlertButton[]): AlertTone => {
  const text = `${title} ${message ?? ''}`;
  if (ERROR_WORDS.test(title)) return 'error';
  if (SUCCESS_WORDS.test(title)) return 'success';
  if (buttons.some((button) => button.style === 'destructive')) return 'warning';
  if (ERROR_WORDS.test(text)) return 'warning';
  return 'info';
};

let nextId = 0;
let queue: AlertRequest[] = [];
const listeners = new Set<(current: AlertRequest | null) => void>();
const emit = () => listeners.forEach((listener) => listener(queue[0] ?? null));

/**
 * AppAlert — drop-in replacement for React Native's Alert.alert, drawn with the
 * app's design system. Same arguments; falls back to the native alert when no
 * AppAlertHost is mounted.
 */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (listeners.size === 0) {
      Alert.alert(title, message, buttons, options);
      return;
    }
    const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
    nextId += 1;
    queue = [...queue, { id: nextId, title, message, buttons: list, options, tone: inferTone(title, message, list) }];
    emit();
  },
};

const closeCurrent = () => {
  queue = queue.slice(1);
  emit();
};

/** Mount once near the root of every screen tree. */
export function AppAlertHost() {
  const [current, setCurrent] = React.useState<AlertRequest | null>(queue[0] ?? null);
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);

  React.useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [current?.id, progress]);

  if (!current) return null;

  const tone = TONES[current.tone];
  const Icon = tone.icon;
  const stacked = current.buttons.length > 2;
  const cancelButton = current.buttons.find((button) => button.style === 'cancel');
  const dismissible = current.buttons.length <= 1 || Boolean(cancelButton) || current.options?.cancelable === true;

  const press = (button?: AlertButton) => {
    closeCurrent();
    // Let the popup leave before the caller opens a new screen or popup.
    setTimeout(() => button?.onPress?.(), 0);
  };

  const dismiss = () => {
    if (!dismissible) return;
    if (cancelButton) { press(cancelButton); return; }
    if (current.buttons.length === 1) { press(current.buttons[0]); return; }
    closeCurrent();
    current.options?.onDismiss?.();
  };

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Fermer" />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]} accessibilityRole="alert">
          <View style={[styles.iconWrap, { backgroundColor: tone.tint }]}>
            <Icon size={26} color={tone.accent} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {current.buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              return (
                <Pressable
                  key={`${button.text ?? 'ok'}-${index}`}
                  onPress={() => press(button)}
                  style={({ pressed }) => [
                    styles.button,
                    !stacked && styles.buttonFlex,
                    isCancel
                      ? styles.buttonGhost
                      : { backgroundColor: isDestructive ? stitchColors.error : stitchColors.sienna },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.buttonText, isCancel && styles.buttonGhostText]}>{button.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: stitchColors.glassOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: stitchColors.paper,
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 18,
    alignItems: 'center',
    ...stitchShadows.floating,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: fontFamilies.display,
    color: stitchColors.ink,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: fontFamilies.inter,
    color: stitchColors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  actionsStacked: { flexDirection: 'column' },
  button: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: { flex: 1 },
  buttonGhost: {
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: {
    fontFamily: fontFamilies.interSemi,
    color: stitchColors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonGhostText: { color: stitchColors.inkSoft },
});
