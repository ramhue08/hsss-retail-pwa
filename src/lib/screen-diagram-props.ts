import type { OrderScreenPayload } from "@/lib/orders";
import type { ScreenDiagramProps } from "@/components/screen-diagram-shared";
import type { FixedStyle, HingeSide, Side } from "@/lib/constants";

function asSide(value: unknown): Side {
  return value === "right" ? "right" : "left";
}

function asFixedStyle(value: unknown): FixedStyle {
  if (value === "double" || value === "panelReturn") return value;
  return "single";
}

function asHingeSide(value: unknown): HingeSide | "" {
  if (value === "left" || value === "right") return value;
  return "";
}

function asFixedPanelReturnStyle(
  value: unknown
): "inlineWalkthrough" | "singleInReturn" {
  return value === "singleInReturn" ? "singleInReturn" : "inlineWalkthrough";
}

function str(value: unknown): string | undefined {
  return value != null && value !== "" ? String(value) : undefined;
}

/** Maps a saved order screen payload to ScreenDiagram props. */
export function screenDiagramPropsFromPayload(
  screen: OrderScreenPayload
): ScreenDiagramProps {
  const config = screen.config;
  return {
    type: screen.type,
    frontOnlyStyle:
      config.style === "panelDoorPanel" ? "panelDoorPanel" : "panelDoor",
    fixedStyle: asFixedStyle(config.fixedStyle),
    returnSide: asSide(config.returnSide),
    panelSide: asSide(config.panelSide),
    isSliding: Boolean(config.isSliding),
    hingeSide: asHingeSide(config.hingeSide),
    angleHeight: str(config.angleHeight),
    frontMM: str(config.frontMM),
    returnMM: str(config.returnMM),
    w2wMM: str(config.w2wMM),
    leftPanelMM: str(config.leftPanelMM),
    rightPanelMM: str(config.rightPanelMM),
    leftFixedPanelMM: str(config.leftFixedPanelMM),
    rightFixedPanelMM: str(config.rightFixedPanelMM),
    fixedPanelReturnStyle: asFixedPanelReturnStyle(config.fixedPanelReturnStyle),
    panelMM: str(config.panelMM),
    doorMM: str(config.doorMM),
    wallA: str(config.wallA),
    wallB: str(config.wallB),
  };
}
