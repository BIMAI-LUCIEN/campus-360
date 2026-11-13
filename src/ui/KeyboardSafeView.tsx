import React, { useEffect, useState } from 'react';
import {
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
 * - iOS & Android (including Expo SDK 54 edge-to-edge): KeyboardAvoidingView with behavior="padding".
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
