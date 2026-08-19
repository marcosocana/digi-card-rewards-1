-- Public brand assets and the remaining dynamic segment predicates.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('brand-assets', 'brand-assets', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "brand assets admin read" on storage.objects for select to authenticated
using(bucket_id = 'brand-assets' and public.is_org_admin((storage.foldername(name))[1]::uuid));
create policy "brand assets admin insert" on storage.objects for insert to authenticated
with check(bucket_id = 'brand-assets' and public.is_org_admin((storage.foldername(name))[1]::uuid));
create policy "brand assets admin update" on storage.objects for update to authenticated
using(bucket_id = 'brand-assets' and public.is_org_admin((storage.foldername(name))[1]::uuid))
with check(bucket_id = 'brand-assets' and public.is_org_admin((storage.foldername(name))[1]::uuid));
create policy "brand assets admin delete" on storage.objects for delete to authenticated
using(bucket_id = 'brand-assets' and public.is_org_admin((storage.foldername(name))[1]::uuid));

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
  elsif _type='wallet' then return exists(select 1 from public.wallet_passes where membership_id=_m.id and status='active' and provider::text=coalesce(_definition->>'provider',provider::text));
  elsif _type='campaign' then return exists(select 1 from public.customer_rewards where membership_id=_m.id and campaign_id=(_definition->>'campaign_id')::uuid);
  end if;
  return false;
end; $$;
revoke all on function public.segment_matches(uuid,jsonb) from public, anon, authenticated;
