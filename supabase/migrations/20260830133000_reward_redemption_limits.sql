alter table public.rewards
  add column if not exists redemption_limit_type text not null default 'unlimited'
    check (redemption_limit_type in ('unlimited', 'per_customer', 'global')),
  add column if not exists redemption_limit_count integer
    check (redemption_limit_count is null or redemption_limit_count > 0);

alter table public.rewards
  add constraint rewards_redemption_limit_valid check (
    (redemption_limit_type = 'unlimited' and redemption_limit_count is null)
    or (redemption_limit_type <> 'unlimited' and redemption_limit_count is not null)
  );

create or replace function public.redeem_reward(
  _membership_id uuid, _reward_id uuid, _location_id uuid, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _m public.memberships; _r public.rewards; _prog public.loyalty_programs;
  _prev integer; _new integer; _t public.point_transactions; _red uuid;
  _customer_reward uuid; _redemption_count integer;
begin
  if _idempotency_key is not null then
    select * into _t from public.point_transactions where idempotency_key = _idempotency_key;
    if _t.id is not null then
      return jsonb_build_object('duplicate', true, 'transaction_id', _t.id,
        'resulting_balance', _t.resulting_balance);
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
  insert into public.point_transactions (
    membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, previous_balance, resulting_balance, note, idempotency_key
  ) values (
    _m.id, _m.organization_id, _location_id, auth.uid(), 'redemption',
    -_r.points_cost, _prev, _new, _r.name, _idempotency_key
  ) returning * into _t;
  insert into public.redemptions (
    transaction_id, reward_id, membership_id, organization_id, location_id,
    performed_by_user_id, points_spent, customer_reward_id
  ) values (
    _t.id, _r.id, _m.id, _m.organization_id, _location_id,
    auth.uid(), _r.points_cost, _customer_reward
  ) returning id into _red;
  update public.customer_rewards set status='redeemed', redeemed_at=now(), redemption_id=_red
    where id=_customer_reward;
  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  update public.customers set last_activity_at = now() where id = _m.customer_id;
  perform public.queue_wallet_update(_m.id, 'redemption');
  insert into public.audit_logs (
    actor_user_id, organization_id, location_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), _m.organization_id, _location_id, 'reward_redeemed', 'redemption', _red,
    jsonb_build_object('reward',_r.name,'points',_r.points_cost,'previous',_prev,'resulting',_new)
  );
  return jsonb_build_object(
    'duplicate', false, 'transaction_id', _t.id, 'reward_name', _r.name,
    'points_spent', _r.points_cost, 'previous_balance', _prev,
    'resulting_balance', _new, 'customer_reward_id', _customer_reward
  );
end;
$$;
