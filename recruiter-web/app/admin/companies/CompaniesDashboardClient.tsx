'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ExternalLink,
} from 'lucide-react';
import type { AdminCompany } from '@/lib/admin-platform-service';
import {
  Card,
  Button,
  IconButton,
  KpiCard,
  Pill,
  EmptyState,
} from '../_components/ui';

export function CompaniesDashboardClient() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('query', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/companies?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les entreprises');
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Erreur réseau',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompanies();
  };

  const handleUpdateStatus = async (
    company: AdminCompany,
    nextStatus: 'VERIFIED' | 'UNVERIFIED' | 'SUSPENDED',
  ) => {
    setActionLoadingId(company.id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-status',
          companyId: company.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur modification');

      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, status: nextStatus } : c)),
      );
      setMessage({ text: data.message, type: 'success' });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Erreur',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPIs
  const totalCount = companies.length;
  const verifiedCount = companies.filter((c) => c.status === 'VERIFIED').length;
  const unverifiedCount = companies.filter((c) => c.status === 'UNVERIFIED').length;
  const suspendedCount = companies.filter((c) => c.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Entreprises & Audit KYB Anti-Fraude
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Supervisez les recruteurs et validez leur authenticité juridique (score KYB ≥ 80% requis pour contacter les étudiants).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchCompanies}
            icon={RefreshCw}
            loading={loading}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* ── Notification Banner ────────────────────────────────────── */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-sm border ${
            message.type === 'success'
              ? 'bg-success-bg border-success/30 text-success'
              : 'bg-danger-bg border-danger/30 text-danger'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Entreprises enregistrées"
          value={totalCount}
          icon={Building2}
          accent="blue"
          caption="Recruteurs & partenaires"
        />
        <KpiCard
          label="Certifiées KYB (≥ 80%)"
          value={verifiedCount}
          icon={ShieldCheck}
          accent="green"
          caption="Contact WhatsApp direct actif"
        />
        <KpiCard
          label="En attente KYB"
          value={unverifiedCount}
          icon={ShieldAlert}
          accent="amber"
          caption="Contact étudiant désactivé"
        />
        <KpiCard
          label="En Quarantaine / Suspendues"
          value={suspendedCount}
          icon={ShieldX}
          accent="rose"
          caption="Tentative frauduleuse bloquée"
        />
      </div>

      {/* ── Filter & Search Bar ─────────────────────────────────────── */}
      <Card padded={false} className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, secteur, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase text-fg-subtle">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg focus:outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="VERIFIED">Vérifiées (KYB ≥ 80%)</option>
              <option value="UNVERIFIED">En attente (KYB &lt; 80%)</option>
              <option value="SUSPENDED">Suspendues (Quarantaine)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── Companies Table ─────────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        {companies.length === 0 ? (
          <EmptyState
            title="Aucune entreprise trouvée"
            description="Aucune entreprise ne correspond à votre filtre."
            action={
              <Button
                variant="secondary"
                onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              >
                Réinitialiser
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                  <th className="py-3.5 px-4">Entreprise & Siège</th>
                  <th className="py-3.5 px-4">Secteur</th>
                  <th className="py-3.5 px-4">Score KYB</th>
                  <th className="py-3.5 px-4">Contact RH</th>
                  <th className="py-3.5 px-4">Offres</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions de modération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((comp) => {
                  const isVerified = comp.status === 'VERIFIED';
                  const isSuspended = comp.status === 'SUSPENDED';

                  return (
                    <tr key={comp.id} className="hover:bg-surface-2/60 transition-colors">
                      {/* Name & Address */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-semibold text-fg flex items-center gap-1.5">
                          <span>{comp.name}</span>
                          {comp.isPremium && (
                            <span className="rounded bg-primary-soft text-primary text-[10px] font-bold px-1.5 py-0.5 uppercase">
                              Partenaire
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-fg-subtle truncate">
                          {comp.address}
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="py-4 px-4 text-xs font-medium text-fg">
                        {comp.industry}
                      </td>

                      {/* KYB Score */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-display font-bold text-sm ${
                              comp.kybScore >= 80
                                ? 'text-success'
                                : comp.kybScore >= 50
                                ? 'text-amber-500'
                                : 'text-danger'
                            }`}
                          >
                            {comp.kybScore}%
                          </span>
                          <div className="h-1.5 w-16 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                comp.kybScore >= 80
                                  ? 'bg-success'
                                  : comp.kybScore >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-danger'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, comp.kybScore))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 text-xs">
                        {comp.contactWhatsapp && (
                          <div className="flex items-center gap-1 text-fg">
                            <Phone size={12} className="text-fg-subtle" />
                            <span>{comp.contactWhatsapp}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-0.5 text-fg-subtle truncate">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{comp.contactEmail}</span>
                        </div>
                      </td>

                      {/* Jobs count */}
                      <td className="py-4 px-4 text-xs font-semibold text-fg">
                        <div className="flex items-center gap-1">
                          <Briefcase size={13} className="text-fg-subtle" />
                          <span>{comp.jobsCount} stages</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isVerified && <Pill tone="green" label="Vérifiée (KYB)" />}
                        {comp.status === 'UNVERIFIED' && <Pill tone="amber" label="En attente" />}
                        {isSuspended && <Pill tone="rose" label="Suspendue" />}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isVerified && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateStatus(comp, 'VERIFIED')}
                              disabled={actionLoadingId === comp.id}
                              className="text-success hover:bg-success-bg border-success/30 text-xs"
                            >
                              <ShieldCheck size={14} />
                              Certifier
                            </Button>
                          )}
                          {!isSuspended ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(comp, 'SUSPENDED')}
                              disabled={actionLoadingId === comp.id}
                              className="text-danger hover:bg-danger-bg text-xs"
                            >
                              <Ban size={14} />
                              Suspendre
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(comp, 'UNVERIFIED')}
                              disabled={actionLoadingId === comp.id}
                              className="text-fg-subtle hover:text-fg text-xs"
                            >
                              Réhabiliter
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
