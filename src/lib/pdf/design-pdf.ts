import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildScreenDiagramAttachments } from "@/lib/email/screen-diagram-images";
import { formatMoney } from "@/lib/pricing";
import { FREIGHT_DISCLAIMER } from "@/lib/site";
import type { OrderScreenPayload } from "@/lib/orders";

export type DesignPdfInput = {
  designRef: string;
  firstName: string;
  phone: string;
  postcode: string;
  email: string;
  screen: OrderScreenPayload;
  buildSummary: string;
  system: string;
  finish: string;
  measurements: string;
  supplyPrice: number;
};

export async function buildDesignPdf(input: DesignPdfInput): Promise<Buffer> {
  const [diagram] = buildScreenDiagramAttachments([input.screen]);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0, 58 / 255, 112 / 255);
  const muted = rgb(0.39, 0.45, 0.55);
  const black = rgb(0.06, 0.09, 0.16);

  let y = height - 48;
  page.drawText("Hydro Seal Shower Systems", {
    x: 40,
    y,
    size: 11,
    font: bold,
    color: navy,
  });
  y -= 18;
  page.drawText(`DIY design ${input.designRef}`, {
    x: 40,
    y,
    size: 18,
    font: bold,
    color: navy,
  });
  y -= 22;
  page.drawText(`${input.firstName}  ·  ${input.phone}  ·  ${input.postcode}  ·  ${input.email}`, {
    x: 40,
    y,
    size: 10,
    font,
    color: muted,
  });
  y -= 28;

  const lines: [string, string][] = [
    ["Build summary", input.buildSummary],
    ["System", input.system],
    ["Finish", input.finish],
    ["Measurements", input.measurements],
    [
      "Supply price",
      `${formatMoney(input.supplyPrice)} ex GST — ${FREIGHT_DISCLAIMER}`,
    ],
  ];

  for (const [label, value] of lines) {
    page.drawText(label, { x: 40, y, size: 8, font: bold, color: muted });
    y -= 14;
    const wrapped = wrapText(value || "—", font, 10, width - 80);
    for (const line of wrapped) {
      page.drawText(line, { x: 40, y, size: 10, font, color: black });
      y -= 13;
    }
    y -= 8;
  }

  if (diagram) {
    const png = await pdf.embedPng(diagram.content);
    const maxW = width - 80;
    const maxH = Math.max(180, y - 60);
    const scale = Math.min(maxW / png.width, maxH / png.height, 1);
    const imgW = png.width * scale;
    const imgH = png.height * scale;
    page.drawImage(png, {
      x: 40,
      y: Math.max(40, y - imgH),
      width: imgW,
      height: imgH,
    });
  }

  return Buffer.from(await pdf.save());
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["—"];
}
