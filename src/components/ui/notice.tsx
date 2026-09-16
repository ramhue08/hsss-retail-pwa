import type { ReactNode } from "react";

type NoticeVariant = "success" | "info" | "warning" | "error";

const styles: Record<NoticeVariant, string> = {
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
  info: "border-sky-200 bg-sky-50/80 text-sky-950",
  warning: "border-amber-200 bg-amber-50/80 text-amber-950",
  error: "border-red-200 bg-red-50/80 text-red-950",
};

export function Notice({
  variant = "info",
  title,
  children,
}: {
  variant?: NoticeVariant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3.5 text-sm shadow-sm ${styles[variant]}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1.5 space-y-2 leading-relaxed" : "space-y-2 leading-relaxed"}>
        {children}
      </div>
    </div>
  );
}
