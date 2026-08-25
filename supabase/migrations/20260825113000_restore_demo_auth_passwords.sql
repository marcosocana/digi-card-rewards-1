-- Keep the public demo shortcuts usable. These accounts contain demo data only.
update auth.users
set encrypted_password = extensions.crypt(email, extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    banned_until = null,
    deleted_at = null,
    updated_at = now()
where lower(email) in (
  'super@cafenorte.es',
  'admin@cafenorte.es',
  'malasana@cafenorte.es',
  'empleado@cafenorte.es'
);
