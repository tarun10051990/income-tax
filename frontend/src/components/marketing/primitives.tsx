import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Section({
  id,
  className,
  children,
  tone = "default",
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  tone?: "default" | "muted" | "dark";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-20 lg:py-24",
        tone === "muted" && "bg-white",
        tone === "dark" && "bg-navy-deep text-white",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  dark?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      {eyebrow && (
        <p className={cn("mb-3 text-sm font-semibold uppercase tracking-wider", dark ? "text-emerald-light" : "text-emerald")}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", dark ? "text-white" : "text-navy-deep")}>{title}</h2>
      {subtitle && <p className={cn("mt-4 text-lg leading-relaxed", dark ? "text-slate-300" : "text-slate-600")}>{subtitle}</p>}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "white";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-navy text-white hover:bg-primary-light shadow-sm hover:shadow-md hover:-translate-y-0.5",
  secondary:
    "bg-emerald text-white hover:bg-emerald-light shadow-sm hover:shadow-md hover:-translate-y-0.5",
  outline:
    "border border-slate-300 bg-white text-navy hover:border-navy hover:bg-slate-50",
  ghost: "text-navy hover:bg-slate-100",
  white: "bg-white text-navy hover:bg-slate-100 shadow-sm",
};

export function CtaLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  arrow = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  arrow?: boolean;
  external?: boolean;
}) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200",
    size === "sm" && "px-4 py-2 text-sm",
    size === "md" && "px-5 py-2.5 text-sm",
    size === "lg" && "px-7 py-3.5 text-base",
    buttonStyles[variant],
    className,
  );
  const content = (
    <>
      {children}
      {arrow && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </>
  );
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald/20 bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
      {children}
    </span>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-navy-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.18),transparent_55%)]" aria-hidden="true" />
      <Container className="relative py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-light">{eyebrow}</p>}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-slate-300">{subtitle}</p>}
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
      </Container>
    </div>
  );
}
