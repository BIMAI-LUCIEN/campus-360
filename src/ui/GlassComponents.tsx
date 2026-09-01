// GlassComponents — "AI Analyzer" dark system.
// Near-black surfaces, violet→pink→blue gradient accent, bold sans, soft radii.
// Component names + prop signatures are preserved for drop-in compatibility.
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import {
  Bell,
  Home,
  Search,
  User,
  BookOpen,
  FileText,
  Wallet,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Briefcase,
  Layers,
} from 'lucide-react-native';

// Cover accents — give each PDF tile a distinct hue (comic-shelf feel).
const COVER_ACCENTS = [
  { icon: '#60A5FA', tint: 'rgba(96,165,250,0.16)' },
  { icon: '#F472B6', tint: 'rgba(244,114,182,0.16)' },
  { icon: '#FBBF24', tint: 'rgba(251,191,36,0.16)' },
  { icon: '#A855F7', tint: 'rgba(168,85,247,0.16)' },
  { icon: '#34D399', tint: 'rgba(52,211,153,0.16)' },
  { icon: '#38BDF8', tint: 'rgba(56,189,248,0.16)' },
];
const pickAccent = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_ACCENTS[h % COVER_ACCENTS.length];
};
const initialsOf = (s: string) =>
  s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'PDF';

import {
  stitchColors,
  stitchSpacing,
  stitchRadius,
  stitchTypography,
  brandGradient,
} from '../theme/stitch';

const SANS = Platform.select({ ios: 'System', android: 'sans-serif-medium', web: 'Outfit, sans-serif' }) as string;
const INTER = Platform.select({ ios: 'System', android: 'sans-serif', web: 'Inter, sans-serif' }) as string;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string;

// ─── InkRule — thin divider ──────────────────────────────────────────────────
export function InkRule({ style }: { style?: ViewStyle }) {
  return <View style={[styles.rule, style]} />;
}

// Five destinations keep the student's complete journey one tap away.
const NAV_ITEMS = [
  { key: 'home', label: 'Accueil', Icon: Home },
  { key: 'stages', label: 'Stages', Icon: Briefcase },
  { key: 'documents', label: 'Créer', Icon: FileText },
  { key: 'resources', label: 'Ressources', Icon: BookOpen },
  { key: 'account', label: 'Profil', Icon: User },
] as const;

// ─── GradientText — the signature gradient headline (SVG-based) ──────────────
export function GradientText({
  text,
  size = 26,
  weight = '700',
  colors = brandGradient.colors as unknown as string[],
  style,
}: {
  text: string;
  size?: number;
  weight?: TextStyle['fontWeight'];
  colors?: string[];
  style?: ViewStyle;
}) {
  const [width, setWidth] = React.useState(0);
  const rawId = React.useId();
  const gradId = 'gt' + rawId.replace(/[^a-zA-Z0-9]/g, '');
  const height = Math.ceil(size * 1.32);

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              {colors.map((c, i) => (
                <Stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={c} />
              ))}
            </SvgGradient>
          </Defs>
          <SvgText
            fill={`url(#${gradId})`}
            fontSize={size}
            fontWeight={weight as string}
            fontFamily={SANS}
            x={0}
            y={size}
          >
            {text}
          </SvgText>
        </Svg>
      ) : (
        // Visible solid fallback until measured — never blank.
        <Text style={{ fontFamily: SANS, fontSize: size, fontWeight: weight, color: colors[1] ?? colors[0], height }}>
          {text}
        </Text>
      )}
    </View>
  );
}

// ─── Backward-compat aliases ─────────────────────────────────────────────────
export const GlassPanel = Card;
export const GlassCard = Card;
export const GlassPill = Pill;
export const GlassInput = EditorialInput;
export const IconButton = (props: { onPress: () => void; icon: React.ReactNode; size?: number; style?: ViewStyle }) => (
  <Pressable
    onPress={props.onPress}
    style={({ pressed }) => [
      {
        width: props.size ?? 44,
        height: props.size ?? 44,
        borderRadius: (props.size ?? 44) / 2,
        backgroundColor: stitchColors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
      },
      pressed && { opacity: 0.7 },
      props.style,
    ]}
  >
    {props.icon}
  </Pressable>
);

// ─── Card — dark surface, hairline border ────────────────────────────────────
export function Card({
  style,
  children,
  tone = 'paper',
}: {
  style?: ViewStyle;
  children: React.ReactNode;
  tone?: 'paper' | 'ink' | 'sienna';
}) {
  const toneStyle =
    tone === 'ink'
      ? { backgroundColor: stitchColors.surfaceContainerHigh, borderColor: stitchColors.glassBorder }
      : tone === 'sienna'
        ? { backgroundColor: stitchColors.siennaBg, borderColor: stitchColors.siennaSoft }
        : { backgroundColor: stitchColors.surface, borderColor: stitchColors.glassBorder };
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

// ─── Pill — dark chip; active = filled brand ─────────────────────────────────
export function Pill({
  label,
  active = false,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const content = (
    <View style={[active ? styles.pillActive : styles.pillInactive, style]}>
      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : stitchColors.inkMuted }]}>{label}</Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

// ─── EditorialInput — dark field, mono label ─────────────────────────────────
export function EditorialInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  showPasswordToggle,
  showPassword,
  onTogglePassword,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline,
  style,
  rightIcon,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  style?: ViewStyle;
  rightIcon?: React.ReactNode;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={style}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={stitchColors.inkSubtle}
          style={[styles.inputText, multiline && styles.inputTextMulti]}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showPasswordToggle && (
          <Pressable onPress={onTogglePassword} hitSlop={8}>
            {showPassword ? (
              <EyeOff size={18} color={stitchColors.inkSubtle} />
            ) : (
              <Eye size={18} color={stitchColors.inkSubtle} />
            )}
          </Pressable>
        )}
        {rightIcon}
      </View>
    </View>
  );
}

// ─── GradientButton — the signature CTA ──────────────────────────────────────
export function GradientButton({
  label,
  onPress,
  fluid,
  disabled,
  loading,
  icon,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  fluid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        fluid && { width: '100%' },
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.9 },
        style,
      ]}
    >
      <LinearGradient
        colors={brandGradient.colors}
        start={brandGradient.horizontal.start}
        end={brandGradient.horizontal.end}
        style={styles.gradBtn}
      >
        <View style={styles.btnRow}>
          {icon}
          <Text style={[styles.gradBtnText, textStyle]}>{loading ? 'Patiente…' : label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// PrimaryButton is now the gradient CTA (drop-in for existing screens).
export const PrimaryButton = GradientButton;

// ─── SiennaButton — solid pink alt CTA ───────────────────────────────────────
export function SiennaButton({
  label,
  onPress,
  fluid,
  disabled,
  style,
  textStyle,
  icon,
}: {
  label: string;
  onPress: () => void;
  fluid?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btnSienna,
        fluid && { width: '100%' },
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.9 },
        style,
      ]}
    >
      <View style={styles.btnRow}>
        {icon}
        <Text style={[styles.btnSiennaText, textStyle]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── SecondaryButton — dark surface button ───────────────────────────────────
export function SecondaryButton({
  label,
  onPress,
  fluid,
  disabled,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  fluid?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btnSecondary,
        fluid && { width: '100%' },
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.btnSecondaryText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

// ─── BottomNav — floating dark bar, active = gradient pill ───────────────────
export function BottomNav({
  activeSection,
  onPress,
}: {
  activeSection: string;
  onPress: (section: string) => void;
}) {
  return (
    <View style={styles.bottomNavWrap} pointerEvents="box-none">
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = activeSection === key;
          if (active) {
            return (
              <Pressable key={key} onPress={() => onPress(key)} style={styles.navItem}>
                <LinearGradient
                  colors={brandGradient.colors}
                  start={brandGradient.horizontal.start}
                  end={brandGradient.horizontal.end}
                  style={styles.navPill}
                >
                  <Icon size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.navPillText} numberOfLines={1}>{label}</Text>
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable key={key} onPress={() => onPress(key)} style={styles.navItem}>
              <Icon size={19} color={stitchColors.inkSubtle} strokeWidth={1.9} />
              <Text style={styles.navLabelInactive} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── TopBar — dark, gradient brand mark ──────────────────────────────────────
export function TopBar({
  appName = 'Campus 360',
  onBellPress,
  hasUnread = false,
  onAvatarPress,
  avatarInitials,
}: {
  appName?: string;
  onBellPress: () => void;
  hasUnread?: boolean;
  onAvatarPress?: () => void;
  avatarInitials?: string;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarBrand}>
        <LinearGradient
          colors={brandGradient.colors}
          start={brandGradient.horizontal.start}
          end={brandGradient.horizontal.end}
          style={styles.topBarMark}
        >
          <Text style={styles.topBarMarkText}>C</Text>
        </LinearGradient>
        <Text style={styles.topBarName}>{appName}</Text>
      </View>

      <View style={styles.topBarActions}>
        <Pressable onPress={onBellPress} hitSlop={8} style={styles.topBarIconBtn}>
          <Bell size={20} color={stitchColors.ink} strokeWidth={1.75} />
          {hasUnread && <View style={styles.topBarNotifDot} />}
        </Pressable>
        {onAvatarPress && (
          <Pressable onPress={onAvatarPress} hitSlop={4}>
            <LinearGradient
              colors={brandGradient.colors}
              start={brandGradient.horizontal.start}
              end={brandGradient.horizontal.end}
              style={styles.topBarAvatar}
            >
              <Text style={styles.topBarAvatarText}>{avatarInitials ?? 'CB'}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── WalletCard — dark card, big balance, gradient recharge ──────────────────
export function WalletCard({
  balance,
  iaCredits,
  formatCoins,
  onRecharge,
}: {
  balance: number;
  iaCredits: number;
  formatCoins: (n: number) => string;
  onRecharge: () => void;
}) {
  return (
    <View style={styles.walletCard}>
      <View style={styles.walletTopRow}>
        <Text style={styles.walletKicker}>PORTEFEUILLE</Text>
        <LinearGradient
          colors={brandGradient.colors}
          start={brandGradient.horizontal.start}
          end={brandGradient.horizontal.end}
          style={styles.walletIAPill}
        >
          <Sparkles size={11} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.walletIAPillText}>{iaCredits} IA</Text>
        </LinearGradient>
      </View>

      <View style={styles.walletBalanceRow}>
        <Text style={styles.walletBalance}>{formatCoins(balance)}</Text>
        <Text style={styles.walletBalanceUnit}> C</Text>
      </View>

      <View style={styles.walletFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletFooterKicker}>Coins PDF & IA</Text>
          <Text style={styles.walletFooterHint}>Recharge via MoMo / Orange Money</Text>
        </View>
        <Pressable onPress={onRecharge} style={({ pressed }) => pressed && { opacity: 0.9 }}>
          <LinearGradient
            colors={brandGradient.colors}
            start={brandGradient.horizontal.start}
            end={brandGradient.horizontal.end}
            style={styles.walletRecharge}
          >
            <Text style={styles.walletRechargeText}>Recharger</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── MetricCard — dark tile, big number ──────────────────────────────────────
export function MetricCard({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.metricCard, style]}>
      <Text style={styles.metricKicker}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

// ─── PackCard — dark poster ──────────────────────────────────────────────────
export function PackCard({
  title,
  description,
  price,
  documentCount,
  discountPercent,
  tag,
  onPress,
  onBuy,
  style,
}: {
  title: string;
  description: string;
  price: string;
  documentCount?: number;
  discountPercent?: number;
  tag?: string;
  onPress: () => void;
  onBuy?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.packCard, pressed && { opacity: 0.92 }, style]}>
      <View style={styles.packCardTop}>
        <View style={styles.tagChip}>
          <Text style={styles.tagChipText}>{tag?.toUpperCase() || 'PACK'}</Text>
        </View>
        {discountPercent !== undefined && discountPercent > 0 ? (
          <Text style={styles.packCardDiscount}>−{discountPercent}%</Text>
        ) : null}
      </View>

      <Text style={styles.packCardTitle} numberOfLines={2}>{title}</Text>
      {description ? <Text style={styles.packCardDesc} numberOfLines={2}>{description}</Text> : null}

      <View style={styles.packCardFooter}>
        <View>
          {documentCount !== undefined && <Text style={styles.packCardMeta}>{documentCount} PDF</Text>}
          <Text style={styles.packCardPrice}>{price}</Text>
        </View>
        {onBuy && (
          <Pressable onPress={onBuy} hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.8 }}>
            <LinearGradient
              colors={brandGradient.colors}
              start={brandGradient.horizontal.start}
              end={brandGradient.horizontal.end}
              style={styles.packCardCta}
            >
              <Text style={styles.packCardCtaText}>→</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ─── DocumentGridCard — dark poster ──────────────────────────────────────────
export function DocumentGridCard({
  title,
  subtitle,
  price,
  isOwned,
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  price?: string;
  isOwned?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const accent = pickAccent(title + (subtitle ?? ''));
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.docCard, pressed && { opacity: 0.85 }, style]}>
      {/* Square cover */}
      <View style={[styles.docCover, { backgroundColor: accent.tint }]}>
        <FileText size={26} color={accent.icon} strokeWidth={1.7} />
        <Text style={[styles.docCoverInitials, { color: accent.icon }]}>{initialsOf(subtitle || title)}</Text>
        {isOwned ? (
          <View style={styles.docOwnedBadge}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : price ? (
          <View style={styles.docPriceBadge}>
            <Text style={styles.docPriceBadgeText}>{price}</Text>
          </View>
        ) : null}
      </View>

      {/* Caption */}
      <Text style={styles.docCardTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.docCardSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </Pressable>
  );
}

// ─── TransactionRow — dark list row ──────────────────────────────────────────
export function TransactionRow({
  label,
  date,
  amount,
  type,
  formatCoins,
}: {
  label: string;
  date: string;
  amount: number;
  type: 'topup' | 'purchase' | 'withdrawal' | 'commission' | 'report' | 'stage_token' | 'subscription';
  formatCoins: (n: number) => string;
}) {
  const isPositive = amount > 0;
  const iconColor =
    type === 'topup' || type === 'stage_token' ? stitchColors.emerald
    : type === 'commission' || type === 'report' || type === 'subscription' ? stitchColors.sienna
    : stitchColors.inkMuted;
  const Icon =
    type === 'topup' || type === 'withdrawal' || type === 'stage_token' ? Wallet
    : type === 'commission' || type === 'subscription' ? Sparkles
    : FileText;

  return (
    <View style={styles.txRow}>
      <View style={styles.txIcon}>
        <Icon size={15} color={iconColor} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.txDate}>{date}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isPositive ? stitchColors.emerald : stitchColors.ink }]}>
        {isPositive ? '+' : '−'}{formatCoins(Math.abs(amount))}
      </Text>
    </View>
  );
}

// ─── ScreenMasthead — direct page header (no editorial rule) ─────────────────
export function ScreenMasthead({
  kicker,
  title,
  subtitle,
  folio,
  action,
  style,
}: {
  kicker: string;
  title: React.ReactNode;
  subtitle?: string;
  folio?: string;
  action?: React.ReactNode;
  titleAccent?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.masthead, style]}>
      <View style={styles.mastheadTop}>
        <Text style={styles.mastheadKicker}>{kicker}</Text>
        {action ?? (folio ? <Text style={styles.mastheadFolio}>{folio}</Text> : null)}
      </View>
      <Text style={styles.mastheadTitle}>{title}</Text>
      {subtitle ? <Text style={styles.mastheadSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ─── SectionHeading — in-page section header ─────────────────────────────────
export function SectionHeading({
  kicker,
  title,
  actionLabel,
  onAction,
  style,
}: {
  kicker: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.sectionHeadingRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionHeadingKicker}>{kicker}</Text>
        <Text style={styles.sectionHeadingTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.sectionHeadingAction}>{actionLabel} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── EmptyState — dark zero state ────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onCta,
  style,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.emptyState, style]}>
      {icon ? <View style={styles.emptyStateIcon}>{icon}</View> : null}
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {body ? <Text style={styles.emptyStateBody}>{body}</Text> : null}
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} style={({ pressed }) => pressed && { opacity: 0.9 }}>
          <LinearGradient
            colors={brandGradient.colors}
            start={brandGradient.horizontal.start}
            end={brandGradient.horizontal.end}
            style={styles.emptyStateCta}
          >
            <Text style={styles.emptyStateCtaText}>{ctaLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: stitchColors.glassBorder },

  card: {
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },

  // Pill
  pillActive: {
    backgroundColor: stitchColors.siennaDeep,
    borderRadius: stitchRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  pillInactive: {
    backgroundColor: stitchColors.surfaceContainer,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  pillText: { fontFamily: INTER, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },

  // Input
  inputLabel: {
    fontFamily: INTER,
    fontSize: 12,
    fontWeight: '600',
    color: stitchColors.inkMuted,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: stitchColors.surfaceContainerLowest,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBoxFocused: { borderColor: stitchColors.sienna },
  inputText: { flex: 1, fontFamily: INTER, fontSize: 16, color: stitchColors.ink, padding: 0, outlineStyle: 'none', outlineWidth: 0 } as any,
  inputTextMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },

  // Gradient button
  gradBtn: {
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradBtnText: { fontFamily: SANS, fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  btnSienna: {
    backgroundColor: stitchColors.secondary,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSiennaText: { fontFamily: SANS, fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  btnSecondary: {
    backgroundColor: stitchColors.surfaceContainerHigh,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: { fontFamily: SANS, fontSize: 15, fontWeight: '600', color: stitchColors.ink },

  // BottomNav
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: stitchColors.surfaceContainer,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 44, height: 48 },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: stitchRadius.full,
  },
  navPillText: { fontFamily: SANS, fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  navLabelInactive: { fontFamily: SANS, fontSize: 10, fontWeight: '600', color: stitchColors.inkSubtle, marginTop: 2 },

  // TopBar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: stitchColors.background,
  },
  topBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: stitchRadius.md,
  },
  topBarMarkText: { fontFamily: SANS, color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 22 },
  topBarName: { fontFamily: SANS, fontSize: 19, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.3 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarNotifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: stitchColors.secondary,
  },
  topBarAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topBarAvatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // WalletCard
  walletCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 22,
  },
  walletTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletKicker: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.8, color: stitchColors.inkMuted, fontWeight: '700' },
  walletIAPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: stitchRadius.full,
  },
  walletIAPillText: { fontFamily: SANS, fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  walletBalanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 20, marginBottom: 22 },
  walletBalance: { fontFamily: SANS, fontSize: 48, lineHeight: 50, fontWeight: '800', color: stitchColors.ink, letterSpacing: -1.5 },
  walletBalanceUnit: { fontFamily: SANS, fontSize: 18, fontWeight: '700', color: stitchColors.inkMuted },
  walletFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletFooterKicker: { fontFamily: SANS, fontSize: 13, fontWeight: '700', color: stitchColors.ink },
  walletFooterHint: { fontFamily: INTER, fontSize: 12, color: stitchColors.inkMuted, marginTop: 2 },
  walletRecharge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: stitchRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletRechargeText: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  // MetricCard
  metricCard: {
    padding: 18,
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  metricKicker: { fontFamily: INTER, fontSize: 12, letterSpacing: 0.2, color: stitchColors.inkMuted, fontWeight: '600', marginBottom: 8 },
  metricValue: { fontFamily: SANS, fontSize: 28, lineHeight: 32, color: stitchColors.ink, fontWeight: '800', letterSpacing: -0.6 },

  // PackCard
  packCard: {
    width: 280,
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 20,
  },
  packCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tagChip: {
    backgroundColor: stitchColors.siennaBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: stitchRadius.full,
  },
  tagChipText: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: stitchColors.sienna, fontWeight: '700' },
  packCardDiscount: { fontFamily: SANS, fontSize: 15, fontWeight: '800', color: stitchColors.sienna, letterSpacing: -0.3 },
  packCardTitle: { fontFamily: SANS, fontSize: 20, lineHeight: 26, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4, marginBottom: 8 },
  packCardDesc: { fontFamily: INTER, fontSize: 13, color: stitchColors.inkMuted, lineHeight: 19, marginBottom: 18 },
  packCardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  packCardMeta: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: stitchColors.inkMuted, fontWeight: '700', marginBottom: 4 },
  packCardPrice: { fontFamily: SANS, fontSize: 22, fontWeight: '800', color: stitchColors.ink, letterSpacing: -0.5 },
  packCardCta: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  packCardCtaText: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },

  // DocumentGridCard — square cover tile (3-col comic-shelf grid)
  docCard: {
    width: '100%',
  },
  docCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  docCoverInitials: { fontFamily: SANS, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  docOwnedBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: stitchColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPriceBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: stitchRadius.full,
  },
  docPriceBadgeText: { fontFamily: SANS, fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  docCardTitle: { fontFamily: SANS, fontSize: 12.5, lineHeight: 16, fontWeight: '600', color: stitchColors.ink, letterSpacing: -0.1 },
  docCardSubtitle: { fontFamily: INTER, fontSize: 11, color: stitchColors.inkMuted, marginTop: 1 },

  // TransactionRow
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: stitchColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txLabel: { fontFamily: INTER, fontSize: 14, fontWeight: '600', color: stitchColors.ink },
  txDate: { fontFamily: MONO, fontSize: 10, color: stitchColors.inkMuted, marginTop: 2, letterSpacing: 0.4 },
  txAmount: { fontFamily: SANS, fontSize: 16, fontWeight: '800' },

  // ScreenMasthead
  masthead: { marginBottom: 24 },
  mastheadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, minHeight: 16 },
  mastheadKicker: { fontFamily: MONO, fontSize: 11, letterSpacing: 1.6, color: stitchColors.sienna, fontWeight: '700', textTransform: 'uppercase' },
  mastheadFolio: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: stitchColors.inkMuted, fontWeight: '700' },
  mastheadTitle: { fontFamily: SANS, fontSize: 30, lineHeight: 36, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.7 },
  mastheadSubtitle: { fontFamily: INTER, fontSize: 14, lineHeight: 20, color: stitchColors.inkMuted, marginTop: 8 },

  // SectionHeading
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  sectionHeadingKicker: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, color: stitchColors.sienna, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  sectionHeadingTitle: { fontFamily: SANS, fontSize: 21, lineHeight: 26, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4 },
  sectionHeadingAction: { fontFamily: INTER, fontSize: 13, fontWeight: '700', color: stitchColors.sienna, letterSpacing: 0.1 },

  // EmptyState
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyStateIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: stitchColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: { fontFamily: SANS, fontSize: 20, lineHeight: 26, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4, textAlign: 'center' },
  emptyStateBody: { fontFamily: INTER, fontSize: 14, lineHeight: 21, color: stitchColors.inkMuted, textAlign: 'center', maxWidth: 300 },
  emptyStateCta: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: stitchRadius.button, alignItems: 'center' },
  emptyStateCtaText: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
