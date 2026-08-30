alter table public.transactional_email_deliveries
  drop constraint if exists transactional_email_deliveries_kind_check;

alter table public.transactional_email_deliveries
  add constraint transactional_email_deliveries_kind_check
  check (kind in (
    'account_welcome',
    'team_invitation',
    'membership_welcome',
    'password_changed',
    'subscription_onboarding',
    'manual_account_confirmation'
  ));
