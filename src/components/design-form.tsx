"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrackingParams } from "@/types/database";
import {
  ANGLE_HEIGHTS,
  FIXED_STYLES,
  RETURN_SIDES,
  SIDES,
  SPLAYED_SIZES,
  type AngleHeight,
  type QuickScreenKey,
} from "@/lib/constants";
import {
  screenDraftForType,
  screenDraftToPayload,
  type ScreenDraft,
  type ScreenType,
} from "@/lib/orders";
import { coloursForDraft, RETAIL_SERVICE_TYPE } from "@/lib/retail";
import { applyRetailMarkup, formatMoney } from "@/lib/pricing";
import { SEND_DESIGN_LABEL } from "@/lib/site";
import { trackDiyAppAccess, trackDiyQuoteRequest } from "@/lib/pixel";
import {
  EMPTY_CONTACT,
  LOCAL_CONTACT_KEY,
  LOCAL_DRAFT_KEY,
  type SendContactDetails,
} from "@/lib/contact";
import { SendDetailsDialog } from "@/components/send-details-dialog";
import {
  frontOnlyEffectiveW2w,
  SLIDER,
  syncFrontOnlyRightPanel,
} from "@/lib/screen-rules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { ChoiceChip } from "@/components/ui/choice-chip";
import {
  ChipRow,
  FieldSection,
  SelectField,
} from "@/components/ui/field";
import { ScreenDiagram } from "@/components/screen-diagram";
import { ScreenPriceTotal } from "@/components/screen-price-total";
import {
  CustomSizeNotice,
  CustomSizeToggle,
  FixedPanelReturnStyleField,
  FixedPanelStockNotice,
  FrontOnlyMinimumNotice,
  FrontOnlySizeModeField,
  FrontReturnStockNotice,
  HingeSideField,
  LinkedPanelField,
  RadiusCornerPanelSizeField,
  RadiusCornerToggle,
  ScreenSizeInput,
  SliderWidthNotice,
  StockPanelPicker,
  WalkthroughWarning,
} from "@/components/screen-form-shared";
import { frontOnlyMinOpening } from "@/lib/stock-panels";

const SCREEN_OPTIONS: { key: QuickScreenKey; type: ScreenType; label: string }[] =
  [
    { key: "frontReturn", type: "Front & Return", label: "Front & Return" },
    { key: "frontOnly", type: "Front Only", label: "Front Only" },
    { key: "splayed", type: "Splayed", label: "Splayed" },
    { key: "fixedPanel", type: "Fixed Panel", label: "Fixed Panel" },
  ];

export function DesignForm({
  initialDraft,
  hasServerDraft,
  initialContact,
  tracking,
}: {
  initialDraft: ScreenDraft;
  hasServerDraft: boolean;
  initialContact: SendContactDetails;
  tracking: TrackingParams;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ScreenDraft>(initialDraft);
  const [contact, setContact] = useState<SendContactDetails>(initialContact);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const skipSave = useRef(true);
  const colourOptions = coloursForDraft(draft.isSliding);

  const showDoor =
    draft.type === "Front & Return" || draft.type === "Front Only";
  const foConfigured =
    draft.type !== "Front Only" ||
    draft.frontOnlySizeMode === "exact" ||
    draft.frontOnlySizeMode === "oversize";

  const preview = useMemo(() => {
    const result = screenDraftToPayload(draft, RETAIL_SERVICE_TYPE, {
      forPreview: true,
    });
    return "error" in result ? null : result;
  }, [draft]);

  useEffect(() => {
    if (hasServerDraft) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ScreenDraft;
      if (saved && typeof saved === "object") setDraft({ ...initialDraft, ...saved });
    } catch {
      /* ignore */
    }
  }, [hasServerDraft, initialDraft]);

  useEffect(() => {
    if (initialContact.email) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_CONTACT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SendContactDetails;
      if (saved && typeof saved === "object") {
        setContact({ ...EMPTY_CONTACT, ...saved });
      }
    } catch {
      /* ignore */
    }
  }, [initialContact.email]);

  useEffect(() => {
    if (draft.isSliding && draft.colour === "Brushed Brass") {
      setDraft((d) => ({ ...d, colour: "Chrome" }));
    }
  }, [draft.isSliding, draft.colour]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => {
      fetch("/api/designs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      }).catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draft]);

  function patch(partial: Partial<ScreenDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function openSendDialog() {
    if (!preview) {
      setError("Complete the design before sending.");
      return;
    }
    setError(null);
    setDialogError(null);
    setDialogOpen(true);
  }

  async function confirmSend(details: SendContactDetails) {
    setLoading(true);
    setDialogError(null);
    const res = await fetch("/api/designs/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, ...details }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setDialogError(body.error ?? "Could not send the design. Please try again.");
      return;
    }
    setContact(details);
    try {
      window.localStorage.setItem(LOCAL_CONTACT_KEY, JSON.stringify(details));
    } catch {
      /* ignore */
    }
    trackDiyAppAccess(tracking);
    trackDiyQuoteRequest(tracking, details.postcode);
    setDialogOpen(false);
    router.push(`/design/sent?ref=${encodeURIComponent(body.design_ref)}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Screen type</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 p-5 sm:p-6">
          {SCREEN_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.key}
              selected={draft.type === opt.type}
              onClick={() =>
                setDraft(screenDraftForType(draft, opt.type))
              }
            >
              {opt.label}
            </ChoiceChip>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-4">
        <Card className="relative z-10 order-2 min-w-0 space-y-6 md:order-none">
          <FieldSection title="Basics">
            <SelectField
              label="Colour"
              value={draft.colour}
              onChange={(e) => patch({ colour: e.target.value })}
            >
              {colourOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </FieldSection>

          <CustomSizeNotice draft={draft} />

          <FieldSection title="Layout & sizes" description="All sizes in mm - plan view">
            {(draft.type === "Front & Return" ||
              draft.type === "Fixed Panel" ||
              draft.type === "Splayed") && (
              <CustomSizeToggle
                draft={draft}
                onChange={(customSize) =>
                  patch(
                    customSize
                      ? { customSize: true, isRadiusCorner: false }
                      : { customSize: false }
                  )
                }
              />
            )}

            {draft.type === "Front & Return" && (
              <>
                <ChipRow label="Return side">
                  {RETURN_SIDES.map((opt) => (
                    <ChoiceChip
                      key={opt.value}
                      selected={draft.returnSide === opt.value}
                      onClick={() => patch({ returnSide: opt.value })}
                    >
                      {opt.label}
                    </ChoiceChip>
                  ))}
                </ChipRow>
                <div className="grid grid-cols-2 gap-3">
                  <ScreenSizeInput
                    label="Front (mm)"
                    value={draft.frontMM}
                    onChange={(value) => patch({ frontMM: value })}
                    draft={draft}
                  />
                  <ScreenSizeInput
                    label="Return (mm)"
                    value={draft.returnMM}
                    onChange={(value) => patch({ returnMM: value })}
                    draft={draft}
                  />
                </div>
                <FrontReturnStockNotice draft={draft} />
                <SliderWidthNotice draft={draft} />
              </>
            )}

            {draft.type === "Front Only" && (
              <>
                <FrontOnlySizeModeField draft={draft} onChange={patch} />
                {foConfigured && draft.type === "Front Only" && (
                  <>
                    <ChipRow label="Style">
                      <ChoiceChip
                        selected={draft.frontOnlyStyle === "panelDoor"}
                        onClick={() => patch({ frontOnlyStyle: "panelDoor" })}
                      >
                        Panel + door
                      </ChoiceChip>
                      <ChoiceChip
                        selected={draft.frontOnlyStyle === "panelDoorPanel"}
                        onClick={() =>
                          patch(
                            syncFrontOnlyRightPanel(draft, {
                              frontOnlyStyle: "panelDoorPanel",
                            })
                          )
                        }
                      >
                        Panel + door + panel
                      </ChoiceChip>
                    </ChipRow>
                    {draft.frontOnlyStyle === "panelDoor" && (
                      <>
                        <ChipRow label="Fixed panel side">
                          {SIDES.map((opt) => (
                            <ChoiceChip
                              key={opt.value}
                              selected={draft.panelSide === opt.value}
                              onClick={() => patch({ panelSide: opt.value })}
                            >
                              {opt.label}
                            </ChoiceChip>
                          ))}
                        </ChipRow>
                        {draft.frontOnlySizeMode !== "oversize" && (
                          <ScreenSizeInput
                            label="Sheet to sheet (mm)"
                            value={draft.w2wMM}
                            onChange={(value) => patch({ w2wMM: value })}
                            draft={draft}
                            min={
                              draft.isSliding
                                ? SLIDER.panelDoor.min
                                : frontOnlyMinOpening("panelDoor", draft.doorMM)
                            }
                          />
                        )}
                        {draft.frontOnlySizeMode === "oversize" && (
                          <p className="text-xs text-slate-500">
                            Layout uses rough sheet-to-sheet{" "}
                            <strong>
                              {frontOnlyEffectiveW2w(draft) || "—"}mm
                            </strong>{" "}
                            from above.
                          </p>
                        )}
                        <FrontOnlyMinimumNotice draft={draft} />
                        <SliderWidthNotice draft={draft} />
                      </>
                    )}
                    {draft.frontOnlyStyle === "panelDoorPanel" && (
                      <LinkedPanelField draft={draft} onChange={patch} />
                    )}
                  </>
                )}
              </>
            )}

            {draft.type === "Splayed" && (
              <>
                {draft.customSize ? (
                  <div className="grid grid-cols-2 gap-3">
                    <ScreenSizeInput
                      label="Wall A (internal)"
                      value={draft.wallA}
                      onChange={(value) => patch({ wallA: value })}
                      draft={draft}
                    />
                    <ScreenSizeInput
                      label="Wall B (internal)"
                      value={draft.wallB}
                      onChange={(value) => patch({ wallB: value })}
                      draft={draft}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField
                      label="Wall A (internal)"
                      value={draft.wallA}
                      onChange={(e) => patch({ wallA: e.target.value })}
                    >
                      {SPLAYED_SIZES.map((s) => (
                        <option key={s.label} value={String(s.internal)}>
                          {s.internal} mm → cut {s.cut}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Wall B (internal)"
                      value={draft.wallB}
                      onChange={(e) => patch({ wallB: e.target.value })}
                    >
                      {SPLAYED_SIZES.map((s) => (
                        <option key={s.label} value={String(s.internal)}>
                          {s.internal} mm → cut {s.cut}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                )}
              </>
            )}

            {draft.type === "Fixed Panel" && (
              <>
                <RadiusCornerToggle draft={draft} onChange={patch} />
                <ChipRow label="Fixed style" columns={3}>
                  {FIXED_STYLES.map((opt) => (
                    <ChoiceChip
                      key={opt.value}
                      selected={draft.fixedStyle === opt.value}
                      onClick={() => patch({ fixedStyle: opt.value })}
                      className="px-2 text-xs sm:text-sm"
                    >
                      {opt.label}
                    </ChoiceChip>
                  ))}
                </ChipRow>
                {draft.fixedStyle === "single" && (
                  <>
                    <ChipRow label="Panel side">
                      {SIDES.map((opt) => (
                        <ChoiceChip
                          key={opt.value}
                          selected={draft.panelSide === opt.value}
                          onClick={() => patch({ panelSide: opt.value })}
                        >
                          {opt.label}
                        </ChoiceChip>
                      ))}
                    </ChipRow>
                    <ScreenSizeInput
                      label="Wall to wall (mm)"
                      value={draft.w2wMM}
                      onChange={(value) => patch({ w2wMM: value })}
                      draft={draft}
                    />
                    {draft.isRadiusCorner ? (
                      <RadiusCornerPanelSizeField
                        label="Panel width"
                        value={draft.panelMM}
                        onChange={(value) => patch({ panelMM: value })}
                      />
                    ) : draft.customSize ? (
                      <ScreenSizeInput
                        label="Panel width (mm)"
                        value={draft.panelMM}
                        onChange={(value) => patch({ panelMM: value })}
                        draft={draft}
                      />
                    ) : (
                      <StockPanelPicker
                        label="Stock panel"
                        value={draft.panelMM}
                        onChange={(value) => patch({ panelMM: value })}
                      />
                    )}
                    <FixedPanelStockNotice draft={draft} />
                    <WalkthroughWarning
                      w2wMM={Number(draft.w2wMM) || 0}
                      panelSizes={[Number(draft.panelMM) || 0]}
                    />
                  </>
                )}
                {draft.fixedStyle === "double" && (
                  <>
                    <ScreenSizeInput
                      label="Wall to wall (mm)"
                      value={draft.w2wMM}
                      onChange={(value) => patch({ w2wMM: value })}
                      draft={draft}
                    />
                    {draft.isRadiusCorner ? (
                      <div className="space-y-3">
                        <RadiusCornerPanelSizeField
                          label="Left panel"
                          value={draft.leftFixedPanelMM}
                          onChange={(value) =>
                            patch({ leftFixedPanelMM: value })
                          }
                        />
                        <RadiusCornerPanelSizeField
                          label="Right panel"
                          value={draft.rightFixedPanelMM}
                          onChange={(value) =>
                            patch({ rightFixedPanelMM: value })
                          }
                        />
                      </div>
                    ) : draft.customSize ? (
                      <div className="grid grid-cols-2 gap-3">
                        <ScreenSizeInput
                          label="Left panel (mm)"
                          value={draft.leftFixedPanelMM}
                          onChange={(value) =>
                            patch({ leftFixedPanelMM: value })
                          }
                          draft={draft}
                        />
                        <ScreenSizeInput
                          label="Right panel (mm)"
                          value={draft.rightFixedPanelMM}
                          onChange={(value) =>
                            patch({ rightFixedPanelMM: value })
                          }
                          draft={draft}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <StockPanelPicker
                          label="Left stock panel"
                          value={draft.leftFixedPanelMM}
                          onChange={(value) =>
                            patch({ leftFixedPanelMM: value })
                          }
                        />
                        <StockPanelPicker
                          label="Right stock panel"
                          value={draft.rightFixedPanelMM}
                          onChange={(value) =>
                            patch({ rightFixedPanelMM: value })
                          }
                        />
                      </div>
                    )}
                    <FixedPanelStockNotice draft={draft} />
                    <WalkthroughWarning
                      w2wMM={Number(draft.w2wMM) || 0}
                      panelSizes={[
                        Number(draft.leftFixedPanelMM) || 0,
                        Number(draft.rightFixedPanelMM) || 0,
                      ]}
                    />
                  </>
                )}
                {draft.fixedStyle === "panelReturn" && (
                  <>
                    <FixedPanelReturnStyleField
                      draft={draft}
                      onChange={(fixedPanelReturnStyle) =>
                        patch({ fixedPanelReturnStyle })
                      }
                    />
                    <ChipRow label="Return side">
                      {RETURN_SIDES.map((opt) => (
                        <ChoiceChip
                          key={opt.value}
                          selected={draft.returnSide === opt.value}
                          onClick={() => patch({ returnSide: opt.value })}
                        >
                          {opt.label}
                        </ChoiceChip>
                      ))}
                    </ChipRow>
                    {draft.isRadiusCorner ? (
                      <RadiusCornerPanelSizeField
                        label={
                          draft.fixedPanelReturnStyle === "inlineWalkthrough"
                            ? "Return panel"
                            : "Return"
                        }
                        value={draft.returnMM}
                        onChange={(value) => patch({ returnMM: value })}
                      />
                    ) : draft.customSize ? (
                      <ScreenSizeInput
                        label={
                          draft.fixedPanelReturnStyle === "inlineWalkthrough"
                            ? "Return panel (mm)"
                            : "Return (mm)"
                        }
                        value={draft.returnMM}
                        onChange={(value) => patch({ returnMM: value })}
                        draft={draft}
                      />
                    ) : (
                      <StockPanelPicker
                        label="Return stock panel"
                        value={draft.returnMM}
                        onChange={(value) => patch({ returnMM: value })}
                      />
                    )}
                    {draft.fixedPanelReturnStyle === "inlineWalkthrough" ? (
                      <>
                        <ScreenSizeInput
                          label="Front total (mm)"
                          value={draft.frontMM}
                          onChange={(value) => patch({ frontMM: value })}
                          draft={draft}
                        />
                        {draft.isRadiusCorner ? (
                          <RadiusCornerPanelSizeField
                            label="Inline panel"
                            value={draft.panelMM}
                            onChange={(value) => patch({ panelMM: value })}
                          />
                        ) : draft.customSize ? (
                          <ScreenSizeInput
                            label="Inline panel (mm)"
                            value={draft.panelMM}
                            onChange={(value) => patch({ panelMM: value })}
                            draft={draft}
                          />
                        ) : (
                          <StockPanelPicker
                            label="Inline stock panel"
                            value={draft.panelMM}
                            onChange={(value) => patch({ panelMM: value })}
                          />
                        )}
                        <FixedPanelStockNotice draft={draft} />
                        <WalkthroughWarning
                          w2wMM={Number(draft.frontMM) || 0}
                          panelSizes={[Number(draft.panelMM) || 0]}
                        />
                      </>
                    ) : draft.isRadiusCorner ? (
                      <>
                        <RadiusCornerPanelSizeField
                          label="Panel in return"
                          value={draft.panelMM}
                          onChange={(value) => patch({ panelMM: value })}
                        />
                        <FixedPanelStockNotice draft={draft} />
                      </>
                    ) : draft.customSize ? (
                      <>
                        <ScreenSizeInput
                          label="Panel in return (mm)"
                          value={draft.panelMM}
                          onChange={(value) => patch({ panelMM: value })}
                          draft={draft}
                        />
                        <FixedPanelStockNotice draft={draft} />
                      </>
                    ) : (
                      <>
                        <StockPanelPicker
                          label="Stock panel in return"
                          value={draft.panelMM}
                          onChange={(value) => patch({ panelMM: value })}
                        />
                        <FixedPanelStockNotice draft={draft} />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </FieldSection>

          <FieldSection title="Finish">
            <ChipRow label="Angle height" columns={3}>
              {ANGLE_HEIGHTS.map((h) => (
                <ChoiceChip
                  key={h}
                  selected={draft.angleHeight === h}
                  onClick={() => patch({ angleHeight: h as AngleHeight })}
                >
                  {h} mm
                </ChoiceChip>
              ))}
            </ChipRow>
          </FieldSection>

          {showDoor && foConfigured && (
            <FieldSection title="Door">
              <ChipRow label="Door type">
                <ChoiceChip
                  selected={!draft.isSliding}
                  onClick={() => patch({ isSliding: false, hingeSide: "" })}
                >
                  Pivot
                </ChoiceChip>
                <ChoiceChip
                  selected={draft.isSliding}
                  onClick={() =>
                    patch({
                      isSliding: true,
                      hingeSide: "",
                      colour:
                        draft.colour === "Brushed Brass"
                          ? "Chrome"
                          : draft.colour,
                    })
                  }
                >
                  Sliding
                </ChoiceChip>
              </ChipRow>
              {draft.isSliding && (
                <>
                  <Notice variant="info">
                    Sliding door size selected by HSSS based on opening
                  </Notice>
                  <p className="text-sm font-medium text-amber-700">
                    Sliding door adds +{formatMoney(applyRetailMarkup(150))}
                  </p>
                  <SliderWidthNotice draft={draft} />
                </>
              )}
              {!draft.isSliding && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <ChipRow label="Door width">
                    {(["662", "762"] as const).map((w) => (
                      <ChoiceChip
                        key={w}
                        selected={draft.doorMM === w}
                        onClick={() =>
                          patch(syncFrontOnlyRightPanel(draft, { doorMM: w }))
                        }
                      >
                        {w} mm
                        {w === "762"
                          ? ` (+${formatMoney(applyRetailMarkup(100))})`
                          : ""}
                      </ChoiceChip>
                    ))}
                  </ChipRow>
                  {draft.doorMM === "762" && (
                    <p className="text-sm font-medium text-amber-700">
                      Wide door (762mm) adds +
                      {formatMoney(applyRetailMarkup(100))}
                    </p>
                  )}
                  <HingeSideField
                    draft={draft}
                    onChange={(hingeSide) => patch({ hingeSide })}
                  />
                </div>
              )}
            </FieldSection>
          )}

          {draft.type === "Splayed" && (
            <FieldSection title="Door" description="Fixed 662 mm">
              <HingeSideField
                draft={draft}
                onChange={(hingeSide) => patch({ hingeSide })}
              />
            </FieldSection>
          )}
        </Card>

        <div className="order-1 sticky top-14 z-30 mb-4 w-full min-w-0 self-stretch rounded-2xl bg-white/98 p-4 shadow-[var(--shadow-elevated)] backdrop-blur-md md:top-20 md:order-none md:z-auto md:mb-0 md:w-auto md:self-start md:bg-slate-50/40 md:shadow-none md:backdrop-blur-none">
          <ScreenDiagram
            type={draft.type}
            frontOnlyStyle={draft.frontOnlyStyle || "panelDoor"}
            fixedStyle={draft.fixedStyle}
            fixedPanelReturnStyle={draft.fixedPanelReturnStyle}
            returnSide={draft.returnSide}
            panelSide={draft.panelSide}
            isSliding={draft.isSliding}
            hingeSide={draft.hingeSide}
            angleHeight={draft.angleHeight || undefined}
            frontMM={draft.frontMM}
            returnMM={draft.returnMM}
            w2wMM={
              draft.type === "Front Only" &&
              draft.frontOnlySizeMode === "oversize"
                ? draft.roughW2wMM
                : draft.w2wMM
            }
            leftPanelMM={draft.leftPanelMM}
            rightPanelMM={draft.rightPanelMM}
            leftFixedPanelMM={draft.leftFixedPanelMM}
            rightFixedPanelMM={draft.rightFixedPanelMM}
            panelMM={draft.panelMM}
            doorMM={draft.doorMM}
            wallA={draft.wallA}
            wallB={draft.wallB}
            className="w-full [&_svg]:max-w-full"
          />
        </div>
      </div>

      <Card className="border-navy/10 bg-gradient-to-br from-white to-cyan-soft/40">
        <ScreenPriceTotal
          draft={draft}
          preview={preview}
          size="lg"
          label="Supply price"
          variant="embedded"
        />
      </Card>

      {error && <Notice variant="error">{error}</Notice>}

      <Button
        type="button"
        full
        size="lg"
        disabled={loading || !preview}
        onClick={openSendDialog}
      >
        {SEND_DESIGN_LABEL}
      </Button>

      <SendDetailsDialog
        open={dialogOpen}
        initial={contact}
        loading={loading}
        error={dialogError}
        onCancel={() => {
          if (!loading) setDialogOpen(false);
        }}
        onConfirm={confirmSend}
      />
    </div>
  );
}
