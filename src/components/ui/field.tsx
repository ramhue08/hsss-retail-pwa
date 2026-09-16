import type { ReactNode, SelectHTMLAttributes } from "react";

export const fieldControlClass =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan focus:ring-4 focus:ring-cyan/15";

export function FieldLabel({
  children,
  htmlFor,
}: Readonly<{ children: ReactNode; htmlFor?: string }>) {
  if (htmlFor) {
    return (
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {children}
      </label>
    );
  }
  return (
    <span className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
    </span>
  );
}

export function FieldSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SelectField({
  label,
  className = "",
  children,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
}) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
      <select
        id={selectId}
        className={`${fieldControlClass} ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function ChipRow({
  label,
  children,
  columns = 2,
}: Readonly<{
  label: string;
  children: ReactNode;
  columns?: 2 | 3 | 5;
}>) {
  const gridClass =
    columns === 5
      ? "grid-cols-5"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2";
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className={`grid gap-2 ${gridClass}`}>{children}</div>
    </div>
  );
}
