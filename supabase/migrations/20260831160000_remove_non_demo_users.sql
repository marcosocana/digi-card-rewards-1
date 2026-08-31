-- Keep only the seeded demo operators. Historical business activity is kept;
-- nullable actor columns are detached before deleting the corresponding Auth
-- account so reports and audit history remain available.
do $$
declare
  reference record;
  deleted_user_count integer;
  deleted_invitation_count integer;
begin
  create temporary table users_to_delete on commit drop as
  select id
  from auth.users
  where not (
    coalesce(lower(email), '') like '%@demo.fideleo.app'
    or coalesce(lower(email), '') in (
      'super@cafenorte.es',
      'admin@cafenorte.es',
      'malasana@cafenorte.es',
      'empleado@cafenorte.es'
    )
  );

  -- Resolve every single-column foreign key that does not already cascade or
  -- set null. This includes audit actors and records created by real accounts.
  for reference in
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
    if reference.delete_action in ('c', 'n') then
      continue;
    end if;

    if reference.is_required then
      execute format(
        'delete from %I.%I where %I in (select id from users_to_delete)',
        reference.schema_name,
        reference.table_name,
        reference.column_name
      );
    else
      execute format(
        'update %I.%I set %I = null where %I in (select id from users_to_delete)',
        reference.schema_name,
        reference.table_name,
        reference.column_name,
        reference.column_name
      );
    end if;
  end loop;

  delete from public.organization_users
  where user_id is null
    and not (
      lower(coalesce(invited_email, '')) like '%@demo.fideleo.app'
      or lower(coalesce(invited_email, '')) in (
        'super@cafenorte.es',
        'admin@cafenorte.es',
        'malasana@cafenorte.es',
        'empleado@cafenorte.es'
      )
    );
  get diagnostics deleted_invitation_count = row_count;

  delete from auth.users where id in (select id from users_to_delete);
  get diagnostics deleted_user_count = row_count;

  raise notice 'Removed % non-demo Auth users and % pending non-demo invitations',
    deleted_user_count,
    deleted_invitation_count;
end;
$$;
