'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

interface DashboardChartsProps {
  dailyStats: {
    date: string;
    purchases: number;
    previews: number;
  }[];
  categoryStats: {
    subject: string;
    purchases: number;
  }[];
}

const COLORS = ['#0891b2', '#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const COMMON_TOOLTIP = {
  cursor: { fill: '#f1f5f9' },
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: 13,
  },
};

export function DashboardCharts({ dailyStats, categoryStats }: DashboardChartsProps) {
  return (
    <>
      {/* Bar Chart — full width */}
      <div className="flup-card" style={{ marginBottom: 20 }}>
        <div className="flup-chart-header">
          <h3 className="flup-chart-title">📊 Ventes et Aperçus (14 jours)</h3>
          <div className="flup-legend">
            <div className="flup-legend-item">
              <span className="legend-dot orange" />
              Aperçus
            </div>
            <div className="flup-legend-item">
              <span className="legend-dot blue" />
              Achats
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <RechartsTooltip {...COMMON_TOOLTIP} />
              <Bar dataKey="previews" fill="#f97316" radius={[6, 6, 0, 0]} name="Aperçus" maxBarSize={40} />
              <Bar dataKey="purchases" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Achats" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom: Donut + Countries */}
      <div className="flup-dash-grid two-col">
        {/* Donut Chart */}
        <div className="flup-card">
          <div className="flup-chart-header">
            <h3 className="flup-chart-title">🏷️ Ventes par catégorie</h3>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {categoryStats.length > 0 ? (
              <>
                <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="purchases"
                        nameKey="subject"
                      >
                        {categoryStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip {...COMMON_TOOLTIP} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="category-list" style={{ flex: 1 }}>
                  {categoryStats.slice(0, 8).map((cat, i) => {
                    const total = categoryStats.reduce((s, c) => s + c.purchases, 0);
                    const pct = total > 0 ? Math.round((cat.purchases / total) * 100) : 0;
                    return (
                      <div key={cat.subject} className="category-row">
                        <span className="category-dot" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="category-name">{cat.subject}</span>
                        <span className="category-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', flex: 1, padding: 24 }}>
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>

        {/* Countries */}
        <div className="flup-card">
          <div className="flup-chart-header">
            <h3 className="flup-chart-title">🌍 Ventes par pays</h3>
          </div>
          <div className="country-list">
            {COUNTRIES_DATA.map((c) => (
              <div key={c.name} className="country-row">
                <span className="country-name">{c.name}</span>
                <div className="country-bar-bg">
                  <div className="country-bar-fill" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="country-pct">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Sample country data — replace with real data from your API when available
const COUNTRIES_DATA = [
  { name: 'Cameroun', pct: 31 },
  { name: 'France', pct: 18 },
  { name: 'Belgique', pct: 14 },
  { name: 'Canada', pct: 12 },
  { name: 'Sénégal', pct: 9 },
  { name: 'Congo', pct: 7 },
  { name: 'Côte d\'Ivoire', pct: 5 },
  { name: 'Autres', pct: 4 },
];
