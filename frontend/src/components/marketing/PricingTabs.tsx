"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { pricingTabs, type PricingAudience } from "@/content/pricing";
import { formatPrice } from "@/content/services";
import { siteConfig } from "@/content/site";
import { cn } from "@/lib/utils";

export default function PricingTabs({ initial = "individuals" }: { initial?: PricingAudience }) {
  const [active, setActive] = useState<PricingAudience>(initial);
  const tab = pricingTabs.find((item) => item.id === active) ?? pricingTabs[0];

  return (
    <div>
      <div role="tablist" aria-label="Pricing audience" className="mx-auto flex w-fit rounded-xl bg-slate-100 p-1">
        {pricingTabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            id={`pricing-tab-${item.id}`}
            aria-selected={active === item.id}
            aria-controls={`pricing-panel-${item.id}`}
            onClick={() => setActive(item.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:px-6",
              active === item.id ? "bg-white text-navy shadow-sm" : "text-slate-600 hover:text-navy",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`pricing-panel-${tab.id}`}
        aria-labelledby={`pricing-tab-${tab.id}`}
        className={cn(
          "mt-10 grid gap-6",
          tab.plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3",
        )}
      >
        {tab.plans.map((plan) => (
          <article
            key={plan.name}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-lg",
              plan.popular ? "border-emerald ring-2 ring-emerald/30" : "border-slate-200",
            )}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-6 rounded-full bg-emerald px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-navy-deep">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Starting at</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-navy-deep">{formatPrice(plan.price)}</span>
                {plan.unit && <span className="text-sm text-slate-500">{plan.unit}</span>}
              </p>
              {plan.quota && <p className="mt-1 text-xs font-medium text-emerald">{plan.quota}</p>}
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={`${siteConfig.portal.getStartedHref}?plan=${encodeURIComponent(plan.name)}`}
              className={cn(
                "mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                plan.popular ? "bg-emerald text-white hover:bg-emerald-light" : "bg-navy text-white hover:bg-primary-light",
              )}
            >
              {plan.ctaLabel ?? "Get Started"}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Prices exclude GST and government fees, which are shown separately before you pay.
      </p>
    </div>
  );
}
