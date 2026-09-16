import { NextResponse, type NextRequest } from "next/server";
import { processDueWebhooks, pruneWebhookLog } from "@/lib/webhook";

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerKey = request.headers.get("x-hsss-key") ?? "";
  if (secret && (bearer === secret || headerKey === secret)) return true;
  const vercelCron = request.headers.get("x-vercel-cron");
  return Boolean(vercelCron);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  await processDueWebhooks();
  await pruneWebhookLog();
  return NextResponse.json({ ok: true });
}
