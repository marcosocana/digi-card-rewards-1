-- Public demo matrix used by the shortcuts on /auth.
-- Demo-only credentials intentionally use the email itself as the password.

insert into public.organizations (
  id, display_name, slug, contact_email, status, plan_code,
  subscription_status, onboarding_step, onboarding_completed_at
) values
  ('d1000000-0000-4000-8000-000000000001', 'Demo Gratis', 'demo-plan-gratis', 'admin.gratis@demo.fideleo.app', 'configuration_pending', null, 'none', 1, null),
  ('d1000000-0000-4000-8000-000000000002', 'Demo Básico', 'demo-plan-basico', 'admin.basico@demo.fideleo.app', 'configuration_pending', 'basic', 'active', 1, null),
  ('d1000000-0000-4000-8000-000000000003', 'Demo Pro', 'demo-plan-pro', 'admin.pro@demo.fideleo.app', 'configuration_pending', 'pro', 'active', 1, null),
  ('d1000000-0000-4000-8000-000000000004', 'Demo Ultra', 'demo-plan-ultra', 'admin.ultra@demo.fideleo.app', 'configuration_pending', 'ultra', 'active', 1, null)
on conflict (id) do update set
  display_name = excluded.display_name,
  contact_email = excluded.contact_email,
  status = excluded.status,
  plan_code = excluded.plan_code,
  subscription_status = excluded.subscription_status,
  onboarding_step = excluded.onboarding_step,
  onboarding_completed_at = excluded.onboarding_completed_at,
  updated_at = now();

insert into public.locations (id, organization_id, name, slug, city, status) values
  ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'Local Demo Gratis', 'local-demo', 'Madrid', 'active'),
  ('d2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'Local Demo Básico', 'local-demo', 'Madrid', 'active'),
  ('d2000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000003', 'Local Demo Pro', 'local-demo', 'Madrid', 'active'),
  ('d2000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000004', 'Local Demo Ultra', 'local-demo', 'Madrid', 'active')
on conflict (id) do update set
  name = excluded.name,
  city = excluded.city,
  status = excluded.status,
  updated_at = now();

insert into public.organization_users (
  id, organization_id, invited_email, full_name, role, status, can_adjust_points
) values
  ('d3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'admin.gratis@demo.fideleo.app', 'Admin Gratis', 'admin', 'active', true),
  ('d3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'manager.gratis@demo.fideleo.app', 'Responsable Gratis', 'manager', 'active', true),
  ('d3000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001', 'staff.gratis@demo.fideleo.app', 'Empleado Gratis', 'staff', 'active', false),
  ('d3000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000002', 'admin.basico@demo.fideleo.app', 'Admin Básico', 'admin', 'active', true),
  ('d3000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000002', 'manager.basico@demo.fideleo.app', 'Responsable Básico', 'manager', 'active', true),
  ('d3000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000002', 'staff.basico@demo.fideleo.app', 'Empleado Básico', 'staff', 'active', false),
  ('d3000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000003', 'admin.pro@demo.fideleo.app', 'Admin Pro', 'admin', 'active', true),
  ('d3000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-000000000003', 'manager.pro@demo.fideleo.app', 'Responsable Pro', 'manager', 'active', true),
  ('d3000000-0000-4000-8000-000000000009', 'd1000000-0000-4000-8000-000000000003', 'staff.pro@demo.fideleo.app', 'Empleado Pro', 'staff', 'active', false),
  ('d3000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000004', 'admin.ultra@demo.fideleo.app', 'Admin Ultra', 'admin', 'active', true),
  ('d3000000-0000-4000-8000-000000000011', 'd1000000-0000-4000-8000-000000000004', 'manager.ultra@demo.fideleo.app', 'Responsable Ultra', 'manager', 'active', true),
  ('d3000000-0000-4000-8000-000000000012', 'd1000000-0000-4000-8000-000000000004', 'staff.ultra@demo.fideleo.app', 'Empleado Ultra', 'staff', 'active', false)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  invited_email = excluded.invited_email,
  full_name = excluded.full_name,
  role = excluded.role,
  status = excluded.status,
  can_adjust_points = excluded.can_adjust_points,
  updated_at = now();

insert into public.user_location_assignments (organization_user_id, location_id) values
  ('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001'),
  ('d3000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001'),
  ('d3000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000002'),
  ('d3000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000002'),
  ('d3000000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000003'),
  ('d3000000-0000-4000-8000-000000000009', 'd2000000-0000-4000-8000-000000000003'),
  ('d3000000-0000-4000-8000-000000000011', 'd2000000-0000-4000-8000-000000000004'),
  ('d3000000-0000-4000-8000-000000000012', 'd2000000-0000-4000-8000-000000000004')
on conflict (organization_user_id, location_id) do nothing;

insert into public.platform_invitations (email, role)
values ('dios@demo.fideleo.app', 'superadmin')
on conflict (email) do update set role = excluded.role;

do $$
declare
  demo record;
  demo_user_id uuid;
begin
  for demo in
    select * from (values
      ('dios@demo.fideleo.app', 'Modo Dios', 'superadmin'::public.platform_role),
      ('admin.gratis@demo.fideleo.app', 'Admin Gratis', 'user'::public.platform_role),
      ('manager.gratis@demo.fideleo.app', 'Responsable Gratis', 'user'::public.platform_role),
      ('staff.gratis@demo.fideleo.app', 'Empleado Gratis', 'user'::public.platform_role),
      ('admin.basico@demo.fideleo.app', 'Admin Básico', 'user'::public.platform_role),
      ('manager.basico@demo.fideleo.app', 'Responsable Básico', 'user'::public.platform_role),
      ('staff.basico@demo.fideleo.app', 'Empleado Básico', 'user'::public.platform_role),
      ('admin.pro@demo.fideleo.app', 'Admin Pro', 'user'::public.platform_role),
      ('manager.pro@demo.fideleo.app', 'Responsable Pro', 'user'::public.platform_role),
      ('staff.pro@demo.fideleo.app', 'Empleado Pro', 'user'::public.platform_role),
      ('admin.ultra@demo.fideleo.app', 'Admin Ultra', 'user'::public.platform_role),
      ('manager.ultra@demo.fideleo.app', 'Responsable Ultra', 'user'::public.platform_role),
      ('staff.ultra@demo.fideleo.app', 'Empleado Ultra', 'user'::public.platform_role)
    ) as demo_users(email, full_name, platform_role)
  loop
    select id into demo_user_id
    from auth.users
    where lower(email) = lower(demo.email)
    limit 1;

    if demo_user_id is null then
      demo_user_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', demo_user_id,
        'authenticated', 'authenticated', demo.email,
        extensions.crypt(demo.email, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', demo.full_name), now(), now(), '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        demo_user_id, demo_user_id, demo_user_id::text,
        jsonb_build_object(
          'sub', demo_user_id::text,
          'email', demo.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email', now(), now(), now()
      );
    else
      update auth.users set
        encrypted_password = extensions.crypt(demo.email, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('full_name', demo.full_name),
        banned_until = null,
        deleted_at = null,
        updated_at = now()
      where id = demo_user_id;
    end if;

    insert into public.profiles (id, email, full_name, platform_role)
    values (demo_user_id, demo.email, demo.full_name, demo.platform_role)
    on conflict (id) do update set
      email = excluded.email,
      full_name = excluded.full_name,
      platform_role = excluded.platform_role;

    update public.organization_users
    set user_id = demo_user_id, updated_at = now()
    where lower(invited_email) = lower(demo.email);
  end loop;
end $$;
