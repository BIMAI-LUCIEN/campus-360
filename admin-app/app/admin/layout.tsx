'use client';

import { LogOut, Bell, HelpCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

type NavItem = { href: string; icon: string; label: string };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/admin/analytics', icon: 'dashboard',       label: 'Dashboard' },
      { href: '/admin/pdf',       icon: 'menu_book',       label: 'PDF Catalogue' },
      { href: '/admin/packs',     icon: 'package_2',       label: 'Packs' },
      { href: '/admin/users',     icon: 'group',           label: 'Étudiants' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '#',                icon: 'analytics',       label: 'Analytics' },
      { href: '/admin/documents', icon: 'description',   label: 'Rédactions' },
    ],
  },
  {
    label: 'SYSTÈME',
    items: [
      { href: '/admin/settings', icon: 'settings',        label: 'Configuration' },
    ],
  },
];

const breadcrumbMap: Array<[RegExp, string, string]> = [
  [/^\/admin\/analytics$/, 'Dashboard', 'Overview'],
  [/^\/admin\/pdf/, 'Dashboard', 'Catalogue PDF'],
  [/^\/admin\/users/, 'Dashboard', 'Utilisateurs'],
  [/^\/admin\/documents\/new/, 'Dashboard', 'Nouveau document'],
  [/^\/admin\/documents/, 'Dashboard', 'Overview'],
];

function resolveBreadcrumb(pathname: string): { section: string; sub: string } {
  for (const [re, section, sub] of breadcrumbMap) {
    if (re.test(pathname)) return { section, sub };
  }
  return { section: 'Dashboard', sub: 'Overview' };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const [search, setSearch] = useState('');

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const { section, sub } = resolveBreadcrumb(pathname);
  const userName = user?.name || 'Admin';
  const userInitial = userName.trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-stitch-bg text-stitch-on-surface font-stitch-body">
      {/* ── Sidebar (fixed, 240px) ─────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-stitch-outline-variant bg-stitch-surface py-6">
        {/* Brand header */}
        <div className="px-6 mb-10">
          <h1 className="font-stitch-headline text-xl font-bold text-stitch-on-surface leading-tight">
            Campus 360 Admin
          </h1>
          <p
            className="mt-1 text-[12px] font-semibold tracking-wide text-stitch-on-surface-variant uppercase"
            style={{ letterSpacing: '0.05em' }}
          >
            University Management
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stitch-on-surface-variant">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'flex items-center gap-3 rounded-r-lg border-l-4 border-stitch-primary bg-stitch-secondary-container px-4 py-2 text-sm font-semibold text-stitch-on-surface-variant opacity-90 transition-opacity'
                        : 'flex items-center gap-3 px-4 py-2 text-sm font-medium text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface'
                    }
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: user profile */}
        <div className="mt-auto border-t border-stitch-outline-variant pt-4">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stitch-primary-container text-stitch-on-primary-container">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-[12px] font-semibold tracking-wide text-stitch-on-surface">
                {userName}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest text-stitch-on-surface-variant"
                style={{ letterSpacing: '0.05em' }}
              >
                Administrator
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Topbar (sticky, 64px) ─────────────────────────── */}
      <header className="sticky top-0 right-0 z-40 flex h-16 w-full max-w-[calc(100%-240px)] items-center justify-between border-b border-stitch-outline-variant bg-stitch-surface px-8 shadow-sm">
        <div className="flex items-center gap-6">
          {/* Search */}
          <div className="relative w-64">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stitch-on-surface-variant">
              <span className="material-symbols-outlined text-sm leading-none">search</span>
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-stitch-outline-variant bg-stitch-surface-container-low py-1.5 pl-10 pr-4 text-[13px] text-stitch-on-surface placeholder:text-stitch-outline transition-all focus:border-stitch-outline focus:outline-none focus:ring-2 focus:ring-stitch-primary/20"
            />
          </div>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2">
            <span className="text-stitch-on-surface-variant font-stitch-body text-sm">{section}</span>
            <span className="material-symbols-outlined text-[16px] text-stitch-outline-variant leading-none">
              chevron_right
            </span>
            <span className="font-bold text-stitch-primary">{sub}</span>
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-primary"
              aria-label="Notifications"
              type="button"
            >
              <Bell size={18} />
            </button>
            {/* Notification dot */}
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-stitch-error" />
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-primary"
            aria-label="Aide"
            type="button"
          >
            <HelpCircle size={18} />
          </button>

          {isPending ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stitch-surface-lowest text-stitch-on-surface-variant">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-stitch-outline-variant bg-stitch-primary-container font-bold text-stitch-on-primary-container"
              title={userName}
            >
              {user?.image ? (
                <img src={user.image} alt={userName} className="h-full w-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="ml-[240px] w-full max-w-[1600px] flex-1 bg-stitch-bg p-8">{children}</main>
    </div>
  );
}
