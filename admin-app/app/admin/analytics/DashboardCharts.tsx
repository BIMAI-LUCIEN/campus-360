'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface DashboardChartsProps {
  dailyStats: { date: string; purchases: number; previews: number }[];
  categoryStats: { subject: string; purchases: number }[];
}

const COLORS = ['#2563eb', '#10B981', '#f97316', '#8b5cf6', '#06b6d4', '#EC4899', '#6366f1', '#14B8A6'];

/** Compute max for axis, rounded up to nearest power-of-2 step */
const niceMax = (n: number) => {
  if (n <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / (pow / 2)) * (pow / 2);
};

const tooltipStyle = {
  backgroundColor: '#fff8f1',
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* ── Bar chart: Ventes & Aperçus (14 jours) ──────── */}
      <div className="lg:col-span-2 bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm">
        <div className="flex justify-between items-center mb-5 gap-3">
          <div>
            <div className="font-stitch-headline text-base font-bold text-stitch-on-surface tracking-tight">
              Ventes & Aperçus
            </div>
            <div className="text-xs text-stitch-on-surface-variant mt-0.5">
              Activité des 14 derniers jours
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-stitch-on-surface-variant">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" />
              Aperçus
            </span>
            <span className="inline-flex items-center gap-1 text-stitch-on-surface-variant">
              <span className="w-2 h-2 rounded-sm bg-stitch-primary-container" />
              Achats
            </span>
          </div>
        </div>
        <div className="w-full h-[280px]">
          {hasData ? (
            <ResponsiveContainer>
              <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="20%">
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
                <Bar dataKey="previews" fill="#10B981" radius={[6, 6, 0, 0]} name="Aperçus" maxBarSize={28} />
                <Bar dataKey="purchases" fill="#2563eb" radius={[6, 6, 0, 0]} name="Achats" maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-stitch-on-surface-variant text-[13px]">
              Pas encore de données
            </div>
          )}
        </div>
      </div>

      {/* ── Categories: horizontal bar list ────────────────── */}
      <div className="bg-stitch-surface-lowest border border-stitch-outline-variant rounded-stitch p-6 shadow-stitch-sm">
        <div className="flex justify-between items-center mb-5 gap-3">
          <div>
            <div className="font-stitch-headline text-base font-bold text-stitch-on-surface tracking-tight">
              Ventes par matière
            </div>
            <div className="text-xs text-stitch-on-surface-variant mt-0.5">
              Top catégories
            </div>
          </div>
        </div>
        {categoryStats.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-stitch-on-surface-variant text-[13px]">
            Pas encore de données
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 mt-3">
            {(() => {
              const total = categoryStats.reduce((sum, c) => sum + c.purchases, 0);
              const top = categoryStats.slice(0, 6);
              return top.map((cat, i) => {
                const pct = total > 0 ? Math.round((cat.purchases / total) * 100) : 0;
                return (
                  <div key={cat.subject} className="grid grid-cols-[100px_1fr_50px] items-center gap-3 text-[13px]">
                    <div className="text-stitch-on-surface font-medium truncate">{cat.subject}</div>
                    <div className="h-2 bg-stitch-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <div className="text-stitch-on-surface-variant font-semibold text-right tabular-nums">
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
