-- The location-scoped version introduced an eighth optional parameter without
-- removing the previous seven-argument signature. PostgREST therefore returned
-- PGRST203 whenever location_id was omitted. Keep one unambiguous function and
-- automatically resolve the location for single-establishment organizations.

drop function if exists public.queue_manual_notification(
  uuid, uuid, text, text, text, timestamptz, text
);

create or replace function public.queue_manual_notification(
  _organization_id uuid,
  _segment_id uuid,
  _title text,
  _message text,
  _destination_url text default null,
  _scheduled_for timestamptz default null,
  _idempotency_key text default null,
  _location_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _org public.organizations;
  _segment public.customer_segments;
  _notification uuid;
  _count integer;
  _local_day date;
  _status text;
  _active_location_ids uuid[];
begin
  if not public.is_org_admin(_organization_id) then raise exception 'NOT_AUTHORIZED'; end if;

  if _location_id is null then
    select array_agg(location.id order by location.created_at)
      into _active_location_ids
    from public.locations location
    where location.organization_id = _organization_id and location.status = 'active';
    if cardinality(_active_location_ids) = 1 then
      _location_id := _active_location_ids[1];
    else
      raise exception 'LOCATION_REQUIRED';
    end if;
  end if;

  if not exists (
    select 1 from public.locations
    where id = _location_id and organization_id = _organization_id and status = 'active'
  ) then raise exception 'INVALID_LOCATION'; end if;
  if length(trim(coalesce(_title,'')))<1 or length(_title)>80
    or length(trim(coalesce(_message,'')))<1 or length(_message)>500
  then raise exception 'INVALID_NOTIFICATION'; end if;

  select * into _org from public.organizations where id=_organization_id;
  select * into _segment from public.customer_segments
    where id=_segment_id and organization_id=_organization_id and status='active';
  if _segment is null then raise exception 'SEGMENT_NOT_FOUND'; end if;

  _local_day := (coalesce(_scheduled_for,now()) at time zone _org.timezone)::date;
  select count(*) into _count from public.notifications
   where organization_id=_organization_id and location_id=_location_id and kind='manual'
     and status not in ('draft','cancelled','failed')
     and (coalesce(scheduled_for,created_at) at time zone _org.timezone)::date=_local_day;
  if _count>=_org.notification_daily_limit then raise exception 'DAILY_NOTIFICATION_LIMIT'; end if;

  if _idempotency_key is not null then
    select id into _notification from public.notifications
      where organization_id=_organization_id and idempotency_key=_idempotency_key;
    if _notification is not null then
      return jsonb_build_object('duplicate',true,'notification_id',_notification);
    end if;
  end if;

  _status := case when _scheduled_for is not null and _scheduled_for>now()
    then 'scheduled' else 'queued' end;
  insert into public.notifications(
    organization_id,location_id,segment_id,title,message,destination_url,kind,status,
    scheduled_for,idempotency_key,created_by
  ) values(
    _organization_id,_location_id,_segment_id,trim(_title),trim(_message),
    nullif(trim(_destination_url),''),'manual',_status,_scheduled_for,
    _idempotency_key,auth.uid()
  ) returning id into _notification;

  insert into public.notification_deliveries(
    notification_id,organization_id,membership_id,wallet_pass_id,provider,status
  )
  select _notification,_organization_id,membership.id,pass.id,pass.provider,
    case when pass.is_sandbox then 'demo' else 'queued' end
  from public.memberships membership
  join public.customers customer on customer.id=membership.customer_id
  join public.customer_consents consent
    on consent.customer_id=customer.id and consent.organization_id=_organization_id
    and consent.consent_type='marketing' and consent.granted
  left join public.wallet_passes pass
    on pass.membership_id=membership.id and pass.status<>'revoked'
  where membership.organization_id=_organization_id
    and membership.acquisition_location_id=_location_id
    and membership.status='active'
    and public.segment_matches(membership.id,_segment.definition);

  update public.notifications set recipient_count=(
    select count(distinct membership_id) from public.notification_deliveries
    where notification_id=_notification
  ) where id=_notification;
  insert into public.audit_logs(
    actor_user_id,organization_id,location_id,action,entity_type,entity_id,metadata
  ) values(
    auth.uid(),_organization_id,_location_id,'notification_queued','notification',
    _notification,jsonb_build_object('segment',_segment.name,'mode','wallet')
  );
  return jsonb_build_object(
    'duplicate',false,'notification_id',_notification,'status',_status,
    'recipient_count',(select recipient_count from public.notifications where id=_notification)
  );
end; $$;

revoke all on function public.queue_manual_notification(uuid,uuid,text,text,text,timestamptz,text,uuid)
  from public, anon;
grant execute on function public.queue_manual_notification(uuid,uuid,text,text,text,timestamptz,text,uuid)
  to authenticated;
