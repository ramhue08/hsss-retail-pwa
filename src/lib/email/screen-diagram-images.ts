import "server-only";

import path from "path";
import {
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { Resvg } from "@resvg/resvg-js";
import { ScreenDiagramSvg } from "@/components/screen-diagram-shared";
import {
  formatScreenDetailsText,
  neatScreenSummary,
  screenDetailRows,
} from "@/lib/email/screen-details";
import { screenDiagramPropsFromPayload } from "@/lib/screen-diagram-props";
import type { OrderScreenPayload } from "@/lib/orders";
import {
  formatPanelsToPickBlock,
  resolvePanelsForPayload,
} from "@/lib/stock-panels";

export type ScreenDiagramAttachment = {
  filename: string;
  contentId: string;
  content: Buffer;
  label: string;
  summaryText: string;
  detailsText: string;
};

const DIAGRAM_FONT_PATH = path.join(
  process.cwd(),
  "assets",
  "fonts",
  "Arial.ttf"
);

const CARD_WIDTH = 720;
const PADDING = 20;
const DETAILS_WIDTH = 168;
const CONTENT_GAP = 16;

function safeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "screen";
}

function escapeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** SVG/HTML attrs that must keep camelCase (not kebab-case). */
const CAMEL_ATTRS = new Set([
  "viewBox",
  "preserveAspectRatio",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "markerUnits",
  "markerWidth",
  "markerHeight",
  "refX",
  "refY",
  "stdDeviation",
  "baseFrequency",
  "numOctaves",
  "pathLength",
]);

function attrName(key: string): string | null {
  if (
    key === "key" ||
    key === "ref" ||
    key === "children" ||
    key === "dangerouslySetInnerHTML" ||
    key.startsWith("__")
  ) {
    return null;
  }
  if (key === "className") return "class";
  if (CAMEL_ATTRS.has(key)) return key;
  if (key.startsWith("aria") || key.startsWith("data")) {
    return key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function styleToString(style: Record<string, unknown>) {
  return Object.entries(style)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      const name = k.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      return `${name}:${String(v)}`;
    })
    .join(";");
}

/**
 * Minimal SVG renderer — avoids react-dom/server, which Next.js blocks
 * in the App Router module graph.
 */
function renderSvgMarkup(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") {
    return escapeText(String(node));
  }
  if (Array.isArray(node)) return node.map(renderSvgMarkup).join("");
  if (!isValidElement(node)) return "";

  const el = node as ReactElement<Record<string, unknown>>;

  if (el.type === Fragment) {
    return renderSvgMarkup(el.props.children as ReactNode);
  }

  if (typeof el.type === "function") {
    const Comp = el.type as (props: Record<string, unknown>) => ReactNode;
    return renderSvgMarkup(Comp(el.props));
  }

  if (typeof el.type !== "string") return "";

  const tag = el.type;
  const props = el.props ?? {};
  const { children, dangerouslySetInnerHTML, ...rest } = props;

  let attrs = "";
  for (const [key, value] of Object.entries(rest)) {
    const name = attrName(key);
    if (!name || value == null || value === false) continue;
    if (value === true) {
      attrs += ` ${name}="true"`;
      continue;
    }
    if (key === "style" && typeof value === "object") {
      attrs += ` style="${escapeAttr(styleToString(value as Record<string, unknown>))}"`;
      continue;
    }
    attrs += ` ${name}="${escapeAttr(String(value))}"`;
  }

  if (
    dangerouslySetInnerHTML &&
    typeof dangerouslySetInnerHTML === "object" &&
    "__html" in (dangerouslySetInnerHTML as object)
  ) {
    return `<${tag}${attrs}>${String((dangerouslySetInnerHTML as { __html: string }).__html)}</${tag}>`;
  }

  const inner = renderSvgMarkup(children as ReactNode);
  if (!inner) return `<${tag}${attrs} />`;
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function renderDiagramInner(screen: OrderScreenPayload): {
  markup: string;
  viewBox: string;
} {
  const props = screenDiagramPropsFromPayload(screen);
  const svg = renderSvgMarkup(
    createElement(ScreenDiagramSvg, { ...props, forEmail: true })
  );
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
  return {
    markup: svg,
    viewBox: viewBoxMatch?.[1] ?? "0 0 320 248",
  };
}

export type ScreenCardMeta = {
  company?: string | null;
  siteContact?: string | null;
  phone?: string | null;
  deliveryAddress?: string | null;
};

/**
 * Builds a full screen card (title + diagram left + details right) as one PNG
 * so the email recipient can download everything in a single image.
 */
function buildScreenCardSvg(
  screen: OrderScreenPayload,
  index: number,
  meta: ScreenCardMeta = {}
): { svg: string; label: string } {
  const n = index + 1;
  const location = screen.locationLabel?.trim();
  const title = location
    ? `${n}. ${screen.type} — ${location}`
    : `${n}. ${screen.type}`;
  const summary = neatScreenSummary(screen.summary);
  const rows = screenDetailRows(screen);
  const upgrades = rows.filter((row) => row.upgrade);

  const headerLines: string[] = [];
  if (meta.company?.trim()) {
    headerLines.push(`Company: ${meta.company.trim()}`);
  }
  if (meta.siteContact?.trim()) {
    headerLines.push(`Site contact: ${meta.siteContact.trim()}`);
  }
  if (meta.phone?.trim()) {
    headerLines.push(`Phone: ${meta.phone.trim()}`);
  }
  if (meta.deliveryAddress?.trim()) {
    headerLines.push(`Delivery address: ${meta.deliveryAddress.trim()}`);
  }

  const titleLines = wrapText(title, 58);
  const headerWrapped = headerLines.flatMap((line) => wrapText(line, 58));
  const summaryLines = wrapText(summary, 64);

  let y = PADDING + 4;
  const textBlocks: string[] = [];
  const shapeBlocks: string[] = [];

  for (const line of titleLines) {
    y += 22;
    textBlocks.push(
      `<text x="${PADDING}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#0f172a">${escapeText(line)}</text>`
    );
  }

  if (headerWrapped.length) {
    y += 6;
    for (const line of headerWrapped) {
      y += 16;
      textBlocks.push(
        `<text x="${PADDING}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="600" fill="#334155">${escapeText(line)}</text>`
      );
    }
  }

  if (upgrades.length) {
    y += 10;
    let badgeX = PADDING;
    const badgeY = y;
    for (const upgrade of upgrades) {
      const label = `${upgrade.label}: ${upgrade.value}`;
      const badgeW = Math.min(DETAILS_WIDTH + 40, 10 + label.length * 7.2);
      shapeBlocks.push(
        `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="22" rx="4" fill="#FFEDD5" stroke="#F97316"/>`
      );
      textBlocks.push(
        `<text x="${badgeX + 8}" y="${badgeY + 15}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#C2410C">${escapeText(label)}</text>`
      );
      badgeX += badgeW + 8;
      if (badgeX > CARD_WIDTH - PADDING - 80) {
        badgeX = PADDING;
        y += 28;
      }
    }
    y = badgeY + 22;
  }

  y += 8;
  for (const line of summaryLines) {
    y += 18;
    textBlocks.push(
      `<text x="${PADDING}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#475569">${escapeText(line)}</text>`
    );
  }

  const contentTop = y + 14;
  const diagram = renderDiagramInner(screen);
  const [, , vbW, vbH] = diagram.viewBox.split(/\s+/).map(Number);

  const frameX = PADDING;
  const frameY = contentTop;
  const frameW =
    CARD_WIDTH - PADDING * 2 - (rows.length ? DETAILS_WIDTH + CONTENT_GAP : 0);
  const frameH = Math.round(frameW * ((vbH || 248) / (vbW || 320)));

  const detailsX = frameX + frameW + CONTENT_GAP;
  const detailRowHeight = 24;
  const detailsNeededH = rows.length
    ? 8 + rows.length * detailRowHeight
    : 0;
  const contentH = Math.max(frameH, detailsNeededH);

  rows.forEach((row, i) => {
    const rowY = frameY + 4 + i * detailRowHeight;
    if (row.upgrade) {
      shapeBlocks.push(
        `<rect x="${detailsX - 6}" y="${rowY}" width="${DETAILS_WIDTH + 4}" height="20" rx="4" fill="#FFEDD5"/>`
      );
      textBlocks.push(
        `<text x="${detailsX}" y="${rowY + 14}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#C2410C">${escapeText(`${row.label}: ${row.value}`)}</text>`
      );
    } else {
      textBlocks.push(
        `<text x="${detailsX}" y="${rowY + 14}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#0f172a"><tspan fill="#64748b">${escapeText(row.label)}:</tspan> <tspan font-weight="700">${escapeText(row.value)}</tspan></text>`
      );
    }
  });

  const innerDiagram = diagram.markup
    .replace(/^<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");

  const panels = resolvePanelsForPayload(screen);
  const panelLines = formatPanelsToPickBlock(panels);
  let panelsY = frameY + contentH + 16;
  const panelsBlock: string[] = [];
  if (panelLines.length > 1) {
    panelsBlock.push(
      `<rect x="${PADDING}" y="${panelsY - 4}" width="${CARD_WIDTH - PADDING * 2}" height="${12 + panelLines.length * 18}" rx="6" fill="#F8FAFC" stroke="#e2e8f0"/>`
    );
    for (const line of panelLines) {
      const isFlag = line.startsWith("⚠");
      const isHeader = line === "Panels to pick";
      panelsY += 18;
      panelsBlock.push(
        `<text x="${PADDING + 10}" y="${panelsY}" font-family="Arial, Helvetica, sans-serif" font-size="${isHeader ? 12 : 12}" font-weight="${isHeader || isFlag ? 700 : 500}" fill="${isFlag ? "#C2410C" : isHeader ? "#003A70" : "#0f172a"}">${escapeText(line)}</text>`
      );
    }
    panelsY += 10;
  }

  const cardHeight = Math.max(frameY + contentH, panelsY) + PADDING;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${cardHeight}" viewBox="0 0 ${CARD_WIDTH} ${cardHeight}">
  <rect width="${CARD_WIDTH}" height="${cardHeight}" fill="#ffffff" rx="8"/>
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${cardHeight - 1}" fill="none" stroke="#e2e8f0" rx="8"/>
  ${shapeBlocks.join("\n  ")}
  ${textBlocks.join("\n  ")}
  <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" fill="#F8FAFC" stroke="#e2e8f0" rx="6"/>
  <svg x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" viewBox="${escapeAttr(diagram.viewBox)}" preserveAspectRatio="xMidYMid meet">
    ${innerDiagram}
  </svg>
  ${panelsBlock.join("\n  ")}
</svg>`;

  return { svg, label: title };
}

/** Renders each screen as a full details+diagram PNG for email attach/embed. */
export function buildScreenDiagramAttachments(
  screens: OrderScreenPayload[],
  options?: ScreenCardMeta
): ScreenDiagramAttachment[] {
  return screens.map((screen, index) => {
    const n = index + 1;
    const { svg, label } = buildScreenCardSvg(screen, index, options ?? {});
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: CARD_WIDTH },
      background: "#ffffff",
      font: {
        fontFiles: [DIAGRAM_FONT_PATH],
        loadSystemFonts: true,
        defaultFontFamily: "Arial",
      },
    });
    const png = Buffer.from(resvg.render().asPng());
    const typeSlug = safeFilenamePart(screen.type.toLowerCase());
    const contentId = `screen-${n}`;

    return {
      filename: `screen-${n}-${typeSlug}.png`,
      contentId,
      content: png,
      label,
      summaryText: neatScreenSummary(screen.summary),
      detailsText: formatScreenDetailsText(screen),
    };
  });
}
