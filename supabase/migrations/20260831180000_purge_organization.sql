-- Permanently remove a company and every tenant-owned record. Auth accounts are
-- also deleted when they do not belong to any other company. Only a
-- superadministrator can execute this operation.
create or replace function public.purge_organization(_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  _organization_name text;
  _user_ids uuid[] := '{}'::uuid[];
  _customer_ids uuid[] := '{}'::uuid[];
  _customer_count integer := 0;
  _deleted_users integer := 0;
  _reference record;
begin
  if auth.uid() is null or not public.is_superadmin(auth.uid()) then
    raise exception 'SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;

  select display_name into _organization_name
  from public.organizations
  where id = _organization_id
  for update;

  if _organization_name is null then
    raise exception 'ORGANIZATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct organization_user.user_id), '{}'::uuid[])
  into _user_ids
  from public.organization_users organization_user
  where organization_user.organization_id = _organization_id
    and organization_user.user_id is not null
    and not exists (
      select 1
      from public.organization_users other_membership
      where other_membership.user_id = organization_user.user_id
        and other_membership.organization_id <> _organization_id
        and other_membership.status = 'active'
    )
    and not exists (
      select 1
      from public.profiles profile
      where profile.id = organization_user.user_id
        and profile.platform_role = 'superadmin'
    );

  select coalesce(array_agg(distinct membership.customer_id), '{}'::uuid[])
  into _customer_ids
  from public.memberships membership
  where membership.organization_id = _organization_id;
  _customer_count := cardinality(_customer_ids);

  -- Delete any direct organization references that were created without a
  -- cascading foreign key. Tenant history must not survive this operation.
  for _reference in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      attribute.attname as column_name
    from pg_constraint constraint_record
    join pg_class relation on relation.oid = constraint_record.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_attribute attribute
      on attribute.attrelid = relation.oid
     and attribute.attnum = constraint_record.conkey[1]
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.organizations'::regclass
      and array_length(constraint_record.conkey, 1) = 1
      and constraint_record.confdeltype <> 'c'
  loop
    execute format(
      'delete from %I.%I where %I = $1',
      _reference.schema_name,
      _reference.table_name,
      _reference.column_name
    ) using _organization_id;
  end loop;

  delete from public.organizations where id = _organization_id;

  -- Remove customers that no longer belong to any surviving company. This
  -- also clears their consents, tokens, Wallet records and remaining history.
  delete from public.customers customer
  where customer.id = any(_customer_ids)
    and not exists (
      select 1 from public.memberships membership
      where membership.customer_id = customer.id
    );

  -- Detach nullable actor references outside the deleted tenant before the
  -- Auth identities themselves are permanently removed.
  if cardinality(_user_ids) > 0 then
    for _reference in
      select
        namespace.nspname as schema_name,
        relation.relname as table_name,
        attribute.attname as column_name,
        attribute.attnotnull as is_required,
        constraint_record.confdeltype as delete_action
      from pg_constraint constraint_record
      join pg_class relation on relation.oid = constraint_record.conrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      join pg_attribute attribute
        on attribute.attrelid = relation.oid
       and attribute.attnum = constraint_record.conkey[1]
      where constraint_record.contype = 'f'
        and constraint_record.confrelid = 'auth.users'::regclass
        and array_length(constraint_record.conkey, 1) = 1
    loop
      if _reference.delete_action in ('c', 'n') then
        continue;
      end if;
      if _reference.is_required then
        execute format(
          'delete from %I.%I where %I = any($1)',
          _reference.schema_name,
          _reference.table_name,
          _reference.column_name
        ) using _user_ids;
      else
        execute format(
          'update %I.%I set %I = null where %I = any($1)',
          _reference.schema_name,
          _reference.table_name,
          _reference.column_name,
          _reference.column_name
        ) using _user_ids;
      end if;
    end loop;

    delete from auth.users where id = any(_user_ids);
    get diagnostics _deleted_users = row_count;
  end if;

  return jsonb_build_object(
    'organization_name', _organization_name,
    'deleted_users', _deleted_users,
    'deleted_customers', _customer_count
  );
end;
$$;

revoke all on function public.purge_organization(uuid) from public, anon;
grant execute on function public.purge_organization(uuid) to authenticated;
