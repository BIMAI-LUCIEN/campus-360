'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Coins,
  TrendingUp,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { AdminPayment } from '@/lib/admin-platform-service';
import {
  Card,
  Button,
  KpiCard,
  Pill,
  EmptyState,
} from '../_components/ui';

export function PaymentsDashboardClient() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (operatorFilter !== 'ALL') params.append('operator', operatorFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les transactions Mobile Money');
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorFilter, statusFilter]);

  // Aggregate metrics
  const successPayments = payments.filter((p) => p.status === 'success');
  const totalRevenue = successPayments.reduce((acc, p) => acc + p.amountFcfa, 0);
  const discoveryPacks = payments.filter((p) => p.packType === 'discovery_500').length;
  const monthlyPasses = payments.filter((p) => p.packType === 'monthly_2000').length;
  const successRate = payments.length > 0 ? Math.round((successPayments.length / payments.length) * 100) : 100;

  const formatFcfa = (val: number) =>
    `${new Intl.NumberFormat('fr-CM').format(val)} FCFA`;

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Transactions & Monétisation Mobile Money
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Suivi des flux MTN MoMo, Orange Money et Wave pour les Packs Découverte (500 FCFA) et Pass Mensuels (2 000 FCFA).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchPayments}
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
          label="Chiffre d'Affaires Total"
          value={formatFcfa(totalRevenue)}
          icon={Coins}
          accent="green"
          caption="Volume Mobile Money collecté"
        />
        <KpiCard
          label="Packs Découverte (500 FCFA)"
          value={discoveryPacks}
          icon={Sparkles}
          accent="blue"
          caption="5 candidatures IA par pack"
        />
        <KpiCard
          label="Pass Mensuels (2 000 FCFA)"
          value={monthlyPasses}
          icon={TrendingUp}
          accent="purple"
          caption="Abonnements 30 jours illimités"
        />
        <KpiCard
          label="Taux de succès USSD"
          value={`${successRate}%`}
          icon={CheckCircle2}
          accent="cyan"
          caption="Webhooks Notch Pay confirmés"
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <Card padded={false} className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Operator filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-subtle">Opérateur :</span>
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg focus:outline-none"
              >
                <option value="ALL">Tous les opérateurs</option>
                <option value="mtn">MTN Mobile Money (MoMo)</option>
                <option value="orange">Orange Money</option>
                <option value="wave">Wave Mobile</option>
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-subtle">Statut :</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg focus:outline-none"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="success">Validés (Succès)</option>
                <option value="pending">En attente USSD</option>
                <option value="failed">Échoués</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-fg-subtle">
            {payments.length} transaction(s) enregistrée(s)
          </div>
        </div>
      </Card>

      {/* ── Transactions Table ──────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        {payments.length === 0 ? (
          <EmptyState
            title="Aucune transaction enregistrée"
            description="Aucun paiement ne correspond aux filtres sélectionnés."
            action={
              <Button
                variant="secondary"
                onClick={() => { setOperatorFilter('ALL'); setStatusFilter('ALL'); }}
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
                  <th className="py-3.5 px-4">Référence & Formule</th>
                  <th className="py-3.5 px-4">Étudiant / Compte</th>
                  <th className="py-3.5 px-4">Opérateur Mobile</th>
                  <th className="py-3.5 px-4">Montant</th>
                  <th className="py-3.5 px-4">Statut USSD</th>
                  <th className="py-3.5 px-4 text-right">Date & Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => {
                  const isSuccess = p.status === 'success';
                  const isPending = p.status === 'pending';

                  return (
                    <tr key={p.id} className="hover:bg-surface-2/60 transition-colors">
                      {/* Ref & Pack */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-semibold text-fg flex items-center gap-1.5">
                          {p.packType === 'monthly_2000' && (
                            <span className="rounded bg-primary-soft text-primary text-[10px] font-bold px-1.5 py-0.5 uppercase">
                              Pass 30J
                            </span>
                          )}
                          {p.packType === 'discovery_500' && (
                            <span className="rounded bg-chart-cyan-soft text-chart-cyan text-[10px] font-bold px-1.5 py-0.5 uppercase">
                              Pack 5 IA
                            </span>
                          )}
                          <span className="truncate">{p.referenceId}</span>
                        </div>
                        <div className="text-xs text-fg-subtle mt-0.5">
                          {p.packType === 'monthly_2000'
                            ? 'Pass Mensuel Illimité'
                            : 'Pack Découverte 5 Candidatures'}
                        </div>
                      </td>

                      {/* Student */}
                      <td className="py-4 px-4 text-xs">
                        <div className="font-medium text-fg">{p.userName || 'Étudiant'}</div>
                        <div className="text-fg-subtle mt-0.5 truncate">{p.userEmail}</div>
                      </td>

                      {/* Operator */}
                      <td className="py-4 px-4 text-xs">
                        {p.operator === 'mtn' && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 text-xs">
                            <Smartphone size={12} />
                            MTN MoMo
                          </span>
                        )}
                        {p.operator === 'orange' && (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 text-orange-600 font-semibold px-2 py-0.5 text-xs">
                            <Smartphone size={12} />
                            Orange Money
                          </span>
                        )}
                        {p.operator === 'wave' && (
                          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 text-cyan-600 font-semibold px-2 py-0.5 text-xs">
                            <Smartphone size={12} />
                            Wave
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-display font-bold text-fg">
                        {formatFcfa(p.amountFcfa)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isSuccess && <Pill tone="green" label="Payé (Confirmé)" />}
                        {isPending && <Pill tone="amber" label="En attente code PIN" />}
                        {p.status === 'failed' && <Pill tone="rose" label="Échoué" />}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-fg-subtle text-right tabular-nums">
                        {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
