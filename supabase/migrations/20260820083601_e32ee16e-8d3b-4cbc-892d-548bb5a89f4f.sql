-- Phase 3: dynamic segments, manual notifications, deliveries and automation jobs.

create table public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  definition jsonb not null default '{"type":"all"}'::jsonb,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, name)
);
create index customer_segments_org_idx on public.customer_segments(organization_id, status);
grant select, insert, update on public.customer_segments to authenticated;
grant all on public.customer_segments to service_role;
alter table public.customer_segments enable row level security;
create policy "segments read" on public.customer_segments for select to authenticated using (public.is_org_admin(organization_id));
create policy "segments insert" on public.customer_segments for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "segments update" on public.customer_segments for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create trigger trg_touch_customer_segments before update on public.customer_segments for each row execute function public.touch_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  segment_id uuid references public.customer_segments(id) on delete set null,
  title text not null check (length(title) between 1 and 80),
  message text not null check (length(message) between 1 and 500),
  destination_url text,
  image_url text,
  kind text not null default 'manual' check (kind in ('manual','automation')),
  status text not null default 'draft' check (status in ('draft','scheduled','queued','processing','sent','partial','failed','cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  idempotency_key text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);
create index notifications_org_schedule_idx on public.notifications(organization_id, scheduled_for, status);
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications read" on public.notifications for select to authenticated using (public.is_org_admin(organization_id));
create trigger trg_touch_notifications before update on public.notifications for each row execute function public.touch_updated_at();

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  wallet_pass_id uuid references public.wallet_passes(id) on delete set null,
  provider public.wallet_provider,
  status text not null default 'queued' check (status in ('queued','demo','processing','delivered','failed','skipped')),
  provider_message_id text,
  failure_reason text,
  attempted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, membership_id, provider)
);
create index notification_deliveries_notification_idx on public.notification_deliveries(notification_id, status);
grant select on public.notification_deliveries to authenticated;
grant all on public.notification_deliveries to service_role;
alter table public.notification_deliveries enable row level security;
create policy "notification deliveries read" on public.notification_deliveries for select to authenticated using (public.is_org_admin(organization_id));

create table public.notification_automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  segment_id uuid references public.customer_segments(id) on delete set null,
  name text not null,
  trigger_type text not null check (trigger_type in ('welcome','reward_earned','inactivity','birthday','reward_reminder','points_expiry','post_transaction')),
  conditions jsonb not null default '{}'::jsonb,
  delay_minutes integer not null default 0 check (delay_minutes >= 0),
  title text not null,
  message text not null,
  destination_url text,
  is_active boolean not null default false,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
grant select, insert, update on public.notification_automations to authenticated;
grant all on public.notification_automations to service_role;
alter table public.notification_automations enable row level security;
create policy "automations read" on public.notification_automations for select to authenticated using (public.is_org_admin(organization_id));
create policy "automations insert" on public.notification_automations for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "automations update" on public.notification_automations for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create trigger trg_touch_notification_automations before update on public.notification_automations for each row execute function public.touch_updated_at();

create table public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid not null references public.notification_automations(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  event_type text not null,
  event_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled')),
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index automation_jobs_event_unique on public.automation_jobs(automation_id, membership_id, event_type, event_id) where event_id is not null;
create index automation_jobs_pending_idx on public.automation_jobs(status, scheduled_for);
grant select on public.automation_jobs to authenticated;
grant all on public.automation_jobs to service_role;
alter table public.automation_jobs enable row level security;
create policy "automation jobs read" on public.automation_jobs for select to authenticated using (public.is_org_admin(organization_id));

create or replace function public.segment_matches(_membership_id uuid, _definition jsonb)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare _type text := coalesce(_definition->>'type','all'); _m public.memberships; _c public.customers;
        _days integer; _value numeric;
begin
  select * into _m from public.memberships where id=_membership_id;
  if _m is null then return false; end if;
  select * into _c from public.customers where id=_m.customer_id;
  if _type='all' then return true;
  elsif _type='new' then _days:=coalesce((_definition->>'days')::int,30); return _m.joined_at >= now()-make_interval(days=>_days);
  elsif _type='inactive' then _days:=coalesce((_definition->>'days')::int,60); return coalesce(_c.last_activity_at,_m.joined_at) < now()-make_interval(days=>_days);
  elsif _type='recurrent' then return (select count(*) from public.point_transactions where membership_id=_m.id and type='purchase') >= coalesce((_definition->>'visits')::int,3);
  elsif _type='reward_available' then return exists(select 1 from public.customer_rewards where membership_id=_m.id and status='available');
  elsif _type='near_reward' then return exists(select 1 from public.rewards where program_id=_m.program_id and status='active' and points_cost>_m.cached_points_balance and points_cost-_m.cached_points_balance<=coalesce((_definition->>'distance')::int,20));
  elsif _type='birthday' then return _c.birth_date is not null and extract(month from _c.birth_date)=extract(month from current_date);
  elsif _type='marketing' then return exists(select 1 from public.customer_consents where customer_id=_c.id and organization_id=_m.organization_id and consent_type='marketing' and granted);
  elsif _type='location' then return _m.acquisition_location_id=(_definition->>'location_id')::uuid;
  elsif _type='spend' then _value:=coalesce((_definition->>'minimum_cents')::numeric,0); return coalesce((select sum(amount_cents) from public.point_transactions where membership_id=_m.id and type='purchase'),0)>=_value;
  elsif _type='vip' then return coalesce((select sum(amount_cents) from public.point_transactions where membership_id=_m.id and type='purchase'),0)>=coalesce((_definition->>'minimum_cents')::numeric,50000);
  end if;
  return false;
end; $$;
revoke all on function public.segment_matches(uuid,jsonb) from public, anon, authenticated;

create or replace function public.preview_segment_count(_segment_id uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare _segment public.customer_segments; _count integer;
begin
  select * into _segment from public.customer_segments where id=_segment_id;
  if _segment is null or not public.is_org_admin(_segment.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  select count(*) into _count from public.memberships membership where membership.organization_id=_segment.organization_id and membership.status='active' and public.segment_matches(membership.id,_segment.definition);
  return _count;
end; $$;
revoke all on function public.preview_segment_count(uuid) from public, anon;
grant execute on function public.preview_segment_count(uuid) to authenticated;

create or replace function public.queue_manual_notification(
  _organization_id uuid, _segment_id uuid, _title text, _message text, _destination_url text default null,
  _scheduled_for timestamptz default null, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _org public.organizations; _segment public.customer_segments; _notification uuid; _count integer; _local_day date; _status text;
begin
  if not public.is_org_admin(_organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if length(trim(coalesce(_title,'')))<1 or length(_title)>80 or length(trim(coalesce(_message,'')))<1 or length(_message)>500 then raise exception 'INVALID_NOTIFICATION'; end if;
  select * into _org from public.organizations where id=_organization_id;
  select * into _segment from public.customer_segments where id=_segment_id and organization_id=_organization_id and status='active';
  if _segment is null then raise exception 'SEGMENT_NOT_FOUND'; end if;
  _local_day := (coalesce(_scheduled_for,now()) at time zone _org.timezone)::date;
  select count(*) into _count from public.notifications
   where organization_id=_organization_id and kind='manual' and status not in ('draft','cancelled','failed')
     and (coalesce(scheduled_for,created_at) at time zone _org.timezone)::date=_local_day;
  if _count>=_org.notification_daily_limit then raise exception 'DAILY_NOTIFICATION_LIMIT'; end if;
  if _idempotency_key is not null then
    select id into _notification from public.notifications where organization_id=_organization_id and idempotency_key=_idempotency_key;
    if _notification is not null then return jsonb_build_object('duplicate',true,'notification_id',_notification); end if;
  end if;
  _status := case when _scheduled_for is not null and _scheduled_for>now() then 'scheduled' else 'queued' end;
  insert into public.notifications(organization_id,segment_id,title,message,destination_url,kind,status,scheduled_for,idempotency_key,created_by)
  values(_organization_id,_segment_id,trim(_title),trim(_message),nullif(trim(_destination_url),''),'manual',_status,_scheduled_for,_idempotency_key,auth.uid()) returning id into _notification;
  insert into public.notification_deliveries(notification_id,organization_id,membership_id,wallet_pass_id,provider,status)
  select _notification,_organization_id,membership.id,pass.id,pass.provider,case when pass.is_sandbox then 'demo' else 'queued' end
    from public.memberships membership
    join public.customers customer on customer.id=membership.customer_id
    join public.customer_consents consent on consent.customer_id=customer.id and consent.organization_id=_organization_id and consent.consent_type='marketing' and consent.granted
    left join public.wallet_passes pass on pass.membership_id=membership.id and pass.status<>'revoked'
   where membership.organization_id=_organization_id and membership.status='active' and public.segment_matches(membership.id,_segment.definition);
  update public.notifications set recipient_count=(select count(distinct membership_id) from public.notification_deliveries where notification_id=_notification) where id=_notification;
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),_organization_id,'notification_queued','notification',_notification,jsonb_build_object('segment',_segment.name,'mode','wallet'));
  return jsonb_build_object('duplicate',false,'notification_id',_notification,'status',_status,
    'recipient_count',(select recipient_count from public.notifications where id=_notification));
end; $$;
revoke all on function public.queue_manual_notification(uuid,uuid,text,text,text,timestamptz,text) from public, anon;
grant execute on function public.queue_manual_notification(uuid,uuid,text,text,text,timestamptz,text) to authenticated;

create or replace function public.enqueue_automation_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare _membership uuid; _org uuid; _event text; automation record;
begin
  if tg_table_name='acquisition_events' then
    if new.event_type<>'registration_completed' or new.customer_id is null then return new; end if;
    select id,organization_id into _membership,_org from public.memberships where customer_id=new.customer_id and organization_id=new.organization_id order by joined_at desc limit 1;
    _event:='welcome';
  else
    _membership:=new.membership_id; _org:=new.organization_id; _event:='reward_earned';
  end if;
  for automation in select * from public.notification_automations where organization_id=_org and trigger_type=_event and is_active loop
    insert into public.automation_jobs(organization_id,automation_id,membership_id,event_type,event_id,payload,scheduled_for)
    values(_org,automation.id,_membership,_event,new.id,to_jsonb(new),now()+make_interval(mins=>automation.delay_minutes)) on conflict do nothing;
  end loop;
  return new;
end; $$;
create trigger trg_registration_automation after insert on public.acquisition_events for each row execute function public.enqueue_automation_event();
create trigger trg_reward_automation after insert on public.customer_rewards for each row execute function public.enqueue_automation_event();
revoke all on function public.enqueue_automation_event() from public, anon, authenticated;

create or replace function public.enqueue_scheduled_automations(_organization_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare automation record; membership record; _count integer:=0; _days integer;
begin
  if not (public.is_org_admin(_organization_id) or auth.role()='service_role') then raise exception 'NOT_AUTHORIZED'; end if;
  for automation in select * from public.notification_automations where organization_id=_organization_id and is_active and trigger_type in ('inactivity','birthday') loop
    _days:=coalesce((automation.conditions->>'days')::int,60);
    for membership in
      select m.id,c.birth_date,c.last_activity_at from public.memberships m join public.customers c on c.id=m.customer_id
      where m.organization_id=_organization_id and m.status='active' and (
        (automation.trigger_type='birthday' and c.birth_date is not null and extract(month from c.birth_date)=extract(month from current_date) and extract(day from c.birth_date)=extract(day from current_date))
        or (automation.trigger_type='inactivity' and coalesce(c.last_activity_at,m.joined_at)<now()-make_interval(days=>_days))
      )
    loop
      insert into public.automation_jobs(organization_id,automation_id,membership_id,event_type,payload,scheduled_for)
      select _organization_id,automation.id,membership.id,automation.trigger_type,jsonb_build_object('run_date',current_date),now()+make_interval(mins=>automation.delay_minutes)
      where not exists(select 1 from public.automation_jobs where automation_id=automation.id and membership_id=membership.id and event_type=automation.trigger_type and created_at::date=current_date);
      if found then _count:=_count+1; end if;
    end loop;
    update public.notification_automations set last_run_at=now(),next_run_at=date_trunc('day',now())+interval '1 day' where id=automation.id;
  end loop;
  return _count;
end; $$;
revoke all on function public.enqueue_scheduled_automations(uuid) from public, anon;
grant execute on function public.enqueue_scheduled_automations(uuid) to authenticated, service_role;

create or replace function public.process_automation_jobs(_organization_id uuid, _limit integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare job record; automation public.notification_automations; _notification uuid; _processed integer:=0; _failed integer:=0;
begin
  if not (public.is_org_admin(_organization_id) or auth.role()='service_role') then raise exception 'NOT_AUTHORIZED'; end if;
  for job in select * from public.automation_jobs where organization_id=_organization_id and status='pending' and scheduled_for<=now() order by scheduled_for for update skip locked limit least(greatest(_limit,1),500)
  loop
    begin
      update public.automation_jobs set status='processing',attempts=attempts+1 where id=job.id;
      select * into automation from public.notification_automations where id=job.automation_id and is_active;
      if automation is null then
        update public.automation_jobs set status='cancelled',completed_at=now() where id=job.id;
        continue;
      end if;
      insert into public.notifications(organization_id,segment_id,title,message,destination_url,kind,status,recipient_count)
      values(_organization_id,automation.segment_id,automation.title,automation.message,automation.destination_url,'automation','queued',1)
      returning id into _notification;
      insert into public.notification_deliveries(notification_id,organization_id,membership_id,wallet_pass_id,provider,status)
      select _notification,_organization_id,job.membership_id,pass.id,pass.provider,case when pass.is_sandbox then 'demo' else 'queued' end
      from public.wallet_passes pass
      where pass.membership_id=job.membership_id and pass.status<>'revoked'
        and exists(select 1 from public.memberships m join public.customer_consents c on c.customer_id=m.customer_id and c.organization_id=_organization_id and c.consent_type='marketing' and c.granted where m.id=job.membership_id);
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
revoke all on function public.process_automation_jobs(uuid,integer) from public, anon;
grant execute on function public.process_automation_jobs(uuid,integer) to authenticated, service_role;

insert into public.customer_segments(id,organization_id,name,description,definition) values
('77777777-7777-4777-8777-777777777701','11111111-1111-4111-8111-111111111111','Todos con marketing','Clientes con comunicaciones comerciales aceptadas','{"type":"marketing"}'),
('77777777-7777-4777-8777-777777777702','11111111-1111-4111-8111-111111111111','Clientes nuevos','Altas de los últimos 30 días','{"type":"new","days":30}'),
('77777777-7777-4777-8777-777777777703','11111111-1111-4111-8111-111111111111','Sin actividad','Sin visitas durante 60 días','{"type":"inactive","days":60}'),
('77777777-7777-4777-8777-777777777704','11111111-1111-4111-8111-111111111111','Con recompensa','Clientes con una recompensa disponible','{"type":"reward_available"}'),
('77777777-7777-4777-8777-777777777705','11111111-1111-4111-8111-111111111111','Cumpleaños del mes','Clientes que cumplen años este mes','{"type":"birthday"}')
on conflict do nothing;

insert into public.notification_automations(id,organization_id,name,trigger_type,conditions,title,message,is_active,next_run_at) values
('88888888-8888-4888-8888-888888888801','11111111-1111-4111-8111-111111111111','Bienvenida','welcome','{}','¡Bienvenido a Café Norte!','Tu tarjeta ya está lista. Empieza a sumar puntos en tu próxima visita.',true,null),
('88888888-8888-4888-8888-888888888802','11111111-1111-4111-8111-111111111111','Recompensa obtenida','reward_earned','{}','¡Tienes una recompensa!','Ya puedes canjear tu premio en cualquiera de nuestros cafés participantes.',true,null),
('88888888-8888-4888-8888-888888888803','11111111-1111-4111-8111-111111111111','Recuperar clientes inactivos','inactivity','{"days":60}','Te echamos de menos','Vuelve a Café Norte y continúa avanzando hacia tu próxima recompensa.',true,date_trunc('day',now())+interval '1 day'),
('88888888-8888-4888-8888-888888888804','11111111-1111-4111-8111-111111111111','Cumpleaños','birthday','{}','¡Feliz cumpleaños!','Celebra tu día con nosotros. Consulta tu tarjeta para descubrir tus ventajas.',true,date_trunc('day',now())+interval '1 day')
on conflict do nothing;