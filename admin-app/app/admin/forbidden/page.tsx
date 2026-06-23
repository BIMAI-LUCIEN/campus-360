export default function ForbiddenPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div className="auth-brand-logo" style={{ color: 'var(--danger)', background: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.2)' }}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1>Accès refusé</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Votre compte est connecté, mais il ne possède pas les privilèges administrateur requis.
        </p>
        <a
          className="auth-btn-primary"
          href="/admin/login"
          style={{
            textDecoration: 'none',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'none',
          }}
        >
          Retourner à la connexion
        </a>
      </div>
    </div>
  );
}
