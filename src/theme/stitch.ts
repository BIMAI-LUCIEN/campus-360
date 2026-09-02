import { Platform, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ── Dark palette — "AI Analyzer" (gradient violet→pink→blue on near-black) ────
// Token NAMES are preserved for compatibility, but the semantics are dark now:
//  · `ink*`   = the foreground/text ramp (light on dark)
//  · `paper*` = the background/surface ramp (dark)
//  · `sienna` = the brand accent (repurposed to violet/pink for solid accents)
export const stitchColors = {
  // Foreground ramp (text) — light on dark
  ink: '#F7F7F8',
  inkSoft: '#E4E4E7',
  inkMuted: '#9A9AA2',
  inkSubtle: '#6E6E78',
  inkFaint: '#33333A',

  // Background / surface ramp — dark élégant et profond
  paper: '#0B0F17',
  paperDeep: '#111622',
  paperSoft: '#182030',

  // Brand accent (solid) — Indigo saphir élégant & moderne
  sienna: '#6366F1',
  siennaDeep: '#4F46E5',
  siennaTone: '#818CF8',
  siennaBg: 'rgba(99, 102, 241, 0.12)',
  siennaSoft: 'rgba(99, 102, 241, 0.20)',

  // Emerald (success / owned / IA) — bright on dark
  emerald: '#34D399',
  emeraldDeep: '#10B981',
  emeraldTone: '#6EE7B7',
  emeraldBg: 'rgba(52, 211, 153, 0.14)',
  emeraldSoft: 'rgba(52, 211, 153, 0.24)',

  // Pure
  white: '#FFFFFF',

  // Semantic
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  warningDeep: '#F59E0B',
  warningBg: 'rgba(251, 191, 36, 0.14)',
  warningTone: '#FCD34D',

  // Modern UI Primary & Secondary
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  primaryContainer: 'rgba(79, 70, 229, 0.14)',
  onPrimaryContainer: '#C7D2FE',
  primaryFixed: 'rgba(79, 70, 229, 0.14)',
  onPrimaryFixed: '#C7D2FE',
  primaryFixedDim: 'rgba(79, 70, 229, 0.22)',
  onPrimaryFixedVariant: '#C7D2FE',
  inversePrimary: '#818CF8',

  secondary: '#3B82F6',
  onSecondary: '#FFFFFF',
  secondaryContainer: 'rgba(59, 130, 246, 0.14)',
  onSecondaryContainer: '#BFDBFE',
  secondaryFixed: 'rgba(59, 130, 246, 0.14)',
  onSecondaryFixed: '#BFDBFE',
  secondaryFixedDim: 'rgba(59, 130, 246, 0.22)',
  onSecondaryFixedVariant: '#BFDBFE',

  tertiary: '#0EA5E9',
  onTertiary: '#FFFFFF',

  background: '#0B0F17',
  onBackground: '#F8FAFC',
  surface: '#111622',
  onSurface: '#F8FAFC',
  surfaceVariant: '#182030',
  onSurfaceVariant: '#94A3B8',

  surfaceContainerLowest: '#0E131E',
  surfaceContainerLow: '#111622',
  surfaceContainer: '#182030',
  surfaceContainerHigh: '#1E283C',
  surfaceContainerHighest: '#27344E',

  inverseSurface: '#F8FAFC',
  inverseOnSurface: '#0B0F17',

  outline: 'rgba(255, 255, 255, 0.08)',
  outlineVariant: 'rgba(255, 255, 255, 0.05)',
  success: '#34D399',
  successContainer: 'rgba(52, 211, 153, 0.14)',
  onError: '#FFFFFF',
  errorContainer: 'rgba(248, 113, 113, 0.14)',
  onErrorContainer: '#FCA5A5',

  // Glass tokens
  glassSurface: '#111622',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderLight: 'rgba(255, 255, 255, 0.12)',
  glassOverlay: 'rgba(0,0,0,0.5)',
  glassCardBg: '#111622',
  glassCardBorder: 'rgba(255, 255, 255, 0.08)',
  glassSurfaceDark: '#0B0F17',
  glassBorderDark: 'rgba(255, 255, 255, 0.06)',
};

// ── Brand gradient — refined Indigo / Sapphire modern tech gradient ─────────
export const brandGradient = {
  colors: ['#4F46E5', '#3B82F6'] as const, // indigo → modern blue
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};
export const brandGradientTwo = {
  colors: ['#4F46E5', '#2563EB'] as const, // indigo → deep blue
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
  DEFAULT: 8,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  card: 18,
  button: 14,
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

// ── Shadows — almost zero. Editorial design uses whitespace, not depth ──────
export const stitchShadows = StyleSheet.create({
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  primary: {},
  secondary: {},
});

// ── Surface presets — solid, no shadow by default ────────────────────────────

/** Sticky chrome (nav bars, wallet card, large containers) */
export const glassPanel = StyleSheet.create({
  light: {
    backgroundColor: stitchColors.surface,
  },
  dark: {
    backgroundColor: stitchColors.inverseSurface,
  },
  /** Bottom nav: solid, floating, no shadow — just a clean top rule */
  bottomNav: {
    backgroundColor: stitchColors.surface,
    borderTopLeftRadius: stitchRadius.lg,
    borderTopRightRadius: stitchRadius.lg,
  },
  /** Top bar: solid, no border, no shadow */
  topBar: {
    backgroundColor: stitchColors.paper,
  },
});

/** Content cards: solid paper-soft, no border, no shadow */
export const glassCard = StyleSheet.create({
  light: {
    backgroundColor: stitchColors.surface,
  },
  dark: {
    backgroundColor: stitchColors.inverseSurface,
  },
  /** Pill chip: paper-soft subtle bg */
  pill: {
    backgroundColor: stitchColors.paperSoft,
  },
  /** Solid card with paper bg */
  solid: {
    backgroundColor: stitchColors.paper,
  },
});

// ── Reusable component presets ───────────────────────────────────────────────

export const stitchComponents = StyleSheet.create({
  // Buttons
  btnPrimary: {
    backgroundColor: stitchColors.ink,
    borderRadius: stitchRadius.sm,
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
    color: stitchColors.paper,
  },
  btnSienna: {
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.sm,
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
    color: stitchColors.paper,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
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
    backgroundColor: stitchColors.ink,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  btnPillInactive: {
    backgroundColor: 'transparent',
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
    borderColor: stitchColors.inkFaint,
    borderWidth: 1,
    borderRadius: stitchRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: stitchColors.ink,
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
    color: stitchColors.ink,
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
    backgroundColor: stitchColors.siennaSoft,
  },
  chipTagSecondary: {
    backgroundColor: stitchColors.inkSoft,
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
    color: stitchColors.siennaDeep,
  },
  chipTagTextSecondary: {
    color: stitchColors.paper,
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalSheet: {
    backgroundColor: stitchColors.paper,
    borderTopLeftRadius: stitchRadius.lg,
    borderTopRightRadius: stitchRadius.lg,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
