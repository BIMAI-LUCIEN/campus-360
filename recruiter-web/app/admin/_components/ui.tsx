// Shared UI primitives for the Campus 360 admin dashboard.
// Modern SaaS look: white surfaces, subtle borders, generous whitespace,
//   blue-600 primary. All components are client-safe (no server-only deps).

import { type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Loader2, ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
 * Card — base container used by every section of the dashboard.
 * ──────────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={[
        'bg-surface border border-border rounded-xl',
        padded ? 'p-6' : '',
        'shadow-card',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-bold text-fg leading-tight">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Button — primary, secondary, ghost, danger variants.
 * ──────────────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:scale-[0.99] shadow-sm',
  secondary:
    'bg-surface text-fg border border-border hover:bg-surface-2',
  ghost:
    'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger:
    'bg-danger text-white hover:bg-red-700',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      {...rest}
      className={[
        buttonBase,
        buttonSizes[size],
        buttonVariants[variant],
        className,
      ].join(' ')}
      disabled={rest.disabled || loading}
    >
      {loading ? <Loader2 size={14} className="spin-anim" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * IconButton — circular icon-only button.
 * ──────────────────────────────────────────────────────────────────────── */

export function IconButton({
  icon: Icon,
  label,
  className = '',
  variant = 'ghost',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: 'ghost' | 'primary' | 'danger';
}) {
  const variantClass =
    variant === 'primary'
      ? 'bg-primary-soft text-primary hover:bg-primary-soft/80'
      : variant === 'danger'
        ? 'bg-danger-bg text-danger hover:bg-danger-soft'
        : 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg';
  return (
    <button
      type="button"
      aria-label={label}
      {...rest}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors cursor-pointer',
        variantClass,
        className,
      ].join(' ')}
    >
      <Icon size={16} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * KpiCard — matches the screenshots: label / big value / trend badge /
 *   caption. Optional accent icon in a soft pastel background.
 * ──────────────────────────────────────────────────────────────────────── */

type KpiAccent = 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan' | 'pink' | 'orange' | 'indigo';

const kpiAccentBg: Record<KpiAccent, string> = {
  blue: 'bg-chart-blue-soft text-chart-blue',
  green: 'bg-chart-green-soft text-chart-green',
  amber: 'bg-chart-amber-soft text-chart-amber',
  purple: 'bg-chart-purple-soft text-chart-purple',
  rose: 'bg-chart-rose-soft text-chart-rose',
  cyan: 'bg-chart-cyan-soft text-chart-cyan',
  pink: 'bg-chart-pink-soft text-chart-pink',
  orange: 'bg-chart-orange-soft text-chart-orange',
  indigo: 'bg-chart-indigo-soft text-chart-indigo',
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  trend,
  caption,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  accent?: KpiAccent;
  trend?: { value: string; direction: 'up' | 'down' | 'stable' };
  caption?: ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          {label}
        </span>
        {Icon ? (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${kpiAccentBg[accent]}`}>
            <Icon size={15} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[28px] font-bold leading-none text-fg tabular-nums">
          {value}
        </span>
        {trend ? <TrendPill {...trend} /> : null}
      </div>
      {caption ? (
        <div className="mt-3 text-[12px] text-fg-subtle">{caption}</div>
      ) : null}
    </div>
  );
}

export function TrendPill({
  value,
  direction,
}: {
  value: string;
  direction: 'up' | 'down' | 'stable';
}) {
  const styles =
    direction === 'up'
      ? 'bg-success-bg text-success'
      : direction === 'down'
        ? 'bg-danger-bg text-danger'
        : 'bg-info-soft text-info';
  const sign = direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      <span aria-hidden>{sign}</span>
      {value}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * FilterChips — pill-shaped dropdowns matching the screenshot aesthetic.
 *   Used in the row above the table on Catalogue and Étudiants.
 * ──────────────────────────────────────────────────────────────────────── */

export function FilterChip({
  label,
  icon: Icon,
  children,
  className = '',
}: {
  label?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={[
        'inline-flex items-center gap-2 bg-surface-soft border border-border',
        'rounded-full px-4 h-9 text-sm text-fg cursor-pointer',
        'hover:border-border-strong transition-colors',
        className,
      ].join(' ')}
    >
      {Icon ? <Icon size={14} className="text-fg-subtle" /> : null}
      {label ? <span className="text-fg-muted">{label}</span> : null}
      {children}
      <ChevronDown size={14} className="text-fg-subtle" />
    </label>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string }>;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className="appearance-none bg-transparent border-0 outline-none text-sm font-medium text-fg cursor-pointer pr-0"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Pill — inline status pill (e.g. PUBLISHED, DRAFT, Active).
 * ──────────────────────────────────────────────────────────────────────── */

type PillTone = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'cyan' | 'pink' | 'orange' | 'indigo';

const pillToneStyles: Record<PillTone, string> = {
  neutral: 'bg-surface-3 text-fg-muted',
  blue: 'bg-chart-blue-soft text-chart-blue',
  green: 'bg-chart-green-soft text-chart-green',
  amber: 'bg-chart-amber-soft text-chart-amber',
  rose: 'bg-chart-rose-soft text-chart-rose',
  violet: 'bg-chart-purple-soft text-chart-purple',
  cyan: 'bg-chart-cyan-soft text-chart-cyan',
  pink: 'bg-chart-pink-soft text-chart-pink',
  orange: 'bg-chart-orange-soft text-chart-orange',
  indigo: 'bg-chart-indigo-soft text-chart-indigo',
};

export function Pill({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        pillToneStyles[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Avatar — initials or image with fallback. Used in tables / topbar.
 * ──────────────────────────────────────────────────────────────────────── */

export function Avatar({
  name,
  src,
  size = 32,
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
  // Soft deterministic gradient palette by name hash (Flup-style multi-color).
  const palette = [
    ['#dbeafe', '#3b82f6'], // blue
    ['#d1fae5', '#10b981'], // green
    ['#fef3c7', '#f59e0b'], // amber
    ['#fce7f3', '#ec4899'], // pink
    ['#ede9fe', '#8b5cf6'], // purple
    ['#cffafe', '#06b6d4'], // cyan
    ['#ffedd5', '#fb923c'], // orange
    ['#ffe4e6', '#f43f5e'], // rose
    ['#e0e7ff', '#6366f1'], // indigo
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % palette.length;
  const [bg, fg] = palette[idx];
  return (
    <span
      aria-hidden
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded-full font-semibold text-white shrink-0',
        ring ? 'ring-2 ring-surface' : '',
      ].join(' ')}
      style={{ width: size, height: size, background: src ? undefined : `linear-gradient(135deg, ${bg}, ${fg})`, fontSize: Math.max(10, size * 0.38) }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * EmptyState — neutral placeholder used when a list has no data.
 * ──────────────────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon ? (
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-3 text-fg-subtle">
          <Icon size={22} />
        </span>
      ) : null}
      <p className="font-semibold text-fg">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-[13px] text-fg-subtle">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * PageHeader — consistent page header with breadcrumb-style title row.
 * ──────────────────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { parent: string; current: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb ? (
          <div className="mb-1 flex items-center gap-2 text-xs text-fg-subtle">
            <span>{breadcrumb.parent}</span>
            <span className="text-fg-faint">›</span>
            <span className="font-semibold text-fg">{breadcrumb.current}</span>
          </div>
        ) : null}
        <h1 className="font-display text-[26px] font-bold leading-tight text-fg">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-fg-subtle">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * SortableHeader — column header for DataTable with sort indicator.
 * ──────────────────────────────────────────────────────────────────────── */

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: 'asc' | 'desc';
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const isActive = activeKey === sortKey;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle hover:text-fg transition-colors cursor-pointer ${alignClass}`}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : null}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Skeleton — light shimmer placeholder for loading states.
 * ──────────────────────────────────────────────────────────────────────── */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-surface-3 rounded animate-pulse ${className}`}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Divider — subtle horizontal rule.
 * ──────────────────────────────────────────────────────────────────────── */

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-border ${className}`} />;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Re-export useful attribute types.
 * ──────────────────────────────────────────────────────────────────────── */
export type { HTMLAttributes };