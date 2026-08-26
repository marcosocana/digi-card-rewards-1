-- Create team invitations through one authorization-checked transaction. This
-- avoids exposing a multi-step insert to RLS and prevents partially created users.
create or replace function public.invite_organization_user(
  _organization_id uuid,
  _email text,
  _full_name text,
  _role public.org_role,
  _location_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _normalized_email text := lower(trim(coalesce(_email, '')));
  _normalized_locations uuid[];
  _existing_user_id uuid;
  _invitation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not public.is_org_admin(_organization_id) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if _normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct location_id), '{}'::uuid[])
    into _normalized_locations
    from unnest(coalesce(_location_ids, '{}'::uuid[])) as requested(location_id);

  if _role <> 'admin' and cardinality(_normalized_locations) = 0 then
    raise exception 'LOCATION_REQUIRED' using errcode = '22023';
  end if;

  if exists (
    select 1
      from unnest(_normalized_locations) as requested(location_id)
     where not exists (
       select 1
         from public.locations location
        where location.id = requested.location_id
          and location.organization_id = _organization_id
          and location.status = 'active'
     )
  ) then
    raise exception 'INVALID_LOCATION' using errcode = '22023';
  end if;

  select id into _existing_user_id
    from auth.users
   where lower(email) = _normalized_email
   limit 1;

  if exists (
    select 1
      from public.organization_users organization_user
     where organization_user.organization_id = _organization_id
       and (
         lower(organization_user.invited_email) = _normalized_email
         or (_existing_user_id is not null and organization_user.user_id = _existing_user_id)
       )
  ) then
    raise exception 'USER_ALREADY_INVITED' using errcode = '23505';
  end if;

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
    _existing_user_id,
    _normalized_email,
    nullif(trim(coalesce(_full_name, '')), ''),
    _role,
    'active',
    _role = 'manager'
  )
  returning id into _invitation_id;

  if _role <> 'admin' then
    insert into public.user_location_assignments (organization_user_id, location_id)
    select _invitation_id, location_id
      from unnest(_normalized_locations) as assigned(location_id);
  end if;

  return _invitation_id;
end;
$$;

revoke all on function public.invite_organization_user(uuid, text, text, public.org_role, uuid[])
  from public, anon;
grant execute on function public.invite_organization_user(uuid, text, text, public.org_role, uuid[])
  to authenticated;
