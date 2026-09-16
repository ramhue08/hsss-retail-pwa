import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ label, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan focus:ring-4 focus:ring-cyan/15 disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
        {...props}
      />
      {hint && <span className="mt-1.5 block text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}
