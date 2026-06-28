'use client';

import {
  GraduationCap,
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

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ href: string; icon: ReactNode; label: string }>;
}> = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/admin/analytics', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { href: '/admin/pdf',       icon: <BookOpen size={18} />,       label: 'PDF Catalogue' },
      { href: '#',                icon: <Package size={18} />,       label: 'Packs' },
      { href: '/admin/users',     icon: <Users size={18} />,          label: 'Étudiants' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '#', icon: <BarChart3 size={18} />, label: 'Analytics' },
      { href: '/admin/reports', icon: <FileText size={18} />, label: 'Rapports' },
    ],
  },
  {
    label: 'SYSTÈME',
    items: [
      { href: '#', icon: <Settings size={18} />, label: 'Configuration' },
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

  return (
    <div className="stitch-layout">
      {/* ── Sidebar (240px, fixed) ───────────────────────── */}
      <aside className="stitch-sidebar">
        <div className="stitch-sidebar-brand">
          <h1>Campus 360 Admin</h1>
          <p>University Management</p>
        </div>

        <nav className="stitch-sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--stitch-on-surface-variant)',
                padding: '0 12px 8px',
              }}>
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
                    className={`stitch-sidebar-link${isActive ? ' is-active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="stitch-sidebar-footer">
          <button
            type="button"
            className="stitch-sidebar-link"
            style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Topbar (sticky, 64px) ──────────────────────────── */}
      <header className="stitch-topbar">
        <div className="stitch-topbar-left">
          <div className="stitch-search">
            <span className="stitch-search-icon">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="stitch-breadcrumb">
            <span className="stitch-breadcrumb-item">{section}</span>
            <span className="stitch-breadcrumb-sep">/</span>
            <span className="stitch-breadcrumb-current">{sub}</span>
          </div>
        </div>

        <div className="stitch-topbar-right">
          <button className="stitch-topbar-icon" title="Notifications">
            <Bell size={18} />
          </button>
          <button className="stitch-topbar-icon" title="Aide">
            <HelpCircle size={18} />
          </button>

          {isPending ? (
            <div className="stitch-avatar" style={{ background: 'var(--stitch-surface-container)' }}>
              <Loader2 size={16} className="spin-anim" />
            </div>
          ) : (
            <div className="stitch-avatar" title={userName}>
              {user?.image ? (
                <img src={user.image} alt={userName} />
              ) : (
                userInitial
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="stitch-main">{children}</main>
    </div>
  );
}
