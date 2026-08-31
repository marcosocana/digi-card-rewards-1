-- Point and stamp programs keep separate reward catalogs. A change of mechanic
-- must never repurpose, pause or rewrite rewards from the other catalog.
alter table public.rewards
  add column if not exists mechanic_type text not null default 'points';

update public.rewards reward
set mechanic_type = case when program.mechanic_type = 'stamps' then 'stamps' else 'points' end
from public.loyalty_programs program
where program.id = reward.program_id;

alter table public.rewards
  drop constraint if exists rewards_mechanic_type_check;
alter table public.rewards
  add constraint rewards_mechanic_type_check
  check (mechanic_type in ('points', 'stamps'));

create index if not exists rewards_program_mechanic_idx
  on public.rewards(program_id, mechanic_type, status);

drop trigger if exists trg_ensure_stamp_program_reward on public.loyalty_programs;
drop function if exists public.ensure_stamp_program_reward();

create or replace function public.enforce_stamp_reward_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mechanic_type = 'stamps' and new.status = 'active' then
    new.redemption_limit_type := 'unlimited';
    new.redemption_limit_count := null;

    update public.rewards reward
    set status = 'paused'
    where reward.program_id = new.program_id
      and reward.mechanic_type = 'stamps'
      and reward.status = 'active'
      and reward.id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_stamp_reward_rules on public.rewards;
create trigger trg_enforce_stamp_reward_rules
before insert or update on public.rewards
for each row execute function public.enforce_stamp_reward_rules();

create or replace function public.redeem_reward(
  _membership_id uuid,
  _reward_id uuid,
  _location_id uuid,
  _idempotency_key text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _m public.memberships;
  _r public.rewards;
  _prog public.loyalty_programs;
  _prev integer;
  _new integer;
  _redemption_cost integer;
  _t public.point_transactions;
  _red uuid;
  _customer_reward uuid;
  _redemption_count integer;
begin
  if _idempotency_key is not null then
    select * into _t from public.point_transactions where idempotency_key = _idempotency_key;
    if _t.id is not null then
      return jsonb_build_object(
        'duplicate', true,
        'transaction_id', _t.id,
        'resulting_balance', _t.resulting_balance
      );
    end if;
  end if;
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select * into _m from public.memberships where id = _membership_id for update;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if _m.status <> 'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _r from public.rewards where id = _reward_id for update;
  if _r is null or _r.status <> 'active' or _r.program_id <> _m.program_id
    then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  if _prog.status <> 'active' or not _prog.allow_redeeming
    then raise exception 'PROGRAM_PAUSED'; end if;
  if _r.mechanic_type <> _prog.mechanic_type then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  if not exists (
    select 1 from public.program_locations where program_id = _prog.id
      and location_id = _location_id and can_redeem
  ) then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;
  if exists (select 1 from public.reward_locations where reward_id = _r.id)
    and not exists (
      select 1 from public.reward_locations
      where reward_id = _r.id and location_id = _location_id
    ) then raise exception 'REWARD_NOT_AVAILABLE'; end if;

  if _r.redemption_limit_type = 'per_customer' then
    select count(*) into _redemption_count from public.redemptions
    where reward_id = _r.id and membership_id = _m.id;
    if _redemption_count >= _r.redemption_limit_count
      then raise exception 'REDEMPTION_LIMIT_REACHED'; end if;
  elsif _r.redemption_limit_type = 'global' then
    select count(*) into _redemption_count from public.redemptions where reward_id = _r.id;
    if _redemption_count >= _r.redemption_limit_count
      then raise exception 'REDEMPTION_LIMIT_REACHED'; end if;
  end if;

  _redemption_cost := case
    when _prog.mechanic_type = 'stamps' then
      least(20, greatest(5, coalesce((_prog.mechanic_config->>'stamp_target')::integer, 10)))
    else _r.points_cost
  end;
  _prev := _m.cached_points_balance;
  if _prev < _redemption_cost then raise exception 'INSUFFICIENT_POINTS'; end if;
  _new := _prev - _redemption_cost;

  select id into _customer_reward from public.customer_rewards
  where membership_id = _m.id and reward_id = _r.id and status = 'available'
  order by awarded_at for update skip locked limit 1;
  if _customer_reward is null then
    insert into public.customer_rewards (organization_id, membership_id, reward_id, status)
    values (_m.organization_id, _m.id, _r.id, 'available') returning id into _customer_reward;
  end if;
  insert into public.point_transactions (
    membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, previous_balance, resulting_balance, note, idempotency_key
  ) values (
    _m.id, _m.organization_id, _location_id, auth.uid(), 'redemption',
    -_redemption_cost, _prev, _new, _r.name, _idempotency_key
  ) returning * into _t;
  insert into public.redemptions (
    transaction_id, reward_id, membership_id, organization_id, location_id,
    performed_by_user_id, points_spent, customer_reward_id
  ) values (
    _t.id, _r.id, _m.id, _m.organization_id, _location_id,
    auth.uid(), _redemption_cost, _customer_reward
  ) returning id into _red;
  update public.customer_rewards set status='redeemed', redeemed_at=now(), redemption_id=_red
    where id=_customer_reward;
  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  update public.customers set last_activity_at = now() where id = _m.customer_id;
  perform public.queue_wallet_update(_m.id, 'redemption');
  insert into public.audit_logs (
    actor_user_id, organization_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), _m.organization_id, 'reward_redeemed', 'redemption', _red,
    jsonb_build_object(
      'reward', _r.name,
      'points', _redemption_cost,
      'previous', _prev,
      'resulting', _new,
      'location_id', _location_id
    )
  );
  return jsonb_build_object(
    'duplicate', false,
    'transaction_id', _t.id,
    'reward_name', _r.name,
    'points_spent', _redemption_cost,
    'previous_balance', _prev,
    'resulting_balance', _new,
    'customer_reward_id', _customer_reward
  );
end;
$$;

revoke all on function public.redeem_reward(uuid,uuid,uuid,text) from public, anon;
grant execute on function public.redeem_reward(uuid,uuid,uuid,text) to authenticated;

create or replace function public.get_membership_portal(_public_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare
  _m public.memberships;
  _c public.customers;
  _program public.loyalty_programs;
  _org public.organizations;
  _account public.loyalty_accounts;
  _reward_cost integer;
begin
  select * into _m from public.memberships where public_id=_public_id;
  if _m is null then return null; end if;
  select * into _c from public.customers where id=_m.customer_id;
  select * into _program from public.loyalty_programs where id=_m.program_id;
  select * into _org from public.organizations where id=_m.organization_id;
  select * into _account from public.loyalty_accounts where membership_id=_m.id;
  _reward_cost := least(20, greatest(5, coalesce((_program.mechanic_config->>'stamp_target')::integer, 10)));
  return jsonb_build_object(
    'membership',jsonb_build_object('public_id',_m.public_id,'balance',_m.cached_points_balance,'status',_m.status,'joined_at',_m.joined_at),
    'customer',jsonb_build_object('first_name',_c.first_name,'last_name',_c.last_name,'email',_c.email),
    'organization',jsonb_build_object('display_name',_org.display_name,'slug',_org.slug),
    'branding',(select to_jsonb(b) from public.organization_branding b where b.organization_id=_org.id),
    'program',jsonb_build_object('public_name',_program.public_name,'description',_program.description,'mechanic_type',_program.mechanic_type,
      'mechanic_config',_program.mechanic_config,'earning_mode',_program.earning_mode,'earning_value',_program.earning_value,'terms',_program.terms),
    'account',case when _account.id is null then null else jsonb_build_object('progress_balance',_account.progress_balance,'lifetime_spend_cents',_account.lifetime_spend_cents,
      'visit_count',_account.visit_count,'stamp_balance',_account.stamp_balance,'cashback_balance_cents',_account.cashback_balance_cents,
      'tier',(select name from public.membership_tiers where id=_account.tier_id)) end,
    'short_code',(select short_code from public.membership_tokens where membership_id=_m.id and status='active' limit 1),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,
      'name',r.name,
      'description',r.description,
      'points_cost',case when _program.mechanic_type='stamps' then _reward_cost else r.points_cost end,
      'available',_m.cached_points_balance >= case when _program.mechanic_type='stamps' then _reward_cost else r.points_cost end
    ) order by r.display_order,r.points_cost)
      from public.rewards r
      where r.program_id=_program.id
        and r.mechanic_type=_program.mechanic_type
        and r.status='active'),'[]'::jsonb),
    'earned_rewards',coalesce((select jsonb_agg(jsonb_build_object('id',cr.id,'name',r.name,'status',cr.status,'awarded_at',cr.awarded_at,'expires_at',cr.expires_at) order by cr.awarded_at desc)
      from public.customer_rewards cr join public.rewards r on r.id=cr.reward_id where cr.membership_id=_m.id),'[]'::jsonb),
    'locations',coalesce((select jsonb_agg(jsonb_build_object('name',l.name,'address_line',l.address_line,'city',l.city)) from public.locations l join public.program_locations pl on pl.location_id=l.id where pl.program_id=_program.id and l.status='active'),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'type',t.type,'points_delta',t.points_delta,'amount_cents',t.amount_cents,'note',t.note,'created_at',t.created_at) order by t.created_at desc)
      from (select * from public.point_transactions where membership_id=_m.id order by created_at desc limit 30)t),'[]'::jsonb),
    'passes',coalesce((select jsonb_agg(jsonb_build_object('provider',p.provider,'status',p.status,'is_sandbox',p.is_sandbox,'last_updated_at',p.last_updated_at)) from public.wallet_passes p where p.membership_id=_m.id),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_membership_portal(uuid) from public;
grant execute on function public.get_membership_portal(uuid) to anon, authenticated;

create or replace function public.get_membership_segments(_membership_id uuid)
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select segment.id, segment.name
  from public.memberships membership
  join public.customer_segments segment
    on segment.organization_id = membership.organization_id
   and segment.status = 'active'
  where membership.id = _membership_id
    and (public.is_superadmin() or public.is_org_member(membership.organization_id))
    and public.segment_matches(membership.id, segment.definition)
  order by segment.name;
$$;

revoke all on function public.get_membership_segments(uuid) from public, anon;
grant execute on function public.get_membership_segments(uuid) to authenticated;
