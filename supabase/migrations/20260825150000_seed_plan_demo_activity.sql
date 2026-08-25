-- A full, deterministic year of activity for the Basic, Pro and Ultra demos.
-- Volumes are deliberately proportional to each plan and every actor role is
-- represented in the transaction and audit history.

do $$
declare
  demo record;
  first_names text[] := array[
    'Alba','Alejandro','Alicia','Andrés','Beatriz','Carlos','Carmen','Claudia','Daniel','Elena',
    'Fernando','Gabriela','Héctor','Inés','Irene','Javier','Laura','Lucía','Manuel','Marina',
    'Marta','Miguel','Natalia','Nicolás','Pablo','Paula','Raúl','Sara','Sergio','Sofía'
  ];
  last_names text[] := array[
    'Alonso','Blanco','Campos','Castro','Díaz','Domínguez','Fernández','García','Gil','Gómez',
    'González','Hernández','Iglesias','Jiménez','López','Martín','Martínez','Moreno','Muñoz',
    'Navarro','Ortega','Pérez','Ramírez','Ramos','Rodríguez','Romero','Ruiz','Sánchez','Sanz','Torres'
  ];
  location_ids uuid[];
  actor_ids uuid[];
  v_program_id uuid;
  v_campaign_id uuid;
  reward_ids uuid[];
  v_customer_id uuid;
  v_membership_id uuid;
  v_public_id uuid;
  v_location_id uuid;
  v_source_id uuid;
  v_actor_id uuid;
  v_purchase_id uuid;
  v_redemption_tx_id uuid;
  v_redemption_id uuid;
  v_reward_id uuid;
  v_customer_reward_id uuid;
  v_joined_at timestamptz;
  v_occurred_at timestamptz;
  v_last_activity timestamptz;
  v_email text;
  v_phone text;
  v_balance integer;
  v_points integer;
  v_amount integer;
  v_cost integer;
  v_purchase_count integer;
  i integer;
  j integer;
  series integer;
begin
  for demo in
    select * from (values
      ('d1000000-0000-4000-8000-000000000002'::uuid, 'basico', 'BA', 25, 6, 20),
      ('d1000000-0000-4000-8000-000000000003'::uuid, 'pro', 'PR', 75, 8, 50),
      ('d1000000-0000-4000-8000-000000000004'::uuid, 'ultra', 'UL', 200, 10, 120)
    ) as plan_demos(org_id, plan_slug, short_prefix, customer_count, purchase_base, audit_count)
  loop
    select array_agg(location.id order by location.id)
      into location_ids
      from public.locations location
     where location.organization_id = demo.org_id
       and location.status = 'active';

    select array_agg(organization_user.user_id order by
      case organization_user.role when 'admin' then 1 when 'manager' then 2 else 3 end)
      into actor_ids
      from public.organization_users organization_user
     where organization_user.organization_id = demo.org_id
       and organization_user.status = 'active'
       and organization_user.user_id is not null;

    if coalesce(array_length(location_ids, 1), 0) = 0
      or coalesce(array_length(actor_ids, 1), 0) < 3 then
      raise exception 'Incomplete demo setup for %', demo.plan_slug;
    end if;

    select program.id into v_program_id
      from public.loyalty_programs program
     where program.organization_id = demo.org_id
       and program.archived_at is null
     order by program.created_at
     limit 1;

    if v_program_id is null then
      v_program_id := md5('program-' || demo.plan_slug)::uuid;
      insert into public.loyalty_programs (
        id, organization_id, internal_name, public_name, description,
        earning_mode, earning_value, rounding_mode, initial_points,
        mechanic_type, status, starts_at, terms
      ) values (
        v_program_id, demo.org_id, 'Programa principal',
        'Club Demo ' || initcap(demo.plan_slug),
        'Un punto por cada euro de compra en todos los establecimientos.',
        'points_per_currency_unit', 1, 'floor', 20,
        'spend', 'active', now() - interval '15 months',
        'Los puntos no caducan y las recompensas se pueden utilizar en cualquier establecimiento.'
      );
    else
      update public.loyalty_programs
         set public_name = 'Club Demo ' || initcap(demo.plan_slug),
             description = 'Un punto por cada euro de compra en todos los establecimientos.',
             earning_mode = 'points_per_currency_unit',
             earning_value = 1,
             rounding_mode = 'floor',
             initial_points = 20,
             mechanic_type = 'spend',
             status = 'active',
             starts_at = least(starts_at, now() - interval '15 months'),
             terms = 'Los puntos no caducan y las recompensas se pueden utilizar en cualquier establecimiento.'
       where id = v_program_id;
    end if;

    insert into public.program_locations (program_id, location_id, can_earn, can_redeem)
    select v_program_id, location_id, true, true
      from unnest(location_ids) location_id
    on conflict (program_id, location_id) do update
      set can_earn = true, can_redeem = true;

    reward_ids := array[
      md5('reward-' || demo.plan_slug || '-welcome')::uuid,
      md5('reward-' || demo.plan_slug || '-premium')::uuid,
      md5('reward-' || demo.plan_slug || '-vip')::uuid
    ];

    insert into public.rewards (
      id, program_id, name, description, points_cost, status, starts_at, display_order
    ) values
      (reward_ids[1], v_program_id, 'Detalle de bienvenida', 'Un producto gratuito a elegir.', 50, 'active', now() - interval '15 months', 1),
      (reward_ids[2], v_program_id, 'Experiencia premium', 'Una experiencia especial para dos personas.', 120, 'active', now() - interval '15 months', 2),
      (reward_ids[3], v_program_id, 'Recompensa VIP', 'Beneficio exclusivo para los clientes más fieles.', 250, 'active', now() - interval '15 months', 3)
    on conflict (id) do update set
      program_id = excluded.program_id,
      name = excluded.name,
      description = excluded.description,
      points_cost = excluded.points_cost,
      status = 'active',
      archived_at = null,
      updated_at = now();

    insert into public.reward_locations (reward_id, location_id)
    select reward_id, location_id
      from unnest(reward_ids) reward_id
      cross join unnest(location_ids) location_id
    on conflict (reward_id, location_id) do nothing;

    select campaign.id into v_campaign_id
      from public.campaigns campaign
     where campaign.organization_id = demo.org_id
       and campaign.archived_at is null
     order by (campaign.status = 'active' and campaign.is_primary) desc, campaign.created_at
     limit 1;

    update public.campaigns
       set is_primary = false
     where organization_id = demo.org_id
       and id is distinct from v_campaign_id;

    if v_campaign_id is null then
      v_campaign_id := md5('campaign-' || demo.plan_slug)::uuid;
      insert into public.campaigns (
        id, organization_id, program_id, reward_id, internal_name, public_name,
        mechanic_type, description, rules, status, is_primary, starts_at, terms
      ) values (
        v_campaign_id, demo.org_id, v_program_id, reward_ids[1],
        'Campaña principal', 'Club Demo ' || initcap(demo.plan_slug), 'spend',
        'Acumula puntos con cada compra y consigue recompensas.',
        '{"points_per_euro":1,"minimum_purchase_cents":100}'::jsonb,
        'active', true, now() - interval '15 months', 'Válida en todos los establecimientos.'
      );
    else
      update public.campaigns
         set program_id = v_program_id,
             reward_id = reward_ids[1],
             public_name = 'Club Demo ' || initcap(demo.plan_slug),
             mechanic_type = 'spend',
             description = 'Acumula puntos con cada compra y consigue recompensas.',
             rules = '{"points_per_euro":1,"minimum_purchase_cents":100}'::jsonb,
             status = 'active',
             is_primary = true,
             starts_at = least(starts_at, now() - interval '15 months'),
             archived_at = null
       where id = v_campaign_id;
    end if;

    insert into public.campaign_locations (campaign_id, location_id)
    select v_campaign_id, location_id from unnest(location_ids) location_id
    on conflict (campaign_id, location_id) do nothing;

    -- Two acquisition sources per location make the capture reports useful.
    for v_location_id in select unnest(location_ids)
    loop
      insert into public.acquisition_sources (
        id, organization_id, location_id, name, slug, status, created_at
      ) values
        (md5(demo.plan_slug || '-qr-' || v_location_id::text)::uuid,
         demo.org_id, v_location_id, 'QR del establecimiento',
         'qr-' || substr(replace(v_location_id::text, '-', ''), 25, 8), 'active', now() - interval '15 months'),
        (md5(demo.plan_slug || '-counter-' || v_location_id::text)::uuid,
         demo.org_id, v_location_id, 'Alta en mostrador',
         'mostrador-' || substr(replace(v_location_id::text, '-', ''), 25, 8), 'active', now() - interval '15 months')
      on conflict (id) do update set status = 'active';
    end loop;

    -- Customers, memberships, Wallet passes and chronologically consistent ledger.
    for i in 1..demo.customer_count
    loop
      v_customer_id := md5('customer-' || demo.plan_slug || '-' || i)::uuid;
      v_membership_id := md5('membership-' || demo.plan_slug || '-' || i)::uuid;
      v_public_id := md5('public-membership-' || demo.plan_slug || '-' || i)::uuid;
      v_location_id := location_ids[((i - 1) % array_length(location_ids, 1)) + 1];
      v_source_id := md5(demo.plan_slug || '-qr-' || v_location_id::text)::uuid;
      v_joined_at := now() - ((((i * 23) % 340) + 8)::text || ' days')::interval;
      v_email := 'cliente' || lpad(i::text, 3, '0') || '@' || demo.plan_slug || '.demo.fideleo.app';
      v_phone := '+346' || lpad(((10000000 + i + demo.customer_count * 1000) % 100000000)::text, 8, '0');
      v_last_activity := v_joined_at;
      v_balance := 20;

      insert into public.customers (
        id, organization_id, normalized_email, email, first_name, last_name,
        birth_date, phone, normalized_phone, status, last_activity_at, created_at, updated_at
      ) values (
        v_customer_id, demo.org_id, lower(v_email), v_email,
        first_names[((i - 1) % array_length(first_names, 1)) + 1],
        last_names[((i * 7 - 1) % array_length(last_names, 1)) + 1],
        date '1968-01-01' + ((i * 137) % 12500), v_phone, v_phone,
        'active', v_joined_at, v_joined_at, v_joined_at
      )
      on conflict (id) do update set
        organization_id = excluded.organization_id,
        normalized_email = excluded.normalized_email,
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        normalized_phone = excluded.normalized_phone,
        status = 'active';

      insert into public.memberships (
        id, public_id, customer_id, organization_id, program_id, status,
        cached_points_balance, joined_at, acquisition_location_id,
        acquisition_source_id, created_at, updated_at
      ) values (
        v_membership_id, v_public_id, v_customer_id, demo.org_id, v_program_id,
        'active', 20, v_joined_at, v_location_id, v_source_id, v_joined_at, v_joined_at
      )
      on conflict (id) do update set
        program_id = excluded.program_id,
        status = 'active',
        acquisition_location_id = excluded.acquisition_location_id,
        acquisition_source_id = excluded.acquisition_source_id,
        cached_points_balance = 20;

      insert into public.membership_tokens (
        id, membership_id, token_hash, short_code, status, created_at
      ) values (
        md5('token-id-' || demo.plan_slug || '-' || i)::uuid,
        v_membership_id,
        public.hash_token('demo-token-' || demo.plan_slug || '-' || i),
        demo.short_prefix || lpad(i::text, 6, '0'),
        'active', v_joined_at
      ) on conflict (id) do update set status = 'active';

      insert into public.customer_consents (
        id, customer_id, organization_id, consent_type, granted,
        policy_version, source, captured_at
      ) values
        (md5('consent-terms-' || demo.plan_slug || '-' || i)::uuid,
         v_customer_id, demo.org_id, 'terms_privacy', true, 'v1', 'demo-qr', v_joined_at),
        (md5('consent-marketing-' || demo.plan_slug || '-' || i)::uuid,
         v_customer_id, demo.org_id, 'marketing', i % 4 <> 0, 'v1', 'demo-qr', v_joined_at)
      on conflict (id) do update set granted = excluded.granted;

      insert into public.acquisition_events (
        id, organization_id, source_id, location_id, event_type,
        anonymous_session_id, customer_id, created_at
      ) values (
        md5('registration-' || demo.plan_slug || '-' || i)::uuid,
        demo.org_id, v_source_id, v_location_id, 'registration',
        'demo-registration-' || demo.plan_slug || '-' || i, v_customer_id, v_joined_at
      ) on conflict (id) do update set created_at = excluded.created_at;

      insert into public.wallet_passes (
        id, membership_id, provider, serial_number, status, is_sandbox,
        installed_at, last_generated_at, last_updated_at, created_at, updated_at
      ) values (
        md5('wallet-' || demo.plan_slug || '-' || i)::uuid,
        v_membership_id,
        case when i % 3 = 0 then 'apple'::public.wallet_provider else 'google'::public.wallet_provider end,
        v_public_id::text, 'active', true,
        v_joined_at + interval '1 day', v_joined_at + interval '1 day',
        now() - (((i % 20) + 1)::text || ' days')::interval,
        v_joined_at, now() - (((i % 20) + 1)::text || ' days')::interval
      ) on conflict (membership_id, provider) do update set
        status = 'active', last_updated_at = excluded.last_updated_at;

      -- Joining bonus.
      insert into public.point_transactions (
        id, membership_id, organization_id, location_id, performed_by_user_id,
        type, points_delta, previous_balance, resulting_balance, note,
        idempotency_key, created_at
      ) values (
        md5('initial-' || demo.plan_slug || '-' || i)::uuid,
        v_membership_id, demo.org_id, v_location_id, actor_ids[1],
        'initial_bonus', 20, 0, 20, 'Puntos de bienvenida',
        'demo-' || demo.plan_slug || '-initial-' || i, v_joined_at
      ) on conflict (idempotency_key) do update set created_at = excluded.created_at;

      v_purchase_count := demo.purchase_base + (i % 7);
      for j in 1..v_purchase_count
      loop
        v_actor_id := actor_ids[((i + j - 2) % 3) + 1];
        v_amount := 850 + ((i * 173 + j * 257) % 4750);
        v_points := floor(v_amount / 100.0)::integer;
        v_occurred_at := v_joined_at + ((now() - v_joined_at) * j / (v_purchase_count + 1));

        -- Always leave useful activity on today's dashboard for every location.
        if j = v_purchase_count and i <= greatest(array_length(location_ids, 1) * 2, 5) then
          v_occurred_at := now() - (((i * 37) % 720)::text || ' minutes')::interval;
        end if;

        v_purchase_id := md5('purchase-' || demo.plan_slug || '-' || i || '-' || j)::uuid;
        insert into public.point_transactions (
          id, membership_id, organization_id, location_id, performed_by_user_id,
          type, points_delta, amount_cents, previous_balance, resulting_balance,
          earning_rule_snapshot, ticket_reference, note, idempotency_key, created_at
        ) values (
          v_purchase_id, v_membership_id, demo.org_id, v_location_id, v_actor_id,
          'purchase', v_points, v_amount, v_balance, v_balance + v_points,
          '{"earning_mode":"points_per_currency_unit","earning_value":1,"rounding_mode":"floor"}'::jsonb,
          upper(demo.short_prefix) || '-' || lpad(i::text, 4, '0') || '-' || lpad(j::text, 2, '0'),
          case when j % 4 = 0 then 'Compra recurrente' else 'Compra en establecimiento' end,
          'demo-' || demo.plan_slug || '-purchase-' || i || '-' || j,
          v_occurred_at
        ) on conflict (idempotency_key) do update set
          points_delta = excluded.points_delta,
          amount_cents = excluded.amount_cents,
          previous_balance = excluded.previous_balance,
          resulting_balance = excluded.resulting_balance,
          performed_by_user_id = excluded.performed_by_user_id,
          created_at = excluded.created_at;

        v_balance := v_balance + v_points;
        v_last_activity := greatest(v_last_activity, v_occurred_at);

        -- Earned rewards populate the benefits and conversion statistics.
        if j % 3 = 0 then
          v_reward_id := reward_ids[((j / 3 - 1) % 3) + 1];
          v_customer_reward_id := md5('earned-' || demo.plan_slug || '-' || i || '-' || j)::uuid;
          insert into public.customer_rewards (
            id, organization_id, membership_id, reward_id, campaign_id,
            source_transaction_id, status, awarded_at, expires_at,
            redeemed_at, created_at, updated_at
          ) values (
            v_customer_reward_id, demo.org_id, v_membership_id, v_reward_id,
            v_campaign_id, v_purchase_id,
            case when j % 6 = 0 then 'redeemed' else 'available' end,
            v_occurred_at, v_occurred_at + interval '180 days',
            case when j % 6 = 0 then v_occurred_at + interval '10 minutes' else null end,
            v_occurred_at, v_occurred_at
          ) on conflict (id) do update set
            status = excluded.status,
            awarded_at = excluded.awarded_at,
            redeemed_at = excluded.redeemed_at;
        end if;

        -- A completed redemption every fourth purchase whenever balance allows it.
        if j % 4 = 0 and v_balance >= 50 then
          if j % 12 = 0 and v_balance >= 250 then
            v_cost := 250;
            v_reward_id := reward_ids[3];
          elsif j % 8 = 0 and v_balance >= 120 then
            v_cost := 120;
            v_reward_id := reward_ids[2];
          else
            v_cost := 50;
            v_reward_id := reward_ids[1];
          end if;

          v_redemption_tx_id := md5('redemption-tx-' || demo.plan_slug || '-' || i || '-' || j)::uuid;
          v_redemption_id := md5('redemption-' || demo.plan_slug || '-' || i || '-' || j)::uuid;

          insert into public.point_transactions (
            id, membership_id, organization_id, location_id, performed_by_user_id,
            type, points_delta, previous_balance, resulting_balance, note,
            idempotency_key, created_at
          ) values (
            v_redemption_tx_id, v_membership_id, demo.org_id, v_location_id, v_actor_id,
            'redemption', -v_cost, v_balance, v_balance - v_cost, 'Recompensa canjeada',
            'demo-' || demo.plan_slug || '-redemption-' || i || '-' || j,
            v_occurred_at + interval '10 minutes'
          ) on conflict (idempotency_key) do update set
            points_delta = excluded.points_delta,
            previous_balance = excluded.previous_balance,
            resulting_balance = excluded.resulting_balance,
            performed_by_user_id = excluded.performed_by_user_id,
            created_at = excluded.created_at;

          insert into public.redemptions (
            id, transaction_id, reward_id, membership_id, organization_id,
            location_id, performed_by_user_id, points_spent, status, created_at
          ) values (
            v_redemption_id, v_redemption_tx_id, v_reward_id, v_membership_id,
            demo.org_id, v_location_id, v_actor_id, v_cost, 'completed',
            v_occurred_at + interval '10 minutes'
          ) on conflict (id) do update set
            points_spent = excluded.points_spent,
            performed_by_user_id = excluded.performed_by_user_id,
            created_at = excluded.created_at;

          v_balance := v_balance - v_cost;
          v_last_activity := greatest(v_last_activity, v_occurred_at + interval '10 minutes');
        end if;
      end loop;

      -- Occasional manual adjustments add variety to the ledger.
      if i % 10 = 0 then
        insert into public.point_transactions (
          id, membership_id, organization_id, location_id, performed_by_user_id,
          type, points_delta, previous_balance, resulting_balance, note, reason,
          idempotency_key, created_at
        ) values (
          md5('adjustment-' || demo.plan_slug || '-' || i)::uuid,
          v_membership_id, demo.org_id, v_location_id, actor_ids[2],
          'manual_adjustment', 10, v_balance, v_balance + 10,
          'Atención al cliente', 'Compensación por incidencia',
          'demo-' || demo.plan_slug || '-adjustment-' || i,
          v_last_activity + interval '20 minutes'
        ) on conflict (idempotency_key) do update set
          previous_balance = excluded.previous_balance,
          resulting_balance = excluded.resulting_balance,
          created_at = excluded.created_at;
        v_balance := v_balance + 10;
        v_last_activity := v_last_activity + interval '20 minutes';
      end if;

      update public.memberships
         set cached_points_balance = v_balance,
             updated_at = v_last_activity
       where id = v_membership_id;
      update public.customers
         set last_activity_at = v_last_activity,
             updated_at = v_last_activity
       where id = v_customer_id;
    end loop;

    -- Additional anonymous scans make the QR acquisition funnel visible.
    for series in 1..(demo.customer_count * 3)
    loop
      v_location_id := location_ids[((series - 1) % array_length(location_ids, 1)) + 1];
      v_source_id := md5(demo.plan_slug || '-qr-' || v_location_id::text)::uuid;
      insert into public.acquisition_events (
        id, organization_id, source_id, location_id, event_type,
        anonymous_session_id, created_at
      ) values (
        md5('scan-' || demo.plan_slug || '-' || series)::uuid,
        demo.org_id, v_source_id, v_location_id,
        case when series % 5 = 0 then 'landing_view' else 'scan' end,
        'demo-scan-' || demo.plan_slug || '-' || series,
        now() - (((series * 29) % 365)::text || ' days')::interval
      ) on conflict (id) do update set created_at = excluded.created_at;
    end loop;

    -- Auditable actions are distributed between administrator, manager and staff.
    for series in 1..demo.audit_count
    loop
      v_actor_id := actor_ids[((series - 1) % 3) + 1];
      insert into public.audit_logs (
        id, actor_user_id, actor_label, organization_id, action,
        entity_type, entity_id, metadata, created_at
      ) values (
        md5('audit-' || demo.plan_slug || '-' || series)::uuid,
        v_actor_id,
        case (series - 1) % 3
          when 0 then 'Administrador Demo'
          when 1 then 'Responsable Demo'
          else 'Empleado Demo'
        end,
        demo.org_id,
        (array['customer.registered','purchase.recorded','points.adjusted','reward.redeemed','report.reviewed'])[((series - 1) % 5) + 1],
        case when series % 5 = 1 then 'customer' when series % 5 = 4 then 'reward' else 'membership' end,
        md5('membership-' || demo.plan_slug || '-' || (((series - 1) % demo.customer_count) + 1))::uuid,
        jsonb_build_object('demo', true, 'plan', demo.plan_slug, 'sequence', series),
        now() - (((series * 17) % 365)::text || ' days')::interval
      ) on conflict (id) do update set
        actor_user_id = excluded.actor_user_id,
        actor_label = excluded.actor_label,
        action = excluded.action,
        created_at = excluded.created_at;
    end loop;
  end loop;
end $$;
