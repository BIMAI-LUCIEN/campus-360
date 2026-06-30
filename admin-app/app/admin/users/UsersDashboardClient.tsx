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
  ChevronLeft,
  ChevronRight,
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

const ITEMS_PER_PAGE = 20;

export function UsersDashboardClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReasonText, setBanReasonText] = useState('');

  // Pagination
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

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
            <Users size={24} className="text-stitch-primary" />
            <h1 className="text-2xl font-bold text-stitch-on-surface m-0">Gestion des Utilisateurs</h1>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            aria-label="Actualiser la liste"
            className="flex items-center gap-2 px-4 py-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch text-[14px] font-semibold text-stitch-on-surface hover:bg-stitch-surface-container transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            <span>Actualiser</span>
          </button>
        </div>
        <p className="text-[14px] text-stitch-on-surface-variant m-0 leading-relaxed">
          Gérez les comptes des étudiants et des administrateurs, changez les rôles d'accès et bannissez/débannissez les utilisateurs.
        </p>
      </div>

      {/* ── Alerts ─────────────────────────────────────────── */}
      {message && (
        <div className="flex items-center gap-2 bg-stitch-success-light border border-stitch-success text-stitch-success-dark rounded-stitch p-3 mb-5 text-sm font-medium">
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-stitch-error-light border border-stitch-error text-stitch-error rounded-stitch p-3 mb-5 text-sm font-medium">
          <CircleAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-outline pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch text-[14px] text-stitch-on-surface placeholder:text-stitch-outline focus:outline-none focus:border-stitch-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-stitch-primary text-stitch-on-primary border-none rounded-stitch text-[14px] font-bold hover:opacity-90 transition-colors whitespace-nowrap"
          >
            Rechercher
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filtrer par rôle"
              className="appearance-none pl-3 pr-8 py-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch text-[14px] text-stitch-on-surface focus:outline-none focus:border-stitch-primary cursor-pointer"
            >
              <option value="">Tous les rôles</option>
              <option value="student">Étudiants</option>
              <option value="admin">Administrateurs</option>
              <option value="super_admin">Super Admins</option>
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stitch-outline" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrer par statut"
              className="appearance-none pl-3 pr-8 py-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch text-[14px] text-stitch-on-surface focus:outline-none focus:border-stitch-primary cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              <option value="false">Actifs</option>
              <option value="true">Bannis</option>
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stitch-outline" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch overflow-hidden shadow-stitch-sm">
        {loading && users.length === 0 ? (
          <div className="flex justify-center items-center py-20 gap-2.5">
            <Loader2 size={24} className="spin-anim text-stitch-primary" />
            <span className="text-stitch-on-surface-variant text-[14px]">Chargement des utilisateurs...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-stitch-surface-container">
                    {['Utilisateur', 'Rôle', 'Statut', 'Créé le', 'Actions'].map((th) => (
                      <th key={th} scope="col" className="text-left text-[12px] uppercase font-semibold text-stitch-on-surface-variant py-3 px-3">
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const isBanned = Boolean(u.banned);
                    return (
                      <tr key={u.id} className="border-b border-stitch-surface-container last:border-0 hover:bg-stitch-surface-container-low">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-stitch-on-surface">{u.name}</div>
                          <div className="text-[12px] text-stitch-on-surface-variant">{u.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={u.role || 'student'}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={actionLoadingId === u.id}
                            aria-label={`Rôle de ${u.name}`}
                            className="appearance-none pl-2 pr-7 py-1 bg-stitch-surface-container-low border border-stitch-outline-variant rounded-lg text-[13px] text-stitch-on-surface focus:outline-none focus:border-stitch-primary cursor-pointer disabled:opacity-50"
                          >
                            <option value="student">Étudiant</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          {isBanned ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded-md text-[12px] font-semibold bg-stitch-error-light text-stitch-error"
                              title={u.banReason || 'Banni'}
                            >
                              Banni
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[12px] font-semibold bg-stitch-success-light text-stitch-success-dark">
                              Actif
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[13px] text-stitch-on-surface-variant">
                          {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            {isBanned ? (
                              <button
                                onClick={() => handleUnban(u.id)}
                                disabled={actionLoadingId === u.id}
                                aria-label={`Débannir ${u.name}`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-stitch-success rounded-stitch-sm text-[13px] font-semibold text-stitch-success-dark bg-stitch-success-light hover:opacity-80 transition-opacity disabled:opacity-50"
                              >
                                <UserCheck size={14} />
                                <span>Débannir</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => triggerBanModal(u.id)}
                                disabled={actionLoadingId === u.id}
                                aria-label={`Bannir ${u.name}`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-stitch-error rounded-stitch-sm text-[13px] font-semibold text-stitch-error bg-stitch-error-light hover:opacity-80 transition-opacity disabled:opacity-50"
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
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-stitch-on-surface-variant py-12">
                        Aucun utilisateur trouvé correspondant aux critères.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stitch-outline-variant">
                <span className="text-[13px] text-stitch-on-surface-variant">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, users.length)} sur {users.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Page précédente"
                    className="w-8 h-8 flex items-center justify-center rounded-stitch-sm text-stitch-on-surface-variant hover:bg-stitch-surface-container hover:text-stitch-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`w-8 h-8 flex items-center justify-center rounded-stitch-sm text-[13px] font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-stitch-primary text-stitch-on-primary'
                            : 'text-stitch-on-surface-variant hover:bg-stitch-surface-container hover:text-stitch-on-surface'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Page suivante"
                    className="w-8 h-8 flex items-center justify-center rounded-stitch-sm text-stitch-on-surface-variant hover:bg-stitch-surface-container hover:text-stitch-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Ban Modal ──────────────────────────────────────── */}
      {banUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="ban-modal-title">
          <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch-lg shadow-stitch-lg p-6 w-full max-w-md">
            <h3 id="ban-modal-title" className="text-[16px] font-bold text-stitch-on-surface mb-3">
              Bannir l'utilisateur
            </h3>
            <p className="text-[13px] text-stitch-on-surface-variant mb-4 leading-relaxed">
              Veuillez indiquer la raison du bannissement de ce compte. L'utilisateur verra ce motif lors de sa tentative de connexion.
            </p>
            <div className="mb-5">
              <label htmlFor="ban-reason" className="block text-[13px] font-semibold text-stitch-on-surface mb-2">
                Raison du bannissement
              </label>
              <textarea
                id="ban-reason"
                value={banReasonText}
                onChange={(e) => setBanReasonText(e.target.value)}
                placeholder="Ex: Activité suspecte ou non conforme"
                rows={3}
                className="w-full px-3 py-2.5 bg-stitch-surface border-stitch-outline-variant rounded-stitch text-[13px] text-stitch-on-surface placeholder:text-stitch-outline focus:outline-none focus:border-stitch-primary resize-none"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setBanUserId(null)}
                className="px-4 py-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch text-[14px] font-semibold text-stitch-on-surface hover:bg-stitch-surface-container transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleBanConfirm}
                className="px-4 py-2 bg-stitch-error border-none rounded-stitch text-[14px] font-bold text-stitch-on-primary hover:opacity-90 transition-colors"
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
