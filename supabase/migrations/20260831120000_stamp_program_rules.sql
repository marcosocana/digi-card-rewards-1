-- Each establishment owns its program through program_locations. Stamp programs
-- may store several rewards, but only one can be active at a time.
create or replace function public.enforce_stamp_reward_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _mechanic text;
  _stamp_target integer;
begin
  select mechanic_type,
         least(20, greatest(5, coalesce((mechanic_config->>'stamp_target')::integer, 10)))
  into _mechanic, _stamp_target
  from public.loyalty_programs
  where id = new.program_id;

  if _mechanic = 'stamps' and new.status = 'active' then
    new.points_cost := _stamp_target;
    new.redemption_limit_type := 'unlimited';
    new.redemption_limit_count := null;

    update public.rewards reward
    set status = 'paused'
    where reward.program_id = new.program_id
      and reward.status = 'active'
      and reward.id <> new.id;
  end if;
  return new;
end;
$$;

update public.loyalty_programs
set mechanic_type = 'points'
where mechanic_type not in ('points', 'stamps');

update public.loyalty_programs
set mechanic_config = coalesce(mechanic_config, '{}'::jsonb) || jsonb_build_object(
  'stamp_target', least(20, greatest(5, coalesce((mechanic_config->>'stamp_target')::integer, 10))),
  'stamps_per_purchase', greatest(coalesce((mechanic_config->>'stamps_per_purchase')::integer, 1), 1),
  'welcome_stamps', least(
    least(20, greatest(5, coalesce((mechanic_config->>'stamp_target')::integer, 10))) - 1,
    greatest(coalesce((mechanic_config->>'welcome_stamps')::integer, 0), 0)
  ),
  'stamp_reward_name', coalesce(nullif(mechanic_config->>'stamp_reward_name', ''), '1 café')
)
where mechanic_type = 'stamps';

with ranked as (
  select reward.id,
    row_number() over (partition by reward.program_id order by reward.created_at, reward.id) as position
  from public.rewards reward
  join public.loyalty_programs program on program.id = reward.program_id
  where program.mechanic_type = 'stamps' and reward.status = 'active'
)
update public.rewards reward
set status = 'paused'
from ranked
where reward.id = ranked.id and ranked.position > 1;

update public.rewards reward
set points_cost = least(20, greatest(5, coalesce((program.mechanic_config->>'stamp_target')::integer, 10))),
    redemption_limit_type = 'unlimited',
    redemption_limit_count = null
from public.loyalty_programs program
where program.id = reward.program_id
  and program.mechanic_type = 'stamps'
  and reward.status = 'active';

drop trigger if exists trg_enforce_stamp_reward_rules on public.rewards;
create trigger trg_enforce_stamp_reward_rules
before insert or update on public.rewards
for each row execute function public.enforce_stamp_reward_rules();

create or replace function public.ensure_stamp_program_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _reward_id uuid;
  _reward_name text;
  _stamp_target integer;
begin
  if new.mechanic_type <> 'stamps' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.mechanic_type = 'stamps' then
    return new;
  end if;

  _reward_name := coalesce(nullif(new.mechanic_config->>'stamp_reward_name', ''), '1 café');
  _stamp_target := least(20, greatest(5, coalesce((new.mechanic_config->>'stamp_target')::integer, 10)));
  select id into _reward_id
  from public.rewards
  where program_id = new.id
  order by case when status = 'active' then 0 else 1 end, created_at, id
  limit 1;

  if _reward_id is null then
    insert into public.rewards (
      program_id, name, points_cost, status,
      redemption_limit_type, redemption_limit_count
    ) values (
      new.id, _reward_name, _stamp_target, 'active', 'unlimited', null
    ) returning id into _reward_id;
  else
    update public.rewards
    set status = 'paused'
    where program_id = new.id and id <> _reward_id and status = 'active';

    update public.rewards
    set points_cost = _stamp_target,
        status = 'active',
        redemption_limit_type = 'unlimited',
        redemption_limit_count = null
    where id = _reward_id;
  end if;

  insert into public.reward_locations (reward_id, location_id)
  select _reward_id, location_id
  from public.program_locations
  where program_id = new.id
  on conflict (reward_id, location_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_ensure_stamp_program_reward on public.loyalty_programs;
create trigger trg_ensure_stamp_program_reward
after insert or update of mechanic_type, mechanic_config on public.loyalty_programs
for each row execute function public.ensure_stamp_program_reward();

-- Run the synchronizer once for stamp programs that already existed.
update public.loyalty_programs
set mechanic_config = mechanic_config
where mechanic_type = 'stamps';
