"use client";

import { InputHTMLAttributes, ReactNode, useId, useState } from "react";
import { useSiteContent } from "@/contexts/SiteContentContext";
import { fieldGuideOf, portalTextOf } from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** Admin-editable phrase from the "Portal text" CMS collection. */
export function usePortalText(): (key: string) => string {
  const content = useSiteContent();
  return (key) => portalTextOf(content, key);
}

interface GuidedFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  /** Key into the "Field guides" CMS collection. */
  guide: string;
  /** Replaces the input (e.g. a select) while keeping the label and help. */
  children?: ReactNode;
  rupee?: boolean;
}

/**
 * Form control with a plain-language label, a one-line hint and an expandable "Where do I find
 * this?" panel (source document, example, Hindi). All copy comes from the CMS field guide.
 */
export default function GuidedField({ guide, children, rupee, className, ...props }: GuidedFieldProps) {
  const content = useSiteContent();
  const entry = fieldGuideOf(content, guide);
  const [open, setOpen] = useState(false);
  const id = useId();
  const hasMore = entry.whereToFind || entry.example || entry.hindi;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {entry.label}
          {props.required && <span className="text-danger ml-0.5">*</span>}
        </label>
        {hasMore && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={`${id}-help`}
            className={cn(
              "shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold",
              open ? "bg-primary text-white border-primary" : "border-primary/40 text-primary hover:bg-primary/10",
            )}
            title="Where do I find this?"
          >
            i
          </button>
        )}
      </div>
      {children ?? (
        <div className="relative">
          {rupee && (
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-muted">₹</span>
          )}
          <input
            id={id}
            className={cn(
              "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60",
              "focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary-light transition-colors",
              rupee && "pl-7",
              className,
            )}
            {...props}
          />
        </div>
      )}
      {entry.hint && <p className="mt-1 text-xs text-muted">{entry.hint}</p>}
      {open && hasMore && (
        <div id={`${id}-help`} className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1.5">
          {entry.whereToFind && (
            <p>
              <span className="font-semibold text-primary">Where to find it: </span>
              {entry.whereToFind}
            </p>
          )}
          {entry.example && (
            <p>
              <span className="font-semibold text-primary">Example: </span>
              {entry.example}
            </p>
          )}
          {entry.hindi && <p className="text-foreground/80">{entry.hindi}</p>}
        </div>
      )}
    </div>
  );
}
