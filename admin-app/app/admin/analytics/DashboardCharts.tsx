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

/** Compute max for axis, rounded up to nearest 50 */
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
    <div className="stitch-charts-grid">
      {/* ── Bar chart: Ventes & Aperçus (14 jours) ──────── */}
      <div className="stitch-card">
        <div className="stitch-card-header">
          <div>
            <div className="stitch-card-title">Ventes & Aperçus</div>
            <div className="stitch-card-subtitle">Activité des 14 derniers jours</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--stitch-on-surface-variant)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#10B981' }} />
              Aperçus
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--stitch-on-surface-variant)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#2563eb' }} />
              Achats
            </span>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
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
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--stitch-on-surface-variant)', fontSize: 13,
            }}>
              Pas encore de données
            </div>
          )}
        </div>
      </div>

      {/* ── Categories: horizontal bar list (Stitch style) */}
      <div className="stitch-card">
        <div className="stitch-card-header">
          <div>
            <div className="stitch-card-title">Ventes par matière</div>
            <div className="stitch-card-subtitle">Top catégories</div>
          </div>
        </div>
        {categoryStats.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 200, color: 'var(--stitch-on-surface-variant)', fontSize: 13,
          }}>
            Pas encore de données
          </div>
        ) : (
          <div className="stitch-chart-bar-list">
            {(() => {
              const total = categoryStats.reduce((sum, c) => sum + c.purchases, 0);
              const top = categoryStats.slice(0, 6);
              return top.map((cat, i) => {
                const pct = total > 0 ? Math.round((cat.purchases / total) * 100) : 0;
                return (
                  <div key={cat.subject} className="stitch-chart-bar-row">
                    <div className="stitch-chart-bar-label">{cat.subject}</div>
                    <div className="stitch-chart-bar-track">
                      <div
                        className="stitch-chart-bar-fill"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <div className="stitch-chart-bar-value">{pct}%</div>
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
