'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
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

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export function DashboardCharts({ dailyStats, categoryStats }: DashboardChartsProps) {
  return (
    <div className="flup-dash-grid">
      {/* Bar Chart */}
      <div className="flup-card">
        <div className="flup-chart-header">
          <h3 className="flup-chart-title">Ventes et Aperçus (14 jours)</h3>
          <div className="flup-legend">
            <div className="flup-legend-item">
              <span className="legend-dot orange"></span>
              Aperçus
            </div>
            <div className="flup-legend-item">
              <span className="legend-dot blue"></span>
              Achats
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaedf2" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#718096' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#718096' }} />
              <RechartsTooltip 
                cursor={{ fill: '#f8f9fc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="previews" fill="#ffb800" radius={[4, 4, 0, 0]} name="Aperçus" />
              <Bar dataKey="purchases" fill="#3182ce" radius={[4, 4, 0, 0]} name="Achats" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="flup-card">
        <div className="flup-chart-header">
          <h3 className="flup-chart-title">Ventes par catégorie</h3>
        </div>
        <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {categoryStats.length > 0 ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="purchases"
                  nameKey="subject"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ fontSize: '12px', color: '#4a5568' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#a0aec0', fontSize: '14px' }}>Aucune donnée disponible</div>
          )}
        </div>
      </div>
    </div>
  );
}
