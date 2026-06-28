'use client';

import {
  GraduationCap,
  LogOut,
  Folder,
  Users,
  LayoutDashboard,
  BookOpen,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

import './flup.css';

type NavItem = { href: string; icon: React.ElementType; label: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Tableau de bord',
    items: [
      { href: '/admin/analytics', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/reports', icon: BookOpen, label: 'Rapports' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/pdf', icon: Folder, label: 'Documents PDF' },
      { href: '/admin/users', icon: Users, label: 'Utilisateurs' },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? 'Étudiant' : '';

  return (
    <div className="flup-layout flex min-h-screen w-full bg-[var(--color-flup-bg)] font-sans">
      {/* ── 1. Nav Rail (thin icon sidebar) ─────────────── */}
      <aside className="w-[72px] bg-[var(--color-flup-surface)] border-r border-[var(--color-flup-border)] flex flex-col items-center py-5 z-20 sticky top-0 h-screen shrink-0">
        <div className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-flup-brand)] to-cyan-700 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(8,145,178,0.35)]">
            <GraduationCap size={20} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          {NAV_SECTIONS.flatMap((section) =>
            section.items.map(({ href, icon: Icon, label }) => {
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href}>
                  <button
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                      isActive
                        ? 'bg-[var(--color-flup-brand-light)] text-[var(--color-flup-brand)]'
                        : 'text-[var(--color-flup-text-muted)] hover:bg-[var(--color-flup-surface-alt)] hover:text-[var(--color-flup-text-main)]'
                    }`}
                    title={label}
                  >
                    {isActive && (
                      <span className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-flup-brand)] rounded-r" />
                    )}
                    <Icon size={20} />
                  </button>
                </Link>
              );
            }),
          )}
        </div>

        <div className="flex flex-col gap-1.5 items-center mt-auto">
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-xl text-[var(--color-flup-text-muted)] hover:bg-[var(--color-flup-surface-alt)] hover:text-[var(--color-flup-text-main)] flex items-center justify-center transition-all duration-200"
            title="Déconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* ── 2. Inner Sidebar (expanded menu) ──────────── */}
      <aside className="w-[248px] bg-[var(--color-flup-surface)] border-r border-[var(--color-flup-border)] flex flex-col py-6 px-4 z-10 sticky top-0 h-screen shrink-0">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 text-[18px] font-bold text-[var(--color-flup-text-main)]">
            <GraduationCap size={22} className="text-[var(--color-flup-brand)]" />
            <span>Campus 360</span>
          </div>
          <div className="text-[11px] text-[var(--color-flup-text-muted)] mt-0.5 pl-[34px]">
            Admin Console
          </div>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <div className="flup-nav-section-label">{section.label}</div>
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flup-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer user card */}
        <div className="mt-auto pt-5 border-t border-[var(--color-flup-border)] flex items-center gap-2.5">
          {isPending ? (
            <div className="flex items-center gap-2 p-1">
              <Loader2 size={16} className="animate-spin text-[var(--color-flup-text-muted)]" />
              <span className="text-[12px] text-[var(--color-flup-text-muted)]">Chargement...</span>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full border-2 border-[var(--color-flup-border)] overflow-hidden shadow-sm shrink-0">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=0891b2&color=fff`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--color-flup-text-main)] truncate">
                  {user?.name || 'Admin'}
                </div>
                <div className="text-[11px] text-[var(--color-flup-text-muted)]">{roleLabel}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg text-[var(--color-flup-text-muted)] hover:bg-[var(--color-flup-surface-alt)] hover:text-[var(--color-flup-text-main)] flex items-center justify-center transition-all duration-200"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── 3. Main Content ─────────────────────────────── */}
      <main className="flex-1 p-7 overflow-y-auto min-w-0">
        <div className="flup-page">{children}</div>
      </main>
    </div>
  );
}