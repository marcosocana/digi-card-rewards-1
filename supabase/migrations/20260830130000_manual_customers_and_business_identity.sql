-- Only explicit business registrations or invited team members can become
-- organizations. A consumer account must never appear as a company/location.
create or replace function public.ensure_current_business_account(_business_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _email text;
  _full_name text;
  _metadata_business_name text;
  _platform_role public.platform_role := 'user';
  _organization_id uuid;
  _display_name text;
  _slug_base text;
begin
  if _uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select lower(email),
    coalesce(nullif(raw_user_meta_data->>'full_name', ''),
      nullif(raw_user_meta_data->>'name', ''), split_part(email, '@', 1)),
    nullif(trim(raw_user_meta_data->>'business_name'), '')
  into _email, _full_name, _metadata_business_name
  from auth.users where id = _uid;
  if _email is null then raise exception 'AUTH_USER_NOT_FOUND' using errcode = '42501'; end if;

  select role into _platform_role from public.platform_invitations
  where lower(email) = _email limit 1;

  insert into public.profiles (id, email, full_name, platform_role)
  values (_uid, _email, _full_name, coalesce(_platform_role, 'user'))
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(profiles.full_name, ''), excluded.full_name);

  update public.organization_users set user_id = _uid, updated_at = now()
  where user_id is null and lower(invited_email) = _email;

  select organization_id into _organization_id from public.organization_users
  where user_id = _uid and status = 'active'
  order by (role = 'admin') desc, created_at limit 1;

  if _organization_id is not null or coalesce(_platform_role, 'user') = 'superadmin' then
    return _organization_id;
  end if;

  _display_name := coalesce(nullif(trim(_business_name), ''), _metadata_business_name);
  if _display_name is null then
    return null;
  end if;

  _slug_base := trim(both '-' from regexp_replace(lower(_display_name), '[^a-z0-9]+', '-', 'g'));
  if _slug_base = '' then _slug_base := 'negocio'; end if;

  insert into public.organizations (
    display_name, slug, contact_email, status, plan_code, subscription_status
  ) values (
    _display_name,
    _slug_base || '-' || substr(replace(_uid::text, '-', ''), 1, 8),
    _email, 'configuration_pending', null, 'none'
  ) returning id into _organization_id;

  insert into public.organization_users (
    organization_id, user_id, invited_email, full_name, role, status, can_adjust_points
  ) values (
    _organization_id, _uid, _email, _full_name, 'admin', 'active', true
  );
  return _organization_id;
end;
$$;

revoke all on function public.ensure_current_business_account(text) from public, anon;
grant execute on function public.ensure_current_business_account(text) to authenticated;

-- Remove only untouched auto-created shells belonging to known QR customers.
do $$
declare accidental record;
begin
  for accidental in
    select organization.id, organization_user.id as organization_user_id
    from public.organizations organization
    join public.organization_users organization_user
      on organization_user.organization_id = organization.id and organization_user.role = 'admin'
    join public.profiles profile on profile.id = organization_user.user_id
    join auth.users auth_user on auth_user.id = organization_user.user_id
    where organization.status = 'configuration_pending'
      and organization.onboarding_completed_at is null
      and not exists(select 1 from public.locations where organization_id = organization.id)
      and nullif(trim(auth_user.raw_user_meta_data->>'business_name'), '') is null
      and exists(
        select 1 from public.customers customer
        where lower(customer.email) = lower(profile.email)
      )
  loop
    delete from public.organization_users where id = accidental.organization_user_id;
    update public.organizations set status = 'archived', archived_at = now()
      where id = accidental.id;
  end loop;
end;
$$;

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
begin
  if not public.can_access_location(_location_id) then
    raise exception 'NO_LOCATION_ACCESS' using errcode = '42501';
  end if;
  if not exists(
    select 1 from public.program_locations program_location
    join public.loyalty_programs program on program.id = program_location.program_id
    join public.locations location on location.id = program_location.location_id
    where program_location.program_id = _program_id
      and program_location.location_id = _location_id
      and program.status = 'active' and location.status = 'active'
  ) then raise exception 'PROGRAM_NOT_AVAILABLE'; end if;

  _result := public.register_customer_and_membership(
    _program_id, _email, _first_name, _last_name, _birth_date, _location_id,
    null, _marketing, _phone, true
  );
  _customer_id := (_result->>'customer_id')::uuid;
  update public.customer_consents set source = 'manual_admin'
  where customer_id = _customer_id
    and organization_id = (select organization_id from public.locations where id = _location_id)
    and source = 'landing';
  insert into public.audit_logs(
    actor_user_id, organization_id, location_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), (select organization_id from public.locations where id = _location_id),
    _location_id, 'customer_registered_manually', 'customer', _customer_id,
    jsonb_build_object('email', lower(trim(_email)))
  );
  return _result;
end;
$$;

revoke all on function public.register_customer_manually(uuid,uuid,text,text,text,date,text,boolean)
  from public, anon;
grant execute on function public.register_customer_manually(uuid,uuid,text,text,text,date,text,boolean)
  to authenticated;
