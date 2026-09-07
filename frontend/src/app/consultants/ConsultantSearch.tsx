"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import Button from "@/components/ui/Button";
import ConsultantCard from "@/components/marketplace/ConsultantCard";
import { useApiData } from "@/hooks/useApiData";
import { marketplaceApi } from "@/lib/marketplace-api";
import { CONSULTATION_MODES, modeLabel } from "@/lib/marketplace-types";

const FILTER_KEYS = ["type", "category", "city", "language", "minExperience", "minRating", "maxFee", "mode", "q", "sort"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export default function ConsultantSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])) as Record<FilterKey, string>;
  const page = Number(searchParams.get("page") ?? "0");

  const types = useApiData(() => marketplaceApi.professionalTypes());
  const categories = useApiData(() => marketplaceApi.categories());
  const results = useApiData(
    () => marketplaceApi.consultants({ ...filters, page }),
    [searchParams.toString()],
  );

  const update = useCallback(
    (changes: Partial<Record<FilterKey | "page", string>>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => {
        if (value === undefined || value.length === 0) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (!("page" in changes)) {
        next.delete("page");
      }
      router.replace(`/consultants?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const select = (key: FilterKey, label: string, options: { value: string; label: string }[]) => (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        value={filters[key]}
        onChange={(event) => update({ [key]: event.target.value })}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="bg-background">
      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-sm uppercase tracking-wide text-white/70">Consultant marketplace</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold">Find a verified CA, tax consultant or lawyer</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Every professional is verified against ICAI or Bar Council records before they appear here. Book a
            video, phone, chat or in-person consultation from ₹99 and pay only the price you see.
          </p>
          <form
            className="mt-6 flex flex-col sm:flex-row gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              update({ q: `${data.get("q") ?? ""}` });
            }}
          >
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Search by name, specialisation or city"
              className="flex-1 rounded-lg px-4 py-3 text-foreground bg-white"
            />
            <Button type="submit" variant="secondary" size="lg">Search</Button>
          </form>
          <p className="mt-4 text-sm text-white/70">
            Are you a professional?{" "}
            <Link href="/consultant/register" className="underline">Join the marketplace</Link>
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          {select("type", "Professional", (types.data ?? []).map((type) => ({ value: type.code, label: type.label })))}
          {select("category", "Need help with", (categories.data ?? []).map((category) => ({ value: category.slug, label: category.name })))}
          {select("mode", "Consultation mode", CONSULTATION_MODES.map((mode) => ({ value: mode, label: modeLabel(mode) })))}
          <label className="block text-sm">
            <span className="text-xs font-medium text-muted">City</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              defaultValue={filters.city}
              onBlur={(event) => update({ city: event.target.value })}
              placeholder="e.g. Mumbai"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-muted">Language</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              defaultValue={filters.language}
              onBlur={(event) => update({ language: event.target.value })}
              placeholder="e.g. Hindi"
            />
          </label>
          {select("minExperience", "Minimum experience", ["2", "5", "10", "15"].map((v) => ({ value: v, label: `${v}+ years` })))}
          {select("minRating", "Minimum rating", ["3", "4", "4.5"].map((v) => ({ value: v, label: `${v}★ and above` })))}
          {select("maxFee", "Budget", ["499", "999", "1999", "4999"].map((v) => ({ value: v, label: `Up to ₹${v}` })))}
          {select("sort", "Sort by", [
            { value: "rating", label: "Top rated" },
            { value: "experience", label: "Most experienced" },
            { value: "fee", label: "Lowest fee" },
          ])}
          <Button variant="ghost" size="sm" onClick={() => router.replace("/consultants")}>Clear filters</Button>
        </aside>

        <div>
          {results.error && <p className="text-sm text-danger">{results.error}</p>}
          {results.isLoading && <p className="text-sm text-muted">Loading consultants…</p>}
          {results.data && (
            <>
              <p className="text-sm text-muted mb-4">{results.data.totalElements} professionals available</p>
              {results.data.content.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
                  No consultants match these filters yet. Try widening your search.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {results.data.content.map((consultant) => (
                    <ConsultantCard key={consultant.id} consultant={consultant} />
                  ))}
                </div>
              )}
              {results.data.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3 text-sm">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => update({ page: `${page - 1}` })}>
                    Previous
                  </Button>
                  <span className="text-muted">Page {page + 1} of {results.data.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= results.data.totalPages}
                    onClick={() => update({ page: `${page + 1}` })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
