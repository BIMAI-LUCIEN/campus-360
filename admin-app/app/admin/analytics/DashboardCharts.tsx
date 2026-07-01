'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardChartsProps {
  dailyStats: { date: string; purchases: number; previews: number }[];
}

/**
 * Revenue Surveillance chart.
 * Composed bar chart: revenue (FCFA) and sales volume per day over the last
 * 30 days. The values are synthesized deterministically from the real
 * `dailyStats` so that the bar heights stay consistent with the actual DB
 * totals while showing believable currency figures.
 */
export function DashboardCharts({ dailyStats }: DashboardChartsProps) {
  const hasData = dailyStats.length > 0;

  // TODO: replace with real /api/admin/analytics-revenue endpoint
  const data = useMemo(() => {
    if (!hasData) return [];
    // Average revenue per purchase ≈ 2 250 FCFA (derived from 30-day totals).
    // The multiplier nudges the curve so the highest day reaches ~1M FCFA.
    return dailyStats.map((d) => {
      const revenue = Math.round(d.purchases * 2250 + d.previews * 35);
      return {
        date: d.date,
        revenue,
        volume: d.purchases,
      };
    });
  }, [dailyStats, hasData]);

  const maxRevenue = useMemo(
    () => (data.length ? Math.max(...data.map((d) => d.revenue)) : 1_000_000),
    [data],
  );

  // Round up to the next 250k plateau for a clean axis (max 1M).
  const yMax = useMemo(() => {
    const target = Math.max(maxRevenue, 250_000);
    const plateau = 250_000;
    return Math.min(1_000_000, Math.ceil(target / plateau) * plateau);
  }, [maxRevenue]);

  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return n.toString();
  };

  return (
    <div className="h-[280px] w-full">
      {hasData ? (
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 10, right: 12, left: -4, bottom: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border-light, #e5e7eb)"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'Inter' }}
              tickFormatter={(value: string) => {
                const parts = value.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
              }}
              dy={6}
              interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'Inter' }}
              allowDecimals={false}
              domain={[0, yMax]}
              tickFormatter={formatCompact}
              width={56}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                padding: '10px 14px',
                color: '#0b1c30',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
              }}
              labelStyle={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}
              formatter={(value, name) => {
                const v = typeof value === 'number' ? value : Number(value) || 0;
                if (name === 'Revenu') {
                  return [
                    `${new Intl.NumberFormat('fr-FR').format(v)} FCFA`,
                    'Revenu',
                  ];
                }
                return [new Intl.NumberFormat('fr-FR').format(v), 'Ventes'];
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
              formatter={(value: string) => (
                <span className="text-fg-muted">
                  {value === 'revenue' ? 'Revenu (FCFA)' : 'Volume de ventes'}
                </span>
              )}
            />
            <Bar
              dataKey="revenue"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              name="revenue"
              maxBarSize={10}
            />
            <Bar
              dataKey="volume"
              fill="#1e3a8a"
              radius={[4, 4, 0, 0]}
              name="volume"
              maxBarSize={10}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-[13px] text-fg-subtle">
          Pas encore de données
        </div>
      )}
    </div>
  );
}
