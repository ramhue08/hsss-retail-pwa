"use client";

import type { ReactNode } from "react";

export function ChoiceChip({
  selected,
  onClick,
  children,
  className = "",
}: Readonly<{
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
        selected
          ? "border-navy bg-cyan/15 text-navy shadow-sm ring-1 ring-navy/10"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      } ${className}`}
    >
      {children}
    </button>
  );
}
