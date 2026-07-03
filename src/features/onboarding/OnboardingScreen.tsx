import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Benefit {
  icon: string;
  title: string;
  description: string;
  accent: string;
  bgGradient: [string, string];
}

const BENEFITS: Benefit[] = [
  {
    icon: '🎁',
    title: '3 PDFs gratuits',
    description: 'Choisis tes 3 premiers cours gratuits dans le catalogue complet',
    accent: '#F59E0B',
    bgGradient: ['#FFFBEB', '#FEF3C7'],
  },
  {
    icon: '📚',
    title: '3 500+ PDFs',
    description: 'Accès instantané à tout le catalogue Universités & Filières',
    accent: '#2563EB',
    bgGradient: ['#EFF6FF', '#DBEAFE'],
  },
  {
    icon: '🤖',
    title: '5 requêtes IA/jour',
    description: 'Fiches, résumés et quiz générés automatiquement sur tes PDF',
    accent: '#7C3AED',
    bgGradient: ['#F5F3FF', '#EDE9FE'],
  },
  {
    icon: '💳',
    title: 'Wallet dès 500 FCFA',
    description: 'Recharge MTN MoMo ou Orange Money — minimum super accessible',
    accent: '#059669',
    bgGradient: ['#ECFDF5', '#D1FAE5'],
  },
  {
    icon: '📱',
    title: 'Sync multi-appareils',
    description: 'Ton compte, tes achats et ta bibliothèque synchronisés partout',
    accent: '#0891B2',
    bgGradient: ['#ECFEFF', '#CFFAFE'],
  },
  {
    icon: '📥',
    title: 'Mode hors-ligne',
    description: 'Télécharge un PDF une fois, lis-le sans connexion partout',
    accent: '#DC2626',
    bgGradient: ['#FEF2F2', '#FEE2E2'],
  },
];

const GLOW_COLORS = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#0891B2', '#DC2626'];

function BenefitCard({ benefit, index, scrollX }: { benefit: Benefit; index: number; scrollX: Animated.Value }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  
  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.88, 1, 0.88],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [20, 0, 20],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.benefitCard,
        {
          transform: [{ scale }, { translateY }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={benefit.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.benefitCardInner}
      >
        <View style={[styles.iconBadge, { backgroundColor: benefit.accent + '20' }]}>
          <Text style={styles.benefitIcon}>{benefit.icon}</Text>
        </View>
        <Text style={[styles.benefitTitle, { color: benefit.accent }]}>{benefit.title}</Text>
        <Text style={styles.benefitDescription}>{benefit.description}</Text>
        
        {/* Decorative glow dot */}
        <View style={[styles.glowDot, { backgroundColor: benefit.accent }]} />
      </LinearGradient>
    </Animated.View>
  );
}

function ProgressDots({ scrollX, total }: { scrollX: Animated.Value; total: number }) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: i === 0 ? '#2563EB' : '#94A3B8',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the CTA button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const isLast = currentIndex === BENEFITS.length - 1;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={styles.background}
      />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>📘</Text>
        </View>
        <Text style={styles.brandName}>Campus-Bordes</Text>
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>GRATUIT</Text>
        </View>
      </Animated.View>

      {/* Scrollable benefits */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={width}
      >
        {BENEFITS.map((benefit, index) => (
          <BenefitCard
            key={benefit.icon}
            benefit={benefit}
            index={index}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>

      {/* Pagination dots */}
      <ProgressDots scrollX={scrollX} total={BENEFITS.length} />

      {/* Current benefit counter */}
      <Animated.View style={[styles.counterBadge, { opacity: fadeAnim }]}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {BENEFITS.length}
        </Text>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.ctaText}>
          {isLast
            ? 'Prêt à démarrer ?'
            : `Dans ${BENEFITS.length - currentIndex - 1} écran${BENEFITS.length - currentIndex - 1 > 1 ? 's' : ''} encore...`}
        </Text>
        
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={[
              styles.ctaButton,
              isLast && styles.ctaButtonFinal,
            ]}
            onPress={onFinish}
          >
            <LinearGradient
              colors={isLast ? ['#2563EB', '#1D4ED8'] : ['#334155', '#1E293B']}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaButtonText}>
                {isLast ? "C'est parti ! 🎉" : 'Suivant'}
              </Text>
              {!isLast && <Text style={styles.ctaArrow}>→</Text>}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {!isLast && (
          <Pressable onPress={onFinish} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Passer l'introduction</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB40',
  },
  logoText: {
    fontSize: 24,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  freeBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  benefitCard: {
    width: width - 48,
    marginHorizontal: 24,
    height: height * 0.48,
    borderRadius: 28,
    overflow: 'hidden',
  },
  benefitCardInner: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  iconBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  benefitIcon: {
    fontSize: 52,
  },
  benefitTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  benefitDescription: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  glowDot: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.06,
    bottom: -20,
    right: -20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  counterBadge: {
    alignItems: 'center',
    marginBottom: 8,
  },
  counterText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 52,
    alignItems: 'center',
    gap: 16,
  },
  ctaText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  ctaButton: {
    width: width - 64,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonFinal: {
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  ctaArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipLink: {
    paddingVertical: 4,
  },
  skipLinkText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
});
