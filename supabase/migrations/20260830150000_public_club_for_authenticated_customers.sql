-- Public club pages must remain readable after a customer authenticates through
-- the QR email verification flow. PostgreSQL uses the authenticated role from
-- that point onwards, so anon-only policies would make the same club disappear.

drop policy if exists "orgs public authenticated read" on public.organizations;
create policy "orgs public authenticated read"
on public.organizations for select to authenticated
using (status = 'active');

drop policy if exists "branding public authenticated read" on public.organization_branding;
create policy "branding public authenticated read"
on public.organization_branding for select to authenticated
using (
  exists (
    select 1 from public.organizations organization
    where organization.id = organization_id and organization.status = 'active'
  )
);

drop policy if exists "locations public authenticated read" on public.locations;
create policy "locations public authenticated read"
on public.locations for select to authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.organizations organization
    where organization.id = organization_id and organization.status = 'active'
  )
);

drop policy if exists "programs public authenticated read" on public.loyalty_programs;
create policy "programs public authenticated read"
on public.loyalty_programs for select to authenticated
using (
  status = 'active'
  and archived_at is null
  and exists (
    select 1 from public.organizations organization
    where organization.id = organization_id and organization.status = 'active'
  )
);

drop policy if exists "proglocs public authenticated read" on public.program_locations;
create policy "proglocs public authenticated read"
on public.program_locations for select to authenticated
using (
  exists (
    select 1
    from public.loyalty_programs program
    join public.locations location on location.id = location_id
    join public.organizations organization on organization.id = program.organization_id
    where program.id = program_id
      and program.status = 'active'
      and program.archived_at is null
      and location.status = 'active'
      and location.organization_id = program.organization_id
      and organization.status = 'active'
  )
);
