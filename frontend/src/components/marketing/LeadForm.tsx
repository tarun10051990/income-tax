"use client";

import { useState, type FormEvent } from "react";
import { CircleCheckBig, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { services } from "@/content/services";
import { LEAD_TYPES, validateLead, type LeadErrors, type LeadInput } from "@/lib/leads";
import { cn } from "@/lib/utils";

type Status = { state: "idle" } | { state: "submitting" } | { state: "success"; message: string } | { state: "error"; message: string };

const EMPTY: LeadInput = { fullName: "", mobile: "", email: "", leadType: "", service: "", message: "", website: "" };

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 aria-[invalid=true]:border-red-500";

export default function LeadForm({
  source,
  defaultService,
  compact = false,
  submitLabel = "Request a Callback",
  className,
}: {
  source: string;
  defaultService?: string;
  compact?: boolean;
  submitLabel?: string;
  className?: string;
}) {
  const [values, setValues] = useState<LeadInput>({ ...EMPTY, service: defaultService ?? "" });
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const update = (field: keyof LeadInput) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLead(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ state: "error", message: "Please correct the highlighted fields." });
      return;
    }
    setStatus({ state: "submitting" });
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string; errors?: LeadErrors };
      if (!response.ok || !data.ok) {
        if (data.errors) setErrors(data.errors);
        setStatus({ state: "error", message: data.message ?? "Something went wrong. Please try again." });
        return;
      }
      setStatus({ state: "success", message: data.message ?? "Thanks! We will be in touch shortly." });
      setValues({ ...EMPTY, service: defaultService ?? "" });
    } catch {
      setStatus({ state: "error", message: "Network error. Please check your connection or call us directly." });
    }
  };

  if (status.state === "success") {
    return (
      <div className={cn("rounded-2xl border border-emerald/30 bg-emerald/5 p-8 text-center", className)} role="status">
        <CircleCheckBig className="mx-auto h-12 w-12 text-emerald" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-semibold text-navy-deep">Request received</h3>
        <p className="mt-2 text-sm text-slate-600">{status.message}</p>
        <button
          type="button"
          onClick={() => setStatus({ state: "idle" })}
          className="mt-6 text-sm font-semibold text-navy underline-offset-4 hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  const error = (field: keyof LeadInput) =>
    errors[field] ? (
      <p id={`${source}-${field}-error`} className="mt-1 text-xs text-red-600" role="alert">
        {errors[field]}
      </p>
    ) : null;

  const describedBy = (field: keyof LeadInput) => (errors[field] ? `${source}-${field}-error` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className={cn("space-y-4", className)} aria-label="Request a callback">
      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <div>
          <label htmlFor={`${source}-fullName`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            id={`${source}-fullName`}
            name="fullName"
            autoComplete="name"
            className={fieldClass}
            value={values.fullName}
            onChange={update("fullName")}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={describedBy("fullName")}
            placeholder="Priya Sharma"
            required
          />
          {error("fullName")}
        </div>
        <div>
          <label htmlFor={`${source}-mobile`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Mobile Number
          </label>
          <input
            id={`${source}-mobile`}
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={fieldClass}
            value={values.mobile}
            onChange={update("mobile")}
            aria-invalid={Boolean(errors.mobile)}
            aria-describedby={describedBy("mobile")}
            placeholder="98765 43210"
            required
          />
          {error("mobile")}
        </div>
        <div>
          <label htmlFor={`${source}-email`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id={`${source}-email`}
            name="email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            value={values.email}
            onChange={update("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("email")}
            placeholder="you@example.com"
            required
          />
          {error("email")}
        </div>
        <div>
          <label htmlFor={`${source}-leadType`} className="mb-1.5 block text-sm font-medium text-slate-700">
            I am a
          </label>
          <select
            id={`${source}-leadType`}
            name="leadType"
            className={fieldClass}
            value={values.leadType}
            onChange={update("leadType")}
            aria-invalid={Boolean(errors.leadType)}
            aria-describedby={describedBy("leadType")}
            required
          >
            <option value="">Select…</option>
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {error("leadType")}
        </div>
        <div className={cn(!compact && "sm:col-span-2")}>
          <label htmlFor={`${source}-service`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Service Required
          </label>
          <select
            id={`${source}-service`}
            name="service"
            className={fieldClass}
            value={values.service}
            onChange={update("service")}
            aria-invalid={Boolean(errors.service)}
            aria-describedby={describedBy("service")}
            required
          >
            <option value="">Select a service…</option>
            {services.map((service) => (
              <option key={service.slug} value={service.name}>
                {service.name}
              </option>
            ))}
            <option value="Custom Plan">Custom plan / multiple services</option>
            <option value="Not sure yet">Not sure yet — help me choose</option>
          </select>
          {error("service")}
        </div>
        <div className={cn(!compact && "sm:col-span-2")}>
          <label htmlFor={`${source}-message`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Message <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id={`${source}-message`}
            name="message"
            rows={compact ? 3 : 4}
            className={fieldClass}
            value={values.message}
            onChange={update("message")}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={describedBy("message")}
            placeholder="Tell us a little about your requirement"
          />
          {error("message")}
        </div>
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${source}-website`}>Website</label>
        <input id={`${source}-website`} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={update("website")} />
      </div>

      {status.state === "error" && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-emerald-light hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status.state === "submitting" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {status.state === "submitting" ? "Sending…" : submitLabel}
      </button>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" aria-hidden="true" />
        Your information is secure and will only be used to contact you regarding your request.
      </p>
    </form>
  );
}
