import "server-only";

import { Resend } from "resend";
import { FREIGHT_DISCLAIMER } from "@/lib/site";
import { formatMoney } from "@/lib/pricing";
import type { RetailIdentity } from "@/types/database";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function emailDesignPdf(input: {
  identity: RetailIdentity;
  designRef: string;
  pdf: Buffer;
  buildSummary: string;
  system: string;
  finish: string;
  measurements: string;
  supplyPrice: number;
}) {
  const to = (process.env.RETAIL_QUOTES_INBOX ?? "").trim();
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) {
    console.error(
      "[retail email] skipped — RETAIL_QUOTES_INBOX or RESEND_API_KEY missing"
    );
    return;
  }

  const from =
    process.env.RETAIL_EMAIL_FROM?.trim() ||
    "HSSS <support@hsss.net.au>";
  const subject = `DIY design ${input.designRef} – ${input.identity.first_name} – ${input.identity.postcode}`;
  const price = formatMoney(input.supplyPrice);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text: [
      `DIY design ${input.designRef}`,
      `${input.identity.first_name} · ${input.identity.phone} · ${input.identity.email} · ${input.identity.postcode}`,
      `System: ${input.system}`,
      `Finish: ${input.finish}`,
      `Measurements: ${input.measurements}`,
      `Build summary: ${input.buildSummary}`,
      `Supply price: ${price} ex GST — ${FREIGHT_DISCLAIMER}`,
    ].join("\n"),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.45">
      <h1 style="color:#003A70;font-size:20px;margin:0 0 8px">DIY design ${escapeHtml(input.designRef)}</h1>
      <p style="margin:0 0 16px;color:#64748b">${escapeHtml(input.identity.first_name)} · ${escapeHtml(input.identity.phone)} · ${escapeHtml(input.identity.email)} · ${escapeHtml(input.identity.postcode)}</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 16px 4px 0;color:#64748b">System</td><td>${escapeHtml(input.system)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#64748b">Finish</td><td>${escapeHtml(input.finish)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#64748b">Measurements</td><td>${escapeHtml(input.measurements)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#64748b">Build summary</td><td>${escapeHtml(input.buildSummary)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#64748b">Supply price</td><td>${escapeHtml(price)} ex GST — ${escapeHtml(FREIGHT_DISCLAIMER)}</td></tr>
      </table>
    </div>`,
    attachments: [
      {
        filename: `${input.designRef}.pdf`,
        content: input.pdf,
      },
    ],
  });

  if (error) {
    console.error("[retail email] send failed", error.message);
    throw new Error(error.message);
  }
}
