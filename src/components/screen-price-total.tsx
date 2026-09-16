"use client";

import { useMemo } from "react";
import { formatMoney } from "@/lib/pricing";
import {
  screenPriceExGst,
  type OrderScreenPayload,
  type ScreenDraft,
} from "@/lib/orders";
import {
  fixedPanelRequiresCustomQuote,
  frontReturnRequiresCustomQuote,
  hidePricing,
} from "@/lib/screen-rules";

type Props = {
  draft: ScreenDraft;
  preview: OrderScreenPayload | null;
  size?: "md" | "lg";
  label?: string;
  /** "bar" = footer strip on order screen card; "embedded" = inside quote card */
  variant?: "bar" | "embedded";
};

/** Ex + inc GST for the current draft/preview — always derived together. */
export function resolveDisplayPrices(
  draft: ScreenDraft,
  preview: OrderScreenPayload | null
): { exGst: number; incGst: number } | null {
  if (!preview || hidePricing(draft)) return null;
  if (typeof preview.priceExGst !== "number") return null;
  const exGst = screenPriceExGst(preview);
  const incGst = Math.round(exGst * 1.1 * 100) / 100;
  return { exGst, incGst };
}

export function ScreenPriceTotal({
  draft,
  preview,
  size = "md",
  label = "Supply price",
  variant = "bar",
}: Props) {
  const prices = useMemo(
    () => resolveDisplayPrices(draft, preview),
    [draft, preview]
  );

  const mainClass =
    size === "lg"
      ? "text-3xl font-semibold tracking-tight text-navy"
      : "text-xl font-semibold text-navy";

  let main: string;
  if (prices) {
    main = formatMoney(prices.exGst);
  } else if (
    draft.type === "Front Only" &&
    draft.frontOnlySizeMode === "oversize"
  ) {
    main = "Pending measure";
  } else if (hidePricing(draft)) {
    main = "Custom quote";
  } else {
    main = "-";
  }

  const body = (
    <div
      key={`${draft.type}-${prices?.exGst ?? "x"}-${prices?.incGst ?? "y"}`}
      className="flex flex-wrap items-end justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm text-slate-600">
          {preview?.summary ?? "Complete the options above"}
        </p>
      </div>
      <div className="text-right">
        <p className={mainClass}>{main}</p>
        {prices ? (
          <p className="text-xs text-slate-500">
            {formatMoney(prices.exGst)} ex GST
            {" · "}
            {formatMoney(prices.incGst)} inc GST
          </p>
        ) : null}
        {prices ? (
          <p className="text-xs font-medium text-slate-600">
            Supply only, freight quoted to your postcode
          </p>
        ) : null}
        {draft.customSize && (
          <p className="text-xs text-slate-500">
            Custom size — pricing by quote
          </p>
        )}
        {draft.type === "Front Only" &&
          draft.frontOnlySizeMode === "oversize" && (
            <p className="text-xs text-slate-500">
              Oversize angle — pricing held until exact measure
            </p>
          )}
        {!draft.customSize && frontReturnRequiresCustomQuote(draft) && (
          <p className="text-xs text-slate-500">
            Over 1500mm leg — pricing by office
          </p>
        )}
        {!draft.customSize && fixedPanelRequiresCustomQuote(draft) && (
          <p className="text-xs text-slate-500">
            Custom panel — pricing by quote
          </p>
        )}
      </div>
    </div>
  );

  if (variant === "embedded") return body;

  return (
    <div className="border-t border-slate-100 bg-gradient-to-br from-white to-cyan-soft/40 px-5 py-4 sm:px-6">
      {body}
    </div>
  );
}
