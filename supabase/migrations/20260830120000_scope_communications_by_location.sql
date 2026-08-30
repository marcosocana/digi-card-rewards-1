alter table public.notifications
  add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.notification_automations
  add column if not exists location_id uuid references public.locations(id) on delete cascade;

create index if not exists notifications_location_idx
  on public.notifications(location_id, created_at desc);
create index if not exists notification_automations_location_idx
  on public.notification_automations(location_id, is_active);

alter table public.notification_automations
  drop constraint if exists notification_automations_organization_id_name_key;
alter table public.notification_automations
  add constraint notification_automations_organization_location_name_key
  unique (organization_id, location_id, name);

-- Existing automations are copied once per active establishment so future
-- edits and executions are independent at location level.
insert into public.notification_automations (
  organization_id, location_id, name, trigger_type, conditions, title, message,
  destination_url, segment_id, delay_minutes, is_active, next_run_at, created_by
)
select
  automation.organization_id, location.id, automation.name, automation.trigger_type,
  automation.conditions, automation.title, automation.message, automation.destination_url,
  automation.segment_id, automation.delay_minutes, automation.is_active,
  automation.next_run_at, automation.created_by
from public.notification_automations automation
join public.locations location
  on location.organization_id = automation.organization_id and location.status = 'active'
where automation.location_id is null;

delete from public.notification_automations automation
where automation.location_id is null
  and exists (
    select 1 from public.locations location
    where location.organization_id = automation.organization_id and location.status = 'active'
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
begin
  if not public.is_org_admin(_organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if _location_id is null or not exists (
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

create or replace function public.enqueue_automation_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare _membership uuid; _org uuid; _location uuid; _event text; automation record;
begin
  if tg_table_name='acquisition_events' then
    if new.event_type<>'registration_completed' or new.customer_id is null then return new; end if;
    select id,organization_id,acquisition_location_id into _membership,_org,_location
      from public.memberships where customer_id=new.customer_id
      and organization_id=new.organization_id order by joined_at desc limit 1;
    _event:='welcome';
  else
    _membership:=new.membership_id; _org:=new.organization_id; _event:='reward_earned';
    select acquisition_location_id into _location from public.memberships where id=_membership;
  end if;
  for automation in select * from public.notification_automations
    where organization_id=_org and location_id=_location
      and trigger_type=_event and is_active
  loop
    insert into public.automation_jobs(
      organization_id,automation_id,membership_id,event_type,event_id,payload,scheduled_for
    ) values(
      _org,automation.id,_membership,_event,new.id,to_jsonb(new),
      now()+make_interval(mins=>automation.delay_minutes)
    ) on conflict do nothing;
  end loop;
  return new;
end; $$;

create or replace function public.enqueue_scheduled_automations(
  _organization_id uuid, _location_id uuid
)
returns integer language plpgsql security definer set search_path = public as $$
declare automation record; membership record; _count integer:=0; _days integer;
begin
  if not (public.is_org_admin(_organization_id) or auth.role()='service_role')
    then raise exception 'NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.locations where id=_location_id and organization_id=_organization_id)
    then raise exception 'INVALID_LOCATION'; end if;
  for automation in select * from public.notification_automations
    where organization_id=_organization_id and location_id=_location_id and is_active
      and trigger_type in ('inactivity','birthday')
  loop
    _days:=coalesce((automation.conditions->>'days')::int,60);
    for membership in
      select m.id,c.birth_date,c.last_activity_at
      from public.memberships m join public.customers c on c.id=m.customer_id
      where m.organization_id=_organization_id and m.acquisition_location_id=_location_id
        and m.status='active' and (
          (automation.trigger_type='birthday' and c.birth_date is not null
            and extract(month from c.birth_date)=extract(month from current_date)
            and extract(day from c.birth_date)=extract(day from current_date))
          or (automation.trigger_type='inactivity'
            and coalesce(c.last_activity_at,m.joined_at)<now()-make_interval(days=>_days))
        )
    loop
      insert into public.automation_jobs(
        organization_id,automation_id,membership_id,event_type,payload,scheduled_for
      ) select
        _organization_id,automation.id,membership.id,automation.trigger_type,
        jsonb_build_object('run_date',current_date),
        now()+make_interval(mins=>automation.delay_minutes)
      where not exists(
        select 1 from public.automation_jobs where automation_id=automation.id
          and membership_id=membership.id and event_type=automation.trigger_type
          and created_at::date=current_date
      );
      if found then _count:=_count+1; end if;
    end loop;
    update public.notification_automations
      set last_run_at=now(),next_run_at=date_trunc('day',now())+interval '1 day'
      where id=automation.id;
  end loop;
  return _count;
end; $$;

revoke all on function public.enqueue_scheduled_automations(uuid,uuid) from public, anon;
grant execute on function public.enqueue_scheduled_automations(uuid,uuid)
  to authenticated, service_role;

create or replace function public.process_automation_jobs(
  _organization_id uuid, _location_id uuid, _limit integer default 100
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare job record; automation public.notification_automations; _notification uuid;
  _processed integer:=0; _failed integer:=0;
begin
  if not (public.is_org_admin(_organization_id) or auth.role()='service_role')
    then raise exception 'NOT_AUTHORIZED'; end if;
  for job in
    select automation_job.* from public.automation_jobs automation_job
    join public.notification_automations scoped_automation
      on scoped_automation.id=automation_job.automation_id
    where automation_job.organization_id=_organization_id
      and scoped_automation.location_id=_location_id
      and automation_job.status='pending' and automation_job.scheduled_for<=now()
    order by automation_job.scheduled_for for update of automation_job skip locked
    limit least(greatest(_limit,1),500)
  loop
    begin
      update public.automation_jobs set status='processing',attempts=attempts+1 where id=job.id;
      select * into automation from public.notification_automations
        where id=job.automation_id and is_active and location_id=_location_id;
      if automation is null then
        update public.automation_jobs set status='cancelled',completed_at=now() where id=job.id;
        continue;
      end if;
      insert into public.notifications(
        organization_id,location_id,segment_id,title,message,destination_url,kind,status,recipient_count
      ) values(
        _organization_id,_location_id,automation.segment_id,automation.title,
        automation.message,automation.destination_url,'automation','queued',1
      ) returning id into _notification;
      insert into public.notification_deliveries(
        notification_id,organization_id,membership_id,wallet_pass_id,provider,status
      ) select
        _notification,_organization_id,job.membership_id,pass.id,pass.provider,
        case when pass.is_sandbox then 'demo' else 'queued' end
      from public.wallet_passes pass
      where pass.membership_id=job.membership_id and pass.status<>'revoked'
        and exists(
          select 1 from public.memberships m
          join public.customer_consents c on c.customer_id=m.customer_id
            and c.organization_id=_organization_id and c.consent_type='marketing' and c.granted
          where m.id=job.membership_id and m.acquisition_location_id=_location_id
        );
      update public.automation_jobs set status='completed',completed_at=now() where id=job.id;
      update public.notification_automations set last_run_at=now() where id=automation.id;
      _processed:=_processed+1;
    exception when others then
      update public.automation_jobs set status='failed',last_error=sqlerrm where id=job.id;
      _failed:=_failed+1;
    end;
  end loop;
  return jsonb_build_object('processed',_processed,'failed',_failed);
end; $$;

revoke all on function public.process_automation_jobs(uuid,uuid,integer) from public, anon;
grant execute on function public.process_automation_jobs(uuid,uuid,integer)
  to authenticated, service_role;
