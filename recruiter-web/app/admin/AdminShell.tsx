'use client';

/**
 * AdminShell — top-level layout for every /admin/* page.
 *
 * Flup-inspired two-layer sidebar:
 *   Layer 1 — icon strip (68px) with just the essential nav icons.
 *   Layer 2 — expanded sidebar (240px) with MARKETING / PAYMENTS / SYSTEM
 *             sections, user info, log out.
 *
 * Collapse toggle on the strip's right edge (the `>` / `<` button) swaps
 * between the two states. Active route is highlighted in the layer that
 * contains the matching item.
 */

import {
  LogOut,
  Bell,
  HelpCircle,
  Search as SearchIcon,
  LayoutDashboard,
  BookOpen,
  Package,
  Users,
  BarChart3,
  FileText,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Avatar } from './_components/ui';

/* ─────────────────────────────────────────────────────────────────────────
 * Nav config — every entry has an icon + label + href. The strip and the
 * expanded sidebar both render from the same source; collapsed state shows
 * just the icon, expanded shows icon + label grouped by section.
 * ──────────────────────────────────────────────────────────────────────── */

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'MARKETING',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/pdf', icon: BookOpen, label: 'PDF Catalogue' },
      { href: '/admin/packs', icon: Package, label: 'Packs' },
      { href: '/admin/users', icon: Users, label: 'Étudiants' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/admin/reports', icon: FileText, label: 'Rapports' },
    ],
  },
  {
    label: 'SYSTÈME',
    items: [
      { href: '/admin/settings', icon: SettingsIcon, label: 'Configuration' },
    ],
  },
];

const STRIP_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function resolveBreadcrumb(pathname: string): { parent: string; current: string } {
  if (pathname === '/admin' || pathname === '/admin/') {
    return { parent: 'Dashboard', current: 'Overview' };
  }
  if (pathname.startsWith('/admin/pdf')) {
    return { parent: 'Marketing', current: 'Catalogue PDF' };
  }
  if (pathname.startsWith('/admin/packs')) {
    return { parent: 'Marketing', current: 'Packs' };
  }
  if (pathname.startsWith('/admin/users')) {
    return { parent: 'Marketing', current: 'Étudiants' };
  }
  if (pathname.startsWith('/admin/analytics')) {
    return { parent: 'Analytics', current: 'Vue d\'ensemble' };
  }
  if (pathname.startsWith('/admin/reports/new')) {
    return { parent: 'Analytics', current: 'Nouveau rapport' };
  }
  if (pathname.startsWith('/admin/reports')) {
    return { parent: 'Analytics', current: 'Rapports' };
  }
  if (pathname.startsWith('/admin/settings')) {
    return { parent: 'Système', current: 'Configuration' };
  }
  return { parent: 'Dashboard', current: 'Overview' };
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const userName = user?.name || 'Admin';
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);

  const breadcrumb = resolveBreadcrumb(pathname);
  // When collapsed the main content shifts by the strip width only; when
  // expanded it shifts by strip + sidebar. Offset with margin-left only and let
  // width auto-fill the remaining space — using `100vw` here double-counts the
  // scrollbar gutter and forces a horizontal overflow on desktop.
  const mainOffset = collapsed ? 'ml-[68px]' : 'ml-[308px]';

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-body">
      {/* ── Layer 1 — Icon strip (always visible) ────────────────────── */}
      <aside
        aria-label="Navigation principale"
        className="fixed inset-y-0 left-0 z-40 flex w-[68px] flex-col items-center border-r border-sidebar-border bg-sidebar-strip py-4"
      >
        {/* Brand mark */}
        <Link
          href="/admin"
          aria-label="Campus 360 — Accueil"
          className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-transform hover:scale-[1.04]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 3l9 5-9 5-9-5 9-5z" />
            <path d="M3 13l9 5 9-5" />
          </svg>
        </Link>

        <div className="my-2 h-px w-8 bg-sidebar-divider" />

        {/* Strip items — one icon per route */}
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
          {STRIP_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                className={[
                  'group relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                ].join(' ')}
              >
                <Icon size={18} strokeWidth={1.8} />
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          type="button"
          aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          aria-pressed={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
          className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border bg-surface text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>

      {/* ── Layer 2 — Expanded sidebar (Flup: white, sectioned) ─────── */}
      <aside
        aria-label="Menu détaillé"
        className={[
          'fixed inset-y-0 z-30 flex w-[240px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out',
          collapsed ? '-translate-x-full' : 'translate-x-0',
        ].join(' ')}
        style={{ left: '68px' }}
      >
        {/* Brand row */}
        <div className="flex h-[64px] items-center justify-between border-b border-sidebar-divider px-5">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 leading-tight"
          >
            <span className="font-display text-[16px] font-bold text-fg">
              Campus 360
            </span>
            <span className="inline-flex items-center rounded-md bg-primary-tint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Admin
            </span>
          </Link>
        </div>

        {/* Nav — grouped sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi === 0 ? '' : 'mt-5'}>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">
                {group.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                  return (
                    <li key={item.href + item.label}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={[
                          'flex items-center gap-3 rounded-md px-3 h-9 text-[13.5px] transition-colors',
                          isActive
                            ? 'bg-primary-soft font-semibold text-primary'
                            : 'font-medium text-fg-muted hover:bg-surface-2 hover:text-fg',
                        ].join(' ')}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.8}
                          className={isActive ? 'text-primary' : 'text-fg-faint'}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User pill */}
        <div className="border-t border-sidebar-divider px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2">
            <Avatar name={userName} src={user?.image ?? null} size={32} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-semibold text-fg">
                {userName}
              </div>
              <div className="truncate text-[11px] text-fg-subtle">
                Administrator
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-faint hover:bg-surface-3 hover:text-danger transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <header
        className={[
          'sticky top-0 z-20 flex h-16 items-center gap-6 border-b border-sidebar-border bg-surface px-8 transition-[margin] duration-200',
          mainOffset,
        ].join(' ')}
      >
        {/* Search */}
        <div className="relative w-[300px] max-w-full">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-fg-faint">
            <SearchIcon size={15} />
          </span>
          <input
            type="text"
            placeholder="Rechercher…"
            aria-label="Recherche globale"
            onFocus={() => setSearch(true)}
            onBlur={() => setSearch(false)}
            className="h-9 w-full rounded-md border border-border bg-surface-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-faint focus:bg-surface focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold text-primary">{breadcrumb.parent}</span>
          <span className="text-fg-faint">›</span>
          <span className="text-fg-muted">{breadcrumb.current}</span>
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <Bell size={17} />
            <span className="absolute top-2 right-2 inline-block h-1.5 w-1.5 rounded-full bg-danger" />
          </button>
          <button
            type="button"
            aria-label="Aide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <HelpCircle size={17} />
          </button>
          <div className="ml-2 flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-2.5 h-9">
            {isPending ? (
              <span className="inline-flex h-7 w-7 items-center justify-center">
                <Loader2 size={14} className="spin-anim text-fg-subtle" />
              </span>
            ) : (
              <Avatar name={userName} src={user?.image ?? null} size={28} />
            )}
            <span className="text-[13px] font-semibold text-fg">{userName}</span>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main
        className={[
          'min-h-[calc(100vh-64px)] px-8 py-8 transition-[margin,width] duration-200',
          mainOffset,
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  );
}