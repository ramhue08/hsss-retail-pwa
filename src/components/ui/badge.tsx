import type { ReactNode } from "react";

const variants = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  navy: "bg-navy/10 text-navy ring-1 ring-navy/15",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
