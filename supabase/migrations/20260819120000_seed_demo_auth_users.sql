-- Demo-only credentials: each user's password intentionally matches their email.
do $$
declare
  demo record;
  demo_user_id uuid;
begin
  for demo in
    select *
    from (values
      ('super@cafenorte.es', 'Superadministrador'),
      ('admin@cafenorte.es', 'Lucía Prado'),
      ('malasana@cafenorte.es', 'Diego Ferrer'),
      ('empleado@cafenorte.es', 'Marta Ruiz')
    ) as demo_users(email, full_name)
  loop
    select id
      into demo_user_id
      from auth.users
     where lower(email) = lower(demo.email)
     limit 1;

    if demo_user_id is null then
      demo_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        demo_user_id,
        'authenticated',
        'authenticated',
        demo.email,
        extensions.crypt(demo.email, extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', demo.full_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      insert into auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        demo_user_id,
        demo_user_id,
        demo_user_id::text,
        jsonb_build_object(
          'sub', demo_user_id::text,
          'email', demo.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        now(),
        now(),
        now()
      );
    else
      update auth.users
         set encrypted_password = extensions.crypt(demo.email, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
             raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
               || jsonb_build_object('full_name', demo.full_name),
             updated_at = now()
       where id = demo_user_id;
    end if;

    demo_user_id := null;
  end loop;
end $$;
