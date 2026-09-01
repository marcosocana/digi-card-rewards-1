alter table public.organization_branding
  add column if not exists cover_mode text not null default 'gradient',
  add column if not exists cover_text_color text not null default '#ffffff';

update public.organization_branding
set cover_mode = case
  when nullif(trim(cover_url), '') is not null then 'image'
  else 'gradient'
end
where cover_mode not in ('gradient', 'solid', 'image')
   or (cover_mode = 'gradient' and nullif(trim(cover_url), '') is not null);

alter table public.organization_branding
  drop constraint if exists organization_branding_cover_mode_check,
  add constraint organization_branding_cover_mode_check
    check (cover_mode in ('gradient', 'solid', 'image'));

alter table public.organization_branding
  drop constraint if exists organization_branding_cover_text_color_check,
  add constraint organization_branding_cover_text_color_check
    check (cover_text_color ~ '^#[0-9A-Fa-f]{6}$');
