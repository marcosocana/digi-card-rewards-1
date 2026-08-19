-- ============ LOYALTY ============
create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  internal_name text not null,
  public_name text not null,
  description text,
  currency text not null default 'EUR',
  earning_mode public.earning_mode not null default 'points_per_currency_unit',
  earning_value numeric(12,4) not null default 1,
  rounding_mode public.rounding_mode not null default 'floor',
  initial_points integer not null default 0,
  points_expiry_months integer,
  allow_earning boolean not null default true,
  allow_redeeming boolean not null default true,
  status public.program_status not null default 'draft',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
grant select, insert, update on public.loyalty_programs to authenticated;
grant select on public.loyalty_programs to anon;
grant all on public.loyalty_programs to service_role;
alter table public.loyalty_programs enable row level security;
create policy "programs read" on public.loyalty_programs for select to authenticated using (public.is_org_member(organization_id));
create policy "programs public read" on public.loyalty_programs for select to anon using (status = 'active');
create policy "programs insert" on public.loyalty_programs for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "programs update" on public.loyalty_programs for update to authenticated using (public.is_org_admin(organization_id));

create table public.program_locations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  can_earn boolean not null default true,
  can_redeem boolean not null default true,
  unique (program_id, location_id)
);
grant select, insert, update, delete on public.program_locations to authenticated;
grant select on public.program_locations to anon;
grant all on public.program_locations to service_role;
alter table public.program_locations enable row level security;
create policy "proglocs read" on public.program_locations for select to authenticated
  using (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.is_org_member(p.organization_id)));
create policy "proglocs public read" on public.program_locations for select to anon using (true);
create policy "proglocs write" on public.program_locations for insert to authenticated
  with check (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.is_org_admin(p.organization_id)));
create policy "proglocs delete" on public.program_locations for delete to authenticated
  using (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.is_org_admin(p.organization_id)));

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  points_cost integer not null check (points_cost > 0),
  status public.program_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  display_order integer not null default 0,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
grant select, insert, update on public.rewards to authenticated;
grant select on public.rewards to anon;
grant all on public.rewards to service_role;
alter table public.rewards enable row level security;
create policy "rewards read" on public.rewards for select to authenticated
  using (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.is_org_member(p.organization_id)));
create policy "rewards public read" on public.rewards for select to anon using (status = 'active');
create policy "rewards insert" on public.rewards for insert to authenticated
  with check (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.is_org_admin(p.organization_id)));
create policy "rewards update" on public.rewards for update to authenticated
  using (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.is_org_admin(p.organization_id)));

create table public.reward_locations (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  unique (reward_id, location_id)
);
grant select, insert, delete on public.reward_locations to authenticated;
grant select on public.reward_locations to anon;
grant all on public.reward_locations to service_role;
alter table public.reward_locations enable row level security;
create policy "rewlocs read" on public.reward_locations for select to authenticated using (true);
create policy "rewlocs public read" on public.reward_locations for select to anon using (true);
create policy "rewlocs write" on public.reward_locations for insert to authenticated
  with check (exists (select 1 from public.rewards r join public.loyalty_programs p on p.id = r.program_id where r.id = reward_id and public.is_org_admin(p.organization_id)));
create policy "rewlocs delete" on public.reward_locations for delete to authenticated
  using (exists (select 1 from public.rewards r join public.loyalty_programs p on p.id = r.program_id where r.id = reward_id and public.is_org_admin(p.organization_id)));

-- ============ CUSTOMERS ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null unique,
  email text not null,
  first_name text not null,
  last_name text,
  birth_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  consent_type text not null,
  granted boolean not null default false,
  policy_version text not null default 'v1',
  source text,
  captured_at timestamptz not null default now()
);
grant select on public.customer_consents to authenticated;
grant all on public.customer_consents to service_role;
alter table public.customer_consents enable row level security;
create policy "consents read" on public.customer_consents for select to authenticated using (public.is_org_member(organization_id));

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  status public.membership_status not null default 'active',
  cached_points_balance integer not null default 0,
  joined_at timestamptz not null default now(),
  acquisition_location_id uuid references public.locations(id),
  acquisition_source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, program_id)
);
grant select on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;
create policy "memberships read" on public.memberships for select to authenticated using (public.is_org_member(organization_id));

create policy "customers read via membership" on public.customers for select to authenticated
  using (public.is_superadmin() or exists (
    select 1 from public.memberships m where m.customer_id = customers.id and public.is_org_member(m.organization_id)));

create table public.membership_tokens (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  token_hash text not null unique,
  short_code text not null unique,
  status text not null default 'active',
  expires_at timestamptz,
  rotated_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.membership_tokens to service_role;
alter table public.membership_tokens enable row level security;

-- ============ LEDGER ============
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id),
  performed_by_user_id uuid references auth.users(id),
  type public.txn_type not null,
  points_delta integer not null,
  amount_cents integer,
  currency text not null default 'EUR',
  previous_balance integer not null,
  resulting_balance integer not null,
  earning_rule_snapshot jsonb,
  ticket_reference text,
  note text,
  reason text,
  reversal_of_transaction_id uuid references public.point_transactions(id),
  reversed_at timestamptz,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index pt_membership_idx on public.point_transactions(membership_id, created_at desc);
create index pt_org_idx on public.point_transactions(organization_id, created_at desc);
grant select on public.point_transactions to authenticated;
grant all on public.point_transactions to service_role;
alter table public.point_transactions enable row level security;
create policy "txn read" on public.point_transactions for select to authenticated using (public.is_org_member(organization_id));

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.point_transactions(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id),
  performed_by_user_id uuid references auth.users(id),
  points_spent integer not null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
grant select on public.redemptions to authenticated;
grant all on public.redemptions to service_role;
alter table public.redemptions enable row level security;
create policy "redemptions read" on public.redemptions for select to authenticated using (public.is_org_member(organization_id));

-- ============ WALLET ============
create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  provider public.wallet_provider not null,
  provider_object_id text,
  serial_number text,
  status public.pass_status not null default 'pending_generation',
  is_sandbox boolean not null default true,
  installed_at timestamptz,
  last_generated_at timestamptz,
  last_update_requested_at timestamptz,
  last_updated_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (membership_id, provider)
);
grant select on public.wallet_passes to authenticated;
grant all on public.wallet_passes to service_role;
alter table public.wallet_passes enable row level security;
create policy "passes read" on public.wallet_passes for select to authenticated
  using (exists (select 1 from public.memberships m where m.id = membership_id and public.is_org_member(m.organization_id)));

create table public.wallet_devices (
  id uuid primary key default gen_random_uuid(),
  wallet_pass_id uuid not null references public.wallet_passes(id) on delete cascade,
  device_identifier text not null,
  push_token text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
grant all on public.wallet_devices to service_role;
alter table public.wallet_devices enable row level security;

create table public.wallet_jobs (
  id uuid primary key default gen_random_uuid(),
  wallet_pass_id uuid not null references public.wallet_passes(id) on delete cascade,
  job_type text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  scheduled_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
grant select on public.wallet_jobs to authenticated;
grant all on public.wallet_jobs to service_role;
alter table public.wallet_jobs enable row level security;
create policy "wallet jobs read" on public.wallet_jobs for select to authenticated using (public.is_superadmin());

-- ============ ACQUISITION ============
create table public.acquisition_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);
grant select, insert, update, delete on public.acquisition_sources to authenticated;
grant select on public.acquisition_sources to anon;
grant all on public.acquisition_sources to service_role;
alter table public.acquisition_sources enable row level security;
create policy "sources read" on public.acquisition_sources for select to authenticated using (public.is_org_member(organization_id));
create policy "sources public read" on public.acquisition_sources for select to anon using (status = 'active');
create policy "sources write" on public.acquisition_sources for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "sources update" on public.acquisition_sources for update to authenticated using (public.is_org_admin(organization_id));
create policy "sources delete" on public.acquisition_sources for delete to authenticated using (public.is_org_admin(organization_id));

create table public.acquisition_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.acquisition_sources(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  event_type text not null,
  anonymous_session_id text,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.acquisition_events to authenticated;
grant all on public.acquisition_events to service_role;
alter table public.acquisition_events enable row level security;
create policy "events read" on public.acquisition_events for select to authenticated using (public.is_org_member(organization_id));

-- ============ AUDIT ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_label text,
  organization_id uuid references public.organizations(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_org_idx on public.audit_logs(organization_id, created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit read" on public.audit_logs for select to authenticated
  using (public.is_superadmin() or (organization_id is not null and public.is_org_admin(organization_id)));

do $$ declare t text; begin
  foreach t in array array['profiles','organizations','organization_branding','locations','organization_users','loyalty_programs','rewards','customers','memberships','wallet_passes']
  loop execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t); end loop;
end $$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.my_org_ids(uuid) from public, anon;
revoke execute on function public.org_role_of(uuid,uuid) from public, anon;
revoke execute on function public.is_superadmin(uuid) from public, anon;
revoke execute on function public.is_org_member(uuid,uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid,uuid) from public, anon;
revoke execute on function public.can_access_location(uuid,uuid) from public, anon;