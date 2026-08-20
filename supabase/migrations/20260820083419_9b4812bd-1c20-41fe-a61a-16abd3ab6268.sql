-- Fideleo phase 1: tenant-owned customer data, campaigns, earned rewards,
-- complete business settings and secure customer lookup for the scanner.

alter table public.organizations
  add column if not exists category text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'ES',
  add column if not exists website text,
  add column if not exists instagram text,
  add column if not exists menu_url text,
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists plan_code text not null default 'starter',
  add column if not exists notification_daily_limit integer not null default 1 check (notification_daily_limit >= 0),
  add column if not exists onboarding_step integer not null default 1 check (onboarding_step between 1 and 5),
  add column if not exists onboarding_completed_at timestamptz;

alter table public.customers
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists phone text,
  add column if not exists normalized_phone text,
  add column if not exists internal_notes text,
  add column if not exists last_activity_at timestamptz;

update public.customers customer
   set organization_id = source.organization_id
  from (
    select distinct on (customer_id) customer_id, organization_id
      from public.memberships
     order by customer_id, joined_at
  ) source
 where source.customer_id = customer.id
   and customer.organization_id is null;

alter table public.customers drop constraint if exists customers_normalized_email_key;
create unique index if not exists customers_org_email_unique
  on public.customers (organization_id, normalized_email)
  where organization_id is not null;
create unique index if not exists customers_org_phone_unique
  on public.customers (organization_id, normalized_phone)
  where organization_id is not null and normalized_phone is not null;
create index if not exists customers_org_activity_idx
  on public.customers (organization_id, last_activity_at desc);

alter table public.loyalty_programs
  add column if not exists mechanic_type text not null default 'points'
    check (mechanic_type in ('spend','points','stamps','cashback','membership','coupon','gift_card')),
  add column if not exists minimum_purchase_cents integer not null default 1 check (minimum_purchase_cents >= 0),
  add column if not exists maximum_progress_per_purchase integer,
  add column if not exists mechanic_config jsonb not null default '{}'::jsonb;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid references public.loyalty_programs(id) on delete set null,
  reward_id uuid references public.rewards(id) on delete set null,
  internal_name text not null,
  public_name text not null,
  mechanic_type text not null default 'spend'
    check (mechanic_type in ('spend','points','stamps','cashback','membership','coupon','gift_card')),
  description text,
  rules jsonb not null default '{}'::jsonb,
  audience jsonb not null default '{"type":"all"}'::jsonb,
  image_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft','scheduled','active','paused','finished','archived')),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  terms text,
  is_primary boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists campaigns_org_status_idx on public.campaigns (organization_id, status, starts_at desc);
create unique index if not exists campaigns_one_primary_active
  on public.campaigns (organization_id) where is_primary and status = 'active' and archived_at is null;
grant select, insert, update on public.campaigns to authenticated;
grant select on public.campaigns to anon;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "campaigns read" on public.campaigns for select to authenticated
  using (public.is_org_member(organization_id));
create policy "campaigns public read" on public.campaigns for select to anon
  using (status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy "campaigns insert" on public.campaigns for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy "campaigns update" on public.campaigns for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create trigger trg_touch_campaigns before update on public.campaigns
  for each row execute function public.touch_updated_at();

create table if not exists public.campaign_locations (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, location_id)
);
grant select, insert, delete on public.campaign_locations to authenticated;
grant select on public.campaign_locations to anon;
grant all on public.campaign_locations to service_role;
alter table public.campaign_locations enable row level security;
create policy "campaign locations read" on public.campaign_locations for select to authenticated
  using (public.can_access_location(location_id));
create policy "campaign locations public read" on public.campaign_locations for select to anon using (true);
create policy "campaign locations insert" on public.campaign_locations for insert to authenticated
  with check (exists (
    select 1 from public.campaigns campaign
     where campaign.id = campaign_id and public.is_org_admin(campaign.organization_id)
  ));
create policy "campaign locations delete" on public.campaign_locations for delete to authenticated
  using (exists (
    select 1 from public.campaigns campaign
     where campaign.id = campaign_id and public.is_org_admin(campaign.organization_id)
  ));

create table if not exists public.customer_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  campaign_id uuid references public.campaigns(id) on delete set null,
  source_transaction_id uuid references public.point_transactions(id),
  redemption_id uuid references public.redemptions(id),
  status text not null default 'available'
    check (status in ('available','redeemed','expired','cancelled')),
  awarded_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reward_id, source_transaction_id)
);
create index if not exists customer_rewards_membership_idx
  on public.customer_rewards (membership_id, status, awarded_at desc);
grant select on public.customer_rewards to authenticated;
grant all on public.customer_rewards to service_role;
alter table public.customer_rewards enable row level security;
create policy "customer rewards read" on public.customer_rewards for select to authenticated
  using (exists (
    select 1 from public.memberships membership
     where membership.id = membership_id
       and (public.is_org_admin(membership.organization_id)
         or (membership.acquisition_location_id is not null and public.can_access_location(membership.acquisition_location_id)))
  ));
create trigger trg_touch_customer_rewards before update on public.customer_rewards
  for each row execute function public.touch_updated_at();

alter table public.redemptions
  add column if not exists customer_reward_id uuid references public.customer_rewards(id) on delete set null;

drop policy if exists "customers read via membership" on public.customers;
create policy "customers read via membership" on public.customers for select to authenticated
using (
  public.is_superadmin()
  or exists (
    select 1 from public.memberships membership
     where membership.customer_id = customers.id
       and (public.is_org_admin(membership.organization_id)
         or (membership.acquisition_location_id is not null and public.can_access_location(membership.acquisition_location_id)))
  )
);

insert into public.campaigns (
  id, organization_id, program_id, reward_id, internal_name, public_name,
  mechanic_type, description, rules, status, is_primary, starts_at, terms
)
select
  '66666666-6666-4666-8666-666666666661', program.organization_id, program.id,
  (select reward.id from public.rewards reward where reward.program_id = program.id order by reward.points_cost limit 1),
  'Campaña principal', program.public_name, 'spend', program.description,
  jsonb_build_object('points_per_euro', program.earning_value, 'minimum_purchase_cents', program.minimum_purchase_cents),
  case when program.status = 'active' then 'active' else 'draft' end,
  true, program.starts_at, program.terms
from public.loyalty_programs program
where program.organization_id = '11111111-1111-4111-8111-111111111111'
on conflict (id) do nothing;

insert into public.campaign_locations (campaign_id, location_id)
select '66666666-6666-4666-8666-666666666661', location_id
from public.program_locations
where program_id = '44444444-4444-4444-8444-444444444444'
on conflict do nothing;

-- Anonymous registration remains passwordless, but validates consent and keeps
-- customer identity inside one tenant.
create or replace function public.register_customer_and_membership(
  _program_id uuid, _email text, _first_name text, _last_name text default null,
  _birth_date date default null, _location_id uuid default null, _source_id uuid default null,
  _marketing boolean default false, _phone text default null, _terms_accepted boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare _org uuid; _cust uuid; _m public.memberships; _existing boolean := false;
        _prog public.loyalty_programs; _token text; _short text; _normalized_phone text;
begin
  if not _terms_accepted then raise exception 'TERMS_REQUIRED'; end if;
  if trim(coalesce(_first_name,'')) = '' then raise exception 'NAME_REQUIRED'; end if;
  if lower(trim(coalesce(_email,''))) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'INVALID_EMAIL'; end if;
  _normalized_phone := nullif(regexp_replace(coalesce(_phone,''), '[^0-9+]', '', 'g'), '');
  if _normalized_phone is not null and length(_normalized_phone) < 7 then raise exception 'INVALID_PHONE'; end if;

  select * into _prog from public.loyalty_programs where id = _program_id;
  if _prog is null or _prog.status <> 'active' then raise exception 'PROGRAM_NOT_AVAILABLE'; end if;
  _org := _prog.organization_id;
  if _location_id is not null and not exists (
    select 1 from public.locations where id = _location_id and organization_id = _org and status = 'active'
  ) then raise exception 'LOCATION_NOT_AVAILABLE'; end if;

  select id into _cust from public.customers
   where organization_id = _org and normalized_email = lower(trim(_email));
  if _cust is null then
    insert into public.customers (organization_id, normalized_email, email, first_name, last_name, birth_date, phone, normalized_phone)
    values (_org, lower(trim(_email)), trim(_email), trim(_first_name), nullif(trim(_last_name),''), _birth_date,
      nullif(trim(_phone),''), _normalized_phone) returning id into _cust;
  end if;

  select * into _m from public.memberships where customer_id = _cust and program_id = _program_id;
  if _m.id is not null then _existing := true;
  else
    insert into public.memberships (customer_id, organization_id, program_id, cached_points_balance, acquisition_location_id, acquisition_source_id)
    values (_cust, _org, _program_id, greatest(_prog.initial_points,0), _location_id, _source_id) returning * into _m;
    if _prog.initial_points > 0 then
      insert into public.point_transactions (membership_id, organization_id, location_id, type, points_delta, previous_balance, resulting_balance, note)
      values (_m.id, _org, _location_id, 'initial_bonus', _prog.initial_points, 0, _prog.initial_points, 'Saldo inicial del programa');
    end if;
    _token := encode(extensions.gen_random_bytes(24), 'hex');
    _short := upper(substr(replace(encode(extensions.gen_random_bytes(8),'hex'),'0','X'), 1, 8));
    insert into public.membership_tokens (membership_id, token_hash, short_code) values (_m.id, public.hash_token(_token), _short);
    insert into public.wallet_passes (membership_id, provider, status, serial_number)
    values (_m.id,'apple','pending_generation', _m.public_id::text), (_m.id,'google','pending_generation', _m.public_id::text);
    insert into public.customer_consents (customer_id, organization_id, consent_type, granted, source)
    values (_cust, _org, 'terms_privacy', true, 'landing'), (_cust, _org, 'marketing', coalesce(_marketing,false), 'landing');
    insert into public.acquisition_events (organization_id, source_id, location_id, event_type, customer_id)
    values (_org, _source_id, _location_id, 'registration_completed', _cust);
  end if;
  return jsonb_build_object('existing', _existing, 'membership_public_id', _m.public_id,
    'token', _token, 'customer_id', _cust);
end; $$;
revoke all on function public.register_customer_and_membership(uuid,text,text,text,date,uuid,uuid,boolean,text,boolean) from public;
grant execute on function public.register_customer_and_membership(uuid,text,text,text,date,uuid,uuid,boolean,text,boolean) to anon, authenticated;

create or replace function public.membership_service_payload(_membership_id uuid, _location_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'membership_id', membership.id, 'public_id', membership.public_id, 'balance', membership.cached_points_balance,
    'customer_name', trim(coalesce(customer.first_name,'') || ' ' || coalesce(customer.last_name,'')),
    'customer_email', customer.email, 'customer_phone', customer.phone, 'short_code', token.short_code,
    'program', jsonb_build_object('id',program.id,'name',program.public_name,'earning_mode',program.earning_mode,
      'earning_value',program.earning_value,'rounding_mode',program.rounding_mode,'allow_earning',program.allow_earning,
      'allow_redeeming',program.allow_redeeming),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('id',reward.id,'name',reward.name,
      'points_cost',reward.points_cost,'available',membership.cached_points_balance >= reward.points_cost)
      order by reward.display_order, reward.points_cost)
      from public.rewards reward where reward.program_id = program.id and reward.status = 'active'
        and (not exists (select 1 from public.reward_locations rl where rl.reward_id = reward.id)
          or exists (select 1 from public.reward_locations rl where rl.reward_id = reward.id and rl.location_id = _location_id))), '[]'::jsonb),
    'last_transaction', (select jsonb_build_object('type',txn.type,'points_delta',txn.points_delta,'created_at',txn.created_at)
      from public.point_transactions txn where txn.membership_id = membership.id order by txn.created_at desc limit 1)
  )
  from public.memberships membership
  join public.customers customer on customer.id = membership.customer_id
  join public.loyalty_programs program on program.id = membership.program_id
  left join lateral (select short_code from public.membership_tokens where membership_id = membership.id and status='active' limit 1) token on true
  where membership.id = _membership_id and membership.status = 'active' and program.status = 'active'
    and exists (select 1 from public.program_locations where program_id = program.id and location_id = _location_id);
$$;
revoke all on function public.membership_service_payload(uuid,uuid) from public, anon, authenticated;

create or replace function public.search_memberships(_query text, _location_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _org uuid; _result jsonb;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select organization_id into _org from public.locations where id = _location_id;
  if length(trim(coalesce(_query,''))) < 2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(public.membership_service_payload(found.id, _location_id)), '[]'::jsonb) into _result
  from (
    select membership.id
      from public.memberships membership
      join public.customers customer on customer.id = membership.customer_id
      left join public.membership_tokens token on token.membership_id = membership.id and token.status = 'active'
     where membership.organization_id = _org and membership.status = 'active'
       and (customer.first_name ilike '%'||trim(_query)||'%' or coalesce(customer.last_name,'') ilike '%'||trim(_query)||'%'
         or customer.email ilike '%'||trim(_query)||'%' or coalesce(customer.phone,'') ilike '%'||trim(_query)||'%'
         or token.short_code ilike '%'||trim(_query)||'%')
     order by customer.last_activity_at desc nulls last, membership.joined_at desc
     limit 10
  ) found;
  return _result;
end; $$;
revoke all on function public.search_memberships(text,uuid) from public, anon;
grant execute on function public.search_memberships(text,uuid) to authenticated;

create or replace function public.record_purchase(
  _membership_id uuid, _location_id uuid, _amount_cents integer,
  _ticket_reference text default null, _note text default null, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _m public.memberships; _prog public.loyalty_programs; _pts integer; _prev integer; _new integer;
        _t public.point_transactions; _earned jsonb;
begin
  if _amount_cents is null or _amount_cents <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if _amount_cents > 1000000 then raise exception 'AMOUNT_TOO_LARGE'; end if;
  if _idempotency_key is not null then
    select * into _t from public.point_transactions where idempotency_key = _idempotency_key;
    if _t.id is not null then return jsonb_build_object('duplicate', true, 'transaction_id', _t.id, 'resulting_balance', _t.resulting_balance); end if;
  end if;
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select * into _m from public.memberships where id = _membership_id for update;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if _m.status <> 'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  if _prog.status <> 'active' or not _prog.allow_earning then raise exception 'PROGRAM_PAUSED'; end if;
  if _amount_cents < _prog.minimum_purchase_cents then raise exception 'PURCHASE_BELOW_MINIMUM'; end if;
  if not exists (select 1 from public.program_locations where program_id = _prog.id and location_id = _location_id and can_earn)
    then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;

  _pts := public.compute_points(_amount_cents, _prog.earning_mode, _prog.earning_value, _prog.rounding_mode);
  if _prog.maximum_progress_per_purchase is not null then _pts := least(_pts, _prog.maximum_progress_per_purchase); end if;
  _prev := _m.cached_points_balance; _new := _prev + _pts;
  insert into public.point_transactions (membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, amount_cents, currency, previous_balance, resulting_balance, earning_rule_snapshot, ticket_reference, note, idempotency_key)
  values (_m.id, _m.organization_id, _location_id, auth.uid(), 'purchase', _pts, _amount_cents, _prog.currency, _prev, _new,
    jsonb_build_object('earning_mode',_prog.earning_mode,'earning_value',_prog.earning_value,'rounding_mode',_prog.rounding_mode,
      'minimum_purchase_cents',_prog.minimum_purchase_cents,'maximum_progress_per_purchase',_prog.maximum_progress_per_purchase),
    _ticket_reference, _note, _idempotency_key) returning * into _t;
  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  update public.customers set last_activity_at = now() where id = _m.customer_id;

  insert into public.customer_rewards (organization_id, membership_id, reward_id, campaign_id, source_transaction_id)
  select _m.organization_id, _m.id, reward.id,
    (select campaign.id from public.campaigns campaign where campaign.program_id = _prog.id and campaign.status='active' order by campaign.is_primary desc limit 1),
    _t.id
  from public.rewards reward
  where reward.program_id = _prog.id and reward.status = 'active'
    and _prev < reward.points_cost and _new >= reward.points_cost
  on conflict (reward_id, source_transaction_id) do nothing;

  select coalesce(jsonb_agg(jsonb_build_object('id',reward.id,'name',reward.name)), '[]'::jsonb) into _earned
    from public.customer_rewards earned join public.rewards reward on reward.id = earned.reward_id
   where earned.source_transaction_id = _t.id;
  perform public.queue_wallet_update(_m.id, 'purchase');
  insert into public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _m.organization_id, 'purchase_recorded', 'point_transaction', _t.id,
    jsonb_build_object('amount_cents',_amount_cents,'points',_pts,'previous',_prev,'resulting',_new,'earned_rewards',_earned));
  return jsonb_build_object('duplicate', false, 'transaction_id', _t.id, 'points_awarded', _pts,
    'previous_balance', _prev, 'resulting_balance', _new, 'earned_rewards', _earned);
end; $$;

create or replace function public.redeem_reward(
  _membership_id uuid, _reward_id uuid, _location_id uuid, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _m public.memberships; _r public.rewards; _prog public.loyalty_programs; _prev integer; _new integer;
        _t public.point_transactions; _red uuid; _customer_reward uuid;
begin
  if _idempotency_key is not null then
    select * into _t from public.point_transactions where idempotency_key = _idempotency_key;
    if _t.id is not null then return jsonb_build_object('duplicate', true, 'transaction_id', _t.id, 'resulting_balance', _t.resulting_balance); end if;
  end if;
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select * into _m from public.memberships where id = _membership_id for update;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if _m.status <> 'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _r from public.rewards where id = _reward_id;
  if _r is null or _r.status <> 'active' or _r.program_id <> _m.program_id then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  if _prog.status <> 'active' or not _prog.allow_redeeming then raise exception 'PROGRAM_PAUSED'; end if;
  if not exists (select 1 from public.program_locations where program_id = _prog.id and location_id = _location_id and can_redeem)
    then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;
  if exists (select 1 from public.reward_locations where reward_id = _r.id)
    and not exists (select 1 from public.reward_locations where reward_id = _r.id and location_id = _location_id)
    then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  _prev := _m.cached_points_balance;
  if _prev < _r.points_cost then raise exception 'INSUFFICIENT_POINTS'; end if;
  _new := _prev - _r.points_cost;

  select id into _customer_reward from public.customer_rewards
   where membership_id = _m.id and reward_id = _r.id and status = 'available'
   order by awarded_at for update skip locked limit 1;
  if _customer_reward is null then
    insert into public.customer_rewards (organization_id, membership_id, reward_id, status)
    values (_m.organization_id, _m.id, _r.id, 'available') returning id into _customer_reward;
  end if;
  insert into public.point_transactions (membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, previous_balance, resulting_balance, note, idempotency_key)
  values (_m.id, _m.organization_id, _location_id, auth.uid(), 'redemption', -_r.points_cost, _prev, _new, _r.name, _idempotency_key)
  returning * into _t;
  insert into public.redemptions (transaction_id, reward_id, membership_id, organization_id, location_id,
    performed_by_user_id, points_spent, customer_reward_id)
  values (_t.id, _r.id, _m.id, _m.organization_id, _location_id, auth.uid(), _r.points_cost, _customer_reward)
  returning id into _red;
  update public.customer_rewards set status='redeemed', redeemed_at=now(), redemption_id=_red where id=_customer_reward;
  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  update public.customers set last_activity_at = now() where id = _m.customer_id;
  perform public.queue_wallet_update(_m.id, 'redemption');
  insert into public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _m.organization_id, 'reward_redeemed', 'redemption', _red,
    jsonb_build_object('reward',_r.name,'points',_r.points_cost,'previous',_prev,'resulting',_new));
  return jsonb_build_object('duplicate', false, 'transaction_id', _t.id, 'reward_name', _r.name,
    'points_spent', _r.points_cost, 'previous_balance', _prev, 'resulting_balance', _new, 'customer_reward_id', _customer_reward);
end; $$;

insert into public.customer_rewards (organization_id, membership_id, reward_id, status)
select membership.organization_id, membership.id, reward.id, 'available'
from public.memberships membership
join public.rewards reward on reward.program_id = membership.program_id and reward.status = 'active'
where membership.cached_points_balance >= reward.points_cost
  and not exists (select 1 from public.customer_rewards existing where existing.membership_id=membership.id and existing.reward_id=reward.id and existing.status='available');

-- The ledger can only be appended to; reversal metadata is the sole permitted update.
create or replace function public.protect_point_transaction() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_LEDGER'; end if;
  if new.id <> old.id or new.membership_id <> old.membership_id or new.organization_id <> old.organization_id
    or new.type <> old.type or new.points_delta <> old.points_delta or new.previous_balance <> old.previous_balance
    or new.resulting_balance <> old.resulting_balance or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_LEDGER';
  end if;
  return new;
end; $$;
create trigger trg_protect_point_transactions
  before update or delete on public.point_transactions
  for each row execute function public.protect_point_transaction();
revoke all on function public.protect_point_transaction() from public, anon, authenticated;

update public.organizations set
  category = coalesce(category, 'Cafetería'), address_line = coalesce(address_line, 'Calle Fuencarral 45'),
  city = coalesce(city, 'Madrid'), postal_code = coalesce(postal_code, '28004'), website = coalesce(website, 'https://cafenorte.es'),
  instagram = coalesce(instagram, '@cafenorte'), onboarding_step = 5, onboarding_completed_at = coalesce(onboarding_completed_at, now())
where id = '11111111-1111-4111-8111-111111111111';