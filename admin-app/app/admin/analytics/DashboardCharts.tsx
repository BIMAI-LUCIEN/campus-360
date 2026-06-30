'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardChartsProps {
  dailyStats: { date: string; purchases: number; previews: number }[];
  categoryStats: { subject: string; purchases: number }[];
}

const COLORS = [
  '#2563eb',
  '#10b981',
  '#f97316',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

/** Compute a nice rounded Y axis maximum (rounded to power-of-2 step). */
const niceMax = (n: number) => {
  if (n <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / (pow / 2)) * (pow / 2);
};

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #c3c6d7',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
  color: '#0b1c30',
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
};

export function DashboardCharts({ dailyStats, categoryStats }: DashboardChartsProps) {
  const hasData = dailyStats.length > 0;
  const maxValue = hasData
    ? niceMax(Math.max(...dailyStats.map((d) => d.previews + d.purchases)))
    : 50;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Bar chart: Ventes & Aperçus (14 jours) ───────── */}
      <div className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm lg:col-span-2">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
              Ventes & Aperçus
            </div>
            <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
              Activité des 14 derniers jours
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-stitch-on-surface-variant">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              Aperçus
            </span>
            <span className="inline-flex items-center gap-1 text-stitch-on-surface-variant">
              <span className="h-2 w-2 rounded-sm bg-stitch-primary-container" />
              Achats
            </span>
          </div>
        </div>
        <div className="h-[280px] w-full">
          {hasData ? (
            <ResponsiveContainer>
              <BarChart
                data={dailyStats}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e1d8" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#434655', fontFamily: 'Inter' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#434655', fontFamily: 'Inter' }}
                  allowDecimals={false}
                  domain={[0, maxValue]}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(0, 74, 198, 0.06)' }}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="previews"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  name="Aperçus"
                  maxBarSize={28}
                />
                <Bar
                  dataKey="purchases"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  name="Achats"
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] text-stitch-on-surface-variant">
              Pas encore de données
            </div>
          )}
        </div>
      </div>

      {/* ── Categories: horizontal bar list ────────────────── */}
      <div className="rounded-stitch border border-stitch-outline-variant bg-stitch-surface-lowest p-6 shadow-stitch-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="font-stitch-headline text-base font-bold tracking-tight text-stitch-on-surface">
              Ventes par matière
            </div>
            <div className="mt-0.5 text-xs text-stitch-on-surface-variant">
              Top catégories
            </div>
          </div>
        </div>
        {categoryStats.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-[13px] text-stitch-on-surface-variant">
            Pas encore de données
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3.5">
            {(() => {
              const total = categoryStats.reduce((sum, c) => sum + c.purchases, 0);
              const top = categoryStats.slice(0, 6);
              return top.map((cat, i) => {
                const pct = total > 0 ? Math.round((cat.purchases / total) * 100) : 0;
                return (
                  <div
                    key={cat.subject}
                    className="grid grid-cols-[100px_1fr_50px] items-center gap-3 text-[13px]"
                  >
                    <div className="truncate font-medium text-stitch-on-surface">
                      {cat.subject}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stitch-surface-container">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <div className="text-right font-semibold text-stitch-on-surface-variant tabular-nums">
                      {pct}%
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
