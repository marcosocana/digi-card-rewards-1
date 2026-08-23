alter table public.organization_branding
  add column if not exists wallet_background_color text not null default '#7A4A2B',
  add column if not exists wallet_text_color text not null default '#FFFFFF',
  add column if not exists wallet_logo_url text,
  add column if not exists wallet_hero_url text,
  add column if not exists wallet_program_name text,
  add column if not exists wallet_points_label text not null default 'Puntos';

alter table public.organization_branding
  drop constraint if exists organization_branding_wallet_background_color_check,
  add constraint organization_branding_wallet_background_color_check
    check (wallet_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists organization_branding_wallet_text_color_check,
  add constraint organization_branding_wallet_text_color_check
    check (wallet_text_color ~ '^#[0-9A-Fa-f]{6}$');
