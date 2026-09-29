'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  GraduationCap,
  MessageSquare,
  AlertCircle,
  Users,
  Eye,
} from 'lucide-react';
import type { AdminApplication } from '@/lib/admin-platform-service';
import {
  Card,
  Button,
  KpiCard,
  Pill,
  EmptyState,
} from '../_components/ui';

export function ApplicationsDashboardClient() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [relanceFilter, setRelanceFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (relanceFilter) params.append('relanceJ7', 'true');
      if (search) params.append('query', search);

      const res = await fetch(`/api/admin/applications?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les candidatures');
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, relanceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  // KPIs
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const eligibleRelanceCount = applications.filter((a) => a.isEligibleForFollowup).length;
  const interviewOrAcceptedCount = applications.filter(
    (a) => a.status === 'INTERVIEW' || a.status === 'ACCEPTED',
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Candidatures Étudiantes & Relances J+7
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Supervisez les postulations générées par le moteur IA (Template CV Officiel + Lettre RH) et les déclencheurs de relance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchApplications}
            icon={RefreshCw}
            loading={loading}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-danger-bg text-danger text-sm border border-danger/30">
          {errorMsg}
        </div>
      )}

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Candidatures transmises"
          value={totalCount}
          icon={Send}
          accent="blue"
          caption="CV & Lettre sur-mesure"
        />
        <KpiCard
          label="En attente de revue"
          value={pendingCount}
          icon={Clock}
          accent="amber"
          caption="Transmises aux recruteurs"
        />
        <KpiCard
          label="Relances J+7 Requises"
          value={eligibleRelanceCount}
          icon={AlertCircle}
          accent="rose"
          caption="≥ 7 jours sans réponse"
        />
        <KpiCard
          label="Entretiens & Retenus"
          value={interviewOrAcceptedCount}
          icon={CheckCircle2}
          accent="green"
          caption="Taux de conversion positif"
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <Card padded={false} className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Rechercher par étudiant, poste, entreprise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Relance J+7 toggle */}
            <button
              onClick={() => setRelanceFilter((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                relanceFilter
                  ? 'bg-danger-bg text-danger border-danger/40'
                  : 'bg-surface text-fg-subtle border-border hover:text-fg'
              }`}
            >
              <AlertCircle size={13} />
              <span>Relances J+7 ({eligibleRelanceCount})</span>
            </button>

            {/* Status select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-subtle">Statut :</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg focus:outline-none"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PENDING">En attente (PENDING)</option>
                <option value="REVIEWING">En cours de revue (REVIEWING)</option>
                <option value="INTERVIEW">Entretien programmé (INTERVIEW)</option>
                <option value="ACCEPTED">Candidat retenu (ACCEPTED)</option>
                <option value="REJECTED">Non retenu (REJECTED)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Applications Table ──────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        {applications.length === 0 ? (
          <EmptyState
            title="Aucune candidature trouvée"
            description="Aucune postulation ne correspond aux filtres actuels."
            action={
              <Button
                variant="secondary"
                onClick={() => { setSearch(''); setStatusFilter('ALL'); setRelanceFilter(false); }}
              >
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                  <th className="py-3.5 px-4">Étudiant & Filière</th>
                  <th className="py-3.5 px-4">Offre & Entreprise Cible</th>
                  <th className="py-3.5 px-4">Délai / Relance J+7</th>
                  <th className="py-3.5 px-4">Statut Candidature</th>
                  <th className="py-3.5 px-4 text-right">Date d'envoi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-surface-2/60 transition-colors">
                    {/* Student */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-semibold text-fg">{app.studentName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-fg-subtle">
                        <GraduationCap size={13} className="shrink-0" />
                        <span className="truncate">
                          {app.studentMajor || 'Non renseigné'} • {app.studentLevel || 'Niveau'}
                        </span>
                      </div>
                      {app.studentWhatsapp && (
                        <div className="text-[11px] text-fg-subtle mt-0.5">
                          💬 {app.studentWhatsapp}
                        </div>
                      )}
                    </td>

                    {/* Job & Company */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-medium text-fg line-clamp-1">{app.jobTitle}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-fg-muted">
                        <Building2 size={13} className="shrink-0 text-fg-subtle" />
                        <span>{app.companyName}</span>
                      </div>
                    </td>

                    {/* J+7 Follow-up status */}
                    <td className="py-4 px-4 text-xs">
                      {app.isEligibleForFollowup ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-bg text-danger font-semibold text-[11px] animate-pulse">
                          <AlertCircle size={12} />
                          Relance J+7 ({app.daysSinceApplication}j)
                        </span>
                      ) : (
                        <span className="text-fg-subtle">
                          {app.daysSinceApplication === 0
                            ? "Aujourd'hui"
                            : `Il y a ${app.daysSinceApplication} jour(s)`}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {app.status === 'PENDING' && <Pill tone="amber" label="En attente" />}
                      {app.status === 'REVIEWING' && <Pill tone="blue" label="En revue" />}
                      {app.status === 'INTERVIEW' && <Pill tone="green" label="Entretien" />}
                      {app.status === 'ACCEPTED' && <Pill tone="green" label="Accepté" />}
                      {app.status === 'REJECTED' && <Pill tone="rose" label="Refusé" />}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-xs text-fg-subtle text-right tabular-nums">
                      {new Date(app.appliedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
