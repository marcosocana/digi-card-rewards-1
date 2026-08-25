-- Provision a usable onboarding workspace after a paid plan becomes active and
-- allow the webhook-driven onboarding email to be logged idempotently.

alter table public.transactional_email_deliveries
  drop constraint if exists transactional_email_deliveries_kind_check;

alter table public.transactional_email_deliveries
  add constraint transactional_email_deliveries_kind_check
  check (kind in (
    'account_welcome',
    'team_invitation',
    'membership_welcome',
    'password_changed',
    'subscription_onboarding'
  ));

create or replace function public.provision_paid_organization(_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _organization public.organizations;
  _program_id uuid;
begin
  select * into _organization
  from public.organizations
  where id = _organization_id;

  if _organization is null
    or _organization.plan_code not in ('basic', 'pro', 'ultra')
    or _organization.subscription_status not in ('active', 'trialing') then
    return;
  end if;

  insert into public.organization_branding (organization_id)
  values (_organization.id)
  on conflict (organization_id) do nothing;

  select id into _program_id
  from public.loyalty_programs
  where organization_id = _organization.id
    and archived_at is null
  order by created_at
  limit 1;

  if _program_id is null then
    insert into public.loyalty_programs (
      organization_id,
      internal_name,
      public_name,
      description,
      mechanic_type,
      status
    ) values (
      _organization.id,
      'Programa principal',
      'Club ' || _organization.display_name,
      'Programa de fidelización de ' || _organization.display_name,
      'spend',
      'draft'
    ) returning id into _program_id;
  end if;

  if not exists (
    select 1 from public.campaigns
    where organization_id = _organization.id
      and archived_at is null
  ) then
    insert into public.campaigns (
      organization_id,
      program_id,
      internal_name,
      public_name,
      mechanic_type,
      description,
      status,
      is_primary
    ) values (
      _organization.id,
      _program_id,
      'Campaña principal',
      'Club ' || _organization.display_name,
      'spend',
      'Campaña principal de fidelización',
      'draft',
      false
    );
  end if;
end;
$$;

revoke all on function public.provision_paid_organization(uuid) from public, anon, authenticated;
grant execute on function public.provision_paid_organization(uuid) to service_role;

create or replace function public.provision_paid_organization_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_paid_organization(new.id);
  return new;
end;
$$;

drop trigger if exists provision_paid_organization_trigger on public.organizations;
create trigger provision_paid_organization_trigger
after insert or update of plan_code, subscription_status on public.organizations
for each row
when (
  new.plan_code in ('basic', 'pro', 'ultra')
  and new.subscription_status in ('active', 'trialing')
)
execute function public.provision_paid_organization_trigger();

select public.provision_paid_organization(id)
from public.organizations
where plan_code in ('basic', 'pro', 'ultra')
  and subscription_status in ('active', 'trialing');
