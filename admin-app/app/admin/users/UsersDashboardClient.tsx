'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserMinus,
  UserCheck,
  Search,
  RefreshCw,
  Check,
  CircleAlert,
  Loader2,
} from 'lucide-react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean | number;
  banReason: string | null;
  createdAt: string;
}

export function UsersDashboardClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReasonText, setBanReasonText] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('banned', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les utilisateurs');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoadingId(userId);
    setMessage('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'update-role', role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour du rôle');
      setMessage(data.message);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setActionLoadingId(userId);
    setMessage('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'unban' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du débannissement');
      setMessage(data.message);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: false, banReason: null } : u)));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerBanModal = (userId: string) => {
    setBanUserId(userId);
    setBanReasonText('');
  };

  const handleBanConfirm = async () => {
    if (!banUserId) return;
    setActionLoadingId(banUserId);
    setMessage('');
    setErrorMsg('');
    const userId = banUserId;
    const reason = banReasonText;
    setBanUserId(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'ban', banReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du bannissement');
      setMessage(data.message);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: true, banReason: reason || 'Banni' } : u)));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-[var(--color-stitch-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-stitch-on-surface)] m-0">Gestion des Utilisateurs</h1>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-stitch-surface-lowest)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[14px] font-semibold text-[var(--color-stitch-on-surface)] hover:bg-[var(--color-stitch-bg)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>
        </div>
        <p className="text-[14px] text-[#64748b] m-0 leading-relaxed">
          Gérez les comptes des étudiants et des administrateurs, changez les rôles d'accès et bannissez/débannissez les utilisateurs.
        </p>
      </div>

      {/* ── Alerts ─────────────────────────────────────────── */}
      {message && (
        <div className="flex items-center gap-2 bg-[#ecfdf5] border border-[#a7f3d0] text-[#15803d] rounded-lg p-3 mb-5 text-sm font-medium">
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-lg p-3 mb-5 text-sm font-medium">
          <CircleAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-stitch-surface-lowest)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[14px] text-[var(--color-stitch-on-surface)] placeholder:text-[#94a3b8] focus:outline-none focus:border-[var(--color-stitch-primary)]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--color-stitch-primary)] text-white border-none rounded-lg text-[14px] font-bold hover:bg-[var(--color-stitch-primary-container)] transition-colors whitespace-nowrap"
          >
            Rechercher
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-[var(--color-stitch-surface-lowest)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[14px] text-[var(--color-stitch-on-surface)] focus:outline-none focus:border-[var(--color-stitch-primary)] cursor-pointer"
            >
              <option value="">Tous les rôles</option>
              <option value="student">Étudiants (Student)</option>
              <option value="admin">Administrateurs (Admin)</option>
              <option value="super_admin">Super Admins</option>
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-[var(--color-stitch-surface-lowest)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[14px] text-[var(--color-stitch-on-surface)] focus:outline-none focus:border-[var(--color-stitch-primary)] cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              <option value="false">Actifs</option>
              <option value="true">Bannis</option>
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="bg-[var(--color-stitch-surface-lowest)] rounded-xl border border-[var(--color-stitch-outline-variant)] overflow-hidden shadow-sm">
        {loading && users.length === 0 ? (
          <div className="flex justify-center items-center py-20 gap-2.5">
            <Loader2 size={24} className="animate-spin text-[var(--color-stitch-primary)]" />
            <span className="text-[#64748b] text-[14px]">Chargement des utilisateurs...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-[var(--color-stitch-surface-container)]">
                  {['Utilisateur', 'Rôle', 'Statut', 'Créé le', 'Actions'].map((th) => (
                    <th key={th} className="text-left text-[12px] uppercase font-semibold text-[#64748b] py-3 px-3">
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isBanned = Boolean(u.banned);
                  return (
                    <tr key={u.id} className="border-b border-[var(--color-stitch-surface-container)] last:border-0 hover:bg-[var(--color-stitch-bg)]">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[var(--color-stitch-on-surface)]">{u.name}</div>
                        <div className="text-[12px] text-[#64748b]">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={u.role || 'student'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={actionLoadingId === u.id}
                          className="appearance-none pl-2 pr-7 py-1 bg-[var(--color-stitch-bg)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[13px] text-[var(--color-stitch-on-surface)] focus:outline-none focus:border-[var(--color-stitch-primary)] cursor-pointer disabled:opacity-50"
                        >
                          <option value="student">Étudiant</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        {isBanned ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded-md text-[12px] font-semibold bg-[#fee2e2] text-[#dc2626]"
                            title={u.banReason || 'Banni'}
                          >
                            Banni
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[12px] font-semibold bg-[#dcfce7] text-[#15803d]">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[13px] text-[#64748b]">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-2">
                          {isBanned ? (
                            <button
                              onClick={() => handleUnban(u.id)}
                              disabled={actionLoadingId === u.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#16a34a] rounded-lg text-[13px] font-semibold text-[#16a34a] bg-[#f0fdf4] hover:bg-[#dcfce7] transition-colors disabled:opacity-50"
                            >
                              <UserCheck size={14} />
                              <span>Débannir</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerBanModal(u.id)}
                              disabled={actionLoadingId === u.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#dc2626] rounded-lg text-[13px] font-semibold text-[#dc2626] bg-[#fef2f2] hover:bg-[#fee2e2] transition-colors disabled:opacity-50"
                            >
                              <UserMinus size={14} />
                              <span>Bannir</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-[#64748b] py-12">
                      Aucun utilisateur trouvé correspondant aux critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ban Modal ──────────────────────────────────────── */}
      {banUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-stitch-surface-lowest)] rounded-xl border border-[var(--color-stitch-outline-variant)] shadow-lg p-6 w-full max-w-md">
            <h3 className="text-[16px] font-bold text-[var(--color-stitch-on-surface)] mb-3">
              Bannir l'utilisateur
            </h3>
            <p className="text-[13px] text-[#64748b] mb-4 leading-relaxed">
              Veuillez indiquer la raison du bannissement de ce compte. L'utilisateur verra ce motif lors de sa tentative de connexion.
            </p>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold text-[var(--color-stitch-on-surface)] mb-2">
                Raison du bannissement
              </label>
              <textarea
                value={banReasonText}
                onChange={(e) => setBanReasonText(e.target.value)}
                placeholder="Ex: Activité suspecte ou non conforme"
                rows={3}
                className="w-full px-3 py-2.5 bg-[var(--color-stitch-bg)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[13px] text-[var(--color-stitch-on-surface)] placeholder:text-[#94a3b8] focus:outline-none focus:border-[var(--color-stitch-primary)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setBanUserId(null)}
                className="px-4 py-2 bg-[var(--color-stitch-surface-lowest)] border border-[var(--color-stitch-outline-variant)] rounded-lg text-[14px] font-semibold text-[var(--color-stitch-on-surface)] hover:bg-[var(--color-stitch-bg)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleBanConfirm}
                className="px-4 py-2 bg-[#dc2626] border-none rounded-lg text-[14px] font-bold text-white hover:bg-[#b91c1c] transition-colors"
              >
                Confirmer le bannissement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
