export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="app-surface flex flex-col gap-1 p-5">
      <p className="text-sm font-medium text-[var(--color-muted)]">{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-navy">{value}</p>
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
