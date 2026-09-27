import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { ConsultantPublicView, formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

export function Avatar({ name, photoUrl, size = "md" }: { name: string; photoUrl: string | null; size?: "md" | "lg" }) {
  const dimension = size === "lg" ? "w-20 h-20 text-2xl" : "w-14 h-14 text-lg";
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`${dimension} rounded-full object-cover`} />;
  }
  return (
    <div className={`${dimension} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Rating({ value, count }: { value: number | null; count: number }) {
  if (value === null || count === 0) {
    return <span className="text-xs text-muted">No reviews yet</span>;
  }
  return (
    <span className="text-sm">
      <span className="text-amber-500">★</span> {Number(value).toFixed(1)}{" "}
      <span className="text-xs text-muted">({count})</span>
    </span>
  );
}

export default function ConsultantCard({ consultant }: { consultant: ConsultantPublicView }) {
  return (
    <Link
      href={`/consultants/${consultant.id}`}
      className="block rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        <Avatar name={consultant.name} photoUrl={consultant.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">
              {consultant.designation ? `${consultant.designation} ` : ""}{consultant.name}
            </h3>
            {consultant.verified && <Badge variant="success">Verified</Badge>}
          </div>
          <p className="text-sm text-muted">
            {consultant.professionalType} · {consultant.experienceYears} yrs
            {consultant.city ? ` · ${consultant.city}` : ""}
          </p>
          <div className="mt-1"><Rating value={consultant.averageRating} count={consultant.reviewCount} /></div>
        </div>
      </div>
      {consultant.specializations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {consultant.specializations.slice(0, 4).map((item) => (
            <span key={item} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-foreground">{item}</span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-muted">Starts at</p>
          <p className="font-semibold">{formatCurrency(Number(consultant.startingFee))}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{consultant.consultationModes.map(modeLabel).join(" · ")}</p>
          <p className="text-xs text-muted">
            {consultant.nextAvailableAt ? `Next: ${formatDateTime(consultant.nextAvailableAt)}` : "No open slots"}
          </p>
        </div>
      </div>
    </Link>
  );
}
