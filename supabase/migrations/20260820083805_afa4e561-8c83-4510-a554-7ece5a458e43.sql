-- Phase 4: generalized loyalty accounts, tiers, coupons, gift cards and POS integration contracts.

create table public.membership_tiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  name text not null,
  rank integer not null default 0,
  minimum_progress integer not null default 0,
  benefits jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id,name)
);
grant select,insert,update on public.membership_tiers to authenticated;
grant all on public.membership_tiers to service_role;
alter table public.membership_tiers enable row level security;
create policy "tiers read" on public.membership_tiers for select to authenticated using(public.is_org_member(organization_id));
create policy "tiers write" on public.membership_tiers for insert to authenticated with check(public.is_org_admin(organization_id));
create policy "tiers update" on public.membership_tiers for update to authenticated using(public.is_org_admin(organization_id)) with check(public.is_org_admin(organization_id));
create trigger trg_touch_membership_tiers before update on public.membership_tiers for each row execute function public.touch_updated_at();

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null unique references public.memberships(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  tier_id uuid references public.membership_tiers(id) on delete set null,
  mechanic_type text not null default 'points',
  progress_balance integer not null default 0,
  lifetime_progress integer not null default 0,
  lifetime_spend_cents bigint not null default 0,
  visit_count integer not null default 0,
  stamp_balance integer not null default 0,
  cashback_balance_cents integer not null default 0,
  membership_started_at timestamptz,
  membership_ends_at timestamptz,
  status text not null default 'active' check(status in ('active','suspended','expired','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loyalty_accounts_org_idx on public.loyalty_accounts(organization_id,status);
grant select on public.loyalty_accounts to authenticated;
grant all on public.loyalty_accounts to service_role;
alter table public.loyalty_accounts enable row level security;
create policy "loyalty accounts read" on public.loyalty_accounts for select to authenticated using(
  public.is_org_admin(organization_id) or exists(select 1 from public.memberships m where m.id=membership_id and m.acquisition_location_id is not null and public.can_access_location(m.acquisition_location_id))
);
create trigger trg_touch_loyalty_accounts before update on public.loyalty_accounts for each row execute function public.touch_updated_at();

create table public.loyalty_account_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id),
  performed_by_user_id uuid references auth.users(id),
  type text not null check(type in ('purchase','stamp','cashback_earned','cashback_spent','membership_validated','coupon_redeemed','gift_card_spent','adjustment','reversal')),
  value_before integer not null,
  value_delta integer not null,
  value_after integer not null,
  amount_cents integer,
  metadata jsonb not null default '{}'::jsonb,
  related_point_transaction_id uuid references public.point_transactions(id),
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create index loyalty_account_tx_account_idx on public.loyalty_account_transactions(account_id,created_at desc);
grant select on public.loyalty_account_transactions to authenticated;
grant all on public.loyalty_account_transactions to service_role;
alter table public.loyalty_account_transactions enable row level security;
create policy "loyalty account transactions read" on public.loyalty_account_transactions for select to authenticated using(
  public.is_org_admin(organization_id) or (location_id is not null and public.can_access_location(location_id))
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  code text not null,
  title text not null,
  description text,
  discount_type text not null check(discount_type in ('percentage','fixed_amount')),
  discount_value integer not null check(discount_value>0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  maximum_uses integer,
  used_count integer not null default 0,
  single_use_per_customer boolean not null default true,
  converts_to_membership boolean not null default false,
  status text not null default 'draft' check(status in ('draft','active','paused','expired','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(organization_id,code)
);
grant select,insert,update on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "coupons read" on public.coupons for select to authenticated using(public.is_org_admin(organization_id));
create policy "coupons insert" on public.coupons for insert to authenticated with check(public.is_org_admin(organization_id));
create policy "coupons update" on public.coupons for update to authenticated using(public.is_org_admin(organization_id)) with check(public.is_org_admin(organization_id));
create trigger trg_touch_coupons before update on public.coupons for each row execute function public.touch_updated_at();

create table public.customer_coupons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  location_id uuid references public.locations(id),
  status text not null default 'assigned' check(status in ('assigned','redeemed','expired','cancelled')),
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique(coupon_id,membership_id),
  unique(organization_id,idempotency_key)
);
grant select on public.customer_coupons to authenticated;
grant all on public.customer_coupons to service_role;
alter table public.customer_coupons enable row level security;
create policy "customer coupons read" on public.customer_coupons for select to authenticated using(public.is_org_admin(organization_id) or (location_id is not null and public.can_access_location(location_id)));

create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  initial_balance_cents integer not null check(initial_balance_cents>0),
  remaining_balance_cents integer not null check(remaining_balance_cents>=0),
  purchaser_name text,
  purchaser_email text,
  recipient_name text,
  recipient_email text,
  message text,
  expires_at timestamptz,
  status text not null default 'active' check(status in ('draft','active','depleted','expired','suspended','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
grant select,insert,update on public.gift_cards to authenticated;
grant all on public.gift_cards to service_role;
alter table public.gift_cards enable row level security;
create policy "gift cards read" on public.gift_cards for select to authenticated using(public.is_org_admin(organization_id));
create policy "gift cards insert" on public.gift_cards for insert to authenticated with check(public.is_org_admin(organization_id));
create policy "gift cards update" on public.gift_cards for update to authenticated using(public.is_org_admin(organization_id)) with check(public.is_org_admin(organization_id));
create trigger trg_touch_gift_cards before update on public.gift_cards for each row execute function public.touch_updated_at();

create table public.gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references public.gift_cards(id),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id),
  performed_by_user_id uuid references auth.users(id),
  type text not null check(type in ('issue','consume','refund','adjustment','expiry')),
  amount_delta_cents integer not null,
  previous_balance_cents integer not null,
  resulting_balance_cents integer not null,
  note text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
grant select on public.gift_card_transactions to authenticated;
grant all on public.gift_card_transactions to service_role;
alter table public.gift_card_transactions enable row level security;
create policy "gift card transactions read" on public.gift_card_transactions for select to authenticated using(public.is_org_admin(organization_id) or (location_id is not null and public.can_access_location(location_id)));

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check(status in ('disconnected','pending','active','error','revoked')),
  configuration jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,provider)
);
grant select,insert,update on public.integration_connections to authenticated;
grant all on public.integration_connections to service_role;
alter table public.integration_connections enable row level security;
create policy "integrations read" on public.integration_connections for select to authenticated using(public.is_org_admin(organization_id));
create policy "integrations insert" on public.integration_connections for insert to authenticated with check(public.is_org_admin(organization_id));
create policy "integrations update" on public.integration_connections for update to authenticated using(public.is_org_admin(organization_id)) with check(public.is_org_admin(organization_id));
create trigger trg_touch_integration_connections before update on public.integration_connections for each row execute function public.touch_updated_at();

create table public.external_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete set null,
  external_id text not null,
  operation_type text not null,
  payload jsonb not null,
  status text not null default 'received' check(status in ('received','processing','completed','failed','duplicate')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(organization_id,external_id)
);
grant select on public.external_operations to authenticated;
grant all on public.external_operations to service_role;
alter table public.external_operations enable row level security;
create policy "external operations read" on public.external_operations for select to authenticated using(public.is_org_admin(organization_id));

insert into public.loyalty_accounts(organization_id,membership_id,program_id,mechanic_type,progress_balance,lifetime_progress,lifetime_spend_cents,visit_count)
select m.organization_id,m.id,m.program_id,p.mechanic_type,m.cached_points_balance,
  greatest(m.cached_points_balance,coalesce((select sum(greatest(t.points_delta,0)) from public.point_transactions t where t.membership_id=m.id),0)),
  coalesce((select sum(t.amount_cents) from public.point_transactions t where t.membership_id=m.id and t.type='purchase'),0),
  coalesce((select count(*) from public.point_transactions t where t.membership_id=m.id and t.type='purchase'),0)
from public.memberships m join public.loyalty_programs p on p.id=m.program_id
on conflict(membership_id) do nothing;

create or replace function public.record_purchase(
  _membership_id uuid, _location_id uuid, _amount_cents integer,
  _ticket_reference text default null, _note text default null, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare _m public.memberships; _prog public.loyalty_programs; _progress integer; _prev integer; _new integer;
        _t public.point_transactions; _earned jsonb; _account public.loyalty_accounts; _unit text;
begin
  if _amount_cents is null or _amount_cents<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if _amount_cents>1000000 then raise exception 'AMOUNT_TOO_LARGE'; end if;
  if _idempotency_key is not null then select * into _t from public.point_transactions where idempotency_key=_idempotency_key;
    if _t.id is not null then return jsonb_build_object('duplicate',true,'transaction_id',_t.id,'resulting_balance',_t.resulting_balance); end if; end if;
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select * into _m from public.memberships where id=_membership_id for update;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if _m.status<>'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _prog from public.loyalty_programs where id=_m.program_id;
  if _prog.status<>'active' or not _prog.allow_earning then raise exception 'PROGRAM_PAUSED'; end if;
  if _amount_cents<_prog.minimum_purchase_cents then raise exception 'PURCHASE_BELOW_MINIMUM'; end if;
  if not exists(select 1 from public.program_locations where program_id=_prog.id and location_id=_location_id and can_earn) then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;

  if _prog.mechanic_type='stamps' then _progress:=greatest(coalesce((_prog.mechanic_config->>'stamps_per_purchase')::int,1),1); _unit:='sellos';
  elsif _prog.mechanic_type='cashback' then _progress:=floor(_amount_cents*coalesce((_prog.mechanic_config->>'percentage')::numeric,5)/100)::int; _unit:='céntimos de cashback';
  elsif _prog.mechanic_type='membership' then _progress:=0; _unit:='visitas';
  else _progress:=public.compute_points(_amount_cents,_prog.earning_mode,_prog.earning_value,_prog.rounding_mode); _unit:=case when _prog.mechanic_type='spend' then '€ acumulados' else 'puntos' end;
  end if;
  if _prog.maximum_progress_per_purchase is not null then _progress:=least(_progress,_prog.maximum_progress_per_purchase); end if;
  _prev:=_m.cached_points_balance; _new:=_prev+_progress;
  insert into public.point_transactions(membership_id,organization_id,location_id,performed_by_user_id,type,points_delta,amount_cents,currency,previous_balance,resulting_balance,earning_rule_snapshot,ticket_reference,note,idempotency_key)
  values(_m.id,_m.organization_id,_location_id,auth.uid(),'purchase',_progress,_amount_cents,_prog.currency,_prev,_new,
    jsonb_build_object('mechanic_type',_prog.mechanic_type,'earning_mode',_prog.earning_mode,'earning_value',_prog.earning_value,'config',_prog.mechanic_config),_ticket_reference,_note,_idempotency_key) returning * into _t;
  update public.memberships set cached_points_balance=_new,updated_at=now() where id=_m.id;
  update public.customers set last_activity_at=now() where id=_m.customer_id;
  insert into public.loyalty_accounts(organization_id,membership_id,program_id,mechanic_type,progress_balance,lifetime_progress,lifetime_spend_cents,visit_count,stamp_balance,cashback_balance_cents)
  values(_m.organization_id,_m.id,_m.program_id,_prog.mechanic_type,_new,greatest(_progress,0),_amount_cents,1,
    case when _prog.mechanic_type='stamps' then _new else 0 end,case when _prog.mechanic_type='cashback' then _new else 0 end)
  on conflict(membership_id) do update set mechanic_type=excluded.mechanic_type,progress_balance=_new,
    lifetime_progress=public.loyalty_accounts.lifetime_progress+greatest(_progress,0),
    lifetime_spend_cents=public.loyalty_accounts.lifetime_spend_cents+_amount_cents,visit_count=public.loyalty_accounts.visit_count+1,
    stamp_balance=case when _prog.mechanic_type='stamps' then _new else public.loyalty_accounts.stamp_balance end,
    cashback_balance_cents=case when _prog.mechanic_type='cashback' then _new else public.loyalty_accounts.cashback_balance_cents end,
    updated_at=now() returning * into _account;
  update public.loyalty_accounts account set tier_id=(select tier.id from public.membership_tiers tier where tier.program_id=account.program_id and tier.minimum_progress<=account.lifetime_progress and tier.status='active' order by tier.minimum_progress desc limit 1) where id=_account.id;
  insert into public.loyalty_account_transactions(account_id,organization_id,location_id,performed_by_user_id,type,value_before,value_delta,value_after,amount_cents,metadata,related_point_transaction_id,idempotency_key)
  values(_account.id,_m.organization_id,_location_id,auth.uid(),'purchase',_prev,_progress,_new,_amount_cents,jsonb_build_object('mechanic_type',_prog.mechanic_type),_t.id,_idempotency_key);
  insert into public.customer_rewards(organization_id,membership_id,reward_id,campaign_id,source_transaction_id)
  select _m.organization_id,_m.id,reward.id,(select id from public.campaigns where program_id=_prog.id and status='active' order by is_primary desc limit 1),_t.id
  from public.rewards reward where reward.program_id=_prog.id and reward.status='active' and _prev<reward.points_cost and _new>=reward.points_cost
  on conflict(reward_id,source_transaction_id) do nothing;
  select coalesce(jsonb_agg(jsonb_build_object('id',reward.id,'name',reward.name)),'[]'::jsonb) into _earned from public.customer_rewards earned join public.rewards reward on reward.id=earned.reward_id where earned.source_transaction_id=_t.id;
  perform public.queue_wallet_update(_m.id,'purchase');
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,metadata) values(auth.uid(),_m.organization_id,'purchase_recorded','point_transaction',_t.id,jsonb_build_object('amount_cents',_amount_cents,'progress',_progress,'mechanic_type',_prog.mechanic_type,'previous',_prev,'resulting',_new,'earned_rewards',_earned));
  return jsonb_build_object('duplicate',false,'transaction_id',_t.id,'points_awarded',_progress,'progress_awarded',_progress,'unit',_unit,'mechanic_type',_prog.mechanic_type,'previous_balance',_prev,'resulting_balance',_new,'earned_rewards',_earned);
end; $$;

create or replace function public.membership_service_payload(_membership_id uuid,_location_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'membership_id',m.id,'public_id',m.public_id,'balance',m.cached_points_balance,
    'customer_name',trim(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')),'customer_email',c.email,'customer_phone',c.phone,'short_code',token.short_code,
    'program',jsonb_build_object('id',p.id,'name',p.public_name,'mechanic_type',p.mechanic_type,'mechanic_config',p.mechanic_config,
      'earning_mode',p.earning_mode,'earning_value',p.earning_value,'rounding_mode',p.rounding_mode,'allow_earning',p.allow_earning,'allow_redeeming',p.allow_redeeming),
    'account',jsonb_build_object('progress_balance',a.progress_balance,'lifetime_spend_cents',a.lifetime_spend_cents,'visit_count',a.visit_count,
      'stamp_balance',a.stamp_balance,'cashback_balance_cents',a.cashback_balance_cents,'tier',tier.name),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'points_cost',r.points_cost,'available',m.cached_points_balance>=r.points_cost) order by r.display_order,r.points_cost)
      from public.rewards r where r.program_id=p.id and r.status='active' and (not exists(select 1 from public.reward_locations rl where rl.reward_id=r.id) or exists(select 1 from public.reward_locations rl where rl.reward_id=r.id and rl.location_id=_location_id))),'[]'::jsonb),
    'last_transaction',(select jsonb_build_object('type',t.type,'points_delta',t.points_delta,'created_at',t.created_at) from public.point_transactions t where t.membership_id=m.id order by t.created_at desc limit 1)
  )
  from public.memberships m join public.customers c on c.id=m.customer_id join public.loyalty_programs p on p.id=m.program_id
  left join public.loyalty_accounts a on a.membership_id=m.id left join public.membership_tiers tier on tier.id=a.tier_id
  left join lateral(select short_code from public.membership_tokens where membership_id=m.id and status='active' limit 1) token on true
  where m.id=_membership_id and m.status='active' and p.status='active' and exists(select 1 from public.program_locations where program_id=p.id and location_id=_location_id);
$$;
revoke all on function public.membership_service_payload(uuid,uuid) from public,anon,authenticated;

create or replace function public.resolve_membership_qr(_token text,_location_id uuid)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare _membership_id uuid; _status text; _payload jsonb;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select membership_id,status into _membership_id,_status from public.membership_tokens where token_hash=public.hash_token(_token) or short_code=upper(trim(_token));
  if _membership_id is null then raise exception 'TOKEN_NOT_FOUND'; end if;
  if _status<>'active' then raise exception 'TOKEN_REVOKED'; end if;
  select public.membership_service_payload(_membership_id,_location_id) into _payload;
  if _payload is null then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  return _payload;
end; $$;

create or replace function public.issue_gift_card(_organization_id uuid,_initial_balance_cents integer,_recipient_name text default null,_recipient_email text default null,_expires_at timestamptz default null,_message text default null)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare _code text; _card public.gift_cards;
begin
  if not public.is_org_admin(_organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if _initial_balance_cents is null or _initial_balance_cents<=0 or _initial_balance_cents>1000000 then raise exception 'INVALID_AMOUNT'; end if;
  _code:=upper(encode(extensions.gen_random_bytes(10),'hex'));
  insert into public.gift_cards(organization_id,code_hash,code_hint,initial_balance_cents,remaining_balance_cents,recipient_name,recipient_email,expires_at,message,created_by)
  values(_organization_id,public.hash_token(_code),'•••• '||right(_code,4),_initial_balance_cents,_initial_balance_cents,nullif(trim(_recipient_name),''),nullif(trim(_recipient_email),''),_expires_at,nullif(trim(_message),''),auth.uid()) returning * into _card;
  insert into public.gift_card_transactions(gift_card_id,organization_id,performed_by_user_id,type,amount_delta_cents,previous_balance_cents,resulting_balance_cents,note)
  values(_card.id,_organization_id,auth.uid(),'issue',_initial_balance_cents,0,_initial_balance_cents,'Emisión de tarjeta regalo');
  return jsonb_build_object('gift_card_id',_card.id,'public_id',_card.public_id,'code',_code,'code_hint',_card.code_hint,'balance_cents',_card.remaining_balance_cents);
end; $$;
revoke all on function public.issue_gift_card(uuid,integer,text,text,timestamptz,text) from public,anon;
grant execute on function public.issue_gift_card(uuid,integer,text,text,timestamptz,text) to authenticated;

create or replace function public.consume_cashback(_membership_id uuid,_location_id uuid,_amount_cents integer,_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare _account public.loyalty_accounts; _prev integer; _new integer; _txn public.loyalty_account_transactions;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  if _amount_cents is null or _amount_cents<=0 then raise exception 'INVALID_AMOUNT'; end if;
  select * into _txn from public.loyalty_account_transactions where idempotency_key=_idempotency_key;
  if _txn.id is not null then return jsonb_build_object('duplicate',true,'transaction_id',_txn.id,'resulting_balance_cents',_txn.value_after); end if;
  select * into _account from public.loyalty_accounts where membership_id=_membership_id for update;
  if _account is null or _account.mechanic_type<>'cashback' then raise exception 'CASHBACK_NOT_AVAILABLE'; end if;
  _prev:=_account.cashback_balance_cents; if _prev<_amount_cents then raise exception 'INSUFFICIENT_CASHBACK'; end if; _new:=_prev-_amount_cents;
  update public.loyalty_accounts set cashback_balance_cents=_new,progress_balance=_new where id=_account.id;
  update public.memberships set cached_points_balance=_new where id=_membership_id;
  insert into public.loyalty_account_transactions(account_id,organization_id,location_id,performed_by_user_id,type,value_before,value_delta,value_after,amount_cents,idempotency_key)
  values(_account.id,_account.organization_id,_location_id,auth.uid(),'cashback_spent',_prev,-_amount_cents,_new,_amount_cents,_idempotency_key) returning * into _txn;
  perform public.queue_wallet_update(_membership_id,'cashback_spent');
  return jsonb_build_object('duplicate',false,'transaction_id',_txn.id,'amount_cents',_amount_cents,'resulting_balance_cents',_new);
end; $$;
revoke all on function public.consume_cashback(uuid,uuid,integer,text) from public,anon;
grant execute on function public.consume_cashback(uuid,uuid,integer,text) to authenticated;

create or replace function public.redeem_coupon(_membership_id uuid,_coupon_code text,_location_id uuid,_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare _m public.memberships; _coupon public.coupons; _claim public.customer_coupons;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  if _idempotency_key is not null then select * into _claim from public.customer_coupons where idempotency_key=_idempotency_key; if _claim.id is not null then return jsonb_build_object('duplicate',true,'customer_coupon_id',_claim.id); end if; end if;
  select * into _m from public.memberships where id=_membership_id and status='active'; if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  select * into _coupon from public.coupons where organization_id=_m.organization_id and upper(code)=upper(trim(_coupon_code)) for update;
  if _coupon is null or _coupon.status<>'active' or _coupon.starts_at>now() or (_coupon.expires_at is not null and _coupon.expires_at<=now()) then raise exception 'COUPON_NOT_AVAILABLE'; end if;
  if _coupon.maximum_uses is not null and _coupon.used_count>=_coupon.maximum_uses then raise exception 'COUPON_LIMIT_REACHED'; end if;
  if _coupon.single_use_per_customer and exists(select 1 from public.customer_coupons where coupon_id=_coupon.id and membership_id=_m.id and status='redeemed') then raise exception 'COUPON_ALREADY_USED'; end if;
  insert into public.customer_coupons(organization_id,coupon_id,membership_id,location_id,status,redeemed_by,redeemed_at,idempotency_key)
  values(_m.organization_id,_coupon.id,_m.id,_location_id,'redeemed',auth.uid(),now(),_idempotency_key)
  on conflict(coupon_id,membership_id) do update set status='redeemed',location_id=excluded.location_id,redeemed_by=auth.uid(),redeemed_at=now(),idempotency_key=excluded.idempotency_key returning * into _claim;
  update public.coupons set used_count=used_count+1 where id=_coupon.id;
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,metadata) values(auth.uid(),_m.organization_id,'coupon_redeemed','customer_coupon',_claim.id,jsonb_build_object('coupon',_coupon.title,'location_id',_location_id));
  return jsonb_build_object('duplicate',false,'customer_coupon_id',_claim.id,'title',_coupon.title,'discount_type',_coupon.discount_type,'discount_value',_coupon.discount_value);
end; $$;
revoke all on function public.redeem_coupon(uuid,text,uuid,text) from public,anon;
grant execute on function public.redeem_coupon(uuid,text,uuid,text) to authenticated;

create or replace function public.consume_gift_card(_code text,_location_id uuid,_amount_cents integer,_idempotency_key text,_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare _card public.gift_cards; _txn public.gift_card_transactions; _prev integer; _new integer; _org uuid;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  if _amount_cents is null or _amount_cents<=0 then raise exception 'INVALID_AMOUNT'; end if;
  select organization_id into _org from public.locations where id=_location_id;
  if _idempotency_key is not null then select * into _txn from public.gift_card_transactions where organization_id=_org and idempotency_key=_idempotency_key; if _txn.id is not null then return jsonb_build_object('duplicate',true,'transaction_id',_txn.id,'resulting_balance_cents',_txn.resulting_balance_cents); end if; end if;
  select * into _card from public.gift_cards where organization_id=_org and code_hash=public.hash_token(trim(_code)) for update;
  if _card is null or _card.status<>'active' or (_card.expires_at is not null and _card.expires_at<=now()) then raise exception 'GIFT_CARD_NOT_AVAILABLE'; end if;
  _prev:=_card.remaining_balance_cents; if _prev<_amount_cents then raise exception 'INSUFFICIENT_GIFT_CARD_BALANCE'; end if; _new:=_prev-_amount_cents;
  insert into public.gift_card_transactions(gift_card_id,organization_id,location_id,performed_by_user_id,type,amount_delta_cents,previous_balance_cents,resulting_balance_cents,note,idempotency_key)
  values(_card.id,_org,_location_id,auth.uid(),'consume',-_amount_cents,_prev,_new,_note,_idempotency_key) returning * into _txn;
  update public.gift_cards set remaining_balance_cents=_new,status=case when _new=0 then 'depleted' else status end where id=_card.id;
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,metadata) values(auth.uid(),_org,'gift_card_consumed','gift_card_transaction',_txn.id,jsonb_build_object('amount_cents',_amount_cents,'resulting_balance_cents',_new));
  return jsonb_build_object('duplicate',false,'transaction_id',_txn.id,'amount_cents',_amount_cents,'resulting_balance_cents',_new);
end; $$;
revoke all on function public.consume_gift_card(text,uuid,integer,text,text) from public,anon;
grant execute on function public.consume_gift_card(text,uuid,integer,text,text) to authenticated;

insert into public.membership_tiers(id,organization_id,program_id,name,rank,minimum_progress,benefits) values
('99999999-9999-4999-8999-999999999901','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','Basic',1,0,'{"description":"Miembro del club"}'),
('99999999-9999-4999-8999-999999999902','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','Silver',2,500,'{"bonus_percent":5}'),
('99999999-9999-4999-8999-999999999903','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','Gold',3,1500,'{"bonus_percent":10}'),
('99999999-9999-4999-8999-999999999904','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','VIP',4,3000,'{"bonus_percent":15,"priority":true}')
on conflict do nothing;

update public.loyalty_accounts account set tier_id=(
  select tier.id from public.membership_tiers tier
  where tier.program_id=account.program_id and tier.minimum_progress<=account.lifetime_progress and tier.status='active'
  order by tier.minimum_progress desc limit 1
);