"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { Service } from "@/content/services";
import { cn } from "@/lib/utils";
import ServiceCard from "./ServiceCard";

const AUDIENCE_FILTERS = [
  { id: "all", label: "All services" },
  { id: "individuals", label: "Individuals" },
  { id: "startups", label: "Startups" },
  { id: "businesses", label: "Businesses" },
] as const;

type AudienceFilter = (typeof AUDIENCE_FILTERS)[number]["id"];

export default function ServiceFilter({ services }: { services: Service[] }) {
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [query, setQuery] = useState("");

  const visible = services.filter((service) => {
    const matchesAudience = audience === "all" || service.audiences.includes(audience);
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      needle.length === 0 ||
      service.name.toLowerCase().includes(needle) ||
      service.summary.toLowerCase().includes(needle) ||
      service.inclusions.some((item) => item.toLowerCase().includes(needle));
    return matchesAudience && matchesQuery;
  });

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter services by audience" className="flex flex-wrap gap-2">
          {AUDIENCE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={audience === filter.id}
              onClick={() => setAudience(filter.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                audience === filter.id
                  ? "border-navy bg-navy text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">Search services</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </label>
      </div>

      <p className="mt-6 text-sm text-slate-500" aria-live="polite">
        Showing {visible.length} of {services.length} services
      </p>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-600">
          No services match your search. Try a different keyword or{" "}
          <a href="/contact" className="font-semibold text-navy underline-offset-4 hover:underline">
            ask an expert
          </a>
          .
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
