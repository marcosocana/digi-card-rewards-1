-- Delivery counters and GDPR operations complete the remaining backend contracts.

alter table public.customer_consents add column if not exists revoked_at timestamptz;
alter table public.membership_tokens add column if not exists revoked_at timestamptz;

create or replace function public.increment_notification_delivery_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
     set recipient_count = recipient_count + 1,
         delivered_count = delivered_count + case when new.status = 'delivered' then 1 else 0 end,
         failed_count = failed_count + case when new.status in ('failed', 'skipped') then 1 else 0 end,
         updated_at = now()
   where id = new.notification_id;
  return new;
end;
$$;
revoke all on function public.increment_notification_delivery_counters() from public, anon, authenticated;

drop trigger if exists trg_increment_notification_delivery_counters on public.notification_deliveries;
create trigger trg_increment_notification_delivery_counters
  after insert on public.notification_deliveries
  for each row execute function public.increment_notification_delivery_counters();

update public.notifications notification
set recipient_count = counters.recipient_count,
    delivered_count = counters.delivered_count,
    failed_count = counters.failed_count
from (
  select notification_id,
         count(*)::integer recipient_count,
         count(*) filter (where status = 'delivered')::integer delivered_count,
         count(*) filter (where status in ('failed', 'skipped'))::integer failed_count
  from public.notification_deliveries
  group by notification_id
) counters
where notification.id = counters.notification_id;

revoke update on public.integration_api_keys from authenticated;

create or replace function public.revoke_integration_api_key(_key_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare _key public.integration_api_keys;
begin
  select * into _key from public.integration_api_keys where id = _key_id for update;
  if _key is null or not public.is_org_admin(_key.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  update public.integration_api_keys set status = 'revoked', revoked_at = now() where id = _key_id;
  insert into public.audit_logs(actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), _key.organization_id, 'integration_api_key_revoked', 'integration_api_key', _key.id,
    jsonb_build_object('key_prefix', _key.key_prefix));
end;
$$;
revoke all on function public.revoke_integration_api_key(uuid) from public, anon;
grant execute on function public.revoke_integration_api_key(uuid) to authenticated;

create or replace function public.export_customer_data(_membership_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare _membership public.memberships; _customer public.customers;
begin
  select * into _membership from public.memberships where id = _membership_id;
  if _membership is null or not public.is_org_admin(_membership.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  select * into _customer from public.customers where id = _membership.customer_id;
  return jsonb_build_object(
    'generated_at', now(),
    'customer', jsonb_build_object(
      'first_name', _customer.first_name, 'last_name', _customer.last_name, 'email', _customer.email,
      'phone', _customer.phone, 'birth_date', _customer.birth_date, 'status', _customer.status,
      'created_at', _customer.created_at
    ),
    'membership', jsonb_build_object(
      'public_id', _membership.public_id, 'status', _membership.status, 'joined_at', _membership.joined_at,
      'balance', _membership.cached_points_balance
    ),
    'consents', coalesce((select jsonb_agg(to_jsonb(consent) - 'customer_id' - 'organization_id')
      from public.customer_consents consent where consent.customer_id = _customer.id and consent.organization_id = _membership.organization_id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(transaction) - 'membership_id' - 'organization_id' order by transaction.created_at)
      from public.point_transactions transaction where transaction.membership_id = _membership.id), '[]'::jsonb),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('name', reward.name, 'status', earned.status,
      'awarded_at', earned.awarded_at, 'redeemed_at', earned.redeemed_at))
      from public.customer_rewards earned join public.rewards reward on reward.id = earned.reward_id
      where earned.membership_id = _membership.id), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('title', notification.title,
      'status', delivery.status, 'created_at', delivery.created_at))
      from public.notification_deliveries delivery join public.notifications notification on notification.id = delivery.notification_id
      where delivery.membership_id = _membership.id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_customer_data(uuid) from public, anon;
grant execute on function public.export_customer_data(uuid) to authenticated;

create or replace function public.anonymize_customer(_membership_id uuid, _reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare _membership public.memberships; _customer public.customers; _suffix text;
begin
  select * into _membership from public.memberships where id = _membership_id for update;
  if _membership is null or not public.is_org_admin(_membership.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if length(trim(coalesce(_reason, ''))) < 5 then raise exception 'REASON_REQUIRED'; end if;
  select * into _customer from public.customers where id = _membership.customer_id for update;
  _suffix := replace(_customer.id::text, '-', '');

  update public.customer_consents set granted = false, revoked_at = now()
   where customer_id = _customer.id and organization_id = _membership.organization_id;
  update public.membership_tokens set status = 'revoked', revoked_at = now()
   where membership_id in (select id from public.memberships where customer_id = _customer.id and organization_id = _membership.organization_id);
  update public.memberships set status = 'archived', updated_at = now()
   where customer_id = _customer.id and organization_id = _membership.organization_id;
  update public.customers
     set first_name = 'Cliente', last_name = 'anonimizado',
         email = 'anon-' || _suffix || '@invalid.local', normalized_email = 'anon-' || _suffix || '@invalid.local',
         phone = null, normalized_phone = null, birth_date = null, marketing_opt_in = false,
         status = 'anonymized', updated_at = now()
   where id = _customer.id;
  insert into public.audit_logs(actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), _membership.organization_id, 'customer_anonymized', 'customer', _customer.id,
    jsonb_build_object('reason', trim(_reason)));
end;
$$;
revoke all on function public.anonymize_customer(uuid, text) from public, anon;
grant execute on function public.anonymize_customer(uuid, text) to authenticated;