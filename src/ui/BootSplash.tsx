import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { fontFamilies, stitchColors } from '../theme/stitch';

const orbiteLogo = require('../../assets/brand/logo-orbite.png');

interface BootSplashProps {
  /** Fonts have resolved (loaded, errored, or timed out): safe to reveal branded typography without swap flash. */
  fontsReady: boolean;
  /** Fonts + initial session/onboarding check are all resolved and the underlying screen is ready. */
  ready: boolean;
  /** Called once the exit fade-out has finished so the overlay can unmount cleanly. */
  onDone: () => void;
}

/**
 * Seamless startup overlay matching the native white splash background.
 * Animates the Orbite monogram on the UI thread (useNativeDriver) while fonts and
 * session state resolve together, then fades out smoothly once the target screen is ready.
 */
export function BootSplash({ fontsReady, ready, onDone }: BootSplashProps) {
  const logoOpacity = useRef(new Animated.Value(0.85)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.92)).current;
  const ringOpacity = useRef(new Animated.Value(0.45)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(8)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const minElapsedRef = useRef(false);
  const readyRef = useRef(ready);
  const fadingOutRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  readyRef.current = ready;

  const tryFadeOut = () => {
    if (fadingOutRef.current) return;
    if (!readyRef.current || !minElapsedRef.current) return;
    fadingOutRef.current = true;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDoneRef.current();
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.12,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.14,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.92,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.45,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulseLoop.start();

    const minTimer = setTimeout(() => {
      minElapsedRef.current = true;
      tryFadeOut();
    }, 750);

    return () => {
      clearTimeout(minTimer);
      pulseLoop.stop();
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    Animated.parallel([
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fontsReady]);

  useEffect(() => {
    if (ready) tryFadeOut();
  }, [ready]);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-28deg', '0deg'],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents={ready ? 'none' : 'auto'}
      accessibilityLabel="Chargement de Campus 360"
    >
      <View style={styles.center}>
        <View style={styles.emblemBox}>
          <Animated.View
            style={[
              styles.haloRing,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <View style={styles.innerHalo} />
          <Animated.Image
            source={orbiteLogo}
            style={[
              styles.logo,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { rotate: spin }],
              },
            ]}
            resizeMode="contain"
          />
        </View>

        {fontsReady && (
          <Animated.View
            style={[
              styles.wordmarkWrap,
              {
                opacity: wordmarkOpacity,
                transform: [{ translateY: wordmarkTranslateY }],
              },
            ]}
          >
            <Text style={styles.wordmark}>
              Campus <Text style={styles.wordmarkNumber}>360</Text>
            </Text>
            <Text style={styles.tagline}>Portail Étudiant, Stages &amp; Réussite</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: stitchColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emblemBox: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1.5,
    borderColor: stitchColors.siennaSoft,
  },
  innerHalo: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: stitchColors.paper,
  },
  logo: {
    width: 78,
    height: 78,
  },
  wordmarkWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  wordmark: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.5,
  },
  wordmarkNumber: {
    fontFamily: fontFamilies.displayRegular,
    fontWeight: '400',
    color: stitchColors.sienna,
  },
  tagline: {
    fontFamily: fontFamilies.inter,
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
