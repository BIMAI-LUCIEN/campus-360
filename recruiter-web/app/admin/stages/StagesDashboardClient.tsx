'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  RefreshCw,
  Star,
  Trash2,
  ExternalLink,
  Building2,
  Calendar,
  MapPin,
  Coins,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Eye,
  Filter,
} from 'lucide-react';
import type { AdminStageJob } from '@/lib/admin-platform-service';
import {
  Card,
  CardHeader,
  Button,
  IconButton,
  KpiCard,
  Pill,
  EmptyState,
} from '../_components/ui';

export function StagesDashboardClient() {
  const [stages, setStages] = useState<AdminStageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [sponsoredFilter, setSponsoredFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('query', search);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
      if (sponsoredFilter === 'true') params.append('sponsored', 'true');
      if (sponsoredFilter === 'false') params.append('sponsored', 'false');

      const res = await fetch(`/api/admin/stages?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les stages');
      const data = await res.json();
      setStages(data);
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
    fetchStages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter, sponsoredFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStages();
  };

  const handleToggleSponsored = async (job: AdminStageJob) => {
    setActionLoadingId(job.id);
    setMessage(null);
    try {
      const nextSponsored = !job.isSponsored;
      const res = await fetch('/api/admin/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-sponsored',
          jobId: job.id,
          isSponsored: nextSponsored,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la modification');

      setStages((prev) =>
        prev.map((s) => (s.id === job.id ? { ...s, isSponsored: nextSponsored } : s)),
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

  const handleDeleteJob = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Confirmer la suppression de l'offre "${jobTitle}" ?`)) return;
    setActionLoadingId(jobId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');

      setStages((prev) => prev.filter((s) => s.id !== jobId));
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
  const totalCount = stages.length;
  const activeCount = stages.filter((s) => !s.isExpired).length;
  const sponsoredCount = stages.filter((s) => s.isSponsored).length;
  const scrapedCount = stages.filter((s) => s.source === 'SCRAPED').length;

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Modération & Offres de Stages
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Supervisez les annonces collectées par l'agent n8n et publiées par les entreprises partenaires.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchStages}
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
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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
          label="Offres totales"
          value={totalCount}
          icon={Briefcase}
          accent="blue"
          caption="Annonces en base"
        />
        <KpiCard
          label="Offres actives"
          value={activeCount}
          icon={CheckCircle2}
          accent="green"
          caption="Disponibles pour matching"
        />
        <KpiCard
          label="Ingestion n8n (IA)"
          value={scrapedCount}
          icon={Sparkles}
          accent="purple"
          caption="Collectées par OCR Vision"
        />
        <KpiCard
          label="Sponsorisées"
          value={sponsoredCount}
          icon={Star}
          accent="amber"
          caption="Mises en avant dans le feed"
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
              placeholder="Rechercher par titre, entreprise, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Source */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-subtle">Source :</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg focus:outline-none"
              >
                <option value="ALL">Toutes les sources</option>
                <option value="SCRAPED">Ingestion n8n (OCR)</option>
                <option value="INTERNAL">Entreprise Partenaire</option>
              </select>
            </div>

            {/* Filter Sponsoring */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-subtle">Sponsoring :</span>
              <select
                value={sponsoredFilter}
                onChange={(e) => setSponsoredFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg focus:outline-none"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="true">Sponsorisées uniquement</option>
                <option value="false">Non sponsorisées</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Offers Table ────────────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        {stages.length === 0 ? (
          <EmptyState
            title="Aucune offre de stage trouvée"
            description="Aucune annonce ne correspond à vos filtres actuels."
            action={
              <Button variant="secondary" onClick={() => { setSearch(''); setSourceFilter('ALL'); setSponsoredFilter('ALL'); }}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                  <th className="py-3.5 px-4">Stage / Entreprise</th>
                  <th className="py-3.5 px-4">Filière & Compétences</th>
                  <th className="py-3.5 px-4">Localisation & Indemnité</th>
                  <th className="py-3.5 px-4">Source & Contact</th>
                  <th className="py-3.5 px-4">Candidatures</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stages.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-2/60 transition-colors">
                    {/* Stage & Company */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleSponsored(job)}
                          disabled={actionLoadingId === job.id}
                          title={job.isSponsored ? 'Désactiver le sponsoring' : 'Sponsoriser cette offre'}
                          className={`mt-0.5 p-1 rounded transition-colors ${
                            job.isSponsored
                              ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                              : 'text-fg-subtle hover:text-amber-500 hover:bg-surface-3'
                          }`}
                        >
                          <Star size={16} fill={job.isSponsored ? 'currentColor' : 'none'} />
                        </button>
                        <div className="min-w-0">
                          <div className="font-semibold text-fg line-clamp-2 leading-snug">
                            {job.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-fg-muted">
                            <Building2 size={13} className="shrink-0 text-fg-subtle" />
                            <span className="truncate">{job.companyName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Industry & Skills */}
                    <td className="py-4 px-4 max-w-[220px]">
                      <div className="text-xs font-medium text-fg truncate">
                        {job.companyIndustry}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {job.requirements.slice(0, 3).map((req, i) => (
                          <span
                            key={i}
                            className="inline-block rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle"
                          >
                            {req}
                          </span>
                        ))}
                        {job.requirements.length > 3 && (
                          <span className="text-[10px] text-fg-subtle self-center">
                            +{job.requirements.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location & Stipend */}
                    <td className="py-4 px-4 text-xs">
                      <div className="flex items-center gap-1 text-fg">
                        <MapPin size={13} className="text-fg-subtle shrink-0" />
                        <span>{job.location || 'Non précisé'}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 font-semibold text-primary">
                        <Coins size={13} className="shrink-0" />
                        <span>{job.stipend || 'Indemnité à convenir'}</span>
                      </div>
                    </td>

                    {/* Source & Contact */}
                    <td className="py-4 px-4 text-xs">
                      <div>
                        {job.source === 'SCRAPED' ? (
                          <Pill tone="violet" label="n8n Vision" />
                        ) : (
                          <Pill tone="blue" label="Entreprise Direct" />
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-fg-subtle truncate">
                        {job.contactWhatsapp ? `💬 ${job.contactWhatsapp}` : `✉️ ${job.contactEmail || '-'}`}
                      </div>
                    </td>

                    {/* Applications */}
                    <td className="py-4 px-4 text-xs">
                      <div className="flex items-center gap-1 font-semibold text-fg">
                        <Users size={14} className="text-fg-subtle" />
                        <span>{job.applicationsCount} postulants</span>
                      </div>
                      <div className="mt-1">
                        {job.isExpired ? (
                          <Pill tone="rose" label="Expirée" />
                        ) : (
                          <Pill tone="green" label="Active" />
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon={Trash2}
                          label="Supprimer le stage"
                          variant="danger"
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          disabled={actionLoadingId === job.id}
                        />
                      </div>
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
