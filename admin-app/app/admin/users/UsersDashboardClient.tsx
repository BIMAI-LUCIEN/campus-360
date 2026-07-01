'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  MoreHorizontal,
  Download,
  Filter,
  X,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Mail,
} from 'lucide-react';
import {
  KpiCard,
  Card,
  Pill,
  Avatar,
  FilterChip,
  FilterSelect,
  EmptyState,
  PageHeader,
  Button,
  IconButton,
} from '../_components/ui';

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

// ─── Mock data helpers (deterministic per user id) ────────────────────────
// TODO: replace with real API fields once backend exposes them
const FACULTIES = ['Sciences', 'Médecine', 'Droit', 'Informatique', 'Lettres'] as const;
const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'] as const;
const UNIVERSITIES = [
  'UCAD',
  'ESP',
  'Université Cheikh Anta Diop',
  'Université Paris-Saclay',
  'UGB Saint-Louis',
] as const;
const PLANS = ['Premium', 'Standard', 'Étudiant', 'Famille'] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

type MockProfile = {
  faculty: string;
  level: string;
  wallet: number;
  studentId: string;
  university: string;
  plan: string;
  isPending: boolean;
};

function deriveMock(id: string): MockProfile {
  const h = hashString(id);
  const faculty = FACULTIES[h % FACULTIES.length];
  const level = LEVELS[Math.floor(h / 5) % LEVELS.length];
  const wallet = (h % 8000) + 100;
  const studentId = `#34${210 + (h % 50)}`;
  const university = UNIVERSITIES[Math.floor(h / 7) % UNIVERSITIES.length];
  const plan = PLANS[Math.floor(h / 11) % PLANS.length];
  // stable "pending" flag — every 7th user
  const isPending = h % 7 === 0;
  return { faculty, level, wallet, studentId, university, plan, isPending };
}
// ─── end mock helpers ──────────────────────────────────────────────────────

function formatCoins(n: number) {
  return n.toLocaleString('fr-FR');
}

function statusPill(user: UserRecord) {
  if (user.banned) {
    return (
      <Pill tone="rose" className="normal-case tracking-normal">
        Banni
      </Pill>
    );
  }
  const mock = deriveMock(user.id);
  if (mock.isPending) {
    return (
      <Pill tone="amber" className="normal-case tracking-normal">
        En attente
      </Pill>
    );
  }
  return (
    <Pill tone="green" className="normal-case tracking-normal">
      Active
    </Pill>
  );
}

const PAGE_OPTIONS = [10, 20, 50, 100];

export function UsersDashboardClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReasonText, setBanReasonText] = useState('');

  // derived mock-based filtered data on top of server results
  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      const mock = deriveMock(u.id);
      if (universityFilter && mock.university !== universityFilter) return false;
      if (facultyFilter && mock.faculty !== facultyFilter) return false;
      if (levelFilter && mock.level !== levelFilter) return false;
      if (planFilter && mock.plan !== planFilter) return false;
      return true;
    });
  }, [users, universityFilter, facultyFilter, levelFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / pageSize));
  const paginatedUsers = visibleUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, universityFilter, facultyFilter, levelFilter, planFilter, pageSize]);

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

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setUniversityFilter('');
    setFacultyFilter('');
    setLevelFilter('');
    setPlanFilter('');
    setCurrentPage(1);
    fetchUsers();
  };

  // KPI summaries (derived from current dataset)
  const activeCount = users.filter((u) => !u.banned && !deriveMock(u.id).isPending).length;
  const pendingCount = users.filter((u) => !u.banned && deriveMock(u.id).isPending).length;
  const bannedCount = users.filter((u) => Boolean(u.banned)).length;

  const banTargetUser = banUserId ? users.find((u) => u.id === banUserId) : null;

  // page numbers for pagination display
  const pageNumbers = useMemo(() => {
    const arr: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
      return arr;
    }
    arr.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) arr.push('ellipsis');
    for (let i = start; i <= end; i++) arr.push(i);
    if (end < totalPages - 1) arr.push('ellipsis');
    arr.push(totalPages);
    return arr;
  }, [currentPage, totalPages]);

  return (
    <>
      <PageHeader
        breadcrumb={{ parent: 'Dashboard', current: 'Étudiants' }}
        title="Étudiants"
        subtitle="Gère les comptes étudiants de Campus 360."
        actions={
          <>
            <div className="hidden sm:flex flex-col items-end leading-tight pr-2 border-r border-border-light">
              <span className="font-display text-[22px] font-bold text-primary tabular-nums">
                {formatCoins(users.length)}
              </span>
              <span className="text-[11px] text-fg-subtle uppercase tracking-wider">
                comptes actifs
              </span>
            </div>
            <Button variant="secondary" icon={Download} size="md">
              Export CSV
            </Button>
            <IconButton icon={RefreshCw} label="Actualiser" onClick={fetchUsers} />
          </>
        }
      />

      {/* ── Alerts ─────────────────────────────────────────── */}
      {message && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success bg-success-bg px-4 py-3 text-sm font-medium text-success">
          <Check size={16} />
          <span>{message}</span>
          <button
            onClick={() => setMessage('')}
            className="ml-auto text-success hover:opacity-70 cursor-pointer"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          <CircleAlert size={16} />
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg('')}
            className="ml-auto text-danger hover:opacity-70 cursor-pointer"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────── */}
      <Card padded={false} className="mb-5">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex min-w-[260px] flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-faint"
              />
              <input
                type="text"
                placeholder="Rechercher nom, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-full border border-border bg-surface-2 pl-10 pr-4 text-sm text-fg placeholder:text-fg-faint transition-colors focus:bg-surface focus:border-primary focus:outline-none"
              />
            </div>
          </form>

          <FilterChip icon={Filter} label="Université :">
            <FilterSelect
              value={universityFilter}
              onChange={(e) => setUniversityFilter(e.target.value)}
              ariaLabel="Filtrer par université"
              options={[
                { value: '', label: 'Tous' },
                ...UNIVERSITIES.map((u) => ({ value: u, label: u })),
              ]}
            />
          </FilterChip>

          <FilterChip icon={Filter} label="Faculté :">
            <FilterSelect
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              ariaLabel="Filtrer par faculté"
              options={[
                { value: '', label: 'Tous' },
                ...FACULTIES.map((f) => ({ value: f, label: f })),
              ]}
            />
          </FilterChip>

          <FilterChip icon={Filter} label="Niveau :">
            <FilterSelect
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              ariaLabel="Filtrer par niveau"
              options={[
                { value: '', label: 'Tous' },
                ...LEVELS.map((l) => ({ value: l, label: l })),
              ]}
            />
          </FilterChip>

          <FilterChip icon={Filter} label="Abonnement :">
            <FilterSelect
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              ariaLabel="Filtrer par abonnement"
              options={[
                { value: '', label: 'Tous' },
                ...PLANS.map((p) => ({ value: p, label: p })),
              ]}
            />
          </FilterChip>

          <FilterChip icon={Filter} label="Statut :">
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              ariaLabel="Filtrer par statut"
              options={[
                { value: '', label: 'Tous' },
                { value: 'false', label: 'Actifs' },
                { value: 'true', label: 'Bannis' },
              ]}
            />
          </FilterChip>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>
      </Card>

      {/* ── Table ──────────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center gap-2.5 py-20">
            <Loader2 size={22} className="spin-anim text-primary" />
            <span className="text-sm text-fg-muted">Chargement des utilisateurs…</span>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun étudiant trouvé"
            description="Aucun résultat ne correspond à vos filtres. Ajustez les critères ou réinitialisez la recherche."
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Tout sélectionner"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    {['NOM', 'EMAIL', 'FACULTÉ', 'NIVEAU', 'WALLET', 'STATUT', ''].map(
                      (th, idx) => (
                        <th
                          key={`${th}-${idx}`}
                          scope="col"
                          className={[
                            'px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-fg-subtle',
                            th === 'WALLET' ? 'text-right' : 'text-left',
                            th === '' ? 'w-12' : '',
                          ].join(' ')}
                        >
                          {th}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const isBanned = Boolean(u.banned);
                    const mock = deriveMock(u.id);
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-border-light last:border-b-0 hover:bg-surface-2/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner ${u.name}`}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size={32} />
                            <div className="leading-tight min-w-0">
                              <div className="text-sm font-bold text-fg truncate">
                                {u.name}
                              </div>
                              <div className="text-[11px] text-fg-subtle font-medium tabular-nums">
                                {mock.studentId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-fg-muted">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-fg-faint shrink-0" />
                            <span className="truncate max-w-[200px]">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-fg">
                          {mock.faculty}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-fg-muted">
                            {mock.level}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-display text-[14px] font-bold text-primary tabular-nums">
                            {formatCoins(mock.wallet)}
                            <span className="ml-0.5 text-[11px] font-semibold text-fg-subtle">
                              F
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3">{statusPill(u)}</td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <IconButton
                              icon={MoreHorizontal}
                              label={`Actions pour ${u.name}`}
                              onClick={() =>
                                setOpenActionId((id) => (id === u.id ? null : u.id))
                              }
                            />
                            {openActionId === u.id && (
                              <div
                                className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-surface py-1 shadow-popover"
                                onMouseLeave={() => setOpenActionId(null)}
                              >
                                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-fg-faint">
                                  Changer le rôle
                                </div>
                                {['student', 'admin', 'super_admin'].map((r) => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                      handleRoleChange(u.id, r);
                                      setOpenActionId(null);
                                    }}
                                    disabled={actionLoadingId === u.id || u.role === r}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-fg hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
                                  >
                                    {r === 'student'
                                      ? 'Étudiant'
                                      : r === 'admin'
                                        ? 'Admin'
                                        : 'Super Admin'}
                                    {u.role === r && (
                                      <Check size={12} className="ml-auto text-success" />
                                    )}
                                  </button>
                                ))}
                                <div className="my-1 border-t border-border-light" />
                                {isBanned ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUnban(u.id);
                                      setOpenActionId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-success hover:bg-surface-2 cursor-pointer"
                                  >
                                    <UserCheck size={14} />
                                    Débannir
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerBanModal(u.id);
                                      setOpenActionId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-danger hover:bg-danger-bg cursor-pointer"
                                  >
                                    <UserMinus size={14} />
                                    Bannir
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {visibleUsers.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light px-5 py-4">
                <span className="text-[13px] text-fg-muted">
                  Affichage{' '}
                  <span className="font-semibold text-fg tabular-nums">
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, visibleUsers.length)}
                  </span>{' '}
                  sur{' '}
                  <span className="font-semibold text-fg tabular-nums">
                    {formatCoins(visibleUsers.length)}
                  </span>{' '}
                  comptes
                </span>
                <div className="flex items-center gap-1">
                  <IconButton
                    icon={ChevronLeft}
                    label="Page précédente"
                    onClick={() => goToPage(currentPage - 1)}
                    className={
                      currentPage === 1 ? 'opacity-40 pointer-events-none' : ''
                    }
                  />
                  {pageNumbers.map((p, i) =>
                    p === 'ellipsis' ? (
                      <span
                        key={`e-${i}`}
                        className="inline-flex h-9 w-9 items-center justify-center text-fg-faint"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        aria-current={currentPage === p ? 'page' : undefined}
                        className={[
                          'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-[13px] font-semibold transition-colors cursor-pointer',
                          currentPage === p
                            ? 'bg-primary text-on-primary'
                            : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                        ].join(' ')}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <IconButton
                    icon={ChevronRight}
                    label="Page suivante"
                    onClick={() => goToPage(currentPage + 1)}
                    className={
                      currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''
                    }
                  />
                </div>
                <div className="flex items-center gap-2 text-[13px] text-fg-muted">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Taille de page"
                    className="h-9 cursor-pointer rounded-md border border-border bg-surface px-2 text-[13px] text-fg focus:border-primary focus:outline-none"
                  >
                    {PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── KPI summary cards ──────────────────────────────── */}
      {!loading && users.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total étudiants"
            value={formatCoins(users.length)}
            icon={GraduationCap}
            accent="blue"
            caption="Comptes enregistrés sur la plateforme"
          />
          <KpiCard
            label="Actifs"
            value={formatCoins(activeCount)}
            icon={ShieldCheck}
            accent="green"
            caption="Comptes vérifiés et en règle"
          />
          <KpiCard
            label="En attente"
            value={formatCoins(pendingCount)}
            icon={UserX}
            accent="amber"
            caption="Vérification e-mail en attente"
          />
          <KpiCard
            label="Bannis"
            value={formatCoins(bannedCount)}
            icon={ShieldAlert}
            accent="rose"
            caption="Accès bloqué par un administrateur"
          />
        </div>
      )}

      {/* ── Ban Modal ──────────────────────────────────────── */}
      {banUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ban-modal-title"
        >
          <Card className="w-full max-w-md" padded={false}>
            <div className="flex items-start gap-3 border-b border-border-light px-6 py-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-danger-bg text-danger shrink-0">
                <UserMinus size={18} />
              </span>
              <div className="min-w-0">
                <h3
                  id="ban-modal-title"
                  className="font-display text-base font-bold text-fg leading-tight"
                >
                  Bannir l&apos;utilisateur
                </h3>
                {banTargetUser && (
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {banTargetUser.name} ·{' '}
                    <span className="text-fg-muted">{banTargetUser.email}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBanUserId(null)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg cursor-pointer"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="mb-4 text-[13px] leading-relaxed text-fg-muted">
                Indiquez la raison du bannissement. L&apos;utilisateur verra ce
                motif lors de sa prochaine tentative de connexion.
              </p>
              <label
                htmlFor="ban-reason"
                className="mb-2 block text-[13px] font-semibold text-fg"
              >
                Raison du bannissement
              </label>
              <textarea
                id="ban-reason"
                value={banReasonText}
                onChange={(e) => setBanReasonText(e.target.value)}
                placeholder="Ex : Activité suspecte ou non conforme"
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-faint transition-colors focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border-light bg-surface-2 px-6 py-3 rounded-b-xl">
              <Button variant="secondary" onClick={() => setBanUserId(null)}>
                Annuler
              </Button>
              <Button variant="danger" icon={UserMinus} onClick={handleBanConfirm}>
                Confirmer le bannissement
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
