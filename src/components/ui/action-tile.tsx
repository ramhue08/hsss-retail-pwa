import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/icons";

export function ActionTile({
  href,
  title,
  description,
  icon,
  featured = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl border p-4 transition duration-200 ${
        featured
          ? "border-cyan/25 bg-gradient-to-br from-cyan-soft/80 to-white shadow-[var(--shadow-card)] hover:border-cyan/40"
          : "border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] hover:border-cyan/25"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          featured ? "bg-cyan text-navy-deep" : "bg-navy/8 text-navy"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-navy">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-[var(--color-muted)]">
          {description}
        </span>
      </span>
      <IconChevronRight className="text-slate-300 transition group-hover:text-cyan" />
    </Link>
  );
}
