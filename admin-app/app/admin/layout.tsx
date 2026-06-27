'use client';

import {
  BarChart3,
  FileText,
  GraduationCap,
  LogOut,
  Settings,
  Moon,
  Folder,
  CreditCard,
  Users,
  Search,
  BookOpen,
  LayoutDashboard,
  Tags,
  Calculator,
  ChevronDown,
  Plus,
  ShoppingCart,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './flup.css';

const NAV_ITEMS = {
  CATALOGUE: [
    { href: '/admin/analytics', icon: LayoutDashboard, label: 'Dashboard', active: true },
    { href: '/admin/pdf', icon: FileText, label: 'Documents PDF' },
    { href: '#', icon: Folder, label: 'Catégories' },
    { href: '#', icon: Search, label: 'Recherches' },
  ],
  ANALYTICS: [
    { href: '#', icon: CreditCard, label: 'Ventes & Achats' },
    { href: '#', icon: BookOpen, label: 'Rapports' },
  ],
  PAIEMENTS: [
    { href: '#', icon: Calculator, label: 'Ledger' },
    { href: '#', icon: Tags, label: 'Taxes' },
  ],
  SYSTEME: [
    { href: '#', icon: Settings, label: 'Paramètres' },
  ],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flup-layout">
      {/* 1. Thin Leftmost Sidebar (Nav Rail) */}
      <aside className="flup-nav-rail">
        <div className="rail-top">
          <div className="brand-mark-small">
            <GraduationCap size={20} />
          </div>
        </div>
        <div className="rail-center">
          <button className="rail-btn active" title="Accueil"><LayoutDashboard size={20} /></button>
          <button className="rail-btn" title="Documents"><FileText size={20} /></button>
          <button className="rail-btn" title="Utilisateurs"><Users size={20} /></button>
          <button className="rail-btn" title="Marketplace"><ShoppingCart size={20} /></button>
          <button className="rail-btn" title="Tracking"><MapPin size={20} /></button>
          <button className="rail-btn" title="Tags"><Tags size={20} /></button>
          <button className="rail-btn" title="Ledger"><Calculator size={20} /></button>
          <button className="rail-btn" title="Paramètres"><Settings size={20} /></button>
        </div>
        <div className="rail-bottom">
          <div className="avatar-small">
            <img src="https://ui-avatars.com/api/?name=Admin&background=0891b2&color=fff" alt="Admin" />
          </div>
          <button className="rail-btn" title="Log out">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* 2. Inner Sidebar (Nav Menu) */}
      <aside className="flup-nav-menu">
        <div className="menu-header">
          <div className="menu-brand">
            <GraduationCap size={22} className="brand-icon" />
            <span>Campus 360</span>
          </div>
        </div>

        <div className="menu-sections">
          <div className="menu-section">
            <span className="section-label">CATALOGUE</span>
            {NAV_ITEMS.CATALOGUE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`menu-link ${pathname === item.href ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.active && <span className="badge">5</span>}
              </Link>
            ))}
          </div>

          <div className="menu-section">
            <span className="section-label">ANALYTICS</span>
            {NAV_ITEMS.ANALYTICS.map((item) => (
              <Link key={item.href} href={item.href} className="menu-link">
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="menu-section">
            <span className="section-label">PAIEMENTS</span>
            {NAV_ITEMS.PAIEMENTS.map((item) => (
              <Link key={item.href} href={item.href} className="menu-link">
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="menu-section">
            <span className="section-label">SYSTÈME</span>
            {NAV_ITEMS.SYSTEME.map((item) => (
              <Link key={item.href} href={item.href} className="menu-link">
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="menu-link" style={{ cursor: 'pointer' }}>
              <Moon size={18} />
              <span>Dark mode</span>
              <div className="toggle-switch" />
            </div>
          </div>
        </div>

        {/* Footer user card */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 20,
          borderTop: '1px solid var(--flup-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div className="avatar-small">
            <img src="https://ui-avatars.com/api/?name=Harper+Nelson&background=0891b2&color=fff" alt="Harper Nelson" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--flup-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Harper Nelson</div>
            <div style={{ fontSize: 11, color: 'var(--flup-text-muted)' }}>Admin Manager</div>
          </div>
          <button className="rail-btn" title="Log out" style={{ width: 32, height: 32 }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <main className="flup-main">
        {children}
      </main>
    </div>
  );
}
