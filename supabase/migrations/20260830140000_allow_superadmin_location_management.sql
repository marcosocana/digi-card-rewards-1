-- Platform superadmins manage every tenant and must be able to provision
-- establishments independently from the tenant's commercial plan limit.
create or replace function public.enforce_location_plan_limit() returns trigger
language plpgsql
set search_path = public
as $$
declare
  _plan_code text;
  _location_limit integer;
  _current_locations integer;
begin
  if new.archived_at is not null or public.is_superadmin() then
    return new;
  end if;

  select plan_code into _plan_code
  from public.organizations
  where id = new.organization_id;

  _location_limit := case _plan_code
    when 'basic' then 1
    when 'pro' then 3
    when 'ultra' then 15
    else null
  end;

  if _location_limit is null then
    return new;
  end if;

  select count(*) into _current_locations
  from public.locations
  where organization_id = new.organization_id
    and archived_at is null
    and id is distinct from new.id;

  if _current_locations >= _location_limit then
    raise exception 'Tu plan % permite hasta % establecimiento(s)', _plan_code, _location_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
