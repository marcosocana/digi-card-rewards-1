-- The paid demo clubs contain production-shaped locations, programs and
-- activity. Publish the organizations too so their real acquisition URLs can
-- be resolved by the anonymous public experience.
update public.organizations
set status = 'active',
    updated_at = now()
where id in (
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003',
  'd1000000-0000-4000-8000-000000000004'
)
and subscription_status in ('active', 'trialing');
