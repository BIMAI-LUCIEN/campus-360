'use client';

import { LogOut, Loader2, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

type NavItem = { href: string; icon: string; label: string };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Pilotage',
    items: [
      { href: '/admin',               icon: 'space_dashboard', label: "Vue d'ensemble" },
      { href: '/admin/mobile',        icon: 'smartphone',      label: 'App mobile' },
      { href: '/admin/notifications', icon: 'campaign',        label: 'Notifications' },
      { href: '/admin/analytics',     icon: 'monitoring',      label: 'Analytics' },
    ],
  },
  {
    label: 'Étudiants',
    items: [
      { href: '/admin/students', icon: 'school', label: 'Étudiants' },
      { href: '/admin/payments', icon: 'payments', label: 'Paiements' },
    ],
  },
  {
    label: 'Stages & emplois',
    items: [
      { href: '/admin/stages',       icon: 'work',      label: 'Offres' },
      { href: '/admin/applications', icon: 'send',      label: 'Candidatures' },
      { href: '/admin/companies',    icon: 'apartment', label: 'Entreprises' },
    ],
  },
  {
    label: 'Contenus',
    items: [
      { href: '/admin/pdf',       icon: 'menu_book', label: 'Catalogue PDF' },
      { href: '/admin/packs',     icon: 'package_2', label: 'Packs' },
      { href: '/admin/templates', icon: 'style',     label: 'Modèles de rapport' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));

function resolveCurrent(pathname: string) {
  const match = [...ALL_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/')));
  return match ?? { group: 'Pilotage', label: "Vue d'ensemble" };
}

type AppStatus = { maintenance: boolean; features: Record<string, boolean> } | null;

function useAppStatus(pathname: string): AppStatus {
  const [status, setStatus] = useState<AppStatus>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/app-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.entries) return;
        const get = (key: string) => data.entries.find((e: { key: string }) => e.key === key)?.value ?? {};
        setStatus({ maintenance: Boolean(get('maintenance').enabled), features: get('features') });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return status;
}

const STATUS_FEATURES: Array<[string, string]> = [
  ['ai', 'IA'],
  ['payments', 'Paiements'],
  ['stages', 'Stages'],
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const appStatus = useAppStatus(pathname);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const current = resolveCurrent(pathname);
  const userName = user?.name || 'Admin';
  const userInitial = userName.trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-bg text-fg font-body overflow-x-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-tower/50 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-tower text-tower-fg transition-transform duration-300 ease-out',
          isSidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-[15px] font-extrabold">
              C
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight">Campus 360</span>
          </Link>
          <button
            type="button"
            className="lg:hidden rounded-md p-1.5 text-tower-muted hover:bg-tower-2 hover:text-tower-fg"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live state of the mobile app: the control tower's signature */}
        <Link
          href="/admin/mobile"
          onClick={() => setIsSidebarOpen(false)}
          className="mx-4 mb-5 block rounded-xl border border-tower-line bg-tower-2 px-3.5 py-3 transition-colors hover:border-primary"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tower-muted">App mobile</span>
            {appStatus ? (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold">
                <span
                  className={[
                    'h-2 w-2 rounded-full',
                    appStatus.maintenance ? 'bg-warning' : 'bg-chart-green animate-pulse',
                  ].join(' ')}
                />
                {appStatus.maintenance ? 'Maintenance' : 'En ligne'}
              </span>
            ) : (
              <span className="text-[12px] text-tower-muted">…</span>
            )}
          </div>
          {appStatus ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {STATUS_FEATURES.map(([key, label]) => {
                const on = appStatus.features?.[key] !== false;
                return (
                  <span
                    key={key}
                    className={[
                      'rounded-md px-1.5 py-0.5 font-mono text-[10.5px]',
                      on ? 'bg-tower-line text-tower-fg' : 'bg-danger/80 text-on-primary line-through',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          ) : null}
        </Link>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-tower-muted">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                      isActive
                        ? 'bg-primary text-on-primary font-semibold'
                        : 'text-tower-muted hover:bg-tower-2 hover:text-tower-fg',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[19px] leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-tower-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-tower-line font-display text-sm font-bold">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : user?.image ? (
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{userName}</div>
              <div className="truncate text-[11px] text-tower-muted">{user?.email ?? 'Administrateur'}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="rounded-md p-1.5 text-tower-muted hover:bg-tower-2 hover:text-tower-fg"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-8">
          <button
            type="button"
            className="lg:hidden rounded-md p-2 text-fg-muted hover:bg-surface-2"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <nav className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="text-fg-subtle">{current.group}</span>
            <span className="text-fg-faint">/</span>
            <span className="truncate font-semibold text-fg">{current.label}</span>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
