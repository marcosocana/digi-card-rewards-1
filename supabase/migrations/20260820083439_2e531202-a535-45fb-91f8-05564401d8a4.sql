-- Follow-up discovered during live validation: support full-name searches and
-- keep campaign configuration visible only to tenant administrators.

create or replace function public.search_memberships(_query text, _location_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _org uuid; _result jsonb; _term text;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select organization_id into _org from public.locations where id = _location_id;
  _term := trim(coalesce(_query,''));
  if length(_term) < 2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(public.membership_service_payload(found.id, _location_id)), '[]'::jsonb) into _result
  from (
    select membership.id
      from public.memberships membership
      join public.customers customer on customer.id = membership.customer_id
      left join public.membership_tokens token on token.membership_id = membership.id and token.status = 'active'
     where membership.organization_id = _org and membership.status = 'active'
       and (trim(concat_ws(' ', customer.first_name, customer.last_name)) ilike '%'||_term||'%'
         or customer.email ilike '%'||_term||'%' or coalesce(customer.phone,'') ilike '%'||_term||'%'
         or token.short_code ilike '%'||_term||'%')
     order by customer.last_activity_at desc nulls last, membership.joined_at desc
     limit 10
  ) found;
  return _result;
end; $$;

drop policy if exists "campaigns read" on public.campaigns;
create policy "campaigns read" on public.campaigns for select to authenticated
  using (public.is_org_admin(organization_id));