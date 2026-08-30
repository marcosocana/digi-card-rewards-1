-- Every organization needs at least one usable recipient group before it can
-- queue a manual notification. Provision it for new tenants and backfill old
-- tenants created before notification segments existed.

create or replace function public.ensure_default_customer_segment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_segments (
    organization_id,
    name,
    description,
    definition,
    status
  ) values (
    new.id,
    'Todos con marketing',
    'Clientes con comunicaciones comerciales aceptadas',
    '{"type":"marketing"}'::jsonb,
    'active'
  );
  return new;
end;
$$;

drop trigger if exists ensure_default_customer_segment_trigger on public.organizations;
create trigger ensure_default_customer_segment_trigger
after insert on public.organizations
for each row execute function public.ensure_default_customer_segment();

insert into public.customer_segments (
  organization_id,
  name,
  description,
  definition,
  status
)
select
  organization.id,
  'Todos con marketing',
  'Clientes con comunicaciones comerciales aceptadas',
  '{"type":"marketing"}'::jsonb,
  'active'
from public.organizations organization
where not exists (
  select 1
  from public.customer_segments segment
  where segment.organization_id = organization.id
    and segment.status = 'active'
);
