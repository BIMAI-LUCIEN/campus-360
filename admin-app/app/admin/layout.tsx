'use client';

import {
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Search as SearchIcon,
  LayoutDashboard,
  BookOpen,
  Package,
  Users,
  BarChart3,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

type NavItem = { href: string; icon: ReactNode; label: string };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/admin/analytics', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { href: '/admin/pdf',       icon: <BookOpen size={18} />,       label: 'PDF Catalogue' },
      { href: '/admin/packs',     icon: <Package size={18} />,        label: 'Packs' },
      { href: '/admin/users',     icon: <Users size={18} />,          label: 'Étudiants' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/admin/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
      { href: '/admin/reports',    icon: <FileText size={18} />,  label: 'Rapports' },
    ],
  },
  {
    label: 'SYSTÈME',
    items: [
      { href: '/admin/settings', icon: <Settings size={18} />, label: 'Configuration' },
    ],
  },
];

const breadcrumbMap: Array<[RegExp, string, string]> = [
  [/^\/admin\/analytics$/, 'Dashboard', 'Overview'],
  [/^\/admin\/pdf/, 'PDF', 'Catalogue'],
  [/^\/admin\/users/, 'Dashboard', 'Utilisateurs'],
  [/^\/admin\/reports\/new/, 'Dashboard', 'Nouveau rapport'],
  [/^\/admin\/reports/, 'Dashboard', 'Overview'],
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
      <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-stitch-outline-variant bg-stitch-surface py-6">
        <div className="px-6 pb-8">
          <h1 className="font-stitch-headline text-lg font-bold tracking-tight text-stitch-on-surface">
            Campus 360 Admin
          </h1>
          <p className="mt-0.5 text-xs text-stitch-on-surface-variant">
            University Management
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stitch-on-surface-variant">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'flex items-center gap-3 rounded-md border-l-4 border-stitch-primary bg-stitch-secondary-container py-2.5 pl-2 pr-3 text-sm font-semibold text-stitch-on-primary'
                        : 'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-stitch-on-surface-variant transition-colors duration-150 hover:bg-stitch-surface-container-high hover:text-stitch-on-surface'
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-stitch-outline-variant px-2 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md bg-transparent px-3 py-2.5 text-left text-sm font-medium text-stitch-on-surface-variant transition-colors duration-150 hover:bg-stitch-surface-container-high hover:text-stitch-on-surface"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Topbar (sticky, 64px) ─────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-stitch-surface px-8 shadow-stitch-sm ml-60">
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stitch-outline">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-full border border-stitch-outline-variant bg-stitch-surface-container-low py-1.5 pl-9 pr-4 text-[13px] text-stitch-on-surface transition-all placeholder:text-stitch-outline focus:border-stitch-outline focus:outline-none focus:ring-4 focus:ring-stitch-primary/15"
            />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-stitch-primary">{section}</span>
            <span className="text-stitch-outline-variant">/</span>
            <span className="text-stitch-on-surface-variant">{sub}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-primary"
            aria-label="Notifications"
            type="button"
          >
            <Bell size={18} />
          </button>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-primary"
            aria-label="Aide"
            type="button"
          >
            <HelpCircle size={18} />
          </button>

          {isPending ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stitch-surface-container text-stitch-on-surface-variant">
              <Loader2 size={16} className="spin-anim" />
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
      <main className="ml-60 w-full max-w-[1600px] flex-1 p-8">{children}</main>
    </div>
  );
}
