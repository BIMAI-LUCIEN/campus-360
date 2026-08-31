import React from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Info, AlertTriangle, XCircle, type LucideIcon } from 'lucide-react-native';
import { stitchColors } from '../theme/stitch';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export type ToastMessage = {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
};

const VARIANTS: Record<
  ToastVariant,
  { accent: string; tint: string; icon: LucideIcon }
> = {
  success: { accent: stitchColors.emerald, tint: stitchColors.emeraldBg, icon: CheckCircle2 },
  info: { accent: stitchColors.sienna, tint: stitchColors.siennaBg, icon: Info },
  warning: { accent: stitchColors.warning, tint: stitchColors.warningBg, icon: AlertTriangle },
  error: { accent: stitchColors.error, tint: stitchColors.errorBg, icon: XCircle },
};

/**
 * Toast — lightweight top-anchored feedback replacing raw Alert.alert for
 * non-blocking messages (purchase confirmed, already owned, …). Animates in
 * with an ease-out curve, auto-dismisses, and can be tapped to dismiss early.
 */
export function Toast({
  toast,
  onDismiss,
  topInset = 0,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
  topInset?: number;
}) {
  const progress = React.useRef(new Animated.Value(0)).current;
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const runHide = React.useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, progress]);

  React.useEffect(() => {
    if (!toast) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    hideTimer.current = setTimeout(runHide, 3200);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // Re-run whenever a new toast (new id) arrives.
  }, [toast?.id, progress, runHide]);

  if (!toast) return null;

  const cfg = VARIANTS[toast.variant];
  const Icon = cfg.icon;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: topInset + 8, opacity: progress, transform: [{ translateY }] }]}
    >
      <Pressable
        onPress={runHide}
        accessibilityRole="alert"
        style={[styles.card, { borderColor: cfg.accent }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.tint }]}>
          <Icon size={18} color={cfg.accent} strokeWidth={2.2} />
        </View>
        <View style={styles.textCol}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderLeftWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
      default: {},
    }),
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: {
    color: stitchColors.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  message: {
    color: stitchColors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
