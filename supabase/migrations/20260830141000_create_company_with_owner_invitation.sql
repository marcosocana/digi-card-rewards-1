-- Create a company and its first administrator atomically. A brand-new company
-- can legitimately have no locations yet; its administrator will have access
-- to the locations created afterwards.
create or replace function public.create_organization_with_admin(
  _display_name text,
  _legal_name text,
  _contact_email text,
  _contact_phone text default null,
  _address_line text default null,
  _city text default null,
  _postal_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _normalized_email text := lower(trim(coalesce(_contact_email, '')));
  _normalized_name text := trim(coalesce(_display_name, ''));
  _slug_base text;
  _slug text;
  _organization_id uuid;
  _existing_user_id uuid;
  _invitation_id uuid;
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
    city, postal_code, slug, status
  ) values (
    _normalized_name, nullif(trim(coalesce(_legal_name, '')), ''),
    _normalized_email, nullif(trim(coalesce(_contact_phone, '')), ''),
    nullif(trim(coalesce(_address_line, '')), ''),
    nullif(trim(coalesce(_city, '')), ''),
    nullif(trim(coalesce(_postal_code, '')), ''), _slug, 'active'
  ) returning id into _organization_id;

  select id into _existing_user_id
  from auth.users
  where lower(email) = _normalized_email
  limit 1;

  insert into public.organization_users (
    organization_id, user_id, invited_email, full_name, role, status,
    can_adjust_points
  ) values (
    _organization_id, _existing_user_id, _normalized_email, null, 'admin',
    'active', true
  ) returning id into _invitation_id;

  return jsonb_build_object(
    'organization_id', _organization_id,
    'invitation_id', _invitation_id,
    'existing_user', _existing_user_id is not null
  );
end;
$$;

revoke all on function public.create_organization_with_admin(text,text,text,text,text,text,text)
  from public, anon;
grant execute on function public.create_organization_with_admin(text,text,text,text,text,text,text)
  to authenticated;
