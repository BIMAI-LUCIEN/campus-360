import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Animated,
  SafeAreaView,
} from 'react-native';

const { width } = Dimensions.get('window');

// ─── Editorial palette ───────────────────────────────────────────────────────
const INK     = '#0F172A';
const PAPER   = '#F6F1E7';
const SIENNA  = '#B7410E';
const EMERALD = '#047857';
const MUTED   = '#475569';
const SOFT    = '#94A3B8';

// ─── Visual element styles ─────────────────────────────────────────────────────
const vs = StyleSheet.create({
  catalogVisual: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'flex-start' },
  docRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  docLine:       { height: 8, backgroundColor: INK, borderRadius: 1, opacity: 0.7 },
  cursorBar:     { width: 24, height: 3, borderRadius: 1, backgroundColor: INK, marginTop: 8 },

  previewVisual:  { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 24, gap: 16 },
  previewLeft:     { flex: 1, gap: 6, position: 'relative', overflow: 'hidden' },
  previewLine:     { height: 7, backgroundColor: INK, borderRadius: 1, opacity: 0.6 },
  previewFade:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: PAPER, opacity: 0.85 },
  previewDivider:  { width: 1, height: 90, backgroundColor: SOFT, marginTop: 4 },
  previewRight:    { alignItems: 'center', paddingTop: 8, gap: 4 },
  priceTag:        { borderWidth: 2, borderColor: SIENNA, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  priceText:       { fontFamily: 'serif', fontSize: 28, fontWeight: '900', color: SIENNA, lineHeight: 30 },
  priceUnit:       { fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5, color: SIENNA, fontWeight: '700' },

  readVisual:  { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 24, gap: 12 },
  bookLeft:    { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 90 },
  bookSpine:   { width: 6, borderRadius: 1, opacity: 0.85 },
  bookRight:   { flex: 1, gap: 6, paddingBottom: 4 },
  readLine:    { height: 7, backgroundColor: INK, borderRadius: 1, opacity: 0.55 },
});

// ─── Slide content ────────────────────────────────────────────────────────────
interface Slide {
  folio: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    folio: '— 01',
    eyebrow: 'CHAPITRE 01',
    title: 'Trouve le bon PDF',
    body: 'Parcourez le catalogue complet par université, filière et matière. Chaque document est indexé et accessible en un instant.',
    visual: (
      <View style={vs.catalogVisual}>
        <View style={[vs.docRow, { marginLeft: 0 }]}>
          <View style={[vs.docLine, { width: 160 }]} />
          <View style={[vs.docLine, { width: 100, backgroundColor: SIENNA }]} />
        </View>
        <View style={vs.docRow}>
          <View style={[vs.docLine, { width: 140 }]} />
          <View style={[vs.docLine, { width: 80 }]} />
        </View>
        <View style={[vs.docRow, { marginLeft: 20 }]}>
          <View style={[vs.docLine, { width: 120 }]} />
          <View style={[vs.docLine, { width: 90 }]} />
        </View>
        <View style={vs.docRow}>
          <View style={[vs.docLine, { width: 150 }]} />
          <View style={[vs.docLine, { width: 60 }]} />
        </View>
        <View style={[vs.docRow, { marginLeft: 10 }]}>
          <View style={[vs.docLine, { width: 130 }]} />
          <View style={[vs.docLine, { width: 70 }]} />
        </View>
        <View style={vs.docRow}>
          <View style={[vs.docLine, { width: 110 }]} />
          <View style={[vs.docLine, { width: 50 }]} />
        </View>
        <View style={[vs.docRow, { marginLeft: 5 }]}>
          <View style={[vs.docLine, { width: 145 }]} />
          <View style={[vs.docLine, { width: 65 }]} />
        </View>
        <View style={[vs.cursorBar, { backgroundColor: INK }]} />
      </View>
    ),
  },
  {
    folio: '— 02',
    eyebrow: 'CHAPITRE 02',
    title: 'Preview puis achat',
    body: "Feuilletez un extrait gratuit avant d'acheter. Pas de surprise — vous voyez exactement ce que vous payez.",
    visual: (
      <View style={vs.previewVisual}>
        <View style={vs.previewLeft}>
          <View style={[vs.previewLine, { width: 80 }]} />
          <View style={[vs.previewLine, { width: 70 }]} />
          <View style={[vs.previewLine, { width: 75 }]} />
          <View style={[vs.previewLine, { width: 60 }]} />
          <View style={[vs.previewLine, { width: 78 }]} />
          <View style={[vs.previewLine, { width: 55 }]} />
          <View style={[vs.previewLine, { width: 65 }]} />
          <View style={vs.previewFade} />
        </View>
        <View style={vs.previewDivider} />
        <View style={vs.previewRight}>
          <View style={[vs.priceTag, { borderColor: SIENNA }]}>
            <Text style={vs.priceText}>500</Text>
            <Text style={vs.priceUnit}>FCFA</Text>
          </View>
          <View style={[vs.docLine, { width: 60, marginTop: 8 }]} />
        </View>
      </View>
    ),
  },
  {
    folio: '— 03',
    eyebrow: 'CHAPITRE 03',
    title: 'Lis et révise',
    body: 'Accédez à vos achats dans votre bibliothèque personnelle. Téléchargez pour le mode hors-ligne et révisez à votre rythme.',
    visual: (
      <View style={vs.readVisual}>
        <View style={vs.bookLeft}>
          {[
            { w: 50, c: INK },
            { w: 60, c: SIENNA },
            { w: 45, c: EMERALD },
            { w: 55, c: MUTED },
            { w: 40, c: SOFT },
          ].map((b, i) => (
            <View key={i} style={[vs.bookSpine, { backgroundColor: b.c, width: b.w }]} />
          ))}
        </View>
        <View style={vs.bookRight}>
          <View style={[vs.readLine, { width: 100 }]} />
          <View style={[vs.readLine, { width: 90 }]} />
          <View style={[vs.readLine, { width: 80 }]} />
          <View style={[vs.readLine, { width: 95 }]} />
          <View style={[vs.readLine, { width: 70 }]} />
          <View style={[vs.readLine, { width: 85 }]} />
          <View style={[vs.readLine, { width: 60 }]} />
          <View style={[vs.readLine, { width: 78 }]} />
          <View style={[vs.readLine, { width: 50 }]} />
        </View>
      </View>
    ),
  },
];

// ─── Slide renderer ───────────────────────────────────────────────────────────
function SlidePage({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slidePage}>
      <Text style={styles.folio}>{slide.folio}</Text>
      <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
      <Text style={styles.slideTitle}>{slide.title}</Text>
      <Text style={styles.slideBody}>{slide.body}</Text>
      <View style={styles.visualContainer}>{slide.visual}</View>
    </View>
  );
}

// ─── Progress dots as 1px ink rules ─────────────────────────────────────────
function ProgressDots({ scrollX, total }: { scrollX: Animated.Value; total: number }) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [6, 24, 6],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidth,
                backgroundColor: scrollX.interpolate({
                  inputRange,
                  outputRange: [SOFT, SIENNA, SOFT],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const idx = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(idx);
      },
    }
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.paperBg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoMark}>C</Text>
        {!isLast && (
          <Pressable onPress={onFinish} style={styles.passButton}>
            <Text style={styles.passButtonText}>PASSER</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.topRule} />

      {/* Slide view */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={width}
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((slide) => (
          <View key={slide.eyebrow} style={styles.slideWrapper}>
            <SlidePage slide={slide} />
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.bottomRule} />
      <ProgressDots scrollX={scrollX} total={SLIDES.length} />

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {String(currentIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaButton, isLast && styles.ctaButtonFinal]}
          onPress={onFinish}
        >
          <Text style={styles.ctaButtonText}>
            {isLast ? 'COMMENCER' : 'SUIVANT'}
          </Text>
          {!isLast && <Text style={styles.ctaArrow}>→</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Component styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  paperBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PAPER,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 0,
  },
  logoMark: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    lineHeight: 26,
  },
  passButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 2,
  },
  passButtonText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: MUTED,
  },

  // Rules
  topRule: {
    height: 1,
    backgroundColor: INK,
    marginHorizontal: 24,
    marginTop: 12,
  },
  bottomRule: {
    height: 1,
    backgroundColor: INK,
    marginHorizontal: 24,
  },

  // Scroll
  scrollContent: {
    alignItems: 'stretch',
  },
  slideWrapper: {
    width,
  },

  // Slide content
  slidePage: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 16,
  },
  folio: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: SIENNA,
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  slideTitle: {
    fontFamily: 'serif',
    fontSize: 34,
    fontWeight: '900',
    color: INK,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  slideBody: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '400',
    fontStyle: 'italic',
    color: MUTED,
    lineHeight: 24,
    marginBottom: 32,
  },
  visualContainer: {
    flex: 1,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    height: 2,
    borderRadius: 1,
  },

  // Counter
  counterRow: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  counterText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: SOFT,
  },

  // Footer CTA
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 16,
    backgroundColor: INK,
    borderRadius: 2,
  },
  ctaButtonFinal: {
    backgroundColor: SIENNA,
  },
  ctaButtonText: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: PAPER,
    letterSpacing: 0.5,
  },
  ctaArrow: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: PAPER,
  },
});
