create table if not exists public.transactional_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null check (kind in ('account_welcome', 'team_invitation', 'membership_welcome', 'password_changed')),
  recipient text not null,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists transactional_email_deliveries_kind_created_idx
  on public.transactional_email_deliveries(kind, created_at desc);

alter table public.transactional_email_deliveries enable row level security;
revoke all on public.transactional_email_deliveries from public, anon, authenticated;
grant all on public.transactional_email_deliveries to service_role;

