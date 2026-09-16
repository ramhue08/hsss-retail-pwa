import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  full?: boolean;
};

const variants = {
  primary:
    "bg-cyan text-navy-deep shadow-sm hover:bg-cyan/90 hover:shadow-md active:scale-[0.99]",
  secondary:
    "bg-white text-navy border border-[var(--color-border)] shadow-sm hover:bg-slate-50",
  outline:
    "border border-[var(--color-border)] bg-transparent text-navy hover:border-cyan/40 hover:bg-cyan-soft/50",
  ghost: "bg-transparent text-cyan hover:bg-white/10",
};

const sizes = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  full,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
