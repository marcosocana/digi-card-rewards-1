-- ============ ENUMS ============
create type public.platform_role as enum ('superadmin','user');
create type public.org_role as enum ('admin','manager','staff');
create type public.entity_status as enum ('draft','configuration_pending','ready','active','paused','suspended','archived');
create type public.program_status as enum ('draft','active','paused','archived');
create type public.earning_mode as enum ('points_per_currency_unit','currency_units_per_point');
create type public.rounding_mode as enum ('floor','nearest','decimal');
create type public.txn_type as enum ('purchase','redemption','manual_adjustment','reversal','initial_bonus','expiry');
create type public.wallet_provider as enum ('apple','google');
create type public.pass_status as enum ('pending_generation','active','update_pending','error','revoked');
create type public.membership_status as enum ('active','suspended','archived');

-- ============ UTIL ============
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  platform_role public.platform_role not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.platform_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.platform_role not null default 'superadmin',
  created_at timestamptz not null default now()
);
grant all on public.platform_invitations to service_role;
alter table public.platform_invitations enable row level security;

-- ============ ORGS ============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  display_name text not null,
  slug text not null unique,
  contact_email text,
  contact_phone text,
  status public.entity_status not null default 'configuration_pending',
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
grant select, insert, update on public.organizations to authenticated;
grant select on public.organizations to anon;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_url text, compact_logo_url text, cover_url text,
  primary_color text not null default '#7A4A2B',
  secondary_color text not null default '#E8DCC8',
  background_color text not null default '#FBF7F0',
  text_color text not null default '#1F1A16',
  font_family text not null default 'inter',
  border_style text not null default 'medium',
  welcome_message text,
  program_description text,
  website text, instagram text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.organization_branding to authenticated;
grant select on public.organization_branding to anon;
grant all on public.organization_branding to service_role;
alter table public.organization_branding enable row level security;

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  address_line text, city text, postal_code text, country text default 'ES',
  contact_email text, contact_phone text,
  opening_hours text,
  timezone text not null default 'Europe/Madrid',
  status public.entity_status not null default 'active',
  branding_override jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, slug)
);
grant select, insert, update on public.locations to authenticated;
grant select on public.locations to anon;
grant all on public.locations to service_role;
alter table public.locations enable row level security;

create table public.organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  full_name text,
  role public.org_role not null default 'staff',
  status text not null default 'active',
  can_adjust_points boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index organization_users_unique_user on public.organization_users(organization_id, user_id) where user_id is not null;
create index organization_users_email_idx on public.organization_users(lower(invited_email));
grant select, insert, update, delete on public.organization_users to authenticated;
grant all on public.organization_users to service_role;
alter table public.organization_users enable row level security;

create table public.user_location_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_user_id uuid not null references public.organization_users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_user_id, location_id)
);
grant select, insert, delete on public.user_location_assignments to authenticated;
grant all on public.user_location_assignments to service_role;
alter table public.user_location_assignments enable row level security;

-- ============ SECURITY DEFINER HELPERS ============
create or replace function public.is_superadmin(_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = _uid and p.platform_role = 'superadmin');
$$;

create or replace function public.org_role_of(_org uuid, _uid uuid default auth.uid())
returns public.org_role language sql stable security definer set search_path = public as $$
  select ou.role from public.organization_users ou
  where ou.organization_id = _org and ou.user_id = _uid and ou.status = 'active' limit 1;
$$;

create or replace function public.is_org_member(_org uuid, _uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin(_uid) or exists (
    select 1 from public.organization_users ou
    where ou.organization_id = _org and ou.user_id = _uid and ou.status = 'active');
$$;

create or replace function public.is_org_admin(_org uuid, _uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin(_uid) or exists (
    select 1 from public.organization_users ou
    where ou.organization_id = _org and ou.user_id = _uid and ou.status = 'active'
      and ou.role in ('admin','manager'));
$$;

create or replace function public.can_access_location(_loc uuid, _uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin(_uid) or exists (
    select 1 from public.locations l
    join public.organization_users ou on ou.organization_id = l.organization_id
    where l.id = _loc and ou.user_id = _uid and ou.status = 'active'
      and (ou.role = 'admin'
           or exists (select 1 from public.user_location_assignments a
                      where a.organization_user_id = ou.id and a.location_id = l.id)));
$$;

create or replace function public.my_org_ids(_uid uuid default auth.uid())
returns setof uuid language sql stable security definer set search_path = public as $$
  select ou.organization_id from public.organization_users ou
  where ou.user_id = _uid and ou.status = 'active';
$$;

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare _role public.platform_role := 'user';
begin
  select role into _role from public.platform_invitations where lower(email) = lower(new.email);
  insert into public.profiles (id, email, full_name, platform_role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), coalesce(_role,'user'));
  update public.organization_users set user_id = new.id, updated_at = now()
    where user_id is null and lower(invited_email) = lower(new.email);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ POLICIES: core ============
create policy "profiles self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_superadmin());
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "orgs read" on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy "orgs public read" on public.organizations for select to anon using (status <> 'archived');
create policy "orgs insert" on public.organizations for insert to authenticated with check (public.is_superadmin());
create policy "orgs update" on public.organizations for update to authenticated using (public.is_org_admin(id));

create policy "branding read" on public.organization_branding for select to authenticated using (public.is_org_member(organization_id));
create policy "branding public read" on public.organization_branding for select to anon using (true);
create policy "branding write" on public.organization_branding for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "branding update" on public.organization_branding for update to authenticated using (public.is_org_admin(organization_id));

create policy "locations read" on public.locations for select to authenticated using (public.is_org_member(organization_id));
create policy "locations public read" on public.locations for select to anon using (status = 'active');
create policy "locations write" on public.locations for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "locations update" on public.locations for update to authenticated using (public.is_org_admin(organization_id));

create policy "org_users read" on public.organization_users for select to authenticated
  using (public.is_org_member(organization_id) or user_id = auth.uid());
create policy "org_users write" on public.organization_users for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "org_users update" on public.organization_users for update to authenticated using (public.is_org_admin(organization_id));
create policy "org_users delete" on public.organization_users for delete to authenticated using (public.is_org_admin(organization_id));

create policy "ula read" on public.user_location_assignments for select to authenticated
  using (exists (select 1 from public.organization_users ou where ou.id = organization_user_id and public.is_org_member(ou.organization_id)));
create policy "ula write" on public.user_location_assignments for insert to authenticated
  with check (exists (select 1 from public.organization_users ou where ou.id = organization_user_id and public.is_org_admin(ou.organization_id)));
create policy "ula delete" on public.user_location_assignments for delete to authenticated
  using (exists (select 1 from public.organization_users ou where ou.id = organization_user_id and public.is_org_admin(ou.organization_id)));