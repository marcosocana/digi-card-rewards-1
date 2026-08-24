alter table public.organization_branding
  add column if not exists wallet_provider_designs jsonb not null default '{}'::jsonb;

alter table public.organization_branding
  drop constraint if exists organization_branding_wallet_provider_designs_check,
  add constraint organization_branding_wallet_provider_designs_check
    check (jsonb_typeof(wallet_provider_designs) = 'object');
