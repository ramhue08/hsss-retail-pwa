-- Retail (DIY) identities, designs, webhook log, and PDF storage.
-- Same Supabase project as Builder; tables are isolated.

create table if not exists public.retail_identities (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  postcode text not null,
  marketing_consent boolean not null default false,
  reentry_token text not null unique,
  path text not null default 'diy',
  utm_source text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  fbclid text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists retail_identities_email_lower_idx
  on public.retail_identities (lower(email));

create index if not exists retail_identities_token_idx
  on public.retail_identities (reentry_token);

create table if not exists public.retail_designs (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.retail_identities(id) on delete cascade,
  design_ref text unique,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  payload jsonb not null default '{}',
  summary text,
  system text,
  finish text,
  measurements text,
  supply_price_ex_freight numeric,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists retail_designs_one_draft_idx
  on public.retail_designs (identity_id)
  where status = 'draft';

create index if not exists retail_designs_identity_idx
  on public.retail_designs (identity_id, updated_at desc);

create sequence if not exists public.retail_design_ref_seq start with 1 increment by 1;

create or replace function public.next_retail_design_ref()
returns text
language sql
as $$
  select 'D-' || lpad(nextval('public.retail_design_ref_seq')::text, 6, '0');
$$;

create table if not exists public.retail_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempts integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists retail_webhook_events_retry_idx
  on public.retail_webhook_events (status, next_retry_at)
  where status = 'pending';

create index if not exists retail_webhook_events_created_idx
  on public.retail_webhook_events (created_at desc);

alter table public.retail_identities enable row level security;
alter table public.retail_designs enable row level security;
alter table public.retail_webhook_events enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retail-designs', 'retail-designs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

revoke all on function public.next_retail_design_ref() from public;
grant execute on function public.next_retail_design_ref() to service_role;
grant all on table public.retail_identities to service_role;
grant all on table public.retail_designs to service_role;
grant all on table public.retail_webhook_events to service_role;
grant usage, select on sequence public.retail_design_ref_seq to service_role;

