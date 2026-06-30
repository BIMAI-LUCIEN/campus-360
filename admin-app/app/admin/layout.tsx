'use client';

import {
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Search as SearchIcon,
  Calendar,
  Download,
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

const pageTitleMap: Array<[RegExp, string, string]> = [
  [/^\/admin\/analytics$/, 'Dashboard', 'Overview'],
  [/^\/admin\/pdf/, 'PDF', 'Catalogue'],
  [/^\/admin\/users/, 'Dashboard', 'Utilisateurs'],
  [/^\/admin\/reports\/new/, 'Dashboard', 'Nouveau rapport'],
  [/^\/admin\/reports/, 'Dashboard', 'Overview'],
];

function resolveBreadcrumb(pathname: string): { section: string; sub: string } {
  for (const [re, section, sub] of pageTitleMap) {
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

  // Stitch sidebar link classes (Tailwind utility composition)
  const linkBase = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150';
  const linkIdle = 'text-stitch-on-surface-variant hover:bg-stitch-surface-container-high hover:text-stitch-on-surface';
  const linkActive = 'bg-stitch-secondary-container text-stitch-on-primary border-l-4 border-stitch-primary pl-2 font-semibold';

  return (
    <div className="block min-h-screen bg-stitch-bg text-stitch-on-surface font-stitch-body">
      {/* ── Sidebar (240px, fixed) ───────────────────────── */}
      <aside className="fixed top-0 left-0 h-screen w-60 bg-stitch-surface border-r border-stitch-outline-variant flex flex-col py-6 z-50">
        <div className="px-6 mb-8">
          <h1 className="font-stitch-headline text-lg font-bold text-stitch-on-surface tracking-tight">
            Campus 360 Admin
          </h1>
          <p className="text-xs text-stitch-on-surface-variant mt-0.5">
            University Management
          </p>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stitch-on-surface-variant px-3 py-2">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive =
                  item.href !== '#' &&
                  (pathname === item.href || pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`${linkBase} ${isActive ? linkActive : linkIdle}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto px-2 pt-4 border-t border-stitch-outline-variant">
          <button
            type="button"
            onClick={handleLogout}
            className={`${linkBase} ${linkIdle} w-full text-left bg-transparent border-0`}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Topbar (sticky, 64px) ──────────────────────────── */}
      <header className="sticky top-0 h-16 ml-60 flex items-center justify-between px-8 bg-stitch-surface shadow-stitch-sm z-40">
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-stitch-outline pointer-events-none">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-stitch-surface-container-low border border-stitch-outline-variant rounded-full text-[13px] text-stitch-on-surface w-64 focus:outline-none focus:border-stitch-primary focus:ring-4 focus:ring-stitch-primary/15 transition-all placeholder-stitch-outline"
            />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-stitch-primary font-bold">{section}</span>
            <span className="text-stitch-outline-variant">/</span>
            <span className="text-stitch-on-surface-variant">{sub}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="w-9 h-9 inline-flex items-center justify-center text-stitch-on-surface-variant hover:text-stitch-primary hover:bg-stitch-surface-container-high rounded-full transition-colors" title="Notifications">
            <Bell size={18} />
          </button>
          <button className="w-9 h-9 inline-flex items-center justify-center text-stitch-on-surface-variant hover:text-stitch-primary hover:bg-stitch-surface-container-high rounded-full transition-colors" title="Aide">
            <HelpCircle size={18} />
          </button>

          {isPending ? (
            <div className="w-10 h-10 rounded-full bg-stitch-surface-container flex items-center justify-center text-stitch-on-surface-variant">
              <Loader2 size={16} className="spin-anim" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-stitch-primary-container flex items-center justify-center text-stitch-on-primary-container font-bold border border-stitch-outline-variant overflow-hidden" title={userName}>
              {user?.image ? (
                <img src={user.image} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="ml-60 p-8 max-w-[1600px]">
        {children}
      </main>
    </div>
  );
}
