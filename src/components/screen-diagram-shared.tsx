import type { FixedStyle, HingeSide, Side } from "@/lib/constants";
import { splayedCutForInternal } from "@/lib/constants";
import type { FrontOnlyStyle, ScreenType } from "@/lib/orders";
import { returnPanelFromHob } from "@/lib/stock-panels";
import type { ReactNode } from "react";

const C = {
  wall: "#6B7280",
  glass: "#2563EB",
  door: "#0EA5E9",
  hinge: "#1E3A8A",
  measure: "#EA580C",
  walk: "#C2410C",
  label: "#1E40AF",
  muted: "#64748B",
  bg: "#F8FAFC",
  corner: "#94A3B8",
};

function WallH({ x, y, w }: Readonly<{ x: number; y: number; w: number }>) {
  return <rect x={x} y={y} width={w} height={10} fill={C.wall} rx={1} />;
}

function WallV({ x, y, h }: Readonly<{ x: number; y: number; h: number }>) {
  return <rect x={x} y={y} width={10} height={h} fill={C.wall} rx={1} />;
}

/** Thin glass as a stroked line (true plan view). */
function GlassLine({
  x1,
  y1,
  x2,
  y2,
  door = false,
}: Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  door?: boolean;
}>) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={door ? C.door : C.glass}
      strokeWidth={door ? 5 : 4}
      strokeLinecap="square"
    />
  );
}

function Hinge({ cx, cy }: Readonly<{ cx: number; cy: number }>) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={C.hinge} />
      <circle cx={cx} cy={cy} r={2.5} fill="white" />
    </g>
  );
}

function Corner90({
  cx,
  cy,
  interior,
  size = 10,
}: Readonly<{
  cx: number;
  cy: number;
  interior: "ne" | "nw" | "se" | "sw";
  size?: number;
}>) {
  const toE = interior === "ne" || interior === "se";
  const toS = interior === "se" || interior === "sw";
  const x = toE ? cx : cx - size;
  const y = toS ? cy : cy - size;
  const labelX = toE ? cx + size + 3 : cx - size - 3;
  const labelY = toS ? cy + size - 1 : cy - size + 8;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill="none"
        stroke={C.corner}
        strokeWidth={1.35}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={toE ? "start" : "end"}
        fontSize={8}
        fill={C.muted}
        fontWeight={600}
      >
        90°
      </text>
    </g>
  );
}

function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical = false,
  labelNudge = 0,
}: Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  vertical?: boolean;
  labelNudge?: number;
}>) {
  const mx = (x1 + x2) / 2 + (vertical ? labelNudge : 0);
  const my = (y1 + y2) / 2 + (vertical ? 0 : labelNudge);
  const gap = Math.max(label.length * 5.5, 28);
  return (
    <g>
      {vertical ? (
        <>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={my - gap / 2}
            stroke={C.measure}
            strokeWidth={1.25}
            strokeDasharray="4 3"
            markerStart="url(#arrow)"
          />
          <line
            x1={x1}
            y1={my + gap / 2}
            x2={x2}
            y2={y2}
            stroke={C.measure}
            strokeWidth={1.25}
            strokeDasharray="4 3"
            markerEnd="url(#arrow)"
          />
        </>
      ) : (
        <>
          <line
            x1={x1}
            y1={y1}
            x2={mx - gap / 2}
            y2={y2}
            stroke={C.measure}
            strokeWidth={1.25}
            strokeDasharray="4 3"
            markerStart="url(#arrow)"
          />
          <line
            x1={mx + gap / 2}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={C.measure}
            strokeWidth={1.25}
            strokeDasharray="4 3"
            markerEnd="url(#arrow)"
          />
        </>
      )}
      <rect
        x={vertical ? mx - 18 : mx - gap / 2}
        y={vertical ? my - gap / 2 : my - 12}
        width={vertical ? 36 : gap}
        height={vertical ? gap : 14}
        fill={C.bg}
      />
      <text
        x={mx}
        y={vertical ? my + 3 : my - 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill={C.measure}
        transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

function WalkBox({
  x,
  y,
  w,
  h = 18,
}: Readonly<{ x: number; y: number; w: number; h?: number }>) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={C.walk}
        strokeWidth={1.5}
        strokeDasharray="5 3"
        rx={2}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 3.5}
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fill={C.walk}
      >
        Walk
      </text>
    </g>
  );
}

function Label({
  x,
  y,
  children,
  rotate,
}: Readonly<{
  x: number;
  y: number;
  children: string;
  rotate?: number;
}>) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={9}
      fontWeight={700}
      fill={C.label}
      transform={rotate != null ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}

function SwingFromCorner({
  cornerX,
  cornerY,
  hingeSide,
  maxR = 48,
}: Readonly<{
  cornerX: number;
  cornerY: number;
  hingeSide: HingeSide;
  maxR?: number;
}>) {
  const r = Math.min(maxR, 44);
  if (hingeSide === "left") {
    return (
      <path
        d={`M ${cornerX + r} ${cornerY} A ${r} ${r} 0 0 1 ${cornerX} ${cornerY + r}`}
        fill="none"
        stroke={C.hinge}
        strokeWidth={1.75}
        strokeDasharray="5 3.5"
        strokeLinecap="round"
      />
    );
  }
  return (
    <path
      d={`M ${cornerX - r} ${cornerY} A ${r} ${r} 0 0 0 ${cornerX} ${cornerY + r}`}
      fill="none"
      stroke={C.hinge}
      strokeWidth={1.75}
      strokeDasharray="5 3.5"
      strokeLinecap="round"
    />
  );
}

const FO = {
  wall: "#334155",
  track: "#00386E",
  fixedFill: "rgba(0, 174, 239, 0.12)",
  fixedStroke: "rgba(0, 174, 239, 0.5)",
  doorFill: "rgba(0, 174, 239, 0.22)",
  doorStroke: "#00AEEF",
  labelFixed: "#5A7D9E",
  labelDoor: "#00AEEF",
  measure: "#F59E0B",
  watermark: "rgba(0, 174, 239, 0.15)",
} as const;

function FrontOnlyGlassBar({
  x,
  y,
  w,
  variant,
  label,
}: Readonly<{
  x: number;
  y: number;
  w: number;
  variant: "fixed" | "door";
  label: string;
}>) {
  const h = 8;
  const isDoor = variant === "door";
  if (w <= 0) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={isDoor ? FO.doorFill : FO.fixedFill}
        stroke={isDoor ? FO.doorStroke : FO.fixedStroke}
        strokeWidth={isDoor ? 2 : 1.5}
        rx={1}
      />
      {w >= 28 && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isDoor ? FO.labelDoor : FO.labelFixed}
          fontSize={isDoor ? 8 : 7}
          fontWeight={600}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function resolveHorizontalHinge(
  hingeSide: HingeSide | "",
  doorLeft: number,
  doorRight: number
) {
  const hingeOnRight = hingeSide === "right";
  return {
    hingeX: hingeOnRight ? doorRight : doorLeft,
    freeX: hingeOnRight ? doorLeft : doorRight,
    hingeOnRight,
  };
}

function resolveSplayedHinge(
  hingeSide: HingeSide | "",
  doorStart: { x: number; y: number },
  doorEnd: { x: number; y: number },
  doorPoly: [number, number][]
) {
  const hingeOnRight = hingeSide === "right";
  const lhsEdgeMid = {
    x: (doorStart.x + doorPoly[3]![0]!) / 2,
    y: (doorStart.y + doorPoly[3]![1]!) / 2,
  };
  const rhsEdgeMid = {
    x: (doorEnd.x + doorPoly[2]![0]!) / 2,
    y: (doorEnd.y + doorPoly[2]![1]!) / 2,
  };
  const hinge = hingeOnRight ? rhsEdgeMid : lhsEdgeMid;
  const free = hingeOnRight ? doorStart : doorEnd;
  return {
    hingeX: hinge.x,
    hingeY: hinge.y,
    freeX: free.x,
    freeY: free.y,
    hingeOnRight,
  };
}

function FrontOnlyDualSwing({
  freeX,
  freeY,
  hingeX,
  doorWPx,
  hingeOnRight,
}: Readonly<{
  freeX: number;
  freeY: number;
  hingeX: number;
  doorWPx: number;
  hingeOnRight: boolean;
}>) {
  const r = doorWPx;
  const sweepUp = hingeOnRight ? 1 : 0;
  const sweepDown = hingeOnRight ? 0 : 1;
  return (
    <>
      <path
        d={`M ${freeX} ${freeY} A ${r} ${r} 0 0 ${sweepUp} ${hingeX} ${freeY - r}`}
        fill="none"
        stroke={FO.doorStroke}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      <path
        d={`M ${freeX} ${freeY} A ${r} ${r} 0 0 ${sweepDown} ${hingeX} ${freeY + r}`}
        fill="none"
        stroke={FO.doorStroke}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.35}
      />
    </>
  );
}

function SplayedCardinalSwing({
  freeX,
  freeY,
  radius,
  hingeOnRight,
}: Readonly<{
  freeX: number;
  freeY: number;
  radius: number;
  hingeOnRight: boolean;
}>) {
  const r = radius;
  const span = r * Math.SQRT2;
  if (hingeOnRight) {
    return (
      <>
        <path
          d={`M ${freeX} ${freeY} A ${r} ${r} 0 0 0 ${freeX} ${freeY + span}`}
          fill="none"
          stroke={FO.doorStroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.5}
        />
        <path
          d={`M ${freeX} ${freeY} A ${r} ${r} 0 0 1 ${freeX + span} ${freeY}`}
          fill="none"
          stroke={FO.doorStroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.35}
        />
      </>
    );
  }
  return (
    <>
      <path
        d={`M ${freeX} ${freeY} A ${r} ${r} 0 0 1 ${freeX - span} ${freeY}`}
        fill="none"
        stroke={FO.doorStroke}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      <path
        d={`M ${freeX} ${freeY} A ${r} ${r} 0 0 0 ${freeX} ${freeY - span}`}
        fill="none"
        stroke={FO.doorStroke}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.35}
      />
    </>
  );
}

function FrontOnlyHinge({ cx, cy }: Readonly<{ cx: number; cy: number }>) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={FO.doorStroke}
      stroke="#FFFFFF"
      strokeWidth={1.5}
    />
  );
}

function FrontOnlySheetDim({
  x1,
  x2,
  y,
  label,
}: Readonly<{
  x1: number;
  x2: number;
  y: number;
  label: string;
}>) {
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={FO.measure}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <line
        x1={x1}
        y1={y - 5}
        x2={x1}
        y2={y + 5}
        stroke={FO.measure}
        strokeWidth={1.5}
      />
      <line
        x1={x2}
        y1={y - 5}
        x2={x2}
        y2={y + 5}
        stroke={FO.measure}
        strokeWidth={1.5}
      />
      <text
        x={mx}
        y={y + 13}
        textAnchor="middle"
        fill={FO.measure}
        fontSize={9}
        fontWeight={600}
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

function FrontReturnVerticalBar({
  x,
  y,
  h,
  label,
}: Readonly<{ x: number; y: number; h: number; label: string }>) {
  const w = 8;
  if (h <= 0) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={FO.fixedFill}
        stroke={FO.fixedStroke}
        strokeWidth={1.5}
        rx={1}
      />
      {h >= 36 && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={FO.labelFixed}
          fontSize={8}
          fontWeight={600}
          transform={`rotate(90, ${x + w / 2}, ${y + h / 2})`}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function FrontReturnVerticalDim({
  y1,
  y2,
  x,
  label,
  labelSide = "right",
}: Readonly<{
  y1: number;
  y2: number;
  x: number;
  label: string;
  labelSide?: "left" | "right";
}>) {
  const my = (y1 + y2) / 2;
  const labelX = labelSide === "left" ? x - 10 : x + 10;
  return (
    <g>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={FO.measure}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <line
        x1={x - 5}
        y1={y1}
        x2={x + 5}
        y2={y1}
        stroke={FO.measure}
        strokeWidth={1.5}
      />
      <line
        x1={x - 5}
        y1={y2}
        x2={x + 5}
        y2={y2}
        stroke={FO.measure}
        strokeWidth={1.5}
      />
      <text
        x={labelX}
        y={my}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={FO.measure}
        fontSize={9}
        fontWeight={600}
        fontFamily="Arial, Helvetica, sans-serif"
        transform={`rotate(90, ${labelX}, ${my})`}
      >
        {label}
      </text>
    </g>
  );
}

function FrontReturnCorner90({
  x,
  y,
  labelSide,
}: Readonly<{ x: number; y: number; labelSide: "left" | "right" }>) {
  const size = 10;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill="none"
        stroke="#64748B"
        strokeWidth={1.2}
        opacity={0.65}
      />
      <text
        x={labelSide === "left" ? x - 7 : x + size + 7}
        y={y + 3}
        textAnchor={labelSide === "left" ? "end" : "start"}
        fill="#64748B"
        fontSize={10}
        fontWeight={600}
        opacity={0.85}
      >
        90°
      </text>
    </g>
  );
}

function FrontReturnPlan({
  returnSide,
  hingeSide,
  isSliding,
  frontN,
  returnN,
  doorN,
}: Readonly<{
  returnSide: Side;
  hingeSide: HingeSide | "";
  isSliding: boolean;
  frontN: number;
  returnN: number;
  doorN: number;
}>) {
  const isRh = returnSide === "right";
  const VB_W = 211;
  const mirrorRectX = (x: number, w: number) => VB_W - x - w;

  const TOP_Y = 45;
  const TOP_X1 = 50;
  const TOP_X2 = 186;
  const OPEN_WALL_X = 55;
  const OPEN_WALL_Y1 = 40;
  const OPEN_WALL_Y2 = 171;
  const openWallLength = OPEN_WALL_Y2 - OPEN_WALL_Y1;
  /** LH: extend top wall left past the return panel (mirrors RH open-side overhang). */
  const topX1 = isRh ? TOP_X1 : VB_W - TOP_X2;
  const topX2 = isRh ? topX1 + openWallLength : TOP_X2 - 25;

  const FRONT_INNER_L = 58;
  const FRONT_INNER_R = 163;
  const FRONT_RUN = FRONT_INNER_R - FRONT_INNER_L;
  const BAR_Y = 148;
  const BAR_CY = 152;
  const GAP = 0;

  const FRONT_TRACK_Y = 158;
  const FRONT_TRACK_W = 100;

  const RETURN_X = 163;
  const RETURN_W = 8;
  const RETURN_TOP = 48;
  // Keep return panel length fixed so changing returnMM only updates the label.
  const RETURN_H = 108;
  const RETURN_BOTTOM = RETURN_TOP + RETURN_H;

  const RETURN_TRACK_X = 173;
  const RETURN_TRACK_W = 4;

  const CORNER_X = 152;
  const CORNER_Y = 137;

  const DIM_FRONT_Y = 178;
  const DIM_FRONT_X1 = 55;
  const DIM_FRONT_X2 = 163;

  const DIM_RETURN_X = 189;
  const DIM_RETURN_Y1 = TOP_Y;
  const DIM_RETURN_Y2 = RETURN_BOTTOM;

  // Keep door/fixed proportions fixed against a reference front so changing
  // frontMM only updates the dimension label (door doesn't shrink/grow).
  // Door width still tracks 662 vs 762 relative to that reference.
  const REF_FRONT = 900;
  const doorW = Math.min(
    FRONT_RUN,
    (doorN / REF_FRONT) * FRONT_RUN
  );
  const fixedW = Math.max(FRONT_RUN - doorW, 0);

  const mirrorBarX = (x: number, w: number) =>
    isRh ? x : VB_W - x - w;
  const mirrorPointX = (x: number) => (isRh ? x : VB_W - x);

  // RH layout: Fixed (open side) | Door (next to return) | Return.
  // LH uses the same layout then mirrors → Return | Door | Fixed,
  // so the door still sits against the return and hinges off the little panel.
  const rhFixedX = FRONT_INNER_L;
  const rhDoorX = FRONT_INNER_L + fixedW + GAP;

  const fixedX = mirrorBarX(rhFixedX, fixedW);
  const doorX = mirrorBarX(rhDoorX, doorW);
  const doorLeft = Math.min(doorX, doorX + doorW);
  const doorRight = Math.max(doorX, doorX + doorW);
  const { hingeX, freeX, hingeOnRight } = resolveHorizontalHinge(
    hingeSide,
    doorLeft,
    doorRight
  );

  const rhReturnX = RETURN_X;
  const lhReturnX = mirrorRectX(RETURN_X, RETURN_W);
  const returnBarX = isRh ? rhReturnX : lhReturnX;

  const rhReturnTrackX = RETURN_TRACK_X;
  const lhReturnTrackX = mirrorRectX(RETURN_TRACK_X, RETURN_TRACK_W);
  const returnTrackX = isRh ? rhReturnTrackX : lhReturnTrackX;

  const rhCornerX = CORNER_X;
  const lhCornerX = mirrorRectX(CORNER_X, 10);
  const cornerX = isRh ? rhCornerX : lhCornerX;

  const rhOpenWallX = OPEN_WALL_X;
  const lhOpenWallX = VB_W - OPEN_WALL_X;
  const openWallX = isRh ? rhOpenWallX : lhOpenWallX;

  const rhFrontTrackX = FRONT_INNER_L;
  const lhFrontTrackX = mirrorRectX(FRONT_INNER_L, FRONT_TRACK_W);
  const frontTrackX = isRh ? rhFrontTrackX : lhFrontTrackX;

  const rhDimFrontX1 = DIM_FRONT_X1;
  const rhDimFrontX2 = DIM_FRONT_X2;
  const dimFrontX1 = mirrorPointX(rhDimFrontX2);
  const dimFrontX2 = mirrorPointX(rhDimFrontX1);
  const dimReturnX = mirrorPointX(DIM_RETURN_X);

  const watermark = isRh ? "RH" : "LH";

  // Include dimension label overhang (front text below, return text beside).
  const contentX = Math.min(topX1, TOP_X1, dimReturnX - 16, dimFrontX1) - 4;
  const contentY = OPEN_WALL_Y1 - 4;
  const contentW =
    Math.max(dimReturnX + 28, DIM_FRONT_X2, dimFrontX1, dimFrontX2) +
    8 -
    contentX;
  const contentH = DIM_FRONT_Y + 28 - contentY;
  const viewW = 320;
  const viewH = 248;
  const fill = 0.9;
  const scale = fill * Math.min(viewW / contentW, viewH / contentH);
  const tx = (viewW - contentW * scale) / 2 - contentX * scale;
  const ty = (viewH - contentH * scale) / 2 - contentY * scale;

  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      <line
        x1={topX1}
        y1={TOP_Y}
        x2={topX2}
        y2={TOP_Y}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={openWallX}
        y1={OPEN_WALL_Y1}
        x2={openWallX}
        y2={OPEN_WALL_Y2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <rect
        x={frontTrackX}
        y={FRONT_TRACK_Y}
        width={FRONT_TRACK_W}
        height={4}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      <rect
        x={returnTrackX}
        y={RETURN_TOP}
        width={RETURN_TRACK_W}
        height={RETURN_H}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      {fixedW > 0 && (
        <FrontOnlyGlassBar
          x={fixedX}
          y={BAR_Y}
          w={fixedW}
          variant="fixed"
          label="Fixed"
        />
      )}
      {doorW > 0 && (
        <FrontOnlyGlassBar
          x={doorX}
          y={BAR_Y}
          w={doorW}
          variant="door"
          label="Door"
        />
      )}
      <FrontReturnVerticalBar
        x={returnBarX}
        y={RETURN_TOP}
        h={RETURN_H}
        label="Return"
      />
      {!isSliding && hingeSide && doorW > 0 && (
        <>
          <FrontOnlyDualSwing
            freeX={freeX}
            freeY={BAR_CY}
            hingeX={hingeX}
            doorWPx={doorW}
            hingeOnRight={hingeOnRight}
          />
          <FrontOnlyHinge cx={hingeX} cy={BAR_CY} />
        </>
      )}
      <FrontReturnCorner90
        x={cornerX}
        y={CORNER_Y}
        labelSide={isRh ? "left" : "right"}
      />
      <text
        x={99}
        y={100.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={FO.watermark}
        fontSize={24}
        fontWeight={800}
      >
        {watermark}
      </text>
      <FrontOnlySheetDim
        x1={dimFrontX1}
        x2={dimFrontX2}
        y={DIM_FRONT_Y}
        label={`${frontN}mm front`}
      />
      <FrontReturnVerticalDim
        y1={DIM_RETURN_Y1}
        y2={DIM_RETURN_Y2}
        x={dimReturnX}
        label={`${returnN}mm return`}
        labelSide={isRh ? "right" : "left"}
      />
    </g>
  );
}

function FrontOnlyPlan({
  frontOnlyStyle,
  panelSide,
  hingeSide,
  isSliding,
  w2wN,
  doorN,
  leftN,
  rightN,
}: Readonly<{
  frontOnlyStyle: FrontOnlyStyle;
  panelSide: Side;
  hingeSide: HingeSide | "";
  isSliding: boolean;
  w2wN: number;
  doorN: number;
  leftN: number;
  rightN: number;
}>) {
  const WALL_L = 50;
  const WALL_R = 194;
  const INNER_L = 53;
  const INNER_R = 191;
  const RUN = INNER_R - INNER_L;
  const BAR_Y = 90;
  const BAR_CY = 94;
  const TRACK_Y = 100;
  const GAP = 2;

  const total =
    frontOnlyStyle === "panelDoorPanel"
      ? leftN + doorN + rightN
      : Math.max(w2wN, 1);

  let segments: Array<{ x: number; w: number; variant: "fixed" | "door"; label: string }> =
    [];

  if (frontOnlyStyle === "panelDoor") {
    const doorW = (doorN / total) * RUN;
    const panelW = RUN - doorW - GAP;
    if (panelSide === "left") {
      segments = [
        { x: INNER_L, w: panelW, variant: "fixed", label: "Fixed Panel" },
        {
          x: INNER_L + panelW + GAP,
          w: doorW,
          variant: "door",
          label: `Door ${doorN}mm`,
        },
      ];
    } else {
      segments = [
        {
          x: INNER_L,
          w: doorW,
          variant: "door",
          label: `Door ${doorN}mm`,
        },
        {
          x: INNER_L + doorW + GAP,
          w: panelW,
          variant: "fixed",
          label: "Fixed Panel",
        },
      ];
    }
  } else {
    const lW = (leftN / total) * RUN;
    const dW = (doorN / total) * RUN;
    const rW = Math.max(RUN - lW - dW, 0);
    segments = [
      { x: INNER_L, w: lW, variant: "fixed", label: `${leftN}mm` },
      { x: INNER_L + lW, w: dW, variant: "door", label: `Door ${doorN}mm` },
      { x: INNER_L + lW + dW, w: rW, variant: "fixed", label: `${rightN}mm` },
    ];
  }

  const doorSeg = segments.find((s) => s.variant === "door");
  const doorLeft = doorSeg?.x ?? INNER_L;
  const doorRight = doorSeg ? doorSeg.x + doorSeg.w : INNER_R;
  const { hingeX, freeX, hingeOnRight } = resolveHorizontalHinge(
    hingeSide,
    doorLeft,
    doorRight
  );
  const doorWPx = doorSeg?.w ?? 0;

  const watermark =
    frontOnlyStyle === "panelDoor"
      ? `PANEL ${panelSide === "left" ? "LHS" : "RHS"}`
      : `${leftN} + ${doorN} + ${rightN}`;

  const contentX = WALL_L;
  const contentY = 30;
  const contentW = WALL_R - WALL_L;
  const contentH = 133 - contentY;
  const viewW = 320;
  const viewH = 248;
  const fill = 0.9;
  const scale = fill * Math.min(viewW / contentW, viewH / contentH);
  const tx = (viewW - contentW * scale) / 2 - contentX * scale;
  const ty = (viewH - contentH * scale) / 2 - contentY * scale;

  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      <line
        x1={WALL_L}
        y1={30}
        x2={WALL_L}
        y2={113}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={WALL_R}
        y1={30}
        x2={WALL_R}
        y2={113}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <rect
        x={INNER_L}
        y={TRACK_Y}
        width={RUN}
        height={4}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      {segments.map((seg) => (
        <FrontOnlyGlassBar
          key={`${seg.variant}-${seg.x}`}
          x={seg.x}
          y={BAR_Y}
          w={seg.w}
          variant={seg.variant}
          label={seg.label}
        />
      ))}
      <text
        x={(WALL_L + WALL_R) / 2}
        y={55}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={FO.watermark}
        fontSize={frontOnlyStyle === "panelDoor" ? 16 : 12}
        fontWeight={800}
      >
        {watermark}
      </text>
      {!isSliding && hingeSide && doorSeg && (
        <>
          <FrontOnlyDualSwing
            freeX={freeX}
            freeY={BAR_CY}
            hingeX={hingeX}
            doorWPx={doorWPx}
            hingeOnRight={hingeOnRight}
          />
          <FrontOnlyHinge cx={hingeX} cy={BAR_CY} />
        </>
      )}
      <FrontOnlySheetDim
        x1={WALL_L}
        x2={WALL_R}
        y={120}
        label={`${w2wN || total}mm (sheet to sheet)`}
      />
    </g>
  );
}

function FixedPanelWalkBox({
  x,
  y,
  w,
  h = 18,
  label = "Walk",
}: Readonly<{ x: number; y: number; w: number; h?: number; label?: string }>) {
  if (w <= 0) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="rgba(245, 158, 11, 0.12)"
        stroke="rgba(245, 158, 11, 0.4)"
        strokeWidth={1}
        strokeDasharray="4 3"
        rx={3}
      />
      {w >= 24 && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#F59E0B"
          fontSize={7}
          fontWeight={600}
          opacity={0.8}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function FixedPanelPanelDim({
  x1,
  x2,
  y,
  label,
}: Readonly<{ x1: number; x2: number; y: number; label: string }>) {
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke="#00AEEF"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <line
        x1={x1}
        y1={y - 5}
        x2={x1}
        y2={y + 5}
        stroke="#00AEEF"
        strokeWidth={1.5}
      />
      <line
        x1={x2}
        y1={y - 5}
        x2={x2}
        y2={y + 5}
        stroke="#00AEEF"
        strokeWidth={1.5}
      />
      <text
        x={mx}
        y={y - 8}
        textAnchor="middle"
        fill="#00AEEF"
        fontSize={9}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function fixedPanelDiagramTransform(
  contentX: number,
  contentY: number,
  contentW: number,
  contentH: number
) {
  const viewW = 320;
  const viewH = 248;
  const fill = 0.9;
  const scale = fill * Math.min(viewW / contentW, viewH / contentH);
  const tx = (viewW - contentW * scale) / 2 - contentX * scale;
  const ty = (viewH - contentH * scale) / 2 - contentY * scale;
  return { scale, tx, ty };
}

function FixedPanelSinglePlan({
  panelSide,
  panelN,
  w2wN,
}: Readonly<{
  panelSide: Side;
  panelN: number;
  w2wN: number;
}>) {
  const WALL_L = 50;
  const WALL_R = 218;
  const WALL_Y1 = 30;
  const WALL_Y2 = 118;
  const INNER_L = 53;
  const RUN = 165;
  const BAR_Y = 90;
  const TRACK_Y = 100;
  const GAP = 4;
  const WALK_Y = 85;
  const PANEL_DIM_Y = 70;
  const W2W_DIM_Y = 123;
  const WATERMARK_Y = 55;

  const panelW = (panelN / Math.max(w2wN, 1)) * RUN;
  const walkW = Math.max(RUN - panelW - GAP, 12);
  const panelX =
    panelSide === "left" ? INNER_L : INNER_L + walkW + GAP;
  const walkX = panelSide === "left" ? INNER_L + panelW + GAP : INNER_L;
  const watermark = panelSide === "left" ? "PANEL LHS" : "PANEL RHS";

  const contentX = WALL_L;
  const contentY = WALL_Y1;
  const contentW = WALL_R - WALL_L;
  const contentH = W2W_DIM_Y + 20 - WALL_Y1;
  const { scale, tx, ty } = fixedPanelDiagramTransform(
    contentX,
    contentY,
    contentW,
    contentH
  );

  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      <line
        x1={WALL_L}
        y1={WALL_Y1}
        x2={WALL_L}
        y2={WALL_Y2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={WALL_R}
        y1={WALL_Y1}
        x2={WALL_R}
        y2={WALL_Y2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <rect
        x={panelX}
        y={TRACK_Y}
        width={panelW}
        height={4}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      <FrontOnlyGlassBar
        x={panelX}
        y={BAR_Y}
        w={panelW}
        variant="fixed"
        label="Fixed"
      />
      <FixedPanelWalkBox x={walkX} y={WALK_Y} w={walkW} />
      <FixedPanelPanelDim
        x1={panelX}
        x2={panelX + panelW}
        y={PANEL_DIM_Y}
        label={`${panelN}mm`}
      />
      <FrontOnlySheetDim
        x1={WALL_L}
        x2={WALL_R}
        y={W2W_DIM_Y}
        label={`${w2wN}mm (wall to wall)`}
      />
      <text
        x={(WALL_L + WALL_R) / 2}
        y={WATERMARK_Y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={FO.watermark}
        fontSize={16}
        fontWeight={800}
      >
        {watermark}
      </text>
    </g>
  );
}

function FixedPanelDoublePlan({
  leftN,
  rightN,
  w2wN,
}: Readonly<{ leftN: number; rightN: number; w2wN: number }>) {
  const WALL_L = 50;
  const WALL_R = 290;
  const WALL_Y1 = 30;
  const WALL_Y2 = 118;
  const INNER_L = 53;
  const INNER_R = 287;
  const RUN = INNER_R - INNER_L;
  const BAR_Y = 90;
  const TRACK_Y = 100;
  const GAP = 4;
  const WALK_Y = 85;
  const PANEL_DIM_Y = 70;
  const W2W_DIM_Y = 123;

  const total = Math.max(w2wN, 1);
  const glassRun = RUN - GAP * 2;
  const leftW = (leftN / total) * glassRun;
  const rightW = (rightN / total) * glassRun;
  const walkW = Math.max(glassRun - leftW - rightW, 12);
  const leftX = INNER_L;
  const walkX = INNER_L + leftW + GAP;
  const rightX = walkX + walkW + GAP;

  const contentX = WALL_L;
  const contentY = WALL_Y1;
  const contentW = WALL_R - WALL_L;
  const contentH = W2W_DIM_Y + 20 - WALL_Y1;
  const { scale, tx, ty } = fixedPanelDiagramTransform(
    contentX,
    contentY,
    contentW,
    contentH
  );

  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      <line
        x1={WALL_L}
        y1={WALL_Y1}
        x2={WALL_L}
        y2={WALL_Y2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={WALL_R}
        y1={WALL_Y1}
        x2={WALL_R}
        y2={WALL_Y2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      {leftW > 0 && (
        <>
          <rect
            x={leftX}
            y={TRACK_Y}
            width={leftW}
            height={4}
            fill={FO.track}
            rx={1}
            opacity={0.6}
          />
          <FrontOnlyGlassBar
            x={leftX}
            y={BAR_Y}
            w={leftW}
            variant="fixed"
            label="Fixed"
          />
          <FixedPanelPanelDim
            x1={leftX}
            x2={leftX + leftW}
            y={PANEL_DIM_Y}
            label={`${leftN}mm`}
          />
        </>
      )}
      <FixedPanelWalkBox x={walkX} y={WALK_Y} w={walkW} />
      {rightW > 0 && (
        <>
          <rect
            x={rightX}
            y={TRACK_Y}
            width={rightW}
            height={4}
            fill={FO.track}
            rx={1}
            opacity={0.6}
          />
          <FrontOnlyGlassBar
            x={rightX}
            y={BAR_Y}
            w={rightW}
            variant="fixed"
            label="Fixed"
          />
          <FixedPanelPanelDim
            x1={rightX}
            x2={rightX + rightW}
            y={PANEL_DIM_Y}
            label={`${rightN}mm`}
          />
        </>
      )}
      <FrontOnlySheetDim
        x1={WALL_L}
        x2={WALL_R}
        y={W2W_DIM_Y}
        label={`${w2wN}mm (wall to wall)`}
      />
    </g>
  );
}

function FixedPanelReturnInfillBar({
  x,
  y,
  h,
}: Readonly<{ x: number; y: number; h: number }>) {
  const w = 8;
  if (h <= 0) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={FO.fixedFill}
        stroke={FO.fixedStroke}
        strokeWidth={1.5}
        rx={1}
      />
      {h >= 36 && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#4FC3F7"
          fontSize={8}
          fontWeight={600}
          transform={`rotate(-90, ${x + w / 2}, ${y + h / 2})`}
        >
          Return
        </text>
      )}
    </g>
  );
}

function FixedPanelCyanVerticalDim({
  y1,
  y2,
  x,
  label,
  labelSide,
}: Readonly<{
  y1: number;
  y2: number;
  x: number;
  label: string;
  labelSide: "left" | "right";
}>) {
  const my = (y1 + y2) / 2;
  const labelX = labelSide === "left" ? x - 10 : x + 10;
  return (
    <g>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke="#00AEEF"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <line
        x1={x - 5}
        y1={y1}
        x2={x + 5}
        y2={y1}
        stroke="#00AEEF"
        strokeWidth={1.5}
      />
      <line
        x1={x - 5}
        y1={y2}
        x2={x + 5}
        y2={y2}
        stroke="#00AEEF"
        strokeWidth={1.5}
      />
      <text
        x={labelX}
        y={my}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#00AEEF"
        fontSize={9}
        fontWeight={600}
        transform={`rotate(-90, ${labelX}, ${my})`}
      >
        {label}
      </text>
    </g>
  );
}

function FixedPanelReturnCorner90({
  x,
  y,
  labelSide,
}: Readonly<{ x: number; y: number; labelSide: "left" | "right" }>) {
  const size = 10;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill="none"
        stroke="#64748B"
        strokeWidth={1.2}
        opacity={0.5}
      />
      <text
        x={labelSide === "left" ? x + size + 4 : x - 4}
        y={y + 3}
        textAnchor={labelSide === "left" ? "start" : "end"}
        fill="#64748B"
        fontSize={9}
        fontWeight={600}
        opacity={0.7}
      >
        90°
      </text>
    </g>
  );
}

function FixedPanelOpenCorner({
  x,
  y,
  size = 12,
}: Readonly<{ x: number; y: number; size?: number }>) {
  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      fill="none"
      stroke="#64748B"
      strokeWidth={1.2}
      opacity={0.5}
    />
  );
}

function FixedPanelReturnPlan({
  returnSide,
  panelN,
  frontN,
  returnN,
  fixedPanelReturnStyle,
}: Readonly<{
  returnSide: Side;
  panelN: number;
  frontN: number;
  returnN: number;
  fixedPanelReturnStyle: "inlineWalkthrough" | "singleInReturn";
}>) {
  const isRh = returnSide === "right";
  const VB_W = 254;
  const mirrorRectX = (x: number, w: number) => VB_W - x - w;
  const mirrorPointX = (x: number) => VB_W - x;

  const TOP_Y = 45;
  const TOP_X1 = 55;
  const TOP_X2 = 219;
  const OPEN_WALL_X = 214;
  const OPEN_WALL_Y1 = 40;
  const OPEN_WALL_Y2 = 171;

  const RETURN_BAR_X = 70;
  const RETURN_TRACK_X = 64;
  const RETURN_W = 8;
  const RETURN_TRACK_W = 4;
  const RETURN_TOP = 48;
  // Keep return panel length fixed so changing returnMM only updates the label.
  const RETURN_H = 108;

  const FRONT_BAR_Y = 148;
  const FRONT_TRACK_Y = 158;
  const WALK_Y = 146;
  const WALK_H = 20;
  const GAP = 2;
  const FRONT_WALK_START = 80;
  const FRONT_GLASS_RUN = 131;

  const FRONT_DIM_L = 78;
  const FRONT_DIM_R = 214;
  const DIM_RETURN_X = 52;
  const DIM_RETURN_Y2 = RETURN_TOP + RETURN_H;
  const DIM_FRONT_Y = 178;

  const CORNER_JUNCTION_X = 79;
  const CORNER_JUNCTION_Y = 137;
  const CORNER_TOP_X = 198;
  const CORNER_TOP_Y = 49;

  const WATERMARK_X = 147;
  const WATERMARK_Y = 100.5;

  const topX1 = isRh ? mirrorPointX(TOP_X2) : TOP_X1;
  const topX2 = isRh ? mirrorPointX(TOP_X1) : TOP_X2;
  const openWallX = isRh ? mirrorPointX(OPEN_WALL_X) : OPEN_WALL_X;
  const returnBarX = isRh ? mirrorRectX(RETURN_BAR_X, RETURN_W) : RETURN_BAR_X;
  const returnTrackX = isRh
    ? mirrorRectX(RETURN_TRACK_X, RETURN_TRACK_W)
    : RETURN_TRACK_X;
  const dimReturnX = isRh ? mirrorPointX(DIM_RETURN_X) : DIM_RETURN_X;
  const dimFrontX1 = isRh ? mirrorPointX(FRONT_DIM_R) : FRONT_DIM_L;
  const dimFrontX2 = isRh ? mirrorPointX(FRONT_DIM_L) : FRONT_DIM_R;
  const junctionCornerX = isRh
    ? mirrorRectX(CORNER_JUNCTION_X, 10)
    : CORNER_JUNCTION_X;
  const topCornerX = isRh ? mirrorRectX(CORNER_TOP_X, 12) : CORNER_TOP_X;
  const watermark = isRh ? "RH" : "LH";

  const fixedW = Math.min(
    FRONT_GLASS_RUN,
    (panelN / Math.max(frontN, 1)) * FRONT_GLASS_RUN
  );
  const walkW = Math.max(FRONT_GLASS_RUN - fixedW - GAP, 12);

  const frontStart = isRh
    ? mirrorRectX(FRONT_WALK_START, FRONT_GLASS_RUN)
    : FRONT_WALK_START;
  // Panel against the far wall; walkthrough on the return side.
  // LH: Return | Front(Walk) | Fixed (open wall).
  // RH: Fixed (open wall) | Front(Walk) | Return.
  const walkX = isRh ? frontStart + fixedW + GAP : frontStart;
  const fixedX = isRh ? frontStart : frontStart + walkW + GAP;

  const contentX = Math.min(topX1, DIM_RETURN_X - 12);
  const contentY = OPEN_WALL_Y1;
  const contentW =
    Math.max(dimReturnX, FRONT_DIM_R, openWallX) + 16 - contentX;
  const contentH = DIM_FRONT_Y + 20 - contentY;
  const { scale, tx, ty } = fixedPanelDiagramTransform(
    contentX,
    contentY,
    contentW,
    contentH
  );

  const renderShell = (
    frontContent: ReactNode,
    extraDims?: ReactNode
  ) => (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      <line
        x1={topX1}
        y1={TOP_Y}
        x2={topX2}
        y2={TOP_Y}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={openWallX}
        y1={OPEN_WALL_Y1}
        x2={openWallX}
        y2={OPEN_WALL_Y2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <rect
        x={returnTrackX}
        y={RETURN_TOP}
        width={RETURN_TRACK_W}
        height={RETURN_H}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      <FixedPanelReturnInfillBar
        x={returnBarX}
        y={RETURN_TOP}
        h={RETURN_H}
      />
      {frontContent}
      <FixedPanelReturnCorner90
        x={junctionCornerX}
        y={CORNER_JUNCTION_Y}
        labelSide={isRh ? "right" : "left"}
      />
      <FixedPanelOpenCorner x={topCornerX} y={CORNER_TOP_Y} />
      <text
        x={WATERMARK_X}
        y={WATERMARK_Y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(0, 174, 239, 0.1)"
        fontSize={14}
        fontWeight={800}
      >
        {watermark}
      </text>
      <FixedPanelCyanVerticalDim
        y1={TOP_Y}
        y2={DIM_RETURN_Y2}
        x={dimReturnX}
        label={`${returnN}mm`}
        labelSide={isRh ? "right" : "left"}
      />
      <FrontOnlySheetDim
        x1={dimFrontX1}
        x2={dimFrontX2}
        y={DIM_FRONT_Y}
        label={`${frontN}mm`}
      />
      {extraDims}
    </g>
  );

  if (fixedPanelReturnStyle === "singleInReturn") {
    const frontWalkX = !isRh
      ? FRONT_WALK_START
      : mirrorRectX(FRONT_WALK_START, FRONT_GLASS_RUN);

    return renderShell(
      <FixedPanelWalkBox
        x={frontWalkX}
        y={WALK_Y}
        w={FRONT_GLASS_RUN}
        h={WALK_H}
        label="Front(Walk)"
      />
    );
  }

  return renderShell(
    <>
      {fixedW > 0 && (
        <>
          <rect
            x={fixedX}
            y={FRONT_TRACK_Y}
            width={fixedW}
            height={4}
            fill={FO.track}
            rx={1}
            opacity={0.6}
          />
          <FrontOnlyGlassBar
            x={fixedX}
            y={FRONT_BAR_Y}
            w={fixedW}
            variant="fixed"
            label="Fixed"
          />
        </>
      )}
      <FixedPanelWalkBox
        x={walkX}
        y={WALK_Y}
        w={walkW}
        h={WALK_H}
        label="Front(Walk)"
      />
    </>
  );
}

function SplayedCutLabel({
  x,
  y,
  label,
  rotate,
}: Readonly<{ x: number; y: number; label: string; rotate: number }>) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#4FC3F7"
      fontSize={8}
      fontWeight={600}
      transform={`rotate(${rotate}, ${x}, ${y})`}
    >
      {label}
    </text>
  );
}

function SplayedPlan({
  wallA,
  wallB,
  doorN,
  hingeSide,
  isSliding,
}: Readonly<{
  wallA: string;
  wallB: string;
  doorN: number;
  hingeSide: HingeSide | "";
  isSliding: boolean;
}>) {
  const a = Number(wallA) || 900;
  const b = Number(wallB) || 900;
  const cutA = splayedCutForInternal(a) ?? 425;
  const cutB = splayedCutForInternal(b) ?? 425;

  // Vertical panel runs along Wall B; horizontal panel runs along Wall A.
  const REF_A = 1100;
  const REF_B = 1000;
  const WALL_RUN_A = 139;
  const WALL_RUN_B = 126;

  const TOP_WALL_X1 = 50;
  const TOP_WALL_Y = 45;
  const RIGHT_WALL_Y1 = 40;

  const PANEL_L = 70;
  const TRACK_L = 64;
  const PANEL_W = 8;
  const PANEL_H = 8;
  const TRACK_W = 4;
  const PANEL_TOP = 48;

  const DIM_A_Y = 30;
  const DIM_A_X1 = 74;
  const DIM_B_Y1 = 45;

  const CORNER_INSET = 3;
  const CORNER_MARK_OFFSET_X = 16;
  const CORNER_LABEL_OFFSET_X = 22;
  const CORNER_MARK_Y = 49;
  const CORNER_LABEL_Y = 71;
  const DIM_B_OFFSET_X = 15;
  const TOP_WALL_PAST_DIM = 5;
  const RIGHT_WALL_PAST_DIM = 24;

  const REF_CUT = 425;
  const REF_PANEL_PX = 55.25;

  const wallRunA = (a / REF_A) * WALL_RUN_A;
  const wallRunB = (b / REF_B) * WALL_RUN_B;
  const dimA_x2 = DIM_A_X1 + wallRunA;
  const dimB_y2 = DIM_B_Y1 + wallRunB;
  const cornerX = dimA_x2;
  const rightWallX = cornerX;
  const topWallX2 = dimA_x2 + TOP_WALL_PAST_DIM;
  const rightWallY2 = dimB_y2 + RIGHT_WALL_PAST_DIM;
  const dimB_x = dimA_x2 + DIM_B_OFFSET_X;

  const verticalPanelPx =
    (cutB / REF_CUT) * REF_PANEL_PX * (wallRunB / WALL_RUN_B);
  const horizontalPanelPx =
    (cutA / REF_CUT) * REF_PANEL_PX * (wallRunA / WALL_RUN_A);

  const bottomPanelX = cornerX - CORNER_INSET - horizontalPanelPx;
  const bottomPanelY = dimB_y2 - 4;
  const bottomTrackY = dimB_y2 + 6;

  const doorStart = { x: PANEL_L, y: PANEL_TOP + verticalPanelPx };
  const doorEnd = { x: bottomPanelX, y: bottomPanelY + PANEL_H };
  const doorLen = Math.hypot(doorEnd.x - doorStart.x, doorEnd.y - doorStart.y);
  const ux = (doorEnd.x - doorStart.x) / doorLen;
  const uy = (doorEnd.y - doorStart.y) / doorLen;
  const px = uy;
  const py = -ux;
  const doorThickness = PANEL_H;

  const doorPoly: [number, number][] = [
    [doorStart.x, doorStart.y],
    [doorEnd.x, doorEnd.y],
    [doorEnd.x - px * doorThickness, doorEnd.y - py * doorThickness],
    [doorStart.x - px * doorThickness, doorStart.y - py * doorThickness],
  ];
  const doorPoints = doorPoly.map((p) => p.join(",")).join(" ");

  const doorMid = {
    x: (doorStart.x + doorEnd.x) / 2,
    y: (doorStart.y + doorEnd.y) / 2,
  };
  const doorAngle =
    (Math.atan2(doorEnd.y - doorStart.y, doorEnd.x - doorStart.x) * 180) /
    Math.PI;

  const trackOffset = 5;
  const trackX1 = doorStart.x + px * trackOffset;
  const trackY1 = doorStart.y + py * trackOffset;
  const trackX2 = doorEnd.x + px * trackOffset;
  const trackY2 = doorEnd.y + py * trackOffset;

  const {
    hingeX,
    hingeY,
    freeX,
    freeY,
    hingeOnRight,
  } = resolveSplayedHinge(hingeSide, doorStart, doorEnd, doorPoly);

  const contentX = TOP_WALL_X1;
  const contentY = DIM_A_Y - 8;
  const contentW = dimB_x + 20 - contentX;
  const contentH = rightWallY2 + 8 - contentY;
  const { scale, tx, ty } = fixedPanelDiagramTransform(
    contentX,
    contentY,
    contentW,
    contentH
  );

  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      <line
        x1={TOP_WALL_X1}
        y1={TOP_WALL_Y}
        x2={topWallX2}
        y2={TOP_WALL_Y}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={rightWallX}
        y1={RIGHT_WALL_Y1}
        x2={rightWallX}
        y2={rightWallY2}
        stroke={FO.wall}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <rect
        x={TRACK_L}
        y={PANEL_TOP}
        width={TRACK_W}
        height={verticalPanelPx}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      <line
        x1={trackX1}
        y1={trackY1}
        x2={trackX2}
        y2={trackY2}
        stroke={FO.track}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.6}
      />
      <rect
        x={bottomPanelX}
        y={bottomTrackY}
        width={horizontalPanelPx}
        height={TRACK_W}
        fill={FO.track}
        rx={1}
        opacity={0.6}
      />
      <rect
        x={PANEL_L}
        y={PANEL_TOP}
        width={PANEL_W}
        height={verticalPanelPx}
        fill={FO.fixedFill}
        stroke={FO.fixedStroke}
        strokeWidth={1.5}
        rx={1}
      />
      <SplayedCutLabel
        x={PANEL_L + PANEL_W / 2}
        y={PANEL_TOP + verticalPanelPx / 2}
        label={`Cut @ ${cutB}mm`}
        rotate={-90}
      />
      <polygon
        points={doorPoints}
        fill={FO.doorFill}
        stroke={FO.doorStroke}
        strokeWidth={2}
      />
      <text
        x={doorMid.x}
        y={doorMid.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={FO.labelDoor}
        fontSize={8}
        fontWeight={600}
        transform={`rotate(${doorAngle}, ${doorMid.x}, ${doorMid.y})`}
      >
        Door {doorN}mm
      </text>
      <rect
        x={bottomPanelX}
        y={bottomPanelY}
        width={horizontalPanelPx}
        height={PANEL_H}
        fill={FO.fixedFill}
        stroke={FO.fixedStroke}
        strokeWidth={1.5}
        rx={1}
      />
      <SplayedCutLabel
        x={bottomPanelX + horizontalPanelPx / 2}
        y={bottomPanelY + PANEL_H / 2}
        label={`Cut @ ${cutA}mm`}
        rotate={0}
      />
      {!isSliding && hingeSide && (
        <>
          <SplayedCardinalSwing
            freeX={freeX}
            freeY={freeY}
            radius={doorLen}
            hingeOnRight={hingeOnRight}
          />
          <FrontOnlyHinge cx={hingeX} cy={hingeY} />
        </>
      )}
      <FixedPanelOpenCorner
        x={cornerX - CORNER_MARK_OFFSET_X}
        y={CORNER_MARK_Y}
      />
      <text
        x={cornerX - CORNER_LABEL_OFFSET_X}
        y={CORNER_LABEL_Y}
        textAnchor="end"
        fill="#64748B"
        fontSize={7}
        opacity={0.6}
      >
        internal corner
      </text>
      <FrontOnlySheetDim
        x1={DIM_A_X1}
        x2={dimA_x2}
        y={DIM_A_Y}
        label={`${a}mm from corner`}
      />
      <FrontReturnVerticalDim
        y1={DIM_B_Y1}
        y2={dimB_y2}
        x={dimB_x}
        label={`${b}mm from corner`}
      />
    </g>
  );
}

function Markers() {
  return (
    <defs>
      <marker
        id="arrow"
        markerWidth="6"
        markerHeight="6"
        refX="3"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <circle cx="3" cy="3" r="1.4" fill={C.measure} />
      </marker>
    </defs>
  );
}

export type ScreenDiagramProps = Readonly<{
  type: ScreenType;
  frontOnlyStyle?: FrontOnlyStyle;
  fixedStyle?: FixedStyle;
  returnSide?: Side;
  panelSide?: Side;
  isSliding?: boolean;
  hingeSide?: HingeSide | "";
  angleHeight?: string;
  frontMM?: string;
  returnMM?: string;
  w2wMM?: string;
  leftPanelMM?: string;
  rightPanelMM?: string;
  leftFixedPanelMM?: string;
  rightFixedPanelMM?: string;
  fixedPanelReturnStyle?: "inlineWalkthrough" | "singleInReturn";
  panelMM?: string;
  doorMM?: string;
  wallA?: string;
  wallB?: string;
  className?: string;
}>;

function diagramCopy(props: ScreenDiagramProps) {
  const {
    type,
    frontOnlyStyle = "panelDoor",
    fixedStyle = "single",
    returnSide = "left",
    panelSide = "left",
    frontMM = "900",
    returnMM = "900",
    w2wMM = "1200",
    leftPanelMM = "350",
    rightPanelMM = "550",
    panelMM,
    doorMM = "662",
    wallA = "900",
    wallB = "900",
    fixedPanelReturnStyle = "inlineWalkthrough",
  } = props;

  const frontN = Number(frontMM) || 900;
  const returnN = Number(returnMM) || 900;
  const doorN = Number(doorMM) || 662;
  const w2wN = Number(w2wMM) || 1200;
  const panelN = Number(panelMM) || 900;
  const leftN = Number(leftPanelMM) || 350;
  const rightN = Number(rightPanelMM) || 550;
  const returnPanelN = returnPanelFromHob(returnN);
  const frontPanelN = Number(panelMM) || 0;
  const openingN =
    frontPanelN > 0 ? frontN - frontPanelN : 0;

  const title =
    type === "Front & Return"
      ? `Front & Return - ${returnSide === "left" ? "LH" : "RH"}`
      : type === "Front Only"
        ? frontOnlyStyle === "panelDoorPanel"
          ? "Panel + Door + Panel"
          : "Panel + Door"
        : type === "Splayed"
          ? `Splayed ${wallA} x ${wallB}`
          : fixedStyle === "double"
            ? "Two Fixed Panels"
            : fixedStyle === "panelReturn"
              ? "Fixed + Return"
              : "Single Fixed Panel";

  const panelReturnSubtitle =
    fixedPanelReturnStyle === "singleInReturn"
      ? `${returnN}mm return hob, ${returnPanelN}mm return panel, ${frontN}mm front hob`
      : [
          `${returnN}mm return hob`,
          `${returnPanelN}mm return panel`,
          `${frontN}mm front hob`,
          frontPanelN > 0
            ? `${frontPanelN}mm front panel, ${openingN}mm opening`
            : "no front panel",
        ].join(", ");

  const subtitle =
    type === "Front & Return"
      ? `${frontN}mm front, ${returnN}mm return, ${doorN}mm door`
      : type === "Front Only" && frontOnlyStyle === "panelDoor"
        ? `${w2wN}mm sheet to sheet, ${doorN}mm door, panel ${panelSide === "left" ? "LHS" : "RHS"}`
        : type === "Front Only"
          ? `L ${leftN} + door ${doorN} + R ${rightN} = ${leftN + doorN + rightN}mm`
          : type === "Splayed"
            ? `${wallA} x ${wallB} from internal corner, door 662mm`
            : fixedStyle === "double"
              ? `${panelN}mm each, ${w2wN}mm wall to wall`
              : fixedStyle === "panelReturn"
                ? panelReturnSubtitle
                : `${panelN}mm panel, ${w2wN}mm wall to wall`;

  return { title, subtitle };
}

/** Plan SVG only — used in UI and for email PNG attachments. */
export function ScreenDiagramSvg(
  props: ScreenDiagramProps & { forEmail?: boolean }
) {
  const {
    type,
    frontOnlyStyle = "panelDoor",
    fixedStyle = "single",
    returnSide = "left",
    panelSide = "left",
    isSliding = false,
    hingeSide = "",
    frontMM = "900",
    returnMM = "900",
    w2wMM = "1200",
    leftPanelMM = "350",
    rightPanelMM = "550",
    leftFixedPanelMM = "350",
    rightFixedPanelMM = "350",
    fixedPanelReturnStyle = "inlineWalkthrough",
    panelMM,
    doorMM = "662",
    wallA = "900",
    wallB = "900",
    forEmail = false,
  } = props;

  const frontN = Number(frontMM) || 900;
  const returnN = Number(returnMM) || 900;
  const doorN = Number(doorMM) || 662;
  const w2wN = Number(w2wMM) || 1200;
  const parsedPanel = Number(panelMM);
  const panelN =
    parsedPanel > 0
      ? parsedPanel
      : fixedStyle === "panelReturn"
        ? 0
        : 900;
  const leftN = Number(leftPanelMM) || 350;
  const rightN = Number(rightPanelMM) || 550;
  const leftFixedN = Number(leftFixedPanelMM) || panelN;
  const rightFixedN = Number(rightFixedPanelMM) || panelN;
  const { title } = diagramCopy(props);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 248"
      width={forEmail ? 640 : undefined}
      height={forEmail ? 496 : undefined}
      className={
        forEmail ? undefined : "mx-auto block h-auto w-full max-w-md"
      }
      role="img"
      aria-label={`${title} overhead plan`}
    >
      <Markers />
      <rect width={320} height={248} fill={C.bg} rx={12} />

      {type === "Front & Return" && (
        <FrontReturnPlan
          returnSide={returnSide}
          hingeSide={hingeSide}
          isSliding={isSliding}
          frontN={frontN}
          returnN={returnN}
          doorN={doorN}
        />
      )}

      {type === "Front Only" && (
        <FrontOnlyPlan
          frontOnlyStyle={frontOnlyStyle}
          panelSide={panelSide}
          hingeSide={hingeSide}
          isSliding={isSliding}
          w2wN={w2wN}
          doorN={doorN}
          leftN={leftN}
          rightN={rightN}
        />
      )}

      {type === "Splayed" && (
        <SplayedPlan
          wallA={wallA}
          wallB={wallB}
          doorN={doorN}
          hingeSide={hingeSide}
          isSliding={isSliding}
        />
      )}

      {type === "Fixed Panel" && fixedStyle === "single" && (
        <FixedPanelSinglePlan
          panelSide={panelSide}
          panelN={panelN}
          w2wN={w2wN}
        />
      )}

      {type === "Fixed Panel" && fixedStyle === "double" && (
        <FixedPanelDoublePlan
          leftN={leftFixedN}
          rightN={rightFixedN}
          w2wN={w2wN}
        />
      )}

      {type === "Fixed Panel" && fixedStyle === "panelReturn" && (
        <FixedPanelReturnPlan
          returnSide={returnSide}
          panelN={panelN}
          frontN={frontN}
          returnN={returnN}
          fixedPanelReturnStyle={fixedPanelReturnStyle}
        />
      )}
    </svg>
  );
}

export function ScreenDiagram(props: ScreenDiagramProps) {
  const { angleHeight, className = "" } = props;
  const { title, subtitle } = diagramCopy(props);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 ${className}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Plan view - overhead
          </p>
          <p className="truncate text-sm font-semibold text-navy">{title}</p>
          <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">
            {subtitle}
          </p>
        </div>
        {angleHeight && (
          <span className="shrink-0 rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-semibold text-navy">
            {angleHeight} mm
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl">
        <ScreenDiagramSvg {...props} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-blue-600" /> Fixed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-sky-500" /> Door
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-navy" /> Hinge
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0 w-3 border-t border-dashed border-orange-500" />{" "}
          Measure
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 border border-dashed border-orange-700" />{" "}
          Walk
        </span>
      </div>
    </div>
  );
}

