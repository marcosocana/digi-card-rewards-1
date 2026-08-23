-- Subscription access for self-serve business accounts.
-- Existing organizations retain access; newly-created organizations start without a plan.

alter table public.organizations
  add column if not exists subscription_status text not null default 'active'
    check (subscription_status in ('none', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_updated_at timestamptz;

create unique index if not exists organizations_stripe_customer_unique
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists organizations_stripe_subscription_unique
  on public.organizations (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.organizations alter column subscription_status set default 'none';
alter table public.organizations alter column plan_code drop default;
alter table public.organizations alter column plan_code drop not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

-- Invited team members keep their assigned organization. A self-serve signup gets
-- a private organization so the account can complete onboarding and choose a plan.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _role public.platform_role := 'user';
  _has_membership boolean := false;
  _organization_id uuid;
  _display_name text;
  _slug_base text;
begin
  select role into _role
    from public.platform_invitations
   where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, platform_role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(_role, 'user')
  );

  update public.organization_users
     set user_id = new.id, updated_at = now()
   where user_id is null and lower(invited_email) = lower(new.email);

  select exists (
    select 1 from public.organization_users where user_id = new.id
  ) into _has_membership;

  if not _has_membership and coalesce(_role, 'user') <> 'superadmin' then
    _display_name := coalesce(
      nullif(new.raw_user_meta_data->>'business_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    );
    _slug_base := trim(both '-' from regexp_replace(lower(_display_name), '[^a-z0-9]+', '-', 'g'));
    if _slug_base = '' then _slug_base := 'negocio'; end if;

    insert into public.organizations (
      display_name,
      slug,
      contact_email,
      status,
      plan_code,
      subscription_status
    ) values (
      _display_name,
      _slug_base || '-' || substr(replace(new.id::text, '-', ''), 1, 8),
      new.email,
      'configuration_pending',
      null,
      'none'
    ) returning id into _organization_id;

    insert into public.organization_users (
      organization_id,
      user_id,
      invited_email,
      full_name,
      role,
      status,
      can_adjust_points
    ) values (
      _organization_id,
      new.id,
      new.email,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), _display_name),
      'admin',
      'active',
      true
    );
  end if;

  return new;
end; $$;

