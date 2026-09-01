-- A stamp program must always finish a transaction with exactly one active
-- reward. The existing before-trigger already pauses the previous reward when
-- another is activated; this deferred check guarantees that the active reward
-- cannot simply be disabled or deleted without a replacement.
create or replace function public.require_active_stamp_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _program_id uuid := coalesce(new.program_id, old.program_id);
begin
  if exists (
    select 1
    from public.loyalty_programs program
    where program.id = _program_id and program.mechanic_type = 'stamps'
  ) and not exists (
    select 1
    from public.rewards reward
    where reward.program_id = _program_id and reward.status = 'active'
  ) then
    raise exception 'STAMP_REWARD_REQUIRED';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_require_active_stamp_reward on public.rewards;
create constraint trigger trg_require_active_stamp_reward
after insert or update or delete on public.rewards
deferrable initially deferred
for each row execute function public.require_active_stamp_reward();

revoke all on function public.require_active_stamp_reward() from public, anon, authenticated;
