-- The completion callback is private to the Edge Function and runs with the
-- service role after Google accepts the shared class update.
grant execute on function public.complete_google_wallet_design_update(uuid)
  to service_role;
