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
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import './flup.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          <button className="rail-btn active" title="Accueil"><BarChart3 size={20} /></button>
          <button className="rail-btn" title="Utilisateurs"><Users size={20} /></button>
          <button className="rail-btn" title="Paramètres"><Settings size={20} /></button>
        </div>
        <div className="rail-bottom">
          <div className="avatar-small">
            <img src="https://ui-avatars.com/api/?name=Admin&background=02b075&color=fff" alt="Admin" />
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
            <GraduationCap size={24} className="brand-icon" />
            <span>Campus 360</span>
          </div>
        </div>

        <div className="menu-sections">
          <div className="menu-section">
            <span className="section-label">CATALOGUE</span>
            <Link href="/admin/pdf" className="menu-link">
              <FileText size={18} />
              <span>Documents PDF</span>
            </Link>
            <Link href="#" className="menu-link">
              <Folder size={18} />
              <span>Catégories</span>
            </Link>
            <Link href="#" className="menu-link">
              <Search size={18} />
              <span>Recherches</span>
            </Link>
          </div>

          <div className="menu-section">
            <span className="section-label">ANALYTICS</span>
            <Link href="/admin/analytics" className="menu-link active">
              <BarChart3 size={18} />
              <span>Dashboard</span>
            </Link>
            <Link href="#" className="menu-link">
              <CreditCard size={18} />
              <span>Ventes & Achats</span>
            </Link>
            <Link href="#" className="menu-link">
              <BookOpen size={18} />
              <span>Rapports</span>
            </Link>
          </div>

          <div className="menu-section">
            <span className="section-label">SYSTÈME</span>
            <Link href="#" className="menu-link">
              <Settings size={18} />
              <span>Paramètres</span>
            </Link>
            <div className="menu-link">
              <Moon size={18} />
              <span>Dark mode</span>
              <div className="toggle-switch"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <main className="flup-main">
        {children}
      </main>
    </div>
  );
}
