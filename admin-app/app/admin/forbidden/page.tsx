export default function ForbiddenPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Acces refuse</h1>
        <p className="muted">Ton compte est connecte, mais il n'a pas le role admin.</p>
        <a className="btn secondary" href="/admin/login">
          Retour connexion
        </a>
      </div>
    </div>
  );
}
