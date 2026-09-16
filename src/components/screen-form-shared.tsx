"use client";

import type { HingeSide } from "@/lib/constants";
import { HINGE_SIDES } from "@/lib/constants";
import type { ScreenDraft } from "@/lib/orders";
import {
  FRONT_RETURN_STOCK_MAX_MM,
  RADIUS_CORNER_EXTRA,
  RADIUS_CORNER_STOCK_SIZES,
  STOCK_STEP_MM,
  WALKTHROUGH_WARNING_MM,
  SLIDER,
  clampLinkedLeftPanelMM,
  fixedPanelBaseWidthMM,
  fixedPanelRequiresCustomQuote,
  frontOnlyEffectiveW2w,
  frontReturnRequiresCustomQuote,
  linkedRightPanelMM,
  panelTotalForFrontOnly,
  sizeStep,
  snapDraftToRadiusCornerStock,
  syncFrontOnlyRightPanel,
  validateSlider,
  walkthroughOpeningMM,
  walkthroughUnderLimit,
} from "@/lib/screen-rules";
import {
  frontOnlyMinOpening,
  SMALLEST_STOCK_PANEL_MM,
  STOCK_GLASS_PANELS,
} from "@/lib/stock-panels";
import { formatMoney } from "@/lib/pricing";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { ChipRow, FieldSection, SelectField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useEffect } from "react";

export function CustomSizeToggle({
  draft,
  onChange,
}: {
  draft: ScreenDraft;
  onChange: (customSize: boolean) => void;
}) {
  return (
    <ChipRow label="Custom size">
      <ChoiceChip selected={!draft.customSize} onClick={() => onChange(false)}>
        Stock sizes
      </ChoiceChip>
      <ChoiceChip selected={draft.customSize} onClick={() => onChange(true)}>
        Custom size
      </ChoiceChip>
    </ChipRow>
  );
}

export function CustomSizeNotice({ draft }: { draft: ScreenDraft }) {
  if (!draft.customSize) return null;
  return (
    <Notice variant="info">
      Custom size selected — pricing is hidden. HSSS will quote this screen
      separately.
    </Notice>
  );
}

export function FixedPanelStockNotice({ draft }: { draft: ScreenDraft }) {
  if (!fixedPanelRequiresCustomQuote(draft)) return null;
  const base = fixedPanelBaseWidthMM(draft);
  return (
    <Notice variant="error">
      {draft.isRadiusCorner
        ? `200mm radius corner stock sizes are ${RADIUS_CORNER_STOCK_SIZES.join(", ")}mm only — ${base}mm is not available.`
        : `Stock size not available for ${base}mm panel — custom panel required.`}{" "}
      Live pricing is hidden; HSSS will quote this screen separately.
    </Notice>
  );
}

export function FrontReturnStockNotice({ draft }: { draft: ScreenDraft }) {
  if (!frontReturnRequiresCustomQuote(draft)) return null;
  const frontMM = Number(draft.frontMM) || 0;
  const returnMM = Number(draft.returnMM) || 0;
  const oversizeLegs = [
    frontMM > FRONT_RETURN_STOCK_MAX_MM ? `front ${frontMM}mm` : null,
    returnMM > FRONT_RETURN_STOCK_MAX_MM ? `return ${returnMM}mm` : null,
  ].filter(Boolean);
  return (
    <Notice variant="error">
      Stock Front & Return max is {FRONT_RETURN_STOCK_MAX_MM}mm per leg
      {oversizeLegs.length ? ` — ${oversizeLegs.join(" and ")} over limit` : ""}
      . This is a custom job; live pricing is hidden and HSSS will quote from the
      office.
    </Notice>
  );
}

export function RadiusCornerToggle({
  draft,
  onChange,
}: {
  draft: ScreenDraft;
  onChange: (patch: Partial<ScreenDraft>) => void;
}) {
  return (
    <>
      <ChipRow label="200mm radius corner">
        <ChoiceChip
          selected={!draft.isRadiusCorner}
          onClick={() => onChange({ isRadiusCorner: false })}
        >
          Square corner
        </ChoiceChip>
        <ChoiceChip
          selected={draft.isRadiusCorner}
          onClick={() => onChange(snapDraftToRadiusCornerStock(draft))}
        >
          200mm radius
        </ChoiceChip>
      </ChipRow>
      {draft.isRadiusCorner && (
        <Notice variant="info">
          200mm radius corner adds +{formatMoney(RADIUS_CORNER_EXTRA)}. Stock
          panel widths: {RADIUS_CORNER_STOCK_SIZES.join(", ")}mm only.
        </Notice>
      )}
    </>
  );
}

export function RadiusCornerPanelSizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = Number(value) || 0;
  return (
    <ChipRow label={label} columns={3}>
      {RADIUS_CORNER_STOCK_SIZES.map((size) => (
        <ChoiceChip
          key={size}
          selected={selected === size}
          onClick={() => onChange(String(size))}
        >
          {size}mm
        </ChoiceChip>
      ))}
    </ChipRow>
  );
}

/** Stock glass panel picker — builder selects the panel; hob = panel + 15. */
export function StockPanelPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const selected = Number(value) || 0;
  const hob = selected > 0 ? selected + 15 : null;
  return (
    <div>
      <SelectField
        label={label}
        value={selected > 0 ? String(selected) : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select stock panel
        </option>
        {STOCK_GLASS_PANELS.map((size) => (
          <option key={size} value={String(size)}>
            {size}mm
          </option>
        ))}
      </SelectField>
      {hob != null && (
        <p className="mt-1.5 text-xs text-slate-500">
          Hob to build: <strong>{hob}mm</strong>
          {hint ? ` — ${hint}` : ""}
        </p>
      )}
    </div>
  );
}

export function FrontOnlySizeModeField({
  draft,
  onChange,
}: {
  draft: ScreenDraft;
  onChange: (patch: Partial<ScreenDraft>) => void;
}) {
  return (
    <FieldSection
      title="Measurement type"
      description="Required — choose how this Front Only screen will be measured."
    >
      <ChipRow label="Exact size or oversize angle">
        <ChoiceChip
          selected={draft.frontOnlySizeMode === "exact"}
          onClick={() => onChange({ frontOnlySizeMode: "exact" })}
        >
          Exact size
        </ChoiceChip>
        <ChoiceChip
          selected={draft.frontOnlySizeMode === "oversize"}
          onClick={() => onChange({ frontOnlySizeMode: "oversize" })}
        >
          Oversize angle
        </ChoiceChip>
      </ChipRow>
      {draft.frontOnlySizeMode === "oversize" && (
        <>
          <Input
            label="Date you will supply exact sheet-to-sheet size"
            type="date"
            required
            value={draft.oversizeMeasurementDate}
            onChange={(e) =>
              onChange({ oversizeMeasurementDate: e.target.value })
            }
          />
          <Input
            label="Rough sheet-to-sheet (mm)"
            type="number"
            min={1}
            step={1}
            required
            value={draft.roughW2wMM}
            onChange={(e) =>
              onChange(
                syncFrontOnlyRightPanel(draft, {
                  roughW2wMM: e.target.value,
                })
              )
            }
            hint="Required rough size for the diagram and panel layout. Pricing is held until the exact measurement arrives."
          />
        </>
      )}
    </FieldSection>
  );
}

export function HingeSideField({
  draft,
  onChange,
}: {
  draft: ScreenDraft;
  onChange: (hingeSide: HingeSide) => void;
}) {
  return (
    <ChipRow label="Hinge side (required)">
      {HINGE_SIDES.map((opt) => (
        <ChoiceChip
          key={opt.value}
          selected={draft.hingeSide === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </ChoiceChip>
      ))}
    </ChipRow>
  );
}

export function ScreenSizeInput({
  label,
  value,
  onChange,
  draft,
  min = STOCK_STEP_MM,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  draft: ScreenDraft;
  min?: number;
}) {
  const step = sizeStep(draft.type, draft);
  return (
    <Input
      label={label}
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      hint={
        draft.customSize
          ? "Custom size — 1mm increments. Pricing hidden."
          : step === STOCK_STEP_MM
            ? draft.type === "Front & Return"
              ? `Stock sizes — 50mm increments, max ${FRONT_RETURN_STOCK_MAX_MM}mm per leg.`
              : "Stock sizes — 50mm increments."
            : undefined
      }
    />
  );
}

export function LinkedPanelField({
  draft,
  onChange,
}: {
  draft: ScreenDraft;
  onChange: (patch: Partial<ScreenDraft>) => void;
}) {
  const oversize = draft.frontOnlySizeMode === "oversize";
  const w2w = frontOnlyEffectiveW2w(draft);
  const doorMM = draft.isSliding ? "662" : draft.doorMM;
  const sliderMin = draft.isSliding ? SLIDER.panelDoorPanel.min : null;
  const panelTotal = w2w ? panelTotalForFrontOnly(w2w, doorMM) : 0;
  const left = Number(draft.leftPanelMM) || 0;
  const right = w2w ? linkedRightPanelMM(w2w, left, doorMM) : 0;
  const step = STOCK_STEP_MM;
  const minPanel = SMALLEST_STOCK_PANEL_MM;
  const maxLeft = panelTotal >= minPanel * 2 ? panelTotal - minPanel : minPanel;
  const canDecrease = w2w > 0 && left > minPanel && panelTotal >= minPanel * 2;
  const canIncrease = w2w > 0 && left < maxLeft && panelTotal >= minPanel * 2;

  // If left/right are impossible for the current opening (e.g. left still 900
  // after narrowing sheet-to-sheet), clamp so −/+ toggles work again.
  useEffect(() => {
    if (!w2w) return;
    const clampedLeft = clampLinkedLeftPanelMM(
      w2w,
      left || minPanel,
      doorMM,
      minPanel
    );
    const nextRight = linkedRightPanelMM(w2w, clampedLeft, doorMM);
    if (
      clampedLeft !== left ||
      String(nextRight) !== String(draft.rightPanelMM ?? "")
    ) {
      onChange({
        leftPanelMM: String(clampedLeft),
        rightPanelMM: String(nextRight),
      });
    }
    // Only re-clamp when opening/door/left change — not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [w2w, doorMM, left, step, minPanel]);

  function adjustLeft(delta: number) {
    if (!w2w || panelTotal < minPanel * 2) return;
    const nextLeft = clampLinkedLeftPanelMM(w2w, left + delta, doorMM, minPanel);
    if (nextLeft === left) return;
    onChange({
      leftPanelMM: String(nextLeft),
      rightPanelMM: String(linkedRightPanelMM(w2w, nextLeft, doorMM)),
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      {!oversize && (
        <ScreenSizeInput
          label="Sheet to sheet (mm)"
          value={draft.w2wMM}
          onChange={(value) => {
            const nextW2w = Number(value) || 0;
            const nextLeft = Number(draft.leftPanelMM) || step;
            if (nextW2w <= 0) {
              onChange({ w2wMM: value });
              return;
            }
            const clampedLeft = clampLinkedLeftPanelMM(
              nextW2w,
              nextLeft,
              doorMM,
              minPanel
            );
            onChange({
              w2wMM: value,
              leftPanelMM: String(clampedLeft),
              rightPanelMM: String(
                linkedRightPanelMM(nextW2w, clampedLeft, doorMM)
              ),
            });
          }}
          draft={draft}
          min={sliderMin ?? frontOnlyMinOpening("panelDoorPanel", doorMM)}
        />
      )}
      {oversize && (
        <p className="text-xs text-slate-500">
          Panel layout uses rough sheet-to-sheet{" "}
          <strong>{w2w || "—"}mm</strong> from above.
        </p>
      )}
      {draft.isSliding && <SliderWidthNotice draft={draft} />}
      {!draft.isSliding &&
        w2w > 0 &&
        w2w < frontOnlyMinOpening("panelDoorPanel", doorMM) && (
        <Notice variant="error">
          Minimum sheet-to-sheet for Panel + Door + Panel with a {doorMM}mm door
          is {frontOnlyMinOpening("panelDoorPanel", doorMM)}mm. Switch to Panel
          + Door for smaller openings.
        </Notice>
      )}
      {!draft.isSliding && w2w > 0 && panelTotal < minPanel * 2 && (
        <Notice variant="warning">
          Not enough width for two side panels after the door deduction (
          {panelTotal}mm left). Increase sheet-to-sheet or use a narrower door.
        </Notice>
      )}
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Left panel</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adjustLeft(-step)}
            disabled={!canDecrease}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-navy hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            − {step}mm
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-semibold text-navy">
            {left}mm
          </span>
          <button
            type="button"
            onClick={() => adjustLeft(step)}
            disabled={!canIncrease}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-navy hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            + {step}mm
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Panels total {panelTotal}mm (sheet-to-sheet −{" "}
        {doorMM === "762" ? 797 : 697}mm door deduction). Right panel auto:{" "}
        <strong>{Math.max(0, right)}mm</strong>.
      </p>
    </div>
  );
}

export function WalkthroughWarning({
  w2wMM,
  panelSizes,
}: {
  w2wMM: number;
  panelSizes: number[];
}) {
  if (!w2wMM || !walkthroughUnderLimit(w2wMM, panelSizes)) return null;
  const opening = walkthroughOpeningMM(w2wMM, panelSizes);
  return (
    <Notice variant="error">
      Walkthrough opening is {opening}mm — under {WALKTHROUGH_WARNING_MM}mm with
      the panel sizes chosen. Under 600mm is not fit for purpose, but you can
      still proceed.
    </Notice>
  );
}

export function FrontOnlyMinimumNotice({ draft }: { draft: ScreenDraft }) {
  if (draft.type !== "Front Only" || !draft.frontOnlySizeMode) {
    return null;
  }
  if (draft.isSliding) return null;
  if (draft.frontOnlyStyle === "panelDoor") {
    const w2w = frontOnlyEffectiveW2w(draft);
    const doorMM = draft.doorMM;
    const min = frontOnlyMinOpening("panelDoor", doorMM);
    if (w2w > 0 && w2w < min) {
      return (
        <Notice variant="error">
          Minimum sheet-to-sheet for Panel + Door with a {doorMM}mm door is{" "}
          {min}mm.
        </Notice>
      );
    }
  }
  return null;
}

export function SliderWidthNotice({ draft }: { draft: ScreenDraft }) {
  const message = validateSlider(draft);
  if (!message) return null;
  return <Notice variant="error">{message}</Notice>;
}

export function FixedPanelReturnStyleField({
  draft,
  onChange,
}: {
  draft: ScreenDraft;
  onChange: (style: ScreenDraft["fixedPanelReturnStyle"]) => void;
}) {
  return (
    <ChipRow label="Panel + return layout">
      <ChoiceChip
        selected={draft.fixedPanelReturnStyle === "inlineWalkthrough"}
        onClick={() => onChange("inlineWalkthrough")}
      >
        Inline panel + return
      </ChoiceChip>
      <ChoiceChip
        selected={draft.fixedPanelReturnStyle === "singleInReturn"}
        onClick={() => onChange("singleInReturn")}
      >
        Single panel in return
      </ChoiceChip>
    </ChipRow>
  );
}
