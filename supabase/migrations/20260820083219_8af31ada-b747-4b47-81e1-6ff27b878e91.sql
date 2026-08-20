-- Organization admins see the full franchise. Managers and staff only see their assigned locations.
create or replace function public.is_org_admin(_org uuid, _uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin(_uid) or exists (
    select 1
      from public.organization_users ou
     where ou.organization_id = _org
       and ou.user_id = _uid
       and ou.status = 'active'
       and ou.role = 'admin'
  );
$$;

-- Resolve organization-user visibility outside RLS evaluation to avoid a
-- recursive loop between organization_users and user_location_assignments.
create or replace function public.can_view_org_user(
  _organization_user_id uuid,
  _uid uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.organization_users target
     where target.id = _organization_user_id
       and (
         public.is_org_admin(target.organization_id, _uid)
         or target.user_id = _uid
         or exists (
           select 1
             from public.user_location_assignments assignment
            where assignment.organization_user_id = target.id
              and public.can_access_location(assignment.location_id, _uid)
         )
       )
  );
$$;

revoke all on function public.can_view_org_user(uuid, uuid) from public, anon;
grant execute on function public.can_view_org_user(uuid, uuid) to authenticated;

drop policy if exists "locations read" on public.locations;
create policy "locations read" on public.locations for select to authenticated
  using (public.can_access_location(id));

drop policy if exists "proglocs read" on public.program_locations;
create policy "proglocs read" on public.program_locations for select to authenticated
  using (public.can_access_location(location_id));

drop policy if exists "rewlocs read" on public.reward_locations;
create policy "rewlocs read" on public.reward_locations for select to authenticated
  using (public.can_access_location(location_id));

drop policy if exists "memberships read" on public.memberships;
create policy "memberships read" on public.memberships for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or (acquisition_location_id is not null and public.can_access_location(acquisition_location_id))
  );

drop policy if exists "customers read via membership" on public.customers;
create policy "customers read via membership" on public.customers for select to authenticated
  using (
    public.is_superadmin()
    or exists (
      select 1
        from public.memberships m
       where m.customer_id = customers.id
         and (
           public.is_org_admin(m.organization_id)
           or (m.acquisition_location_id is not null and public.can_access_location(m.acquisition_location_id))
         )
    )
  );

drop policy if exists "consents read" on public.customer_consents;
create policy "consents read" on public.customer_consents for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or exists (
      select 1
        from public.memberships m
       where m.customer_id = customer_consents.customer_id
         and m.organization_id = customer_consents.organization_id
         and m.acquisition_location_id is not null
         and public.can_access_location(m.acquisition_location_id)
    )
  );

drop policy if exists "txn read" on public.point_transactions;
create policy "txn read" on public.point_transactions for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "redemptions read" on public.redemptions;
create policy "redemptions read" on public.redemptions for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "passes read" on public.wallet_passes;
create policy "passes read" on public.wallet_passes for select to authenticated
  using (
    exists (
      select 1
        from public.memberships m
       where m.id = wallet_passes.membership_id
         and (
           public.is_org_admin(m.organization_id)
           or (m.acquisition_location_id is not null and public.can_access_location(m.acquisition_location_id))
         )
    )
  );

drop policy if exists "sources read" on public.acquisition_sources;
create policy "sources read" on public.acquisition_sources for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "sources write" on public.acquisition_sources;
create policy "sources write" on public.acquisition_sources for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "sources update" on public.acquisition_sources;
create policy "sources update" on public.acquisition_sources for update to authenticated
  using (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  )
  with check (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "sources delete" on public.acquisition_sources;
create policy "sources delete" on public.acquisition_sources for delete to authenticated
  using (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "events read" on public.acquisition_events;
create policy "events read" on public.acquisition_events for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or (location_id is not null and public.can_access_location(location_id))
  );

drop policy if exists "org_users read" on public.organization_users;
create policy "org_users read" on public.organization_users for select to authenticated
  using (public.can_view_org_user(id));

drop policy if exists "ula read" on public.user_location_assignments;
create policy "ula read" on public.user_location_assignments for select to authenticated
  using (
    public.can_access_location(location_id)
    or public.can_view_org_user(organization_user_id)
  );

drop policy if exists "audit read" on public.audit_logs;
create policy "audit read" on public.audit_logs for select to authenticated
  using (
    public.is_superadmin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  );

-- Cashier operations remain location-scoped by can_access_location inside each function.
grant execute on function public.resolve_membership_qr(text, uuid) to authenticated;
grant execute on function public.record_purchase(uuid, uuid, integer, text, text, text) to authenticated;
grant execute on function public.redeem_reward(uuid, uuid, uuid, text) to authenticated;

-- The Malasaña employee can operate the till, including reward redemption, but not adjust balances manually.
update public.organization_users
   set status = 'active', can_adjust_points = false
 where lower(invited_email) = 'empleado@cafenorte.es';