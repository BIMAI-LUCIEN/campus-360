'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Check,
  CircleAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  MoreVertical,
  Send,
  UserMinus,
  UserCheck,
  Wallet,
  Ban,
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReasonText, setBanReasonText] = useState('');

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const activeCount = users.filter((u) => !u.banned).length;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, banned: false, banReason: null } : u)),
      );
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
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, banned: true, banReason: reason || 'Banni' } : u,
        ),
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedUsers.map((u) => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectUser = (userId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(userId);
    } else {
      newSet.delete(userId);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <>
      {/* ── Alerts ─────────────────────────────────────────── */}
      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-stitch border border-stitch-success bg-stitch-success-light p-3 text-sm font-medium text-stitch-success-dark">
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-5 flex items-center gap-2 rounded-stitch border border-stitch-error bg-stitch-error-light p-3 text-sm font-medium text-stitch-error">
          <CircleAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="mb-8 flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="font-stitch-headline text-2xl font-bold text-stitch-on-surface">
            Étudiants
          </h2>
          <p className="text-sm text-stitch-on-surface-variant">
            Gère les comptes étudiants de Campus 360.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xl font-bold text-stitch-primary">
              {activeCount.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs text-stitch-on-surface-variant opacity-70">comptes actifs</span>
          </div>
          <button
            onClick={() => {
              /* Export CSV logic */
            }}
            className="flex items-center gap-2 rounded-lg border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2.5 text-sm font-medium text-stitch-on-surface shadow-sm transition-all hover:bg-stitch-surface-container-low"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filter Row ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stitch-outline-variant bg-stitch-surface p-4 shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="min-w-[300px] flex-1 relative"
        >
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant opacity-50"
          />
          <input
            type="text"
            placeholder="Rechercher nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stitch-outline-variant bg-stitch-surface-lowest py-2 pl-10 pr-4 text-sm text-stitch-on-surface transition-colors placeholder:text-stitch-outline focus:border-stitch-primary focus:outline-none focus:ring-2 focus:ring-stitch-primary/15"
          />
        </form>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button className="flex items-center gap-1 rounded-full border border-stitch-outline-variant bg-stitch-surface-container-low px-3 py-1.5 text-sm text-stitch-on-surface transition-colors hover:bg-stitch-surface-container">
            Université <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-1 rounded-full border border-stitch-outline-variant bg-stitch-surface-container-low px-3 py-1.5 text-sm text-stitch-on-surface transition-colors hover:bg-stitch-surface-container">
            Rôle <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-1 rounded-full border border-stitch-outline-variant bg-stitch-surface-container-low px-3 py-1.5 text-sm text-stitch-on-surface transition-colors hover:bg-stitch-surface-container">
            Statut <ChevronDown size={16} />
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1 rounded-full border border-stitch-outline-variant bg-stitch-surface-container-low px-3 py-1.5 text-sm text-stitch-on-surface transition-colors hover:bg-stitch-surface-container disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      {/* ── Data Table Card ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-stitch-outline-variant bg-stitch-surface shadow-sm">
        {/* Bulk Actions Bar */}
        <div
          className={`absolute top-0 left-0 z-20 flex h-14 w-full items-center gap-6 bg-stitch-primary px-6 text-stitch-on-primary transition-transform ${
            selectedIds.size > 0 ? 'translate-y-0' : 'translate-y-[-100%]'
          }`}
        >
          <span className="text-sm font-medium">{selectedIds.size} sélectionnés</span>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10">
              <Send size={16} /> Envoyer message
            </button>
            <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10">
              <Wallet size={16} /> Offrir recharge
            </button>
            <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10">
              <Ban size={16} /> Suspendre
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="ml-auto rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <span className="sr-only">Fermer</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stitch-outline-variant bg-stitch-surface-container-low">
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && selectedIds.size === paginatedUsers.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-stitch-outline-variant text-stitch-primary focus:ring-stitch-primary cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                  Nom
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                  Email
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                  Rôle
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                  Statut
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-stitch-on-surface-variant">
                  Créé le
                </th>
                <th className="w-10 px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stitch-outline-variant">
              {paginatedUsers.map((u) => {
                const isBanned = Boolean(u.banned);
                const isSelected = selectedIds.has(u.id);
                return (
                  <tr
                    key={u.id}
                    className={`group transition-colors hover:bg-stitch-surface-container ${
                      isSelected ? 'bg-stitch-primary-fixed/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectUser(u.id, e.target.checked)}
                        className="rounded border-stitch-outline-variant text-stitch-primary focus:ring-stitch-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stitch-primary-container text-stitch-on-primary font-semibold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-stitch-on-surface">{u.name}</div>
                          <div className="text-xs text-stitch-on-surface-variant opacity-60">
                            ID: #{u.id.slice(-5)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stitch-on-surface-variant">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'student'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={actionLoadingId === u.id}
                        className="cursor-pointer appearance-none rounded-lg border border-stitch-outline-variant bg-stitch-surface-container-low px-2 py-1 text-xs font-semibold text-stitch-on-surface transition-colors focus:border-stitch-primary focus:outline-none disabled:opacity-50"
                      >
                        <option value="student">Étudiant</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {isBanned ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-sm font-medium text-amber-600">En attente</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            <span className="text-sm font-medium text-emerald-600">Active</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-stitch-on-surface-variant">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {isBanned ? (
                          <button
                            onClick={() => handleUnban(u.id)}
                            disabled={actionLoadingId === u.id}
                            className="flex items-center gap-1.5 rounded-lg border border-stitch-success bg-stitch-success-light px-3 py-1.5 text-xs font-semibold text-stitch-success-dark transition-opacity hover:opacity-80 disabled:opacity-50"
                          >
                            <UserCheck size={14} />
                            Débannir
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerBanModal(u.id)}
                            disabled={actionLoadingId === u.id}
                            className="flex items-center gap-1.5 rounded-lg border border-stitch-error bg-stitch-error-light px-3 py-1.5 text-xs font-semibold text-stitch-error transition-opacity hover:opacity-80 disabled:opacity-50"
                          >
                            <UserMinus size={14} />
                            Bannir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stitch-on-surface-variant">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-stitch-outline-variant bg-stitch-surface px-6 py-4">
          <span className="text-sm text-stitch-on-surface-variant">
            Affichage {paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–
            {Math.min(currentPage * ITEMS_PER_PAGE, users.length)} sur {users.length} comptes
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center justify-center rounded p-2 text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={20} />
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
                  className={
                    currentPage === page
                      ? 'flex h-8 w-8 items-center justify-center rounded bg-stitch-primary text-sm font-medium text-stitch-on-primary'
                      : 'flex h-8 w-8 items-center justify-center rounded text-sm font-medium text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface'
                  }
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center rounded p-2 text-stitch-on-surface-variant transition-colors hover:bg-stitch-surface-container-high hover:text-stitch-on-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Ban Modal ──────────────────────────────────────── */}
      {banUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ban-modal-title"
        >
          <div className="w-full max-w-md rounded-stitch-lg border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-lg">
            <h3
              id="ban-modal-title"
              className="mb-3 text-base font-bold text-stitch-on-surface"
            >
              Bannir l&apos;utilisateur
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-stitch-on-surface-variant">
              Veuillez indiquer la raison du bannissement de ce compte.
              L&apos;utilisateur verra ce motif lors de sa tentative de connexion.
            </p>
            <div className="mb-5">
              <label
                htmlFor="ban-reason"
                className="mb-2 block text-sm font-semibold text-stitch-on-surface"
              >
                Raison du bannissement
              </label>
              <textarea
                id="ban-reason"
                value={banReasonText}
                onChange={(e) => setBanReasonText(e.target.value)}
                placeholder="Ex: Activité suspecte ou non conforme"
                rows={3}
                className="w-full resize-none rounded-stitch border border-stitch-outline-variant bg-stitch-surface px-3 py-2.5 text-sm text-stitch-on-surface transition-colors placeholder:text-stitch-outline focus:border-stitch-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBanUserId(null)}
                className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest px-4 py-2 text-sm font-semibold text-stitch-on-surface transition-colors hover:bg-stitch-surface-container"
              >
                Annuler
              </button>
              <button
                onClick={handleBanConfirm}
                className="rounded-stitch border-none bg-stitch-error px-4 py-2 text-sm font-bold text-stitch-on-primary transition-opacity hover:opacity-90"
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
