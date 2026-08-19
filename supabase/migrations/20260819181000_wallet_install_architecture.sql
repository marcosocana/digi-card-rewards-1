create table public.wallet_integration_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.wallet_provider not null,
  mode text not null default 'demo' check(mode in ('demo','live')),
  status text not null default 'credentials_missing' check(status in ('credentials_missing','pending_verification','active','error','disabled')),
  public_configuration jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,provider)
);
grant select,insert,update on public.wallet_integration_settings to authenticated;
grant all on public.wallet_integration_settings to service_role;
alter table public.wallet_integration_settings enable row level security;
create policy "wallet settings read" on public.wallet_integration_settings for select to authenticated using(public.is_org_admin(organization_id));
create policy "wallet settings insert" on public.wallet_integration_settings for insert to authenticated with check(public.is_org_admin(organization_id));
create policy "wallet settings update" on public.wallet_integration_settings for update to authenticated using(public.is_org_admin(organization_id)) with check(public.is_org_admin(organization_id));
create trigger trg_touch_wallet_integration_settings before update on public.wallet_integration_settings for each row execute function public.touch_updated_at();

create or replace function public.get_wallet_install_state(_membership_public_id uuid,_provider public.wallet_provider)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare _m public.memberships; _pass public.wallet_passes; _settings public.wallet_integration_settings;
begin
  select * into _m from public.memberships where public_id=_membership_public_id and status='active';
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  select * into _pass from public.wallet_passes where membership_id=_m.id and provider=_provider;
  select * into _settings from public.wallet_integration_settings where organization_id=_m.organization_id and provider=_provider;
  if _settings is null or _settings.mode='demo' or _settings.status<>'active' then
    return jsonb_build_object('provider',_provider,'mode','demo','status','credentials_missing','install_url',null,
      'web_fallback_url','/mi-tarjeta/'||_m.public_id::text,'message','Integración Wallet pendiente de credenciales. Usa la tarjeta web.');
  end if;
  return jsonb_build_object('provider',_provider,'mode','live','status',_pass.status,'install_url',null,
    'web_fallback_url','/mi-tarjeta/'||_m.public_id::text,'message','El pase está pendiente de generación por el servicio Wallet.');
end; $$;
revoke all on function public.get_wallet_install_state(uuid,public.wallet_provider) from public;
grant execute on function public.get_wallet_install_state(uuid,public.wallet_provider) to anon,authenticated;

insert into public.wallet_integration_settings(organization_id,provider,mode,status) values
('11111111-1111-4111-8111-111111111111','apple','demo','credentials_missing'),
('11111111-1111-4111-8111-111111111111','google','demo','credentials_missing')
on conflict(organization_id,provider) do nothing;

create or replace function public.get_membership_portal(_public_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare _m public.memberships; _c public.customers; _program public.loyalty_programs; _org public.organizations; _account public.loyalty_accounts;
begin
  select * into _m from public.memberships where public_id=_public_id; if _m is null then return null; end if;
  select * into _c from public.customers where id=_m.customer_id; select * into _program from public.loyalty_programs where id=_m.program_id;
  select * into _org from public.organizations where id=_m.organization_id; select * into _account from public.loyalty_accounts where membership_id=_m.id;
  return jsonb_build_object(
    'membership',jsonb_build_object('public_id',_m.public_id,'balance',_m.cached_points_balance,'status',_m.status,'joined_at',_m.joined_at),
    'customer',jsonb_build_object('first_name',_c.first_name,'last_name',_c.last_name,'email',_c.email),
    'organization',jsonb_build_object('display_name',_org.display_name,'slug',_org.slug),
    'branding',(select to_jsonb(b) from public.organization_branding b where b.organization_id=_org.id),
    'program',jsonb_build_object('public_name',_program.public_name,'description',_program.description,'mechanic_type',_program.mechanic_type,
      'mechanic_config',_program.mechanic_config,'earning_mode',_program.earning_mode,'earning_value',_program.earning_value,'terms',_program.terms),
    'account',case when _account.id is null then null else jsonb_build_object('progress_balance',_account.progress_balance,'lifetime_spend_cents',_account.lifetime_spend_cents,
      'visit_count',_account.visit_count,'stamp_balance',_account.stamp_balance,'cashback_balance_cents',_account.cashback_balance_cents,
      'tier',(select name from public.membership_tiers where id=_account.tier_id)) end,
    'short_code',(select short_code from public.membership_tokens where membership_id=_m.id and status='active' limit 1),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'description',r.description,'points_cost',r.points_cost,
      'available',_m.cached_points_balance>=r.points_cost) order by r.points_cost) from public.rewards r where r.program_id=_program.id and r.status='active'),'[]'::jsonb),
    'earned_rewards',coalesce((select jsonb_agg(jsonb_build_object('id',cr.id,'name',r.name,'status',cr.status,'awarded_at',cr.awarded_at,'expires_at',cr.expires_at) order by cr.awarded_at desc)
      from public.customer_rewards cr join public.rewards r on r.id=cr.reward_id where cr.membership_id=_m.id),'[]'::jsonb),
    'locations',coalesce((select jsonb_agg(jsonb_build_object('name',l.name,'address_line',l.address_line,'city',l.city)) from public.locations l join public.program_locations pl on pl.location_id=l.id where pl.program_id=_program.id and l.status='active'),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'type',t.type,'points_delta',t.points_delta,'amount_cents',t.amount_cents,'note',t.note,'created_at',t.created_at) order by t.created_at desc)
      from (select * from public.point_transactions where membership_id=_m.id order by created_at desc limit 30)t),'[]'::jsonb),
    'passes',coalesce((select jsonb_agg(jsonb_build_object('provider',p.provider,'status',p.status,'is_sandbox',p.is_sandbox,'last_updated_at',p.last_updated_at)) from public.wallet_passes p where p.membership_id=_m.id),'[]'::jsonb)
  );
end; $$;
