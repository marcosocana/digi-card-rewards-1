-- Complete Phase 4 with an auditable POS intake contract and keep the
-- generalized loyalty account in sync with the immutable points ledger.

create or replace function public.sync_loyalty_account_from_point_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loyalty_accounts
     set progress_balance = new.resulting_balance,
         stamp_balance = case when mechanic_type = 'stamps' then new.resulting_balance else stamp_balance end,
         cashback_balance_cents = case when mechanic_type = 'cashback' then new.resulting_balance else cashback_balance_cents end,
         updated_at = now()
   where membership_id = new.membership_id;
  return new;
end;
$$;
revoke all on function public.sync_loyalty_account_from_point_transaction() from public, anon, authenticated;

drop trigger if exists trg_sync_loyalty_account_from_point_transaction on public.point_transactions;
create trigger trg_sync_loyalty_account_from_point_transaction
  after insert on public.point_transactions
  for each row execute function public.sync_loyalty_account_from_point_transaction();

create table public.integration_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default array['operations:write']::text[],
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index integration_api_keys_org_idx on public.integration_api_keys(organization_id, status);
grant select, update on public.integration_api_keys to authenticated;
grant all on public.integration_api_keys to service_role;
alter table public.integration_api_keys enable row level security;
create policy "integration keys read" on public.integration_api_keys for select to authenticated
  using (public.is_org_admin(organization_id));
create policy "integration keys update" on public.integration_api_keys for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create or replace function public.issue_integration_api_key(
  _organization_id uuid,
  _name text,
  _connection_id uuid default null,
  _expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _raw_key text;
  _row public.integration_api_keys;
begin
  if not public.is_org_admin(_organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if nullif(trim(_name), '') is null then raise exception 'NAME_REQUIRED'; end if;
  if _connection_id is not null and not exists (
    select 1 from public.integration_connections
    where id = _connection_id and organization_id = _organization_id
  ) then raise exception 'CONNECTION_NOT_FOUND'; end if;

  _raw_key := 'fid_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.integration_api_keys(
    organization_id, connection_id, name, key_hash, key_prefix, expires_at, created_by
  ) values (
    _organization_id, _connection_id, trim(_name), public.hash_token(_raw_key), left(_raw_key, 12), _expires_at, auth.uid()
  ) returning * into _row;

  insert into public.audit_logs(actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), _organization_id, 'integration_api_key_issued', 'integration_api_key', _row.id,
    jsonb_build_object('name', _row.name, 'key_prefix', _row.key_prefix));

  return jsonb_build_object(
    'id', _row.id,
    'name', _row.name,
    'api_key', _raw_key,
    'key_prefix', _row.key_prefix,
    'expires_at', _row.expires_at
  );
end;
$$;
revoke all on function public.issue_integration_api_key(uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.issue_integration_api_key(uuid, text, uuid, timestamptz) to authenticated;

create or replace function public.ingest_pos_operation(
  _api_key text,
  _external_id text,
  _operation_type text,
  _payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _key public.integration_api_keys;
  _operation public.external_operations;
begin
  if nullif(trim(_api_key), '') is null or nullif(trim(_external_id), '') is null then
    raise exception 'INVALID_REQUEST';
  end if;
  if _operation_type not in ('purchase', 'refund', 'customer_sync', 'balance_query') then
    raise exception 'UNSUPPORTED_OPERATION';
  end if;

  select * into _key
    from public.integration_api_keys
   where key_hash = public.hash_token(trim(_api_key))
     and status = 'active'
     and (expires_at is null or expires_at > now())
   for update;
  if _key is null then raise exception 'INVALID_API_KEY'; end if;
  if not ('operations:write' = any(_key.scopes)) then raise exception 'INSUFFICIENT_SCOPE'; end if;

  select * into _operation
    from public.external_operations
   where organization_id = _key.organization_id and external_id = trim(_external_id);
  if _operation.id is not null then
    update public.integration_api_keys set last_used_at = now() where id = _key.id;
    return jsonb_build_object('duplicate', true, 'operation_id', _operation.id, 'status', _operation.status);
  end if;

  insert into public.external_operations(
    organization_id, connection_id, external_id, operation_type, payload, status
  ) values (
    _key.organization_id, _key.connection_id, trim(_external_id), _operation_type,
    coalesce(_payload, '{}'::jsonb), 'received'
  ) returning * into _operation;
  update public.integration_api_keys set last_used_at = now() where id = _key.id;

  insert into public.audit_logs(organization_id, action, entity_type, entity_id, metadata)
  values(_key.organization_id, 'pos_operation_received', 'external_operation', _operation.id,
    jsonb_build_object('external_id', _operation.external_id, 'operation_type', _operation.operation_type,
      'api_key_prefix', _key.key_prefix));

  return jsonb_build_object('duplicate', false, 'operation_id', _operation.id, 'status', _operation.status);
end;
$$;
revoke all on function public.ingest_pos_operation(text, text, text, jsonb) from public, authenticated;
grant execute on function public.ingest_pos_operation(text, text, text, jsonb) to anon, service_role;