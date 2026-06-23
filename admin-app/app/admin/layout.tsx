import { BarChart3, FileText, GraduationCap } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand-mark" title="Campus-Bordes">
          <GraduationCap size={20} />
        </div>
        <a className="nav-icon" href="/admin/pdf" title="PDF">
          <FileText size={19} />
        </a>
        <a className="nav-icon" href="/admin/analytics" title="Analytics PDF">
          <BarChart3 size={19} />
        </a>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
