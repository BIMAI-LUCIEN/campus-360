'use client';

/**
 * AdminShell — top-level layout for every /admin/* page.
 *
 * Sidebar (fixed, 240px, white) + Topbar (sticky, 64px, white).
 * Active route highlighted with blue-soft background + blue text.
 * User info pill anchored at the bottom of the sidebar.
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
  ChevronDown,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Avatar } from './_components/ui';

type NavItem = { href: string; icon: ReactNode; label: string };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/admin',              icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
      { href: '/admin/pdf',          icon: <BookOpen size={17} />,        label: 'PDF Catalogue' },
      { href: '/admin/packs',        icon: <Package size={17} />,         label: 'Packs' },
      { href: '/admin/users',        icon: <Users size={17} />,           label: 'Étudiants' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/admin/analytics',    icon: <BarChart3 size={17} />,       label: 'Analytics' },
      { href: '/admin/reports',      icon: <FileText size={17} />,        label: 'Rapports' },
    ],
  },
  {
    label: 'SYSTÈME',
    items: [
      { href: '/admin/settings',     icon: <SettingsIcon size={17} />,    label: 'Configuration' },
    ],
  },
];

function resolveBreadcrumb(pathname: string): { parent: string; current: string } {
  if (pathname === '/admin' || pathname === '/admin/') {
    return { parent: 'Dashboard', current: 'Overview' };
  }
  if (pathname.startsWith('/admin/pdf')) {
    return { parent: 'Dashboard', current: 'Catalogue PDF' };
  }
  if (pathname.startsWith('/admin/packs')) {
    return { parent: 'Dashboard', current: 'Packs' };
  }
  if (pathname.startsWith('/admin/users')) {
    return { parent: 'Dashboard', current: 'Étudiants' };
  }
  if (pathname.startsWith('/admin/analytics')) {
    return { parent: 'Dashboard', current: 'Analytics' };
  }
  if (pathname.startsWith('/admin/reports/new')) {
    return { parent: 'Dashboard', current: 'Nouveau rapport' };
  }
  if (pathname.startsWith('/admin/reports')) {
    return { parent: 'Dashboard', current: 'Rapports' };
  }
  if (pathname.startsWith('/admin/settings')) {
    return { parent: 'Dashboard', current: 'Configuration' };
  }
  return { parent: 'Dashboard', current: 'Overview' };
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const userName = user?.name || 'Admin';
  const [search, setSearch] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const breadcrumb = resolveBreadcrumb(pathname);

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
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-border bg-surface">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-border-light">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-700 text-white shadow-sm">
              <LayoutDashboard size={17} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold text-fg">Campus 360 Admin</div>
              <div className="text-[11px] text-fg-subtle">University Management</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-fg-faint">
                {group.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                  return (
                    <li key={item.href + item.label}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={[
                          'flex items-center gap-3 rounded-md px-3 h-9 text-sm transition-colors',
                          isActive
                            ? 'bg-primary-softer text-primary font-semibold'
                            : 'text-fg-muted font-medium hover:bg-surface-2 hover:text-fg',
                        ].join(' ')}
                      >
                        <span className={isActive ? 'text-primary' : 'text-fg-subtle'}>{item.icon}</span>
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
        <div className="border-t border-border-light px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2 cursor-pointer">
            <Avatar name={userName} src={user?.image ?? null} size={32} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-semibold text-fg">{userName}</div>
              <div className="truncate text-[11px] text-fg-subtle">Administrator</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-3 hover:text-danger transition-colors cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 ml-[240px] flex h-16 items-center gap-6 border-b border-border bg-surface px-8">
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
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
          >
            <Bell size={17} />
            <span className="absolute top-2 right-2 inline-block h-1.5 w-1.5 rounded-full bg-danger" />
          </button>
          <button
            type="button"
            aria-label="Aide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
          >
            <HelpCircle size={17} />
          </button>
          <button
            type="button"
            aria-label="Mon profil"
            onClick={() => setProfileOpen((v) => !v)}
            className="ml-2 flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-2.5 h-9 hover:bg-surface-2 transition-colors cursor-pointer"
          >
            {isPending ? (
              <span className="inline-flex h-7 w-7 items-center justify-center">
                <Loader2 size={14} className="spin-anim text-fg-subtle" />
              </span>
            ) : (
              <Avatar name={userName} src={user?.image ?? null} size={28} />
            )}
            <span className="text-[13px] font-semibold text-fg">{userName}</span>
            <ChevronDown size={13} className="text-fg-subtle" />
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="ml-[240px] min-h-[calc(100vh-64px)] w-[calc(100vw-240px)] px-8 py-8">
        {children}
      </main>
    </div>
  );
}