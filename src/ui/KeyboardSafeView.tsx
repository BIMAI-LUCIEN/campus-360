import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type KeyboardAvoidingViewProps,
} from 'react-native';

/**
 * Returns true while the software keyboard is open (native + mobile web via visualViewport).
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.visualViewport) return;
      const vv = window.visualViewport;
      const update = () => {
        const inset = window.innerHeight - vv.height - vv.offsetTop;
        setOpen(inset > 100);
      };
      update();
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      };
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvent, () => setOpen(true));
    const s2 = Keyboard.addListener(hideEvent, () => setOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  return open;
}

/**
 * Cross-platform keyboard-avoiding container:
 * - iOS: KeyboardAvoidingView with behavior="padding".
 * - Android: measures actual overlap via Keyboard.addListener('keyboardDidShow') + measureInWindow
 *   (works reliably inside Modals and Expo SDK 54 edge-to-edge without double-padding if adjustResize is active).
 * - Mobile Web: tracks window.visualViewport inset and adds paddingBottom when virtual keyboard opens.
 */
export function KeyboardSafeView({
  children,
  style,
  behavior,
  keyboardVerticalOffset = 0,
  ...rest
}: KeyboardAvoidingViewProps) {
  const [webInset, setWebInset] = useState(0);
  const [androidInset, setAndroidInset] = useState(0);
  const androidViewRef = useRef<View>(null);
  const keyboardOpenRef = useRef(false);
  const maxWindowHeightRef = useRef(Dimensions.get('window').height);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      // Ignore tiny browser chrome deltas (< 80px) so desktop/normal viewports stay untouched.
      setWebInset(inset > 80 ? inset : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const dimSub = Dimensions.addEventListener('change', ({ window: win }) => {
      if (!keyboardOpenRef.current && win.height > 0) {
        maxWindowHeightRef.current = win.height;
      }
    });

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardOpenRef.current = true;
      const kbHeight = e.endCoordinates?.height ?? 0;
      if (kbHeight <= 0) return;

      const currentWinHeight = Dimensions.get('window').height;
      if (currentWinHeight > maxWindowHeightRef.current) {
        maxWindowHeightRef.current = currentWinHeight;
      }
      const windowShrink = Math.max(0, maxWindowHeightRef.current - currentWinHeight);
      const effectiveKbHeight = Math.max(0, kbHeight - windowShrink);
      if (effectiveKbHeight <= 0) {
        setAndroidInset(0);
        return;
      }

      if (androidViewRef.current?.measureInWindow) {
        androidViewRef.current.measureInWindow((_x, y, _w, h) => {
          if (h <= 0) {
            setAndroidInset(Math.max(0, effectiveKbHeight - keyboardVerticalOffset));
            return;
          }
          const gapFromBottom = Math.max(0, currentWinHeight - (y + h));
          const overlap = Math.max(0, Math.round(effectiveKbHeight - gapFromBottom));
          setAndroidInset(overlap);
        });
      } else {
        setAndroidInset(Math.max(0, effectiveKbHeight - keyboardVerticalOffset));
      }
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpenRef.current = false;
      setAndroidInset(0);
      const winH = Dimensions.get('window').height;
      if (winH > 0) maxWindowHeightRef.current = winH;
    });

    return () => {
      dimSub.remove();
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardVerticalOffset]);

  if (Platform.OS === 'web') {
    const flat = StyleSheet.flatten(style) || {};
    const basePad = typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;
    return (
      <View
        style={[style, webInset > 0 ? { paddingBottom: basePad + webInset } : null]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    const flat = StyleSheet.flatten(style) || {};
    const basePad = typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;
    return (
      <View
        ref={androidViewRef}
        collapsable={false}
        style={[style, androidInset > 0 ? { paddingBottom: basePad + androidInset } : null]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={behavior ?? 'padding'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}
      {...rest}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
