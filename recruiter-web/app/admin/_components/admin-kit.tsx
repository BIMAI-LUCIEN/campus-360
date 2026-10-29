'use client';

// Building blocks shared by the student, mobile and notification pages.
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
export const num = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

export const relative = (iso: string | null | undefined) => {
  if (!iso) return 'jamais';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return shortDate(iso);
};

/** Header used by the new pages: display title with a one-line purpose. */
export function PageTitle({ title, lead, actions }: { title: string; lead: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-none tracking-tight text-fg sm:text-[32px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-subtle">{lead}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Compact figure: label above, tabular number below. */
export function Figure({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'money' | 'primary' }) {
  const color = tone === 'money' ? 'text-money' : tone === 'primary' ? 'text-primary' : 'text-fg';
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="text-[12px] font-medium text-fg-subtle">{label}</div>
      <div className={`mt-1 truncate font-mono text-[22px] font-semibold tabular-nums ${color}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11.5px] text-fg-subtle">{hint}</div> : null}
    </div>
  );
}

export function FigureStrip({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border-light sm:grid-cols-4 [&>*]:bg-surface">
      {children}
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, width = 'max-w-2xl' }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-tower/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className={`relative flex h-full w-full ${width} flex-col bg-surface shadow-popover`}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold leading-tight text-fg">{title}</h2>
            {subtitle ? <div className="mt-1 text-[13px] text-fg-subtle">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

export function Notice({ tone, children, onClose }: { tone: 'success' | 'error'; children: ReactNode; onClose?: () => void }) {
  return (
    <div
      role="status"
      className={[
        'mb-5 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
        tone === 'success' ? 'border-money/30 bg-money-soft text-money' : 'border-danger/30 bg-danger-soft text-danger',
      ].join(' ')}
    >
      <span>{children}</span>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Fermer le message" className="opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-[12.5px] text-fg-subtle">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-border',
        ].join(' ')}
      >
        <span className={['absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5'].join(' ')} />
      </button>
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-fg-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-danger">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-fg-subtle">{hint}</span> : null}
    </label>
  );
}
