"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import { TrendSeries } from "@/lib/finance-types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLOURS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4b5563"];

function compact(value: number): string {
  if (Math.abs(value) >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  empty: boolean;
}

function ChartCard({ title, description, children, empty }: ChartCardProps) {
  return (
    <Card variant="bordered">
      <CardTitle className="text-base">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
      <div className="mt-4 h-64">
        {empty ? <p className="text-sm text-muted py-6">No data for this period.</p> : children}
      </div>
    </Card>
  );
}

interface SeriesChartProps {
  title: string;
  description?: string;
  /** Series that share the same bucket labels are drawn together, one line/bar each. */
  series: (TrendSeries | undefined)[];
  kind?: "line" | "bar";
  values?: "currency" | "count";
}

/** Time-bucketed series (one point per month/quarter/FY) as lines or grouped bars. */
export function SeriesChart({ title, description, series, kind = "line", values = "currency" }: SeriesChartProps) {
  const present = series.filter((s): s is TrendSeries => s !== undefined);
  const labels = present[0]?.points.map((p) => p.label) ?? [];
  const data = labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    present.forEach((s) => {
      row[s.key] = s.points[index]?.value ?? 0;
    });
    return row;
  });
  const empty = data.length === 0 || present.every((s) => s.points.every((p) => p.value === 0));
  const fmt = values === "currency" ? formatCurrency : formatNumber;
  const tick = values === "currency" ? compact : (v: number) => `${v}`;

  return (
    <ChartCard title={title} description={description} empty={empty}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={tick} tick={{ fontSize: 11 }} width={48} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            {present.length > 1 && <Legend />}
            {present.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLOURS[i % COLOURS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={tick} tick={{ fontSize: 11 }} width={48} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            {present.length > 1 && <Legend />}
            {present.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={COLOURS[i % COLOURS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface PairedChartProps {
  title: string;
  description?: string;
  series: TrendSeries | undefined;
  /** Points come in pairs "<label> <a>" / "<label> <b>"; e.g. "Apr 2025 started" and "Apr 2025 filed". */
  suffixes: [string, string];
  values?: "currency" | "count";
}

/** Two-value-per-bucket series (liability vs paid, started vs filed) as grouped bars. */
export function PairedBarChart({ title, description, series, suffixes, values = "currency" }: PairedChartProps) {
  const points = series?.points ?? [];
  const rows = new Map<string, { label: string; a: number; b: number }>();
  points.forEach((p) => {
    const [a, b] = suffixes;
    const key = p.label.endsWith(` ${a}`) ? p.label.slice(0, -a.length - 1) : p.label.endsWith(` ${b}`) ? p.label.slice(0, -b.length - 1) : p.label;
    const row = rows.get(key) ?? { label: key, a: 0, b: 0 };
    if (p.label.endsWith(` ${a}`)) row.a = p.value;
    else row.b = p.value;
    rows.set(key, row);
  });
  const data = [...rows.values()];
  const empty = data.length === 0 || data.every((r) => r.a === 0 && r.b === 0);
  const fmt = values === "currency" ? formatCurrency : formatNumber;
  const tick = values === "currency" ? compact : (v: number) => `${v}`;

  return (
    <ChartCard title={title} description={description} empty={empty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={tick} tick={{ fontSize: 11 }} width={48} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend />
          <Bar dataKey="a" name={suffixes[0]} fill={COLOURS[2]} radius={[3, 3, 0, 0]} />
          <Bar dataKey="b" name={suffixes[1]} fill={COLOURS[1]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface BreakdownChartProps {
  title: string;
  description?: string;
  /** Either a categorical series (label → value) or a plain map. */
  series?: TrendSeries;
  data?: Record<string, number>;
  values?: "currency" | "count";
  labelize?: (key: string) => string;
}

/** Categorical breakdown (tax paid by type, refunds by status, consultants by type) as a donut. */
export function BreakdownChart({ title, description, series, data, values = "currency", labelize }: BreakdownChartProps) {
  const entries = series ? series.points.map((p) => [p.label, p.value] as const) : Object.entries(data ?? {});
  const rows = entries
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: labelize ? labelize(k) : k, value: v }));
  const fmt = values === "currency" ? formatCurrency : formatNumber;

  return (
    <ChartCard title={title} description={description} empty={rows.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {rows.map((_, i) => (
              <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function findSeries(series: TrendSeries[] | undefined, key: string): TrendSeries | undefined {
  return series?.find((s) => s.key === key);
}
