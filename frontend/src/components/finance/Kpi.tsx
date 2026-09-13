import Card, { CardDescription } from "@/components/ui/Card";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: number | undefined | null;
  kind?: "currency" | "count";
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
  /** Marks figures derived from assumptions (e.g. tax-saving estimates) so they are never read as filed values. */
  estimate?: boolean;
}

const TONES = {
  default: "text-foreground",
  warning: "text-amber-700",
  success: "text-emerald-700",
  danger: "text-danger",
};

export default function Kpi({ label, value, kind = "currency", hint, tone = "default", estimate = false }: KpiProps) {
  const display = value === undefined || value === null ? "—" : kind === "currency" ? formatCurrency(value) : formatNumber(value);
  return (
    <Card variant="bordered" className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">
        {label}
        {estimate && <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] text-amber-700 normal-case">estimate</span>}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${TONES[tone]}`}>{display}</p>
      {hint && <CardDescription className="mt-0.5 text-xs">{hint}</CardDescription>}
    </Card>
  );
}
