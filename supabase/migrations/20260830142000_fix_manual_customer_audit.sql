-- Manual customer registration must remain atomic. The original implementation
-- referenced audit_logs.location_id, but audit_logs stores location context in
-- metadata and has no location_id column. That made every valid registration
-- roll back at the final audit insert.
create or replace function public.register_customer_manually(
  _program_id uuid,
  _location_id uuid,
  _email text,
  _first_name text,
  _last_name text default null,
  _birth_date date default null,
  _phone text default null,
  _marketing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _result jsonb;
  _customer_id uuid;
  _organization_id uuid;
begin
  if not public.can_access_location(_location_id) then
    raise exception 'NO_LOCATION_ACCESS' using errcode = '42501';
  end if;

  select location.organization_id into _organization_id
  from public.program_locations program_location
  join public.loyalty_programs program on program.id = program_location.program_id
  join public.locations location on location.id = program_location.location_id
  where program_location.program_id = _program_id
    and program_location.location_id = _location_id
    and program.status = 'active'
    and location.status = 'active';

  if _organization_id is null then
    raise exception 'PROGRAM_NOT_AVAILABLE';
  end if;

  _result := public.register_customer_and_membership(
    _program_id, _email, _first_name, _last_name, _birth_date, _location_id,
    null, _marketing, _phone, true
  );
  _customer_id := (_result->>'customer_id')::uuid;

  update public.customer_consents
  set source = 'manual_admin'
  where customer_id = _customer_id
    and organization_id = _organization_id
    and source = 'landing';

  insert into public.audit_logs(
    actor_user_id, organization_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), _organization_id, 'customer_registered_manually', 'customer', _customer_id,
    jsonb_build_object(
      'email', lower(trim(_email)),
      'location_id', _location_id,
      'program_id', _program_id
    )
  );

  return _result;
end;
$$;

revoke all on function public.register_customer_manually(uuid,uuid,text,text,text,date,text,boolean)
  from public, anon;
grant execute on function public.register_customer_manually(uuid,uuid,text,text,text,date,text,boolean)
  to authenticated;
