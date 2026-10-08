// GlassComponents — "AI Analyzer" dark system.
// Near-black surfaces, violet→pink→blue gradient accent, bold sans, soft radii.
// Component names + prop signatures are preserved for drop-in compatibility.
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
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
  MapPin,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  ArrowRight,
  Heart,
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
  fontFamilies,
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
        backgroundColor: stitchColors.paperSoft,
        borderWidth: 1,
        borderColor: stitchColors.glassBorder,
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

// ─── Card — Clean white surface, subtle border, soft shadow ─────────────────
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
      ? { backgroundColor: stitchColors.paperDeep, borderColor: stitchColors.glassBorder }
      : tone === 'sienna'
        ? { backgroundColor: stitchColors.siennaBg, borderColor: stitchColors.siennaSoft }
        : { backgroundColor: stitchColors.surface, borderColor: stitchColors.paperSoft };
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

// ─── Pill — Clean chip; active = solid royal violet pill ────────────────────
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
      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : '#64748B' }]}>{label}</Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

// ─── EditorialInput — Clean white field, crisp border, violet focus ring ─────
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
  leftIcon,
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
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={style}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        {leftIcon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
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
              <EyeOff size={18} color="#94A3B8" />
            ) : (
              <Eye size={18} color="#94A3B8" />
            )}
          </Pressable>
        )}
        {rightIcon}
      </View>
    </View>
  );
}

// ─── GradientButton — Solid Royal Violet & Electric Violet CTA ───────────────
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
        colors={['#7C3AED', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
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

// ─── SiennaButton — Solid Royal Violet CTA ──────────────────────────────────
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

// ─── SecondaryButton — Clean light surface button ───────────────────────────
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

// ─── BottomNav — Floating Clean White Curved Bar with Solid Violet Pill ──────
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
              <Pressable
                key={key}
                testID={`nav-${key}`}
                accessibilityLabel={label}
                onPress={() => onPress(key)}
                style={({ pressed }) => [styles.navActivePill, pressed && { opacity: 0.9 }]}
              >
                <Icon size={17} color={stitchColors.white} strokeWidth={2.4} />
                <Text style={styles.navActiveLabel}>{label}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={key}
              testID={`nav-${key}`}
              accessibilityLabel={label}
              onPress={() => onPress(key)}
              hitSlop={8}
              style={({ pressed }) => [styles.navInactiveItem, pressed && { opacity: 0.6 }]}
            >
              <Icon size={20} color={stitchColors.inkMuted} strokeWidth={1.8} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── DashboardHubCard — Grande carte blanche arrondie avec icône 3D & flèche ──
export function DashboardHubCard({
  title,
  subtitle,
  icon: Icon,
  iconBg = 'rgba(139, 92, 246, 0.12)',
  iconColor = '#8B5CF6',
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  icon: any;
  iconBg?: string;
  iconColor?: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.hubCard,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        style,
      ]}
    >
      <View style={[styles.hubIconCircle, { backgroundColor: iconBg }]}>
        <Icon size={25} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.hubTextWrap}>
        <Text style={styles.hubTitle}>{title}</Text>
        <Text style={styles.hubSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.hubArrowBtn}>
        <ArrowRight size={15} color="#A78BFA" strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

// ─── DashboardGrid — Grille 2x2 organisant les 4 piliers du Dashboard ────────
export function DashboardGrid({
  onApplyIa,
  onApplications,
  onDocuments,
  onStages,
  style,
}: {
  onApplyIa: () => void;
  onApplications: () => void;
  onDocuments: () => void;
  onStages: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.hubGridWrap, style]}>
      <View style={styles.hubGridRow}>
        <DashboardHubCard
          title="Postuler IA"
          subtitle="Génère CV & lettre ciblés pour décrocher ton stage."
          icon={Sparkles}
          iconBg="rgba(139, 92, 246, 0.15)"
          iconColor="#7C3AED"
          onPress={onApplyIa}
        />
        <DashboardHubCard
          title="Mes Candidatures"
          subtitle="Suis tes postulations et relances en temps réel."
          icon={Briefcase}
          iconBg="rgba(59, 130, 246, 0.15)"
          iconColor="#2563EB"
          onPress={onApplications}
        />
      </View>
      <View style={styles.hubGridRow}>
        <DashboardHubCard
          title="Atelier Rédaction"
          subtitle="Rédige et optimise tes rapports et mémoires."
          icon={FileText}
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="#D97706"
          onPress={onDocuments}
        />
        <DashboardHubCard
          title="Stages & Favoris"
          subtitle="Explore et sauvegarde les meilleures opportunités."
          icon={Heart}
          iconBg="rgba(236, 72, 153, 0.15)"
          iconColor="#DB2777"
          onPress={onStages}
        />
      </View>
    </View>
  );
}

// ─── TopBar — Curved Royal Violet Header with Location & Search ──────────────
export interface TopBarProps {
  appName?: string;
  onBellPress?: () => void;
  hasUnread?: boolean;
  unreadCount?: number;
  onAvatarPress?: () => void;
  avatarInitials?: string;
  locationName?: string;
  universityName?: string;
  onLocationPress?: () => void;
  showLocation?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  onFilterPress?: () => void;
  onSearchPress?: () => void;
  hasActiveFilters?: boolean;
  iaCredits?: number;
  showCredits?: boolean;
  onWalletPress?: () => void;
  style?: ViewStyle;
}

export function TopBar({
  appName = 'Campus 360',
  onBellPress,
  hasUnread = false,
  unreadCount,
  onAvatarPress,
  avatarInitials,
  locationName,
  universityName,
  onLocationPress,
  showLocation = true,
  showSearch = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher un stage, entreprise...',
  onFilterPress,
  onSearchPress,
  hasActiveFilters = false,
  iaCredits,
  showCredits = false,
  onWalletPress,
  style,
}: TopBarProps) {
  const displayLocation = locationName || universityName || 'Yaoundé • Univ. Ydé I';

  return (
    <LinearGradient
      colors={['#7C3AED', '#6D28D9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.topBarCurved, style]}
    >
      {/* ── Row 1: Location Pill & Action Buttons ── */}
      <View style={styles.topBarHeaderRow}>
        {showLocation ? (
          <Pressable
            onPress={onLocationPress}
            style={({ pressed }) => [styles.topBarLocPill, pressed && { opacity: 0.85 }]}
          >
            <MapPin size={14} color={stitchColors.white} strokeWidth={2.2} />
            <Text style={styles.topBarLocText} numberOfLines={1}>
              {displayLocation}
            </Text>
            <ChevronDown size={13} color="rgba(255, 255, 255, 0.85)" />
          </Pressable>
        ) : (
          <View style={styles.topBarBrand}>
            <View style={styles.topBarMark}>
              <Text style={styles.topBarMarkText}>C</Text>
            </View>
            <Text style={styles.topBarNameLight}>{appName}</Text>
          </View>
        )}

        <View style={styles.topBarActions}>
          {showCredits && iaCredits !== undefined && onWalletPress && (
            <Pressable
              onPress={onWalletPress}
              style={({ pressed }) => [styles.topBarCreditsPill, pressed && { opacity: 0.85 }]}
            >
              <Coins size={13} color="#FDE047" />
              <Text style={styles.topBarCreditsText}>{iaCredits} cr</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onBellPress}
            hitSlop={6}
            style={({ pressed }) => [styles.topBarIconCircle, pressed && { opacity: 0.8 }]}
          >
            <Bell size={18} color={stitchColors.white} strokeWidth={2} />
            {hasUnread && (
              <View style={unreadCount && unreadCount > 0 ? styles.topBarNotifBadge : styles.topBarNotifDot}>
                {unreadCount && unreadCount > 0 ? (
                  <Text style={styles.topBarNotifCountText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                ) : null}
              </View>
            )}
          </Pressable>

          {onAvatarPress && (
            <Pressable
              onPress={onAvatarPress}
              hitSlop={4}
              style={({ pressed }) => [styles.topBarAvatarCircle, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.topBarAvatarText}>{avatarInitials ?? 'CB'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Row 2: Integrated Clean White Search Pill ── */}
      {showSearch && (
        <View style={styles.topBarSearchPill}>
          <Search size={18} color={stitchColors.inkSubtle} strokeWidth={2} />
          {onSearchPress && !onSearchChange ? (
            <Pressable onPress={onSearchPress} style={{ flex: 1 }}>
              <Text style={styles.topBarSearchPlaceholder} numberOfLines={1}>
                {searchValue || searchPlaceholder}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor={stitchColors.inkSubtle}
              style={styles.topBarSearchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
          )}
          <Pressable
            onPress={onFilterPress}
            style={({ pressed }) => [
              styles.topBarFilterBtn,
              hasActiveFilters && styles.topBarFilterBtnActive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <SlidersHorizontal
              size={15}
              color={hasActiveFilters ? stitchColors.white : stitchColors.sienna}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      )}
    </LinearGradient>
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
      {/* Book cover (Image 1 style) */}
      <View style={[styles.docCover, { backgroundColor: accent.tint }]}>
        {/* Floating rating badge */}
        <View style={styles.docRatingBadge}>
          <Text style={styles.docRatingStar}>★</Text>
          <Text style={styles.docRatingText}>4.8</Text>
        </View>

        <FileText size={28} color={accent.icon} strokeWidth={1.7} />
        <Text style={[styles.docCoverInitials, { color: accent.icon }]}>{initialsOf(subtitle || title)}</Text>

        {isOwned ? (
          <View style={styles.docOwnedBadge}>
            <Check size={12} color="#FFFFFF" strokeWidth={3} />
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

// ─── LocationHeader — Top bar with Location pin, Uni dropdown, Notifications & Tokens ────
export function LocationHeader({
  universityName = 'Université de Yaoundé I',
  facultyOrCity = 'Cameroun • Faculté des Sciences',
  onLocationPress,
  onBellPress,
  hasUnread = false,
  iaCredits = 10,
  onWalletPress,
  style,
}: {
  universityName?: string;
  facultyOrCity?: string;
  onLocationPress?: () => void;
  onBellPress?: () => void;
  hasUnread?: boolean;
  iaCredits?: number;
  onWalletPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.locHeader, style]}>
      <Pressable
        onPress={onLocationPress}
        style={({ pressed }) => [styles.locLeft, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.locPinBox}>
          <MapPin size={17} color="#7C3AED" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.locTitleRow}>
            <Text style={styles.locTitle} numberOfLines={1}>
              {universityName}
            </Text>
            <ChevronDown size={14} color="#64748B" style={{ marginLeft: 3 }} />
          </View>
          <Text style={styles.locSubtitle} numberOfLines={1}>
            {facultyOrCity}
          </Text>
        </View>
      </Pressable>

      <View style={styles.locActions}>
        <Pressable
          onPress={onBellPress}
          style={({ pressed }) => [styles.locActionBtn, pressed && { opacity: 0.75 }]}
        >
          <Bell size={18} color="#0F172A" strokeWidth={1.9} />
          {hasUnread && <View style={styles.locNotifDot} />}
        </Pressable>

        <Pressable
          onPress={onWalletPress}
          style={({ pressed }) => [styles.locWalletPill, pressed && { opacity: 0.8 }]}
        >
          <Coins size={14} color="#FBBF24" />
          <Text style={styles.locWalletText}>{iaCredits} cr</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── SearchFilterBar — Rounded pill search bar with filter sliders button ────
export function SearchFilterBar({
  value,
  onChangeText,
  placeholder = 'Rechercher un stage, entreprise, document...',
  onFilterPress,
  onSubmitEditing,
  hasActiveFilters = false,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  onSubmitEditing?: () => void;
  hasActiveFilters?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.searchFilterWrap, style]}>
      <View style={styles.searchPill}>
        <Search size={17} color="#94A3B8" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable
          onPress={onFilterPress}
          style={({ pressed }) => [
            styles.searchFilterBtn,
            hasActiveFilters && styles.searchFilterBtnActive,
            pressed && { opacity: 0.7 },
          ]}
        >
          <SlidersHorizontal
            size={16}
            color={hasActiveFilters ? '#FFFFFF' : '#7C3AED'}
            strokeWidth={2}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ─── CategoryGrid — Circular Avatars with Horizontal Scroll & Grid Mode ─────
export interface CategoryItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
}

export function CategoryGrid({
  categories,
  activeId,
  onSelectCategory,
  onSeeAllPress,
  title = 'Filières Populaires',
  seeAllLabel = 'Voir tout',
  horizontal = true,
  style,
}: {
  categories: CategoryItem[];
  activeId?: string;
  onSelectCategory: (id: string) => void;
  onSeeAllPress?: () => void;
  title?: string;
  seeAllLabel?: string;
  horizontal?: boolean;
  style?: ViewStyle;
}) {
  const renderItem = (cat: CategoryItem) => {
    const active = activeId === cat.id;
    const Icon = cat.icon;
    return (
      <Pressable
        key={cat.id}
        onPress={() => onSelectCategory(cat.id)}
        style={({ pressed }) => [
          styles.categoryItemWrap,
          pressed && { opacity: 0.8 },
        ]}
      >
        <View
          style={[
            styles.categoryCircle,
            { backgroundColor: cat.bg || '#F5F3FF' },
            active && styles.categoryCircleActive,
          ]}
        >
          <Icon
            size={22}
            color={active ? stitchColors.white : (cat.color || stitchColors.sienna)}
            strokeWidth={active ? 2.2 : 2}
          />
        </View>
        <Text
          style={[
            styles.categoryItemLabel,
            active && styles.categoryItemLabelActive,
          ]}
          numberOfLines={2}
        >
          {cat.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.categorySection, style]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.categorySectionTitle}>{title}</Text>
        {onSeeAllPress ? (
          <Pressable onPress={onSeeAllPress} hitSlop={8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.seeAllTextViolet}>{seeAllLabel}</Text>
              <ChevronRight size={14} color={stitchColors.sienna} strokeWidth={2.2} />
            </View>
          </Pressable>
        ) : null}
      </View>

      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map(renderItem)}
        </ScrollView>
      ) : (
        <View style={styles.categoryGridWrap}>
          {categories.map(renderItem)}
        </View>
      )}
    </View>
  );
}

// ─── TrustBadgeStrip — 4 horizontal trust & guarantee badges ────────────────
export function TrustBadgeStrip({ style }: { style?: ViewStyle }) {
  const BADGES = [
    { label: 'Entreprises\nVérifiées', icon: ShieldCheck, color: stitchColors.emerald },
    { label: 'Indemnités\nClaires', icon: Coins, color: '#38BDF8' },
    { label: 'Postulation\nIA 1-Clic', icon: Zap, color: '#FBBF24' },
    { label: 'Suivi Direct\nJ+7', icon: Clock, color: '#A78BFA' },
  ];

  return (
    <View style={[styles.trustStrip, style]}>
      {BADGES.map((b, i) => {
        const Icon = b.icon;
        return (
          <View key={i} style={styles.trustItem}>
            <View style={[styles.trustIconCircle, { backgroundColor: b.color + '1A' }]}>
              <Icon size={16} color={b.color} strokeWidth={2.2} />
            </View>
            <Text style={styles.trustLabel}>{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: stitchColors.paperSoft },

  card: {
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    backgroundColor: stitchColors.surface,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  // Pill
  pillActive: {
    backgroundColor: stitchColors.sienna,
    borderWidth: 1,
    borderColor: stitchColors.sienna,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pillInactive: {
    backgroundColor: stitchColors.paperDeep,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillText: { fontFamily: INTER, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },

  // Input
  inputLabel: {
    fontFamily: INTER,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.inkSoft,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: stitchColors.paperDeep,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBoxFocused: {
    borderColor: stitchColors.sienna,
    backgroundColor: stitchColors.surface,
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputText: { flex: 1, fontFamily: INTER, fontSize: 15, color: stitchColors.ink, padding: 0, outlineStyle: 'none', outlineWidth: 0 } as any,
  inputTextMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },

  // Gradient button
  gradBtn: {
    borderRadius: stitchRadius.sm,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 4,
  },
  gradBtnText: { fontFamily: SANS, fontSize: 15, fontWeight: '700', color: stitchColors.white, letterSpacing: 0.2 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  btnSienna: {
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.sm,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnSiennaText: { fontFamily: SANS, fontSize: 15, fontWeight: '700', color: stitchColors.white, letterSpacing: 0.2 },

  btnSecondary: {
    backgroundColor: stitchColors.paperSoft,
    borderRadius: stitchRadius.sm,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: { fontFamily: SANS, fontSize: 15, fontWeight: '600', color: stitchColors.ink },

  // BottomNav — Floating Clean White Capsule
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 8,
    zIndex: 100,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    borderRadius: stitchRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 12,
  },
  navActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  navActiveLabel: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.white,
  },
  navInactiveItem: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: stitchRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dashboard Hub styles
  hubGridWrap: {
    gap: 14,
    width: '100%',
  },
  hubGridRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  hubCard: {
    flex: 1,
    minHeight: 180,
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.xl,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  hubIconCircle: {
    width: 48,
    height: 48,
    borderRadius: stitchRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTextWrap: {
    marginVertical: 8,
  },
  hubTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 16,
    fontWeight: '700',
    color: stitchColors.ink,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  hubSubtitle: {
    fontFamily: INTER,
    fontSize: 11,
    lineHeight: 15,
    color: stitchColors.inkMuted,
  },
  hubArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: stitchColors.siennaBg,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // TopBar — Curved Royal Violet & Legacy Aliases
  topBarCurved: {
    paddingTop: Platform.OS === 'ios' ? 52 : (Platform.OS === 'web' ? 24 : 40),
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  topBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topBarLocPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: stitchRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 10,
  },
  topBarLocText: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.white,
    letterSpacing: 0.1,
  },
  topBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  topBarMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarMarkText: { color: stitchColors.white, fontSize: 16, fontWeight: '800' },
  topBarNameLight: { fontFamily: SANS, fontSize: 18, fontWeight: '700', color: stitchColors.white },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  topBarCreditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: stitchRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topBarCreditsText: { fontFamily: SANS, fontSize: 12, fontWeight: '700', color: stitchColors.white },
  topBarIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarNotifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: stitchColors.error,
    borderWidth: 1.5,
    borderColor: stitchColors.sienna,
  },
  topBarNotifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: stitchColors.error,
    borderWidth: 1.5,
    borderColor: stitchColors.sienna,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarNotifCountText: {
    color: stitchColors.white,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  topBarAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: stitchColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAvatarText: { color: stitchColors.sienna, fontSize: 12.5, fontWeight: '800' },
  topBarSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 10,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  topBarSearchInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 13.5,
    color: stitchColors.ink,
    paddingVertical: 4,
  } as any,
  topBarSearchPlaceholder: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: stitchColors.inkSubtle,
  },
  topBarFilterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarFilterBtnActive: {
    backgroundColor: stitchColors.sienna,
  },
  // Legacy topBar styles
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: stitchColors.surface,
  },
  topBarName: { fontFamily: SANS, fontSize: 19, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 },
  topBarIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // WalletCard
  walletCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.xl,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    padding: 22,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
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
    backgroundColor: stitchColors.sienna,
  },
  walletIAPillText: { fontFamily: SANS, fontSize: 11, fontWeight: '700', color: stitchColors.white, letterSpacing: 0.3 },
  walletBalanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 20, marginBottom: 22 },
  walletBalance: { fontFamily: SANS, fontSize: 48, lineHeight: 50, fontWeight: '800', color: stitchColors.ink, letterSpacing: -1.5 },
  walletBalanceUnit: { fontFamily: SANS, fontSize: 18, fontWeight: '700', color: stitchColors.inkMuted },
  walletFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletFooterKicker: { fontFamily: SANS, fontSize: 13, fontWeight: '700', color: stitchColors.ink },
  walletFooterHint: { fontFamily: INTER, fontSize: 12, color: stitchColors.inkMuted, marginTop: 2 },
  walletRecharge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: stitchRadius.sm,
    backgroundColor: stitchColors.sienna,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  walletRechargeText: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: stitchColors.white, letterSpacing: 0.3 },

  // MetricCard
  metricCard: {
    padding: 18,
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  metricKicker: { fontFamily: INTER, fontSize: 12, letterSpacing: 0.2, color: stitchColors.inkMuted, fontWeight: '600', marginBottom: 8 },
  metricValue: { fontFamily: SANS, fontSize: 28, lineHeight: 32, color: stitchColors.ink, fontWeight: '800', letterSpacing: -0.6 },

  // PackCard
  packCard: {
    width: 280,
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.lg,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 18,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  packCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tagChip: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  tagChipText: { fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.8, color: stitchColors.sienna, fontWeight: '700' },
  packCardDiscount: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: stitchColors.emeraldDeep, letterSpacing: -0.3 },
  packCardTitle: { fontFamily: SANS, fontSize: 18, lineHeight: 24, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.3, marginBottom: 6 },
  packCardDesc: { fontFamily: INTER, fontSize: 12.5, color: stitchColors.inkMuted, lineHeight: 18, marginBottom: 16 },
  packCardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  packCardMeta: { fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: stitchColors.inkMuted, fontWeight: '600', marginBottom: 3 },
  packCardPrice: { fontFamily: SANS, fontSize: 20, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4 },
  packCardCta: { width: 38, height: 38, borderRadius: 19, backgroundColor: stitchColors.sienna, alignItems: 'center', justifyContent: 'center' },
  packCardCtaText: { fontSize: 16, color: stitchColors.white, fontWeight: '700' },

  // DocumentGridCard
  docCard: {
    width: '100%',
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.md,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 10,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  docCover: {
    width: '100%',
    aspectRatio: 1.05,
    borderRadius: stitchRadius.sm,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  docRatingBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: '#FDE047',
    zIndex: 5,
  },
  docRatingStar: {
    fontSize: 9,
    color: '#CA8A04',
  },
  docRatingText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#854D0E',
    fontFamily: MONO,
  },
  docCoverInitials: { fontFamily: SANS, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  docOwnedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: stitchColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  docPriceBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 5,
  },
  docPriceBadgeText: { fontFamily: MONO, fontSize: 10, fontWeight: '800', color: stitchColors.emeraldDeep },
  docCardTitle: { fontFamily: SANS, fontSize: 12.5, lineHeight: 16, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.2 },
  docCardSubtitle: { fontFamily: INTER, fontSize: 10.5, color: stitchColors.inkMuted, marginTop: 3 },

  // TransactionRow
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: stitchColors.paperSoft,
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
    backgroundColor: stitchColors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: { fontFamily: SANS, fontSize: 20, lineHeight: 26, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4, textAlign: 'center' },
  emptyStateBody: { fontFamily: INTER, fontSize: 14, lineHeight: 21, color: stitchColors.inkMuted, textAlign: 'center', maxWidth: 300 },
  emptyStateCta: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: stitchColors.sienna, alignItems: 'center' },
  emptyStateCtaText: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: stitchColors.white, letterSpacing: 0.3 },

  // LocationHeader
  locHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 8,
    paddingBottom: 12,
  },
  locLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 12,
  },
  locPinBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: stitchColors.siennaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locTitle: {
    fontFamily: SANS,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  locSubtitle: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: stitchColors.inkMuted,
    marginTop: 1,
  },
  locActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  locNotifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: stitchColors.error,
  },
  locWalletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.28)',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: stitchRadius.full,
  },
  locWalletText: {
    fontFamily: SANS,
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },

  // SearchFilterBar
  searchFilterWrap: {
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 16,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 13.5,
    color: stitchColors.ink,
    padding: 0,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
  searchFilterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilterBtnActive: {
    backgroundColor: stitchColors.sienna,
  },

  // CategoryGrid — Circular Avatars
  categorySection: {
    paddingHorizontal: stitchSpacing.containerMargin,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categorySectionTitle: {
    fontFamily: SANS,
    fontSize: 18,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.3,
  },
  seeAllTextViolet: {
    fontFamily: INTER,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.sienna,
  },
  seeAllText: {
    fontFamily: INTER,
    fontSize: 12.5,
    fontWeight: '600',
    color: stitchColors.sienna,
  },
  categoryScrollContent: {
    gap: 14,
    paddingRight: 20,
  },
  categoryGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryItemWrap: {
    alignItems: 'center',
    width: 76,
  },
  categoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  categoryCircleActive: {
    backgroundColor: stitchColors.sienna,
    borderColor: stitchColors.sienna,
    shadowColor: stitchColors.sienna,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryItemLabel: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '600',
    color: stitchColors.ink,
    textAlign: 'center',
    marginTop: 8,
  },
  categoryItemLabelActive: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },
  // Legacy aliases
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: 76,
    alignItems: 'center',
  },
  categoryCardActive: {},
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '600',
    color: stitchColors.ink,
    textAlign: 'center',
  },

  // TrustBadgeStrip
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: stitchColors.surface,
    borderWidth: 1,
    borderColor: stitchColors.paperSoft,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: stitchSpacing.containerMargin,
    marginBottom: 24,
    shadowColor: stitchColors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  trustIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: {
    fontFamily: INTER,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '600',
    color: stitchColors.inkSoft,
    textAlign: 'center',
  },
});
