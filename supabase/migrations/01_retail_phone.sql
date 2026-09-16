-- Add phone to retail identities (collected on send).
alter table public.retail_identities
  add column if not exists phone text not null default '';
