-- Prepare a paid tenant from the platform administration. Authentication is
-- created afterwards by the Edge Function, so the pending organization user is
-- already present when the auth.users trigger runs and no personal shell tenant
-- is generated for the new owner.
create or replace function public.admin_prepare_paid_company(
  _display_name text,
  _legal_name text,
  _contact_email text,
  _contact_phone text,
  _address_line text,
  _city text,
  _postal_code text,
  _plan_code text,
  _owner_name text,
  _owner_email text,
  _locations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _normalized_name text := trim(coalesce(_display_name, ''));
  _normalized_email text := lower(trim(coalesce(_owner_email, '')));
  _slug_base text;
  _slug text;
  _organization_id uuid;
  _organization_user_id uuid;
  _program_id uuid;
  _campaign_id uuid;
  _location_id uuid;
  _location jsonb;
  _location_count integer;
  _location_limit integer;
  _index integer := 0;
begin
  if auth.uid() is null or not public.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;
  if length(_normalized_name) < 2 then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;
  if _normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if _plan_code not in ('basic', 'pro', 'ultra') then
    raise exception 'INVALID_PLAN' using errcode = '22023';
  end if;
  if exists(select 1 from auth.users where lower(email) = _normalized_email)
    or exists(
      select 1 from public.organization_users
      where lower(invited_email) = _normalized_email and status = 'active'
    ) then
    raise exception 'ACCOUNT_EXISTS' using errcode = '23505';
  end if;

  _location_limit := case _plan_code when 'basic' then 1 when 'pro' then 3 else 15 end;
  if jsonb_typeof(_locations) <> 'array' then
    raise exception 'INVALID_LOCATIONS' using errcode = '22023';
  end if;
  _location_count := jsonb_array_length(_locations);
  if _location_count < 1 or _location_count > _location_limit then
    raise exception 'INVALID_LOCATION_COUNT' using errcode = '22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(_locations) item
    where length(trim(coalesce(item->>'name', ''))) < 2
  ) then
    raise exception 'LOCATION_NAME_REQUIRED' using errcode = '22023';
  end if;

  _slug_base := trim(both '-' from regexp_replace(
    lower(translate(_normalized_name, 'áéíóúüñ', 'aeiouun')),
    '[^a-z0-9]+', '-', 'g'
  ));
  if _slug_base = '' then _slug_base := 'empresa'; end if;
  _slug := _slug_base;
  if exists(select 1 from public.organizations where slug = _slug) then
    _slug := _slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.organizations (
    display_name, legal_name, contact_email, contact_phone, address_line,
    city, postal_code, slug, status, plan_code, subscription_status,
    subscription_updated_at, onboarding_step
  ) values (
    _normalized_name,
    nullif(trim(coalesce(_legal_name, '')), ''),
    lower(coalesce(nullif(trim(coalesce(_contact_email, '')), ''), _normalized_email)),
    nullif(trim(coalesce(_contact_phone, '')), ''),
    nullif(trim(coalesce(_address_line, '')), ''),
    nullif(trim(coalesce(_city, '')), ''),
    nullif(trim(coalesce(_postal_code, '')), ''),
    _slug, 'active', _plan_code, 'active', now(), 2
  ) returning id into _organization_id;

  insert into public.organization_users (
    organization_id, user_id, invited_email, full_name, role, status,
    can_adjust_points
  ) values (
    _organization_id, null, _normalized_email,
    nullif(trim(coalesce(_owner_name, '')), ''), 'admin', 'active', true
  ) returning id into _organization_user_id;

  -- The paid-organization trigger has prepared the first draft program and
  -- campaign. Use those for the first location and create isolated programs for
  -- the remaining establishments.
  select id into _program_id
  from public.loyalty_programs
  where organization_id = _organization_id and archived_at is null
  order by created_at
  limit 1;

  select id into _campaign_id
  from public.campaigns
  where organization_id = _organization_id and archived_at is null
  order by created_at
  limit 1;

  for _location in select value from jsonb_array_elements(_locations)
  loop
    _index := _index + 1;
    insert into public.locations (
      organization_id, name, slug, address_line, city, postal_code, status
    ) values (
      _organization_id,
      trim(_location->>'name'),
      trim(both '-' from regexp_replace(lower(translate(trim(_location->>'name'), 'áéíóúüñ', 'aeiouun')), '[^a-z0-9]+', '-', 'g'))
        || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
      nullif(trim(coalesce(_location->>'addressLine', '')), ''),
      nullif(trim(coalesce(_location->>'city', '')), ''),
      nullif(trim(coalesce(_location->>'postalCode', '')), ''),
      'active'
    ) returning id into _location_id;

    if _index > 1 then
      insert into public.loyalty_programs (
        organization_id, internal_name, public_name, description,
        mechanic_type, status
      ) values (
        _organization_id,
        'Programa · ' || trim(_location->>'name'),
        'Club ' || trim(_location->>'name'),
        'Programa de fidelización de ' || trim(_location->>'name'),
        'spend', 'draft'
      ) returning id into _program_id;

      insert into public.campaigns (
        organization_id, program_id, internal_name, public_name,
        mechanic_type, description, status, is_primary
      ) values (
        _organization_id, _program_id,
        'Campaña · ' || trim(_location->>'name'),
        'Club ' || trim(_location->>'name'),
        'spend', 'Campaña principal de fidelización', 'draft', false
      ) returning id into _campaign_id;
    else
      update public.loyalty_programs
      set internal_name = 'Programa · ' || trim(_location->>'name'),
          public_name = 'Club ' || trim(_location->>'name')
      where id = _program_id;
    end if;

    insert into public.program_locations (program_id, location_id)
    values (_program_id, _location_id);
    insert into public.campaign_locations (campaign_id, location_id)
    values (_campaign_id, _location_id);
  end loop;

  return jsonb_build_object(
    'organization_id', _organization_id,
    'organization_user_id', _organization_user_id,
    'slug', _slug,
    'locations_created', _location_count
  );
end;
$$;

revoke all on function public.admin_prepare_paid_company(text,text,text,text,text,text,text,text,text,text,jsonb)
  from public, anon;
grant execute on function public.admin_prepare_paid_company(text,text,text,text,text,text,text,text,text,text,jsonb)
  to authenticated;
