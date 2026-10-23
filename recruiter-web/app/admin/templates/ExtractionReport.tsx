'use client';

import type { ImportReport } from './types';

// What the import understood: kept as is, guessed (to check), not found (to set).
export function ExtractionReport({ report }: { report: ImportReport }) {
  const groups: { title: string; items: string[]; tone: string }[] = [
    { title: 'Repris tel quel', items: report.sure, tone: 'text-chart-green' },
    { title: 'Déduit (à vérifier)', items: report.guessed, tone: 'text-chart-amber' },
    { title: 'Introuvable (à régler)', items: report.missing, tone: 'text-chart-rose' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {groups.map((group) => (
        <div key={group.title} className="rounded-lg border border-border bg-surface p-4">
          <p className={`mb-2 text-sm font-semibold ${group.tone}`}>
            {group.title} ({group.items.length})
          </p>
          {group.items.length ? (
            <ul className="space-y-1 text-[13px] text-fg-muted">
              {group.items.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-subtle">Rien.</p>
          )}
        </div>
      ))}
    </div>
  );
}
