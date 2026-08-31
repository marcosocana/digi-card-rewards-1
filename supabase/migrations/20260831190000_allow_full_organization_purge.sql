-- Point transactions remain immutable during normal operation. The only
-- exception is the cascading deletion of an entire organization initiated by
-- a superadministrator through purge_organization().
create or replace function public.mark_organization_purge()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and public.is_superadmin(auth.uid()) then
    perform set_config('fideleo.purge_organization_id', old.id::text, true);
  end if;
  return old;
end;
$$;

drop trigger if exists trg_mark_organization_purge on public.organizations;
create trigger trg_mark_organization_purge
before delete on public.organizations
for each row execute function public.mark_organization_purge();

create or replace function public.protect_point_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if auth.uid() is not null
      and public.is_superadmin(auth.uid())
      and current_setting('fideleo.purge_organization_id', true) = old.organization_id::text
    then
      return old;
    end if;
    raise exception 'IMMUTABLE_LEDGER';
  end if;

  if new.id <> old.id
    or new.membership_id <> old.membership_id
    or new.organization_id <> old.organization_id
    or new.type <> old.type
    or new.points_delta <> old.points_delta
    or new.previous_balance <> old.previous_balance
    or new.resulting_balance <> old.resulting_balance
    or new.created_at <> old.created_at
  then
    raise exception 'IMMUTABLE_LEDGER';
  end if;
  return new;
end;
$$;

revoke all on function public.mark_organization_purge() from public, anon, authenticated;
revoke all on function public.protect_point_transaction() from public, anon, authenticated;
