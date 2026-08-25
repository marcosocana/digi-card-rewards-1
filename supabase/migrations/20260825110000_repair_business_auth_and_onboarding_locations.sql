-- Repair legacy/OAuth business accounts on login and keep onboarding location
-- writes behind an authorization-checked, atomic database operation.

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
  _platform_role public.platform_role := 'user';
  _organization_id uuid;
  _display_name text;
  _slug_base text;
begin
  if _uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select
    lower(email),
    coalesce(
      nullif(raw_user_meta_data->>'full_name', ''),
      nullif(raw_user_meta_data->>'name', ''),
      split_part(email, '@', 1)
    )
  into _email, _full_name
  from auth.users
  where id = _uid;

  if _email is null then
    raise exception 'AUTH_USER_NOT_FOUND' using errcode = '42501';
  end if;

  select role into _platform_role
  from public.platform_invitations
  where lower(email) = _email
  limit 1;

  insert into public.profiles (id, email, full_name, platform_role)
  values (_uid, _email, _full_name, coalesce(_platform_role, 'user'))
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(profiles.full_name, ''), excluded.full_name);

  update public.organization_users
  set user_id = _uid, updated_at = now()
  where user_id is null
    and lower(invited_email) = _email;

  select organization_id into _organization_id
  from public.organization_users
  where user_id = _uid and status = 'active'
  order by (role = 'admin') desc, created_at
  limit 1;

  if _organization_id is not null or coalesce(_platform_role, 'user') = 'superadmin' then
    return _organization_id;
  end if;

  _display_name := coalesce(nullif(trim(_business_name), ''), _full_name, split_part(_email, '@', 1));
  _slug_base := trim(both '-' from regexp_replace(lower(_display_name), '[^a-z0-9]+', '-', 'g'));
  if _slug_base = '' then _slug_base := 'negocio'; end if;

  insert into public.organizations (
    display_name,
    slug,
    contact_email,
    status,
    plan_code,
    subscription_status
  ) values (
    _display_name,
    _slug_base || '-' || substr(replace(_uid::text, '-', ''), 1, 8),
    _email,
    'configuration_pending',
    null,
    'none'
  ) returning id into _organization_id;

  insert into public.organization_users (
    organization_id,
    user_id,
    invited_email,
    full_name,
    role,
    status,
    can_adjust_points
  ) values (
    _organization_id,
    _uid,
    _email,
    _full_name,
    'admin',
    'active',
    true
  );

  return _organization_id;
end;
$$;

revoke all on function public.ensure_current_business_account(text) from public, anon;
grant execute on function public.ensure_current_business_account(text) to authenticated;

create or replace function public.save_onboarding_location(
  _organization_id uuid,
  _location_id uuid,
  _name text,
  _slug text,
  _address_line text,
  _city text,
  _postal_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _saved_id uuid;
  _program_id uuid;
  _campaign_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform public.ensure_current_business_account(null);

  if not exists (
    select 1
    from public.organization_users
    where organization_id = _organization_id
      and user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if length(trim(coalesce(_name, ''))) < 2 then
    raise exception 'LOCATION_NAME_REQUIRED' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(_organization_id::text, 0));

  if _location_id is null then
    insert into public.locations (
      organization_id,
      name,
      slug,
      address_line,
      city,
      postal_code,
      status
    ) values (
      _organization_id,
      trim(_name),
      trim(_slug),
      nullif(trim(coalesce(_address_line, '')), ''),
      nullif(trim(coalesce(_city, '')), ''),
      nullif(trim(coalesce(_postal_code, '')), ''),
      'active'
    ) returning id into _saved_id;
  else
    update public.locations
    set name = trim(_name),
        address_line = nullif(trim(coalesce(_address_line, '')), ''),
        city = nullif(trim(coalesce(_city, '')), ''),
        postal_code = nullif(trim(coalesce(_postal_code, '')), ''),
        updated_at = now()
    where id = _location_id and organization_id = _organization_id
    returning id into _saved_id;

    if _saved_id is null then
      raise exception 'LOCATION_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  select id into _program_id
  from public.loyalty_programs
  where organization_id = _organization_id and archived_at is null
  order by created_at
  limit 1;

  if _program_id is not null then
    insert into public.program_locations (program_id, location_id)
    values (_program_id, _saved_id)
    on conflict (program_id, location_id) do nothing;
  end if;

  select id into _campaign_id
  from public.campaigns
  where organization_id = _organization_id and archived_at is null
  order by created_at
  limit 1;

  if _campaign_id is not null then
    insert into public.campaign_locations (campaign_id, location_id)
    values (_campaign_id, _saved_id)
    on conflict (campaign_id, location_id) do nothing;
  end if;

  return _saved_id;
end;
$$;

revoke all on function public.save_onboarding_location(uuid, uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.save_onboarding_location(uuid, uuid, text, text, text, text, text)
  to authenticated;
