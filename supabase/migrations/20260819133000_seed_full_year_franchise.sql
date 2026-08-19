-- One year of deterministic demo activity for the five-location Café Norte franchise.
do $$
declare
  org_id constant uuid := '11111111-1111-4111-8111-111111111111';
  loyalty_program_id constant uuid := '44444444-4444-4444-8444-444444444444';
  coffee_reward_id constant uuid := '55555555-5555-4555-8555-555555555551';
  breakfast_reward_id constant uuid := '55555555-5555-4555-8555-555555555552';
  discount_reward_id constant uuid := '55555555-5555-4555-8555-555555555553';
  snack_reward_id constant uuid := '55555555-5555-4555-8555-555555555554';
  tasting_reward_id constant uuid := '55555555-5555-4555-8555-555555555555';
  location_ids uuid[] := array[
    '22222222-2222-4222-8222-222222222221'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222223'::uuid,
    '22222222-2222-4222-8222-222222222224'::uuid,
    '22222222-2222-4222-8222-222222222225'::uuid
  ];
  first_names text[] := array[
    'Alba','Alejandro','Alicia','Andrés','Beatriz','Carlos','Carmen','Claudia','Daniel','Elena',
    'Fernando','Gabriela','Héctor','Inés','Irene','Javier','Laura','Lucía','Manuel','Marina',
    'Marta','Miguel','Natalia','Nicolás','Pablo','Paula','Raúl','Sara','Sergio','Sofía'
  ];
  last_names text[] := array[
    'Alonso','Blanco','Campos','Castro','Díaz','Domínguez','Fernández','García','Gil','Gómez',
    'González','Hernández','Iglesias','Jiménez','López','Martín','Martínez','Moreno','Muñoz','Navarro',
    'Ortega','Pérez','Ramírez','Ramos','Rodríguez','Romero','Ruiz','Sánchez','Sanz','Torres'
  ];
  i integer;
  j integer;
  purchase_count integer;
  points integer;
  balance integer;
  redemption_cost integer;
  amount integer;
  v_customer_id uuid;
  v_membership_id uuid;
  membership_public_id uuid;
  v_location_id uuid;
  v_source_id uuid;
  v_actor_id uuid;
  admin_user_id uuid;
  manager_user_id uuid;
  staff_user_id uuid;
  v_transaction_id uuid;
  chosen_reward_id uuid;
  v_joined_at timestamptz;
  v_occurred_at timestamptz;
  customer_email text;
  short_code text;
begin
  select id into admin_user_id from auth.users where lower(email) = 'admin@cafenorte.es' limit 1;
  select id into manager_user_id from auth.users where lower(email) = 'malasana@cafenorte.es' limit 1;
  select id into staff_user_id from auth.users where lower(email) = 'empleado@cafenorte.es' limit 1;

  update public.organizations
     set status = 'active',
         created_at = now() - interval '15 months',
         contact_email = 'hola@cafenorte.es',
         contact_phone = '+34 910 000 000'
   where id = org_id;

  update public.loyalty_programs
     set status = 'active',
         starts_at = now() - interval '15 months',
         description = 'Programa común de los cinco Café Norte: 1 € gastado equivale a 1 punto.',
         terms = 'Puntos sin caducidad. Recompensas disponibles en los cinco establecimientos.'
   where id = loyalty_program_id;

  insert into public.locations (
    id, organization_id, name, slug, address_line, city, postal_code,
    contact_email, contact_phone, opening_hours, status, created_at
  ) values
    ('22222222-2222-4222-8222-222222222223', org_id, 'Café Norte Retiro', 'retiro',
     'Avenida de Menéndez Pelayo 37', 'Madrid', '28009', 'retiro@cafenorte.es', '+34 910 000 003', 'L-D 07:30-21:30', 'active', now() - interval '13 months'),
    ('22222222-2222-4222-8222-222222222224', org_id, 'Café Norte Salamanca', 'salamanca',
     'Calle de Goya 64', 'Madrid', '28001', 'salamanca@cafenorte.es', '+34 910 000 004', 'L-D 08:00-22:00', 'active', now() - interval '12 months'),
    ('22222222-2222-4222-8222-222222222225', org_id, 'Café Norte Chueca', 'chueca',
     'Calle de Hortaleza 28', 'Madrid', '28004', 'chueca@cafenorte.es', '+34 910 000 005', 'L-D 08:00-22:30', 'active', now() - interval '11 months')
  on conflict (id) do update set
    name = excluded.name,
    address_line = excluded.address_line,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    opening_hours = excluded.opening_hours,
    status = 'active';

  update public.locations
     set status = 'active',
         created_at = least(created_at, now() - interval '15 months')
   where organization_id = org_id;

  insert into public.program_locations (program_id, location_id, can_earn, can_redeem)
  select loyalty_program_id, location, true, true
    from unnest(location_ids) as location
  on conflict (program_id, location_id) do update
    set can_earn = true, can_redeem = true;

  insert into public.rewards (id, program_id, name, description, points_cost, status, display_order, starts_at)
  values
    (snack_reward_id, loyalty_program_id, 'Merienda para dos', 'Dos bebidas calientes y una porción de tarta para compartir', 600, 'active', 4, now() - interval '10 months'),
    (tasting_reward_id, loyalty_program_id, 'Cata de café', 'Experiencia guiada para dos personas con nuestros cafés de origen', 900, 'active', 5, now() - interval '8 months')
  on conflict (id) do update set status = 'active', description = excluded.description;

  update public.rewards
     set status = 'active'
   where rewards.program_id = '44444444-4444-4444-8444-444444444444';

  insert into public.reward_locations (reward_id, location_id)
  select reward, location
    from unnest(array[coffee_reward_id, breakfast_reward_id, discount_reward_id, snack_reward_id, tasting_reward_id]) reward
    cross join unnest(location_ids) location
  on conflict (reward_id, location_id) do nothing;

  insert into public.organization_users (
    id, organization_id, invited_email, full_name, role, status, can_adjust_points, created_at
  ) values
    ('33333333-3333-4333-8333-333333333334', org_id, 'responsable.chamberi@cafenorte.es', 'Ana Beltrán', 'manager', 'active', true, now() - interval '14 months'),
    ('33333333-3333-4333-8333-333333333335', org_id, 'equipo.chamberi@cafenorte.es', 'Mario Santos', 'staff', 'active', false, now() - interval '13 months'),
    ('33333333-3333-4333-8333-333333333336', org_id, 'responsable.retiro@cafenorte.es', 'Nuria Calvo', 'manager', 'active', true, now() - interval '13 months'),
    ('33333333-3333-4333-8333-333333333337', org_id, 'equipo.retiro@cafenorte.es', 'Hugo Prieto', 'staff', 'active', false, now() - interval '12 months'),
    ('33333333-3333-4333-8333-333333333338', org_id, 'responsable.salamanca@cafenorte.es', 'Elisa Vega', 'manager', 'active', true, now() - interval '12 months'),
    ('33333333-3333-4333-8333-333333333339', org_id, 'equipo.salamanca@cafenorte.es', 'Jaime Vidal', 'staff', 'active', false, now() - interval '11 months'),
    ('33333333-3333-4333-8333-333333333340', org_id, 'responsable.chueca@cafenorte.es', 'Rocío Molina', 'manager', 'active', true, now() - interval '11 months'),
    ('33333333-3333-4333-8333-333333333341', org_id, 'equipo.chueca@cafenorte.es', 'Iván Cano', 'staff', 'active', false, now() - interval '10 months')
  on conflict (id) do update set status = 'active', full_name = excluded.full_name;

  insert into public.user_location_assignments (organization_user_id, location_id)
  values
    ('33333333-3333-4333-8333-333333333334', '22222222-2222-4222-8222-222222222222'),
    ('33333333-3333-4333-8333-333333333335', '22222222-2222-4222-8222-222222222222'),
    ('33333333-3333-4333-8333-333333333336', '22222222-2222-4222-8222-222222222223'),
    ('33333333-3333-4333-8333-333333333337', '22222222-2222-4222-8222-222222222223'),
    ('33333333-3333-4333-8333-333333333338', '22222222-2222-4222-8222-222222222224'),
    ('33333333-3333-4333-8333-333333333339', '22222222-2222-4222-8222-222222222224'),
    ('33333333-3333-4333-8333-333333333340', '22222222-2222-4222-8222-222222222225'),
    ('33333333-3333-4333-8333-333333333341', '22222222-2222-4222-8222-222222222225')
  on conflict (organization_user_id, location_id) do nothing;

  insert into public.acquisition_sources (organization_id, location_id, name, slug, status, created_at)
  select org_id, location_ids[location_number], source.name, source.slug || '-' || location.slug, 'active', now() - interval '12 months'
    from generate_series(1, 5) location_number
    join public.locations location on location.id = location_ids[location_number]
    cross join (values ('Mostrador','mostrador'), ('QR en mesa','qr-mesa'), ('Instagram','instagram')) source(name, slug)
  on conflict (organization_id, slug) do update set status = 'active';

  -- Ensure every pre-existing demo customer and membership is active.
  update public.customers set status = 'active' where normalized_email like '%@example.com';
  update public.memberships set status = 'active' where organization_id = org_id;

  -- 120 customers with deterministic, chronologically consistent purchase and redemption ledgers.
  for i in 1..120 loop
    customer_email := 'cliente' || lpad(i::text, 3, '0') || '@demo.cafenorte.es';
    v_location_id := location_ids[((i - 1) % 5) + 1];
    v_joined_at := now() - ((((i * 17) % 350) + 10)::text || ' days')::interval;

    select acquisition_source.id into v_source_id
      from public.acquisition_sources acquisition_source
     where acquisition_source.organization_id = org_id
       and acquisition_source.location_id = location_ids[((i - 1) % 5) + 1]
       and acquisition_source.status = 'active'
     order by acquisition_source.slug
     limit 1;

    insert into public.customers (
      normalized_email, email, first_name, last_name, birth_date, status, created_at, updated_at
    ) values (
      customer_email,
      customer_email,
      first_names[((i - 1) % array_length(first_names, 1)) + 1],
      last_names[((i * 7 - 1) % array_length(last_names, 1)) + 1],
      date '1965-01-01' + ((i * 97) % 13000),
      'active',
      v_joined_at,
      v_joined_at
    ) returning id into v_customer_id;

    insert into public.memberships (
      customer_id, organization_id, program_id, status, cached_points_balance,
      joined_at, acquisition_location_id, acquisition_source_id, created_at, updated_at
    ) values (
      v_customer_id, org_id, loyalty_program_id, 'active', 0,
      v_joined_at, v_location_id, v_source_id, v_joined_at, v_joined_at
    ) returning id, public_id into v_membership_id, membership_public_id;

    short_code := 'CN' || lpad(i::text, 6, '0');
    insert into public.membership_tokens (membership_id, token_hash, short_code, status, created_at)
    values (v_membership_id, public.hash_token('annual-demo-token-' || i), short_code, 'active', v_joined_at);

    insert into public.customer_consents (
      customer_id, organization_id, consent_type, granted, policy_version, source, captured_at
    ) values
      (v_customer_id, org_id, 'terms_privacy', true, 'v1', 'franchise-demo', v_joined_at),
      (v_customer_id, org_id, 'marketing', i % 4 <> 0, 'v1', 'franchise-demo', v_joined_at);

    insert into public.wallet_passes (
      membership_id, provider, serial_number, status, is_sandbox,
      installed_at, last_generated_at, last_updated_at, created_at, updated_at
    ) values (
      v_membership_id,
      case when i % 2 = 0 then 'apple'::public.wallet_provider else 'google'::public.wallet_provider end,
      membership_public_id::text,
      'active',
      false,
      v_joined_at + interval '1 day',
      v_joined_at + interval '1 day',
      now() - (((i % 20) + 1)::text || ' days')::interval,
      v_joined_at,
      now() - (((i % 20) + 1)::text || ' days')::interval
    );

    if i % 5 = 0 then
      insert into public.wallet_passes (
        membership_id, provider, serial_number, status, is_sandbox,
        installed_at, last_generated_at, last_updated_at, created_at, updated_at
      ) values (
        v_membership_id,
        case when i % 2 = 0 then 'google'::public.wallet_provider else 'apple'::public.wallet_provider end,
        membership_public_id::text || '-secondary',
        'active',
        false,
        v_joined_at + interval '3 days',
        v_joined_at + interval '3 days',
        now() - (((i % 15) + 1)::text || ' days')::interval,
        v_joined_at,
        now() - (((i % 15) + 1)::text || ' days')::interval
      );
    end if;

    insert into public.acquisition_events (
      organization_id, source_id, location_id, event_type, anonymous_session_id, customer_id, created_at
    ) values (
      org_id, v_source_id, v_location_id, 'registration', 'customer-' || i, v_customer_id, v_joined_at
    );

    balance := 0;
    purchase_count := 9 + (i % 18);

    for j in 1..purchase_count loop
      amount := 420 + ((i * 137 + j * 211) % 1880);
      points := floor(amount / 100.0)::integer;
      v_occurred_at := v_joined_at + ((now() - v_joined_at) * j / (purchase_count + 1));

      if v_location_id = location_ids[1] then
        v_actor_id := case j % 3 when 0 then staff_user_id when 1 then manager_user_id else admin_user_id end;
      else
        v_actor_id := admin_user_id;
      end if;

      insert into public.point_transactions (
        membership_id, organization_id, location_id, performed_by_user_id, type,
        points_delta, amount_cents, previous_balance, resulting_balance,
        earning_rule_snapshot, ticket_reference, note, idempotency_key, created_at
      ) values (
        v_membership_id, org_id, v_location_id, v_actor_id, 'purchase',
        points, amount, balance, balance + points,
        '{"earning_mode":"points_per_currency_unit","earning_value":1,"rounding_mode":"floor"}'::jsonb,
        'CN-' || to_char(v_occurred_at, 'YYYYMMDD') || '-' || lpad(i::text, 3, '0') || '-' || lpad(j::text, 2, '0'),
        case when j % 6 = 0 then 'Compra de desayuno' when j % 4 = 0 then 'Merienda' else 'Compra en cafetería' end,
        'annual-demo-p-' || i || '-' || j,
        v_occurred_at
      );
      balance := balance + points;

      if j % 8 = 0 and balance >= 100 then
        if j % 24 = 0 and balance >= 400 then
          redemption_cost := 400;
          chosen_reward_id := discount_reward_id;
        elsif j % 16 = 0 and balance >= 250 then
          redemption_cost := 250;
          chosen_reward_id := breakfast_reward_id;
        else
          redemption_cost := 100;
          chosen_reward_id := coffee_reward_id;
        end if;

        insert into public.point_transactions (
          membership_id, organization_id, location_id, performed_by_user_id, type,
          points_delta, previous_balance, resulting_balance, note, idempotency_key, created_at
        ) values (
          v_membership_id, org_id, v_location_id, v_actor_id, 'redemption',
          -redemption_cost, balance, balance - redemption_cost, 'Recompensa canjeada',
          'annual-demo-r-' || i || '-' || j,
          v_occurred_at + interval '5 minutes'
        ) returning id into v_transaction_id;

        insert into public.redemptions (
          transaction_id, reward_id, membership_id, organization_id, location_id,
          performed_by_user_id, points_spent, status, created_at
        ) values (
          v_transaction_id, chosen_reward_id, v_membership_id, org_id, v_location_id,
          v_actor_id, redemption_cost, 'completed', v_occurred_at + interval '5 minutes'
        );
        balance := balance - redemption_cost;
      end if;
    end loop;

    update public.memberships
       set cached_points_balance = balance,
           updated_at = now()
     where id = v_membership_id;
  end loop;

  -- Anonymous acquisition traffic spread across the full year and all five locations.
  insert into public.acquisition_events (
    organization_id, source_id, location_id, event_type, anonymous_session_id, created_at
  )
  select
    org_id,
    source.id,
    source.location_id,
    case when series % 11 = 0 then 'landing_view' else 'scan' end,
    'annual-session-' || series,
    now() - (((series * 37) % 365)::text || ' days')::interval
      - (((series * 13) % 20)::text || ' hours')::interval
  from generate_series(1, 1800) series
  join lateral (
    select acquisition_source.id, acquisition_source.location_id
      from public.acquisition_sources acquisition_source
     where acquisition_source.organization_id = org_id and acquisition_source.status = 'active'
     order by acquisition_source.id
     offset ((series - 1) % (select count(*) from public.acquisition_sources where organization_id = org_id and status = 'active'))
     limit 1
  ) source on true;

  -- Operational audit history for the administrator and superadministrator dashboards.
  insert into public.audit_logs (
    actor_user_id, actor_label, organization_id, action, entity_type, entity_id, metadata, created_at
  )
  select
    case when series % 9 = 0 then manager_user_id else admin_user_id end,
    case when series % 9 = 0 then 'Diego Ferrer' else 'Lucía Prado' end,
    org_id,
    (array['membership.reviewed','points.adjustment.reviewed','reward.updated','location.report.exported'])[(series % 4) + 1],
    case when series % 4 = 3 then 'reward' else 'membership' end,
    case when series % 4 = 3 then coffee_reward_id else (
      select id from public.memberships where organization_id = org_id order by id offset ((series - 1) % 120) limit 1
    ) end,
    jsonb_build_object('demo', true, 'sequence', series),
    now() - (((series * 19) % 365)::text || ' days')::interval
  from generate_series(1, 180) series;
end $$;
