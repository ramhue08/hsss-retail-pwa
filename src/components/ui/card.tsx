import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  }[padding];

  return (
    <div className={`app-surface ${paddingClass} ${className}`}>{children}</div>
  );
}
