import { AppBrand } from "@/components/app-brand";
import { RETAIL_PHONE_DISPLAY, RETAIL_PHONE_TEL } from "@/lib/site";

export function RetailHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
        <AppBrand size="header" showSubtitle={false} linkTo="/design" />
        <a
          href={`tel:${RETAIL_PHONE_TEL}`}
          className="shrink-0 rounded-xl border border-[var(--color-border)] bg-slate-50 px-3 py-2 text-sm font-semibold text-navy hover:border-cyan/40 hover:bg-cyan-soft/40"
        >
          {RETAIL_PHONE_DISPLAY}
        </a>
      </div>
    </header>
  );
}
