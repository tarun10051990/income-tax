"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { resourceCategories, type ResourcePost } from "@/content/resources";
import { cn } from "@/lib/utils";
import { ResourceCard } from "./sections";

export default function ResourceExplorer({ posts, initialCategory }: { posts: ResourcePost[]; initialCategory?: string }) {
  const [category, setCategory] = useState<string>(initialCategory ?? "all");
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible = posts.filter(
    (post) =>
      (category === "all" || post.category === category) &&
      (needle.length === 0 || post.title.toLowerCase().includes(needle) || post.excerpt.toLowerCase().includes(needle)),
  );

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter resources by category" className="flex flex-wrap gap-2">
          <FilterButton active={category === "all"} onClick={() => setCategory("all")}>
            All
          </FilterButton>
          {resourceCategories.map((item) => (
            <FilterButton key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>
              {item.label}
            </FilterButton>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search resources</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </label>
      </div>

      <p className="mt-6 text-sm text-slate-500" aria-live="polite">
        {visible.length} {visible.length === 1 ? "article" : "articles"}
      </p>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-600">
          No articles match your search yet. Try another keyword or category.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((post, i) => (
            <ResourceCard key={post.slug} post={post} index={i % 3} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy",
      )}
    >
      {children}
    </button>
  );
}
