import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import type { RetailWebhookEvent } from "@/types/database";

const RETRY_DELAYS_MS = [
  60_000,
  10 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
] as const;

const FETCH_TIMEOUT_MS = 15_000;
const LOG_RETENTION_DAYS = 90;

function webhookUrl() {
  return (process.env.HSSS_WEBHOOK_URL ?? "").trim();
}

function webhookKey() {
  return (process.env.HSSS_WEBHOOK_KEY ?? "").trim();
}

export function brisbaneTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+10:00`;
}

export async function enqueueWebhook(
  event: "app_access" | "design_sent",
  payload: Record<string, unknown>
) {
  const event_id = crypto.randomUUID();
  const body = {
    event_id,
    event,
    timestamp: brisbaneTimestamp(),
    ...payload,
  };
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_webhook_events")
    .insert({
      event_id,
      event,
      payload: body,
      status: "pending",
      attempts: 0,
      next_retry_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    console.error("[retail webhook] enqueue failed", error.message);
    return;
  }
  await deliverWebhook(data as RetailWebhookEvent);
}

async function deliverWebhook(row: RetailWebhookEvent) {
  const admin = createServiceClient();
  const url = webhookUrl();
  let errorMessage = "";
  let ok = false;

  if (!url) {
    errorMessage = "HSSS_WEBHOOK_URL is not configured";
  } else {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HSSS-Key": webhookKey(),
        },
        body: JSON.stringify(row.payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      ok = res.status >= 200 && res.status < 300;
      if (!ok) {
        const text = await res.text().catch(() => "");
        errorMessage = `HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Webhook request failed";
    }
  }

  const attempts = row.attempts + 1;
  if (ok) {
    await admin
      .from("retail_webhook_events")
      .update({
        status: "delivered",
        attempts,
        last_error: null,
        delivered_at: new Date().toISOString(),
        next_retry_at: null,
      })
      .eq("id", row.id);
    return;
  }

  const delay = RETRY_DELAYS_MS[attempts - 1];
  if (delay == null) {
    console.error(
      `[retail webhook] giving up event_id=${row.event_id} event=${row.event}: ${errorMessage}`
    );
    await admin
      .from("retail_webhook_events")
      .update({
        status: "failed",
        attempts,
        last_error: errorMessage,
        next_retry_at: null,
      })
      .eq("id", row.id);
    return;
  }

  await admin
    .from("retail_webhook_events")
    .update({
      status: "pending",
      attempts,
      last_error: errorMessage,
      next_retry_at: new Date(Date.now() + delay).toISOString(),
    })
    .eq("id", row.id);
}

export async function processDueWebhooks(limit = 20) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("retail_webhook_events")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[retail webhook] retry query failed", error.message);
    return;
  }
  for (const row of (data ?? []) as RetailWebhookEvent[]) {
    await deliverWebhook(row);
  }
}

export async function pruneWebhookLog() {
  const admin = createServiceClient();
  const cutoff = new Date(
    Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  await admin.from("retail_webhook_events").delete().lt("created_at", cutoff);
}
