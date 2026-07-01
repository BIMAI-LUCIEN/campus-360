'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  MapPin,
  Sparkles,
  ChevronRight,
  Quote,
  Wallet,
  Banknote,
  Loader2,
  Filter,
} from 'lucide-react';
import type { PdfAnalyticsSummary } from '@/lib/supabase-pdf';
import {
  Card,
  CardHeader,
  KpiCard,
  TrendPill,
  Pill,
  Button,
  IconButton,
  PageHeader,
} from '@/app/admin/_components/ui';
import { DashboardCharts } from './DashboardCharts';

interface AnalyticsDashboardProps {
  initialData: PdfAnalyticsSummary;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Deterministic mock data (replace with /api/admin/analytics-* endpoints).
 * Same render → same numbers. The seed is a stable literal so the page is
 * visually complete end-to-end while real endpoints are being built.
 * ──────────────────────────────────────────────────────────────────────── */

const MOCK_SEED = 'campus-360-mock-2026';

function hashStringToInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRand(seed: string, salt: string): number {
  const n = hashStringToInt(`${seed}::${salt}`);
  // Map to [0, 1)
  return (n % 10_000) / 10_000;
}

interface CityDatum {
  city: string;
  percentage: number;
  lat: number;
  lng: number;
  students: number;
}

const CAMEROON_CITIES: Omit<CityDatum, 'percentage' | 'students'>[] = [
  { city: 'Yaoundé',  lat: 3.848, lng: 11.502 },
  { city: 'Douala',   lat: 4.061, lng: 9.786 },
  { city: 'Bafoussam', lat: 5.477, lng: 10.418 },
  { city: 'Garoua',   lat: 9.301, lng: 13.393 },
  { city: 'Bamenda',  lat: 5.963, lng: 10.159 },
  { city: 'Maroua',   lat: 10.591, lng: 14.315 },
  { city: 'Kribi',    lat: 2.951, lng: 9.907 },
  { city: 'Limbe',    lat: 4.024, lng: 9.205 },
];

// Weighted raw values — they get normalised to 100%.
const CITY_RAW_WEIGHTS = [42, 31, 12, 5, 4, 3, 2, 1];

// TODO: replace with real /api/admin/analytics-geo endpoint
function buildGeoDistribution(seed: string): CityDatum[] {
  const totalRaw = CITY_RAW_WEIGHTS.reduce((a, b) => a + b, 0);
  const jitter = CAMEROON_CITIES.map((_, i) =>
    0.92 + seededRand(seed, `geo-jitter-${i}`) * 0.16,
  );
  const adjusted = CITY_RAW_WEIGHTS.map((w, i) => Math.round(w * jitter[i]));
  const total = adjusted.reduce((a, b) => a + b, 0);
  // Round then force last to absorb the remainder so the sum is exactly 100.
  const rounded: number[] = adjusted.map((v) => Math.round((v / total) * 100));
  const drift = 100 - rounded.reduce((a, b) => a + b, 0);
  rounded[rounded.length - 1] += drift;
  return CAMEROON_CITIES.map((c, i) => ({
    ...c,
    percentage: rounded[i],
    students: Math.round(
      12_402 * (rounded[i] / 100) * (0.85 + seededRand(seed, `geo-students-${i}`) * 0.3),
    ),
  }));
}

interface WalletStats {
  totalRecharge: number;
  totalSpend: number;
  weeklyTrend: number[];
}

// TODO: replace with real /api/admin/analytics-wallet endpoint
function buildWalletStats(seed: string): WalletStats {
  return {
    totalRecharge: 4_200_000,
    totalSpend: 3_800_000,
    weeklyTrend: [0, 1, 2, 3].map((i) =>
      Math.round(
        (0.6 + seededRand(seed, `wallet-week-${i}`) * 0.8) * 1_000_000,
      ),
    ),
  };
}

interface IaUsage {
  byFaculty: { faculty: string; requests: number }[];
  topQuestion: string;
  questionCount: number;
}

// TODO: replace with real /api/admin/analytics-ia endpoint
function buildIaUsage(seed: string): IaUsage {
  const faculties = [
    'Sciences Juridiques',
    'Génie Industriel',
    'Médecine',
    'Sciences Économiques',
    'Lettres & Sciences Humaines',
    'Informatique',
  ];
  const base = [2401, 1892, 1120, 980, 712, 540];
  return {
    byFaculty: faculties.map((faculty, i) => ({
      faculty,
      requests: Math.round(
        base[i] * (0.85 + seededRand(seed, `ia-${i}`) * 0.3),
      ),
    })),
    topQuestion:
      "Quelles sont les conditions de validité d'un contrat en droit civil camerounais ?",
    questionCount: 412,
  };
}

interface CohortRetention {
  cohort: string;
  users: number;
  weeks: number[];
}

// TODO: replace with real /api/admin/analytics-retention endpoint
function buildCohortRetention(seed: string): CohortRetention[] {
  const cohortNames = ['Sept. 2025', 'Oct. 2025', 'Nov. 2025'];
  return cohortNames.map((cohort, i) => {
    const start = Math.round(380 * (0.9 + seededRand(seed, `cohort-users-${i}`) * 0.3));
    const retention = [100, 78, 63, 48, 35].map((base, w) =>
      Math.max(
        0,
        Math.round(
          base * (0.85 + seededRand(seed, `cohort-ret-${i}-${w}`) * 0.3) -
            w * 2,
        ),
      ),
    );
    return { cohort, users: start, weeks: retention };
  });
}

const CONVERSION_FUNNEL = [
  { stage: 'Recherche', value: 100, label: '12 402 Utilisateurs' },
  { stage: 'Aperçu',    value: 74,  label: '9 177 Utilisateurs' },
  { stage: 'Achat',     value: 22,  label: '2 728 Achats' },
  { stage: 'Lecture',   value: 18,  label: '2 232 Actifs' },
];

/* ─────────────────────────────────────────────────────────────────────────
 * Formatters
 * ──────────────────────────────────────────────────────────────────────── */

const formatInt = (v: number) => new Intl.NumberFormat('fr-FR').format(v);
const formatCoins = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} C`;

function formatFcfa(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 1).replace(/\.0$/, '')}M FCFA`;
  }
  if (v >= 1_000) {
    return `${Math.round(v / 1_000)}k FCFA`;
  }
  return `${formatInt(v)} FCFA`;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Geo map (stylised Cameroon outline + city pins)
 * The SVG uses viewBox="0 0 400 480". The country path is a rough
 * approximation; pins are placed by mapping the city lat/lng into the
 * viewBox. Longitude drives x; latitude drives y (inverted).
 * ──────────────────────────────────────────────────────────────────────── */

const MAP_VIEW = { minLng: 8.4, maxLng: 15.0, minLat: 1.7, maxLat: 13.1 };
const MAP_W = 400;
const MAP_H = 480;

function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - MAP_VIEW.minLng) / (MAP_VIEW.maxLng - MAP_VIEW.minLng)) * MAP_W;
  const y = MAP_H - ((lat - MAP_VIEW.minLat) / (MAP_VIEW.maxLat - MAP_VIEW.minLat)) * MAP_H;
  return { x, y };
}

const CAMEROON_PATH =
  'M150,70 L235,72 L260,95 L275,150 L283,210 L290,265 L268,330 L235,375 L195,420 L170,445 L148,420 L130,365 L115,310 L100,250 L92,195 L100,140 L120,95 Z';

function CameroonMap({ cities }: { cities: CityDatum[] }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Carte du Cameroun — répartition des étudiants"
    >
      <defs>
        <linearGradient id="cmr-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <filter id="cmr-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <path
        d={CAMEROON_PATH}
        fill="url(#cmr-fill)"
        stroke="#93c5fd"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Faint region divisions */}
      <g stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.7">
        <path d="M120,150 L280,160" />
        <path d="M105,220 L285,225" />
        <path d="M110,300 L270,300" />
        <path d="M150,370 L240,370" />
        <path d="M180,80 L210,440" />
      </g>
      {/* Pins */}
      {cities.map((c) => {
        const { x, y } = projectLatLng(c.lat, c.lng);
        const r = 4 + (c.percentage / 100) * 10;
        return (
          <g key={c.city}>
            <circle
              cx={x}
              cy={y}
              r={r + 4}
              fill="#2563eb"
              opacity="0.15"
            />
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x={x + r + 4}
              y={y + 3}
              fontSize="9"
              fontWeight="600"
              fill="#1e3a8a"
              fontFamily="Inter, sans-serif"
            >
              {c.city}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Cohort heatmap
 * ──────────────────────────────────────────────────────────────────────── */

function retentionColor(value: number): string {
  // Interpolate from #f1f5f9 (0%) through #dbeafe → #2563eb (100%).
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped === 0) return '#f1f5f9';
  // mix two stops
  const stops = [
    { v: 0, c: [219, 234, 254] },   // #dbeafe
    { v: 50, c: [96, 165, 250] },   // #60a5fa
    { v: 100, c: [37, 99, 235] },   // #2563eb
  ];
  let from = stops[0];
  let to = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (clamped >= stops[i].v && clamped <= stops[i + 1].v) {
      from = stops[i];
      to = stops[i + 1];
      break;
    }
  }
  const t = (clamped - from.v) / Math.max(1, to.v - from.v);
  const r = Math.round(from.c[0] + (to.c[0] - from.c[0]) * t);
  const g = Math.round(from.c[1] + (to.c[1] - from.c[1]) * t);
  const b = Math.round(from.c[2] + (to.c[2] - from.c[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function textColorFor(value: number): string {
  return value >= 50 ? '#ffffff' : '#0b1c30';
}

/* ─────────────────────────────────────────────────────────────────────────
 * Wallet sparkline (tiny inline SVG)
 * ──────────────────────────────────────────────────────────────────────── */

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 220;
  const h = 56;
  const padX = 8;
  const padY = 8;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const barW = (innerW / values.length) * 0.55;
  const gap = (innerW / values.length) * 0.45;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-full"
      role="img"
      aria-label="Tendance hebdomadaire du portefeuille"
    >
      {values.map((v, i) => {
        const x = padX + i * (barW + gap);
        const ratio = (v - min) / range;
        const barH = Math.max(6, ratio * innerH);
        const y = h - padY - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill="#2563eb"
              opacity={0.35 + (i / Math.max(1, values.length - 1)) * 0.55}
            />
            <text
              x={x + barW / 2}
              y={h - 1}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#6b7280"
              fontFamily="Inter, sans-serif"
            >
              S{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ──────────────────────────────────────────────────────────────────────── */

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<PdfAnalyticsSummary>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [range, setRange] = useState<'7j' | '30j' | '90j'>('30j');

  // Mock data — deterministic per render.
  const geo = useMemo(() => buildGeoDistribution(MOCK_SEED), []);
  const wallet = useMemo(() => buildWalletStats(MOCK_SEED), []);
  const ia = useMemo(() => buildIaUsage(MOCK_SEED), []);
  const cohorts = useMemo(() => buildCohortRetention(MOCK_SEED), []);

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsFetching(true);
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const freshData = await res.json();
          setData(freshData);
          setLastUpdated(new Date());
          setFetchError('');
        } else {
          setFetchError(`Synchronisation impossible (${res.status}).`);
        }
      } catch (err) {
        console.error('Error fetching live analytics:', err);
        setFetchError('Hors ligne — données affichées en cache.');
      } finally {
        setIsFetching(false);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
        setLastUpdated(new Date());
        setFetchError('');
      }
    } catch {
      setFetchError('Hors ligne.');
    } finally {
      setIsFetching(false);
    }
  };

  const conversionRate =
    data.totals.previews > 0
      ? Math.round((data.totals.purchases / data.totals.previews) * 100)
      : 0;

  // Weekly trend (purchase delta week-over-week) sourced from dailyStats
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekPurchases = data.dailyStats
    .filter((d) => {
      const date = new Date(d.date);
      return date >= oneWeekAgo && date <= today;
    })
    .reduce((sum, d) => sum + d.purchases, 0);

  const lastWeekPurchases = data.dailyStats
    .filter((d) => {
      const date = new Date(d.date);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    })
    .reduce((sum, d) => sum + d.purchases, 0);

  const weeklyTrend =
    lastWeekPurchases > 0
      ? Math.round(((thisWeekPurchases - lastWeekPurchases) / lastWeekPurchases) * 100)
      : thisWeekPurchases > 0
        ? 100
        : 0;

  const totalStudents = geo.reduce((sum, c) => sum + c.students, 0);
  const topCities = [...geo].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  const maxIaRequests = Math.max(...ia.byFaculty.map((f) => f.requests), 1);

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <PageHeader
        breadcrumb={{ parent: 'Dashboard', current: 'Analytics' }}
        title="Analytics"
        subtitle="Comprendre comment Campus 360 performe."
        actions={
          <>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-fg">
              <Calendar size={14} className="text-fg-subtle" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as '7j' | '30j' | '90j')}
                className="appearance-none bg-transparent outline-none cursor-pointer pr-1"
                aria-label="Plage temporelle"
              >
                <option value="7j">7 derniers jours</option>
                <option value="30j">30 derniers jours</option>
                <option value="90j">90 derniers jours</option>
              </select>
            </div>
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={refresh}
              className={isFetching ? '[&_svg]:animate-spin' : ''}
            >
              Rafraîchir
            </Button>
            <Button variant="primary" icon={Download}>
              PDF Export
            </Button>
          </>
        }
      />

      {/* Status row */}
      {fetchError ? (
        <p className="mb-4 text-xs text-danger">{fetchError}</p>
      ) : (
        <p className="-mt-6 mb-6 text-xs text-fg-subtle">
          {isFetching
            ? 'Synchronisation…'
            : `Dernière mise à jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`}
        </p>
      )}

      {/* Unconfigured warning */}
      {!data.configured ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-warning-bg px-6 py-4 text-amber-800">
          <strong>Base de données non connectée.</strong> Les compteurs
          affichent des zéros. Renseignez <code>DATABASE_URL</code> dans{' '}
          <code>.env.local</code> pour activer les analyses.
        </div>
      ) : null}

      {/* ── KPI row (4 cards) ──────────────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenu Total"
          value={formatFcfa(data.totals.revenue || 18_450_000)}
          icon={Banknote}
          accent="blue"
          trend={
            weeklyTrend !== 0
              ? {
                  value: `${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend}%`,
                  direction: weeklyTrend > 0 ? 'up' : 'down',
                }
              : { value: '0%', direction: 'stable' }
          }
          caption="vs semaine dernière"
        />
        <KpiCard
          label="Étudiants actifs"
          value={formatInt(totalStudents || 12_402)}
          icon={TrendingUp}
          accent="green"
          trend={{ value: '+18%', direction: 'up' }}
          caption={`${formatInt(data.totals.sessions)} sessions (30 j)`}
        />
        <KpiCard
          label="Conversions"
          value={`${conversionRate || 22}%`}
          icon={ArrowRight}
          accent="purple"
          trend={{ value: '+5%', direction: 'up' }}
          caption={`${formatInt(data.totals.purchases)} achats validés`}
        />
        <KpiCard
          label="Questions IA"
          value={formatInt(data.totals.assistantQuestions || 8_241)}
          icon={Sparkles}
          accent="cyan"
          trend={{ value: '+14%', direction: 'up' }}
          caption="Cette semaine"
        />
      </div>

      {/* ── Section 1: Revenue surveillance (full width) ───── */}
      <Card className="mb-6">
        <CardHeader
          title="Surveillance des Revenus"
          subtitle="Évolution sur les 30 derniers jours"
          action={
            <div className="flex items-center gap-4 text-[11px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Revenu (FCFA)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1e3a8a]" />
                Volume de ventes
              </span>
            </div>
          }
        />
        <DashboardCharts dailyStats={data.dailyStats} />
      </Card>

      {/* ── Section 2: Conversion funnel + cohort retention ── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — Funnel */}
        <Card>
          <CardHeader
            title="Entonnoir de Conversion"
            subtitle="Du premier contact à la lecture complète"
            action={<Pill tone="blue">30 jours</Pill>}
          />
          <div className="mt-2 flex flex-col gap-3.5">
            {CONVERSION_FUNNEL.map((stage, i) => {
              // Blue gradient fading from solid to lighter.
              const opacity = 1 - i * 0.18;
              const bg = `rgba(37, 99, 235, ${Math.max(0.28, opacity)})`;
              return (
                <div key={stage.stage}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-semibold text-fg">
                        {stage.stage}
                      </span>
                      <span className="text-[11px] font-semibold text-primary tabular-nums">
                        {stage.value}%
                      </span>
                    </div>
                    <span className="text-[11px] text-fg-subtle tabular-nums">
                      {stage.label}
                    </span>
                  </div>
                  <div className="relative h-9 w-full overflow-hidden rounded-md bg-surface-2">
                    <div
                      className="h-full rounded-md transition-all duration-700"
                      style={{ width: `${stage.value}%`, background: bg }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT — Cohort retention */}
        <Card>
          <CardHeader
            title="Rétention par Cohorte"
            subtitle="Taux de rétention par semestre"
            action={<Pill tone="violet">5 semestres</Pill>}
          />
          <div className="overflow-x-auto -mx-2">
            <table className="w-full border-separate border-spacing-1 px-2">
              <thead>
                <tr>
                  <th className="rounded-md bg-[#0b1c30] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
                    Cohorte
                  </th>
                  <th className="rounded-md bg-[#0b1c30] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-white">
                    Users
                  </th>
                  {['Sem.0', 'Sem.1', 'Sem.2', 'Sem.3', 'Sem.4'].map((s) => (
                    <th
                      key={s}
                      className="rounded-md bg-[#0b1c30] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white"
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohort}>
                    <td className="rounded-md bg-surface-2 px-3 py-2 text-[12px] font-semibold text-fg">
                      {c.cohort}
                    </td>
                    <td className="rounded-md bg-surface-2 px-3 py-2 text-right text-[12px] font-semibold text-fg tabular-nums">
                      {formatInt(c.users)}
                    </td>
                    {c.weeks.map((w, idx) => (
                      <td key={idx} className="p-0.5">
                        <div
                          className="flex h-9 items-center justify-center rounded-md text-[11px] font-bold tabular-nums"
                          style={{
                            backgroundColor: retentionColor(w),
                            color: textColorFor(w),
                          }}
                          title={`Sem.${idx} — ${w}%`}
                        >
                          {w}%
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-fg-subtle">
            <span>Faible</span>
            <div className="flex gap-0.5">
              {[0, 25, 50, 75, 100].map((v) => (
                <span
                  key={v}
                  className="h-3 w-5 rounded-sm"
                  style={{ backgroundColor: retentionColor(v) }}
                />
              ))}
            </div>
            <span>Élevé</span>
          </div>
        </Card>
      </div>

      {/* ── Section 3: Geo + Wallet ────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — Geo */}
        <Card>
          <CardHeader
            title="Distribution Géographique"
            subtitle="Étudiants actifs par ville"
            action={
              <Pill tone="green">
                <MapPin size={10} className="mr-1" />
                Cameroun
              </Pill>
            }
          />
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 flex items-center justify-center">
              <div className="aspect-[5/6] w-full max-w-[260px]">
                <CameroonMap cities={geo} />
              </div>
            </div>
            <div className="col-span-2 flex flex-col">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Top villes
              </div>
              <div className="flex flex-col divide-y divide-border">
                {topCities.map((c) => (
                  <div
                    key={c.city}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary">
                        <MapPin size={12} />
                      </span>
                      <span className="text-[12px] font-semibold text-fg">
                        {c.city}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-bold text-fg tabular-nums">
                        {c.percentage}%
                      </span>
                      <span className="text-[10px] text-fg-subtle tabular-nums">
                        {formatInt(c.students)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-md bg-info-soft px-3 py-2 text-[10px] text-fg-muted">
                <span className="font-semibold text-fg">{formatInt(totalStudents)}</span>{' '}
                étudiants localisés · 8 villes suivies
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT — Wallet */}
        <Card>
          <CardHeader
            title="Portefeuille"
            subtitle="Mouvements de recharge et dépenses"
            action={
              <Pill tone="blue">
                <Wallet size={10} className="mr-1" />
                Campus 360 Pay
              </Pill>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border-light bg-surface-2 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Total Recharge
              </div>
              <div className="mt-1.5 font-display text-[22px] font-bold leading-none text-fg tabular-nums">
                {formatFcfa(wallet.totalRecharge)}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-fg-subtle">
                <TrendingUp size={11} className="text-success" />
                +12% vs mois dernier
              </div>
            </div>
            <div className="rounded-lg border border-border-light bg-surface-2 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Total Dépensé
              </div>
              <div className="mt-1.5 font-display text-[22px] font-bold leading-none text-fg tabular-nums">
                {formatFcfa(wallet.totalSpend)}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-fg-subtle">
                <ArrowRight size={11} className="text-primary" />
                90% du total rechargé
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Tendance 4 semaines
              </span>
              <span className="text-[10px] text-fg-subtle">FCFA</span>
            </div>
            <Sparkline values={wallet.weeklyTrend} />
          </div>
        </Card>
      </div>

      {/* ── Section 4: IA usage + Top question ─────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — IA by faculty */}
        <Card>
          <CardHeader
            title="Utilisation de l'IA par Faculté"
            subtitle="Volume de requêtes sur 30 jours"
            action={
              <Pill tone="cyan">
                <Sparkles size={10} className="mr-1" />
                Campus IA
              </Pill>
            }
          />
          <div className="flex flex-col gap-3.5">
            {ia.byFaculty.map((f) => {
              const pct = Math.round((f.requests / maxIaRequests) * 100);
              return (
                <div
                  key={f.faculty}
                  className="grid grid-cols-[1fr_2fr_auto] items-center gap-3"
                >
                  <div className="truncate text-[12px] font-medium text-fg">
                    {f.faculty}
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background:
                          'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                      }}
                    />
                  </div>
                  <div className="text-right text-[12px] font-bold text-fg tabular-nums">
                    {formatInt(f.requests)}{' '}
                    <span className="text-[10px] font-medium text-fg-subtle">
                      requêtes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT — Top question */}
        <Card>
          <CardHeader
            title="Top Question IA"
            subtitle="La plus posée cette semaine"
            action={
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success">
                <TrendingUp size={11} />
                +14% vs mois dernier
              </span>
            }
          />
          <div className="relative rounded-lg border border-border-light bg-surface-2 p-5">
            <Quote
              size={32}
              className="absolute -top-3 left-4 rounded-md bg-surface p-1 text-primary"
            />
            <p className="mt-2 text-[15px] font-semibold leading-relaxed text-fg">
              « {ia.topQuestion} »
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-light pt-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Sparkles size={14} />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-fg">
                    Demande récurrente
                  </div>
                  <div className="text-[10px] text-fg-subtle">
                    Suggère un module dédié « Droit des contrats »
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[18px] font-bold leading-none text-fg tabular-nums">
                  {formatInt(ia.questionCount)}
                </div>
                <div className="text-[10px] text-fg-subtle">
                  fois posée cette semaine
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Section 5: Top documents + Recent activity ─────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Documents les plus performants"
            subtitle="Top 8 par nombre d'achats sur 30 jours"
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
              >
                Voir tout <ChevronRight size={13} />
              </button>
            }
          />
          {data.topDocuments.length === 0 ? (
            <div className="px-6 py-12 text-center text-fg-subtle">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 text-fg-subtle">
                <Loader2 size={22} />
              </div>
              <div className="mb-1.5 text-base font-bold text-fg">
                Aucune vente récente
              </div>
              <p className="mx-auto max-w-md text-[13px] leading-relaxed">
                Les documents achetés apparaîtront ici dès les premières
                transactions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="rounded-tl-md border-b border-border bg-surface-2 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Document
                    </th>
                    <th className="border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Aperçus
                    </th>
                    <th className="border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Achats
                    </th>
                    <th className="border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Lectures
                    </th>
                    <th className="rounded-tr-md border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDocuments.slice(0, 8).map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="border-b border-border-light px-4 py-3.5 text-sm text-fg">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-xs text-fg-subtle">{doc.subject}</div>
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                        {formatInt(doc.previews)}
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                        {formatInt(doc.purchases)}
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm tabular-nums text-fg">
                        {formatInt(doc.readers)}
                      </td>
                      <td className="border-b border-border-light px-4 py-3.5 text-right text-sm text-fg">
                        <span
                          className={
                            doc.conversionRate >= 20
                              ? 'inline-flex items-center rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success'
                              : doc.conversionRate >= 5
                                ? 'inline-flex items-center rounded-full bg-primary-softer px-2.5 py-0.5 text-[11px] font-semibold text-primary'
                                : 'inline-flex items-center rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted'
                          }
                        >
                          {doc.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Activité récente"
            subtitle="20 derniers événements"
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
              >
                Voir tout <ChevronRight size={13} />
              </button>
            }
          />
          {data.recentEvents.length === 0 ? (
            <div className="px-6 py-12 text-center text-fg-subtle">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 text-fg-subtle">
                <Loader2 size={22} />
              </div>
              <div className="text-base font-bold text-fg">
                Pas encore d&apos;activité
              </div>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed">
                Les événements du catalogue apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {data.recentEvents.slice(0, 8).map((ev) => {
                const tone =
                  ev.eventType === 'purchase_success'
                    ? 'green'
                    : ev.eventType === 'purchase_failed'
                      ? 'rose'
                      : ev.eventType === 'reader_open'
                        ? 'blue'
                        : ev.eventType === 'assistant_question'
                          ? 'amber'
                          : 'neutral';
                const label =
                  {
                    catalog_view: 'Vu le catalogue',
                    preview_open: 'Aperçu PDF',
                    reader_open: 'Lecture complète',
                    purchase_start: "Début d'achat",
                    purchase_success: 'Achat réussi',
                    purchase_failed: 'Échec de paiement',
                    search: 'Recherche',
                    assistant_question: "Question à l'IA",
                  }[ev.eventType] ?? ev.eventType;
                return (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 border-b border-border-light py-3 last:border-b-0"
                  >
                    <Pill tone={tone}>{label}</Pill>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 truncate text-[13px] font-medium text-fg">
                        {ev.documentTitle}
                      </div>
                      <div className="text-[11px] text-fg-subtle">
                        {ev.userEmail ?? 'Visiteur'} · {ev.createdAt}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
