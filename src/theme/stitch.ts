import { Platform, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ── Clean White & Royal Violet Design System Foundation ──────────────────────────
// High-contrast, PropTech & neo-workspace inspired design tokens:
//  · `ink*`   = Foreground ramp (Deep Slate Black #0F172A on white)
//  · `paper*` = Background & Surface ramp (Clean White #FFFFFF & Slate 50 #F8FAFC)
//  · `sienna` = Brand accent (Royal Violet #7C3AED & Electric Violet #8B5CF6)
export const stitchColors = {
  // Foreground ramp (text) — crisp deep slate black on white
  ink: '#0F172A',
  inkSoft: '#334155',
  inkMuted: '#64748B',
  inkSubtle: '#94A3B8',
  inkFaint: '#94A3B8',

  // Background / surface ramp — Clean White & Subtle Slate 50
  paper: '#FFFFFF',
  paperDeep: '#F8FAFC',
  paperSoft: '#F1F5F9',

  // Brand accent (solid) — Royal Violet & Electric Purple
  sienna: '#7C3AED',
  siennaDeep: '#6D28D9',
  siennaTone: '#8B5CF6',
  siennaBg: 'rgba(124, 58, 237, 0.08)',
  siennaSoft: 'rgba(124, 58, 237, 0.14)',

  // Emerald (success / stipends / verified) — accessible on light white
  emerald: '#10B981',
  emeraldDeep: '#059669',
  emeraldTone: '#059669',
  emeraldBg: 'rgba(16, 185, 129, 0.08)',
  emeraldSoft: 'rgba(16, 185, 129, 0.16)',

  // Pure
  white: '#FFFFFF',

  // Semantic
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.08)',
  warning: '#D97706',
  warningDeep: '#B45309',
  warningBg: 'rgba(245, 158, 11, 0.08)',
  warningTone: '#F59E0B',

  // Modern UI Primary & Secondary — Royal Violet & Electric Violet
  primary: '#7C3AED',
  onPrimary: '#FFFFFF',
  primaryContainer: 'rgba(124, 58, 237, 0.08)',
  onPrimaryContainer: '#7C3AED',
  primaryFixed: 'rgba(124, 58, 237, 0.08)',
  onPrimaryFixed: '#7C3AED',
  primaryFixedDim: 'rgba(124, 58, 237, 0.14)',
  onPrimaryFixedVariant: '#6D28D9',
  inversePrimary: '#8B5CF6',

  secondary: '#8B5CF6',
  onSecondary: '#FFFFFF',
  secondaryContainer: 'rgba(139, 92, 246, 0.08)',
  onSecondaryContainer: '#6D28D9',
  secondaryFixed: 'rgba(139, 92, 246, 0.08)',
  onSecondaryFixed: '#6D28D9',
  secondaryFixedDim: 'rgba(139, 92, 246, 0.14)',
  onSecondaryFixedVariant: '#6D28D9',

  tertiary: '#0284C7',
  onTertiary: '#FFFFFF',

  background: '#F8FAFC',
  onBackground: '#0F172A',
  surface: '#FFFFFF',
  onSurface: '#0F172A',
  surfaceVariant: '#F1F5F9',
  onSurfaceVariant: '#64748B',

  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#F8FAFC',
  surfaceContainerHigh: '#F1F5F9',
  surfaceContainerHighest: '#CBD5E1',

  inverseSurface: '#0F172A',
  inverseOnSurface: '#FFFFFF',

  outline: '#CBD5E1',
  outlineVariant: '#F1F5F9',
  success: '#10B981',
  successContainer: 'rgba(16, 185, 129, 0.08)',
  onError: '#FFFFFF',
  errorContainer: 'rgba(239, 68, 68, 0.08)',
  onErrorContainer: '#B91C1C',

  // Clean White Surface & Card tokens
  glassSurface: '#FFFFFF',
  glassBorder: '#E2E8F0',
  glassBorderLight: 'rgba(124, 58, 237, 0.08)',
  glassOverlay: 'rgba(15, 23, 42, 0.45)',
  glassCardBg: '#FFFFFF',
  glassCardBorder: '#E2E8F0',
  glassSurfaceDark: '#0F172A',
  glassBorderDark: 'rgba(15, 23, 42, 0.10)',
};

// ── Brand gradient — Luminous Royal Violet to Electric Violet ──────────────
export const brandGradient = {
  colors: ['#7C3AED', '#8B5CF6', '#A78BFA'] as const,
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};
export const brandGradientTwo = {
  colors: ['#7C3AED', '#6D28D9'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
};

export const stitchSpacing = {
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  gutter: 16,
  containerMargin: width < 390 ? 20 : 24,
  safeAreaBottom: 20,
};

export const stitchRadius = {
  DEFAULT: 10,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  card: 20,
  button: 16,
  full: 9999,
};

// ── Font families ────────────────────────────────────────────────────────────
const outfitFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  web: 'Outfit, sans-serif',
}) as string;

const interFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'Inter, sans-serif',
}) as string;

const serifFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
}) as string;

const serifItalicFamily = Platform.select({
  ios: 'Georgia-Italic',
  android: 'serif',
  web: 'Georgia, serif',
}) as string;

const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  web: 'monospace',
}) as string;

// ── Font families — the single source of truth for type stacks ───────────────
// Screens must import these instead of re-declaring `Platform.select` inline.
export const fontFamilies = {
  serif: serifFamily,
  serifItalic: serifItalicFamily,
  outfit: outfitFamily,
  inter: interFamily,
  sans: interFamily,
  mono: monoFamily,
};

// ── Typography — committed editorial scale ───────────────────────────────────
export const stitchTypography = StyleSheet.create({
  // Display (bold sans — direct, no serif in dark UI)
  displayHero: {
    fontFamily: outfitFamily,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.8,
  },
  displayLg: {
    fontFamily: outfitFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.6,
  },
  displayMd: {
    fontFamily: outfitFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.4,
  },
  displaySm: {
    fontFamily: outfitFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  // Sans display (outfit)
  headlineXl: {
    fontFamily: outfitFamily,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  headlineLg: {
    fontFamily: outfitFamily,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  headlineLgMobile: {
    fontFamily: outfitFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  headlineMd: {
    fontFamily: outfitFamily,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  // Italic body
  bodyItalic: {
    fontFamily: serifItalicFamily,
    fontSize: 16,
    lineHeight: 24,
    color: stitchColors.inkMuted,
  },
  // Body sans
  bodyLg: {
    fontFamily: interFamily,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
    color: stitchColors.inkMuted,
  },
  bodyMd: {
    fontFamily: interFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: stitchColors.inkMuted,
  },
  bodySm: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: stitchColors.inkMuted,
  },
  // Mono kicker
  monoKicker: {
    fontFamily: monoFamily,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: stitchColors.sienna,
    textTransform: 'uppercase' as const,
  },
  monoEyebrow: {
    fontFamily: monoFamily,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  // Labels
  labelMd: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  labelSm: {
    fontFamily: interFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: stitchColors.inkMuted,
  },
  labelMonoSm: {
    fontFamily: monoFamily,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    fontWeight: '700',
    color: stitchColors.ink,
  },
});

// ── Shadows — Ultra-soft elevation shadows (0F172A at 4-6% opacity) ─────────
export const stitchShadows = StyleSheet.create({
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 8,
  },
  primary: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
});

// ── Surface presets ──────────────────────────────────────────────────────────
export const glassPanel = StyleSheet.create({
  light: {
    backgroundColor: stitchColors.surface,
  },
  dark: {
    backgroundColor: stitchColors.inverseSurface,
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  topBar: {
    backgroundColor: stitchColors.primary,
  },
});

export const glassCard = StyleSheet.create({
  light: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.card,
  },
  dark: {
    backgroundColor: stitchColors.inverseSurface,
  },
  pill: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderRadius: stitchRadius.full,
  },
  solid: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.card,
  },
});

// ── Reusable component presets ───────────────────────────────────────────────

export const stitchComponents = StyleSheet.create({
  // Buttons
  btnPrimary: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnPrimaryText: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSienna: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnSiennaText: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSecondary: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnSecondaryText: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnGhostText: {
    fontFamily: interFamily,
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  btnPillActive: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  btnPillInactive: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  btnPillText: {
    fontFamily: interFamily,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Inputs
  inputWrapper: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: stitchColors.primary,
    borderWidth: 1,
  },
  inputText: {
    fontFamily: interFamily,
    fontSize: 16,
    lineHeight: 22,
    color: stitchColors.ink,
  },
  inputPlaceholder: {
    color: stitchColors.inkSubtle,
  },
  inputLabel: {
    fontFamily: monoFamily,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },

  // Chip / Tag
  chipTag: {
    borderRadius: stitchRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipTagPrimary: {
    backgroundColor: stitchColors.siennaBg,
  },
  chipTagSecondary: {
    backgroundColor: stitchColors.surfaceContainerLow,
  },
  chipTagError: {
    backgroundColor: stitchColors.errorBg,
  },
  chipTagText: {
    fontFamily: monoFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chipTagTextPrimary: {
    color: stitchColors.primary,
  },
  chipTagTextSecondary: {
    color: stitchColors.inkMuted,
  },
  chipTagTextError: {
    color: stitchColors.error,
  },

  // Avatar
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  // Nav item
  navItemActive: {},
  navItemInactive: {},

  // Bottom sheet / modal overlay
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end' as const,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: stitchRadius.xl,
    borderTopRightRadius: stitchRadius.xl,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
