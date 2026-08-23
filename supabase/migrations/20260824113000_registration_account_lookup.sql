-- Used only by the registration Edge Function. Keeping this RPC restricted to the
-- service role prevents direct browser access to auth.users.
create or replace function public.registration_email_exists(_email text)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
      from auth.users
     where lower(email) = lower(trim(_email))
  );
$$;

revoke all on function public.registration_email_exists(text) from public, anon, authenticated;
grant execute on function public.registration_email_exists(text) to service_role;

