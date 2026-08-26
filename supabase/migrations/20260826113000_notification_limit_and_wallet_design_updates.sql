-- Keep manual communications within the product limit.
alter table public.organizations
  alter column notification_daily_limit set default 3;

update public.organizations
set notification_daily_limit = 3
where notification_daily_limit is distinct from 3;

alter table public.organizations
  drop constraint if exists organizations_notification_daily_limit_check;
alter table public.organizations
  add constraint organizations_notification_daily_limit_check
  check (notification_daily_limit between 0 and 3);

-- Any relevant branding change affects every issued pass in the organization.
-- Queue each installed pass once so non-Google providers can be processed by
-- their worker; Google is also synchronized immediately through its class API.
create or replace function public.queue_wallet_design_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and row(
    new.wallet_background_color,
    new.wallet_text_color,
    new.wallet_logo_url,
    new.wallet_hero_url,
    new.wallet_program_name,
    new.wallet_points_label,
    new.wallet_provider_designs
  ) is not distinct from row(
    old.wallet_background_color,
    old.wallet_text_color,
    old.wallet_logo_url,
    old.wallet_hero_url,
    old.wallet_program_name,
    old.wallet_points_label,
    old.wallet_provider_designs
  ) then
    return new;
  end if;

  update public.wallet_passes wallet_pass
     set status = 'update_pending',
         last_update_requested_at = now()
    from public.memberships membership
   where membership.id = wallet_pass.membership_id
     and membership.organization_id = new.organization_id
     and wallet_pass.status not in ('revoked', 'pending_generation');

  insert into public.wallet_jobs (wallet_pass_id, job_type, status, error)
  select wallet_pass.id, 'update', 'pending', null
    from public.wallet_passes wallet_pass
    join public.memberships membership on membership.id = wallet_pass.membership_id
   where membership.organization_id = new.organization_id
     and wallet_pass.status = 'update_pending'
     and not exists (
       select 1
         from public.wallet_jobs job
        where job.wallet_pass_id = wallet_pass.id
          and job.job_type = 'update'
          and job.status in ('pending', 'processing')
     );

  return new;
end;
$$;

revoke all on function public.queue_wallet_design_updates() from public, anon, authenticated;

drop trigger if exists trg_queue_wallet_design_updates on public.organization_branding;
create trigger trg_queue_wallet_design_updates
after insert or update of
  wallet_background_color,
  wallet_text_color,
  wallet_logo_url,
  wallet_hero_url,
  wallet_program_name,
  wallet_points_label,
  wallet_provider_designs
on public.organization_branding
for each row execute function public.queue_wallet_design_updates();

create or replace function public.complete_google_wallet_design_update(_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wallet_passes wallet_pass
     set status = 'active',
         last_updated_at = now(),
         last_error_code = null,
         last_error_message = null
    from public.memberships membership
   where membership.id = wallet_pass.membership_id
     and membership.organization_id = _organization_id
     and wallet_pass.provider = 'google'
     and wallet_pass.status <> 'revoked';

  update public.wallet_jobs job
     set status = 'completed',
         completed_at = now(),
         error = null
    from public.wallet_passes wallet_pass,
         public.memberships membership
   where wallet_pass.id = job.wallet_pass_id
     and membership.id = wallet_pass.membership_id
     and membership.organization_id = _organization_id
     and wallet_pass.provider = 'google'
     and job.job_type = 'update'
     and job.status in ('pending', 'processing');
end;
$$;

revoke all on function public.complete_google_wallet_design_update(uuid)
  from public, anon, authenticated;
