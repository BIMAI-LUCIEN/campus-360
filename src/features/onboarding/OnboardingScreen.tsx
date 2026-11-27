import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  Send,
  Sparkles,
} from 'lucide-react-native';
import {
  brandGradient,
  fontFamilies,
  stitchColors,
  stitchRadius,
  stitchShadows,
} from '../../theme/stitch';

// ─── Slide visuals (Clean White & Royal Violet, 100% theme tokens) ───────────
function StagesVisual() {
  return (
    <View style={vs.card}>
      <View style={vs.cardTopRow}>
        <View style={[vs.iconBadge, { backgroundColor: stitchColors.siennaBg }]}>
          <Briefcase size={20} color={stitchColors.primary} />
        </View>
        <View style={vs.matchPill}>
          <Sparkles size={12} color={stitchColors.emeraldDeep} />
          <Text style={vs.matchPillText}>92% Match</Text>
        </View>
      </View>
      <Text style={vs.cardHeading}>Stage Développeur Web & Mobile</Text>
      <Text style={vs.cardSub}>Douala • Entreprise vérifiée • Rémunéré</Text>
      <View style={vs.tagRow}>
        <View style={vs.tag}>
          <CheckCircle2 size={12} color={stitchColors.primary} />
          <Text style={vs.tagText}>Offre vérifiée</Text>
        </View>
        <View style={vs.tag}>
          <Text style={vs.tagText}>Alertes en direct</Text>
        </View>
      </View>
    </View>
  );
}

function CvApplyVisual() {
  return (
    <View style={vs.card}>
      <View style={vs.cardTopRow}>
        <View style={[vs.iconBadge, { backgroundColor: stitchColors.siennaBg }]}>
          <FileCheck2 size={20} color={stitchColors.primary} />
        </View>
        <View style={vs.juryPill}>
          <Award size={12} color={stitchColors.primary} />
          <Text style={vs.juryPillText}>Jury RH IA</Text>
        </View>
      </View>
      <Text style={vs.cardHeading}>CV officiel ATS & Lettre prêts</Text>
      <View style={vs.lineGroup}>
        <View style={[vs.mockLine, { width: '90%', backgroundColor: stitchColors.primary }]} />
        <View style={[vs.mockLine, { width: '74%' }]} />
        <View style={[vs.mockLine, { width: '62%' }]} />
      </View>
      <View style={vs.sendBar}>
        <Send size={13} color={stitchColors.primary} />
        <Text style={vs.sendBarText}>Envoi direct par e-mail ou WhatsApp</Text>
      </View>
    </View>
  );
}

function StudyDocsVisual() {
  return (
    <View style={vs.card}>
      <View style={vs.cardTopRow}>
        <View style={[vs.iconBadge, { backgroundColor: stitchColors.emeraldBg }]}>
          <BookOpen size={20} color={stitchColors.emeraldDeep} />
        </View>
        <View style={vs.matchPill}>
          <Text style={vs.matchPillText}>PDF Gratuits</Text>
        </View>
      </View>
      <Text style={vs.cardHeading}>Cours, Rapports & Mémoires</Text>
      <Text style={vs.cardSub}>Assistant IA sur tes PDF + rédaction structurée</Text>
      <View style={vs.tagRow}>
        <View style={vs.tag}>
          <Sparkles size={12} color={stitchColors.primary} />
          <Text style={vs.tagText}>Plan & Chapitres IA</Text>
        </View>
        <View style={vs.tag}>
          <Text style={vs.tagText}>Export PDF / Word</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Slide definitions ───────────────────────────────────────────────────────
interface Slide {
  id: string;
  folio: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    id: 'stages',
    folio: '01',
    eyebrow: 'STAGES & EMPLOIS',
    title: 'Décroche ton stage plus vite',
    body: 'Découvre des offres vérifiées au Cameroun, ton score de correspondance selon tes compétences et des alertes dès qu’une opportunité te correspond.',
    visual: <StagesVisual />,
  },
  {
    id: 'cv-apply',
    folio: '02',
    eyebrow: 'CV & CANDIDATURES',
    title: 'Un CV prêt pour les recruteurs',
    body: 'Crée un CV adapté à chaque offre avec l’IA, fais-le évaluer par notre Jury RH et envoie ta candidature complète par e-mail ou WhatsApp.',
    visual: <CvApplyVisual />,
  },
  {
    id: 'study-docs',
    folio: '03',
    eyebrow: 'COURS & MÉMOIRES',
    title: 'Révise et rédige sans blocage',
    body: 'Lis tous les cours PDF gratuitement avec l’assistant IA, et rédige tes rapports de stage et mémoires chapitre par chapitre jusqu’à l’export PDF ou Word.',
    visual: <StudyDocsVisual />,
  },
];

// ─── Main screen ─────────────────────────────────────────────────────────────
export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(Math.max(1, windowWidth));
  const compact = pageWidth < 380;
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const targetIndexRef = useRef<number | null>(null);
  const targetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPageWidth((prev) => (prev > 1 ? prev : Math.max(1, windowWidth)));
  }, [windowWidth]);

  useEffect(() => {
    return () => {
      if (targetTimerRef.current) clearTimeout(targetTimerRef.current);
    };
  }, []);

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    if (measured > 0 && measured !== pageWidth) {
      setPageWidth(measured);
      // Keep the active slide aligned if the viewport resizes or rotates.
      scrollRef.current?.scrollTo({ x: currentIndex * measured, animated: false });
    }
  };

  const goToSlide = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, nextIndex));
    targetIndexRef.current = clamped;
    if (targetTimerRef.current) clearTimeout(targetTimerRef.current);
    targetTimerRef.current = setTimeout(() => {
      targetIndexRef.current = null;
    }, 450);
    setCurrentIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const computed = Math.max(
      0,
      Math.min(SLIDES.length - 1, Math.round(offsetX / Math.max(1, pageWidth))),
    );
    if (targetIndexRef.current !== null) {
      if (Math.abs(offsetX - targetIndexRef.current * pageWidth) <= 4) {
        targetIndexRef.current = null;
      }
      return;
    }
    if (computed !== currentIndex) {
      setCurrentIndex(computed);
    }
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    targetIndexRef.current = null;
    const offsetX = event.nativeEvent.contentOffset.x;
    const computed = Math.max(
      0,
      Math.min(SLIDES.length - 1, Math.round(offsetX / Math.max(1, pageWidth))),
    );
    setCurrentIndex(computed);
  };

  const isLast = currentIndex >= SLIDES.length - 1;

  const handlePrimaryPress = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
      return;
    }
    onFinish();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandBadge}>
          <Sparkles size={13} color={stitchColors.primary} />
          <Text style={styles.brandText}>CAMPUS 360</Text>
        </View>
        {!isLast ? (
          <Pressable onPress={onFinish} hitSlop={12} style={styles.passButton} testID="btn-intro-skip">
            <Text style={styles.passButtonText}>Passer</Text>
          </Pressable>
        ) : (
          <View style={styles.passPlaceholder} />
        )}
      </View>

      {/* Horizontal pager */}
      <View style={styles.viewport} onLayout={handleViewportLayout}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          {SLIDES.map((slide) => (
            <View key={slide.id} style={[styles.slideWrapper, { width: pageWidth }]}>
              <ScrollView
                style={styles.slideScroll}
                contentContainerStyle={[styles.slidePage, compact && styles.slidePageCompact]}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.eyebrowRow}>
                  <Text style={styles.folio}>{slide.folio}</Text>
                  <View style={styles.folioDot} />
                  <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
                </View>

                <Text style={[styles.slideTitle, compact && styles.slideTitleCompact]}>
                  {slide.title}
                </Text>
                <Text style={[styles.slideBody, compact && styles.slideBodyCompact]}>
                  {slide.body}
                </Text>

                <View style={styles.visualContainer}>{slide.visual}</View>
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((slide, i) => {
          const active = i === currentIndex;
          return (
            <Pressable
              key={slide.id}
              onPress={() => goToSlide(i)}
              hitSlop={8}
              accessibilityLabel={`Diapositive ${i + 1}`}
              style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
            />
          );
        })}
      </View>

      <Text style={styles.counterText}>
        {String(currentIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
      </Text>

      {/* Footer navigation */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          {currentIndex > 0 ? (
            <Pressable
              onPress={() => goToSlide(currentIndex - 1)}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
              accessibilityLabel="Étape précédente"
              testID="btn-intro-prev"
            >
              <ArrowLeft size={18} color={stitchColors.inkSoft} />
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.primaryPressable, pressed && { opacity: 0.9 }]}
            onPress={handlePrimaryPress}
            testID="btn-intro-next"
          >
            <LinearGradient
              colors={brandGradient.colors}
              start={brandGradient.horizontal.start}
              end={brandGradient.horizontal.end}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonText}>
                {isLast ? 'Commencer' : 'Suivant'}
              </Text>
              <ArrowRight size={18} color={stitchColors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Visual card styles ──────────────────────────────────────────────────────
const vs = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 18,
    gap: 12,
    ...stitchShadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.emeraldBg,
  },
  matchPillText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.emeraldDeep,
  },
  juryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.siennaBg,
  },
  juryPillText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  cardHeading: {
    fontFamily: fontFamilies.displaySemi,
    fontSize: 16,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  cardSub: {
    fontFamily: fontFamilies.inter,
    fontSize: 13,
    lineHeight: 19,
    color: stitchColors.inkMuted,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.paperSoft,
  },
  tagText: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 12,
    color: stitchColors.inkSoft,
  },
  lineGroup: {
    gap: 7,
    paddingVertical: 4,
  },
  mockLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: stitchColors.paperSoft,
  },
  sendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: stitchRadius.sm,
    backgroundColor: stitchColors.siennaBg,
  },
  sendBarText: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.primary,
    flex: 1,
  },
});

// ─── Screen styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.glassBorder,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.siennaBg,
  },
  brandText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: stitchColors.primary,
  },
  passButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passButtonText: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  passPlaceholder: {
    width: 48,
    height: 24,
  },
  viewport: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  slideWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  slideScroll: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
  },
  slidePage: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  slidePageCompact: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  folio: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.primary,
  },
  folioDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: stitchColors.inkSubtle,
  },
  eyebrow: {
    fontFamily: fontFamilies.interSemi,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: stitchColors.inkMuted,
  },
  slideTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontWeight: '800',
    color: stitchColors.ink,
    lineHeight: 38,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  slideTitleCompact: {
    fontSize: 27,
    lineHeight: 33,
  },
  slideBody: {
    fontFamily: fontFamilies.inter,
    fontSize: 15,
    color: stitchColors.inkMuted,
    lineHeight: 23,
    marginBottom: 26,
  },
  slideBodyCompact: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  visualContainer: {
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 26,
    backgroundColor: stitchColors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: stitchColors.outline,
  },
  counterText: {
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: stitchColors.inkSubtle,
    textAlign: 'center',
    paddingBottom: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    backgroundColor: stitchColors.surface,
    borderTopWidth: 1,
    borderTopColor: stitchColors.glassBorder,
    alignItems: 'center',
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 480,
  },
  backBtn: {
    width: 52,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    backgroundColor: stitchColors.surface,
  },
  primaryPressable: {
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 54,
    borderRadius: 14,
  },
  ctaButtonText: {
    fontFamily: fontFamilies.display,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.white,
  },
});
