export type ServiceType = "Supply & Install" | "Supply Only";

export type TrackingParams = {
  path: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
};

export type RetailIdentity = {
  id: string;
  email: string;
  first_name: string;
  phone: string;
  postcode: string;
  marketing_consent: boolean;
  reentry_token: string;
  path: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
  created_at: string;
  updated_at: string;
};

export type RetailDesignStatus = "draft" | "sent";

export type RetailDesign = {
  id: string;
  identity_id: string;
  design_ref: string | null;
  status: RetailDesignStatus;
  payload: Record<string, unknown>;
  summary: string | null;
  system: string | null;
  finish: string | null;
  measurements: string | null;
  supply_price_ex_freight: number | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RetailWebhookStatus = "pending" | "delivered" | "failed";

export type RetailWebhookEvent = {
  id: string;
  event_id: string;
  event: string;
  payload: Record<string, unknown>;
  status: RetailWebhookStatus;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
};
