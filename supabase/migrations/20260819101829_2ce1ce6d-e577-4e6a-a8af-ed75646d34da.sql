create extension if not exists pgcrypto with schema extensions;

create or replace function public.hash_token(_t text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(_t, 'sha256'), 'hex');
$$;
revoke execute on function public.hash_token(text) from public, anon, authenticated;

create or replace function public.compute_points(_amount_cents integer, _mode public.earning_mode, _value numeric, _rounding public.rounding_mode)
returns integer language plpgsql immutable set search_path = public as $$
declare raw numeric;
begin
  if _mode = 'points_per_currency_unit' then raw := (_amount_cents::numeric / 100) * _value;
  else raw := (_amount_cents::numeric / 100) / nullif(_value,0); end if;
  if raw is null then return 0; end if;
  if _rounding = 'nearest' then return round(raw)::int; else return floor(raw)::int; end if;
end; $$;

create or replace function public.register_customer_and_membership(
  _program_id uuid, _email text, _first_name text, _last_name text default null,
  _birth_date date default null, _location_id uuid default null, _source_id uuid default null,
  _marketing boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare _org uuid; _cust uuid; _m public.memberships; _existing boolean := false;
        _prog public.loyalty_programs; _token text; _short text;
begin
  select * into _prog from public.loyalty_programs where id = _program_id;
  if _prog is null or _prog.status <> 'active' then raise exception 'PROGRAM_NOT_AVAILABLE'; end if;
  _org := _prog.organization_id;

  select id into _cust from public.customers where normalized_email = lower(trim(_email));
  if _cust is null then
    insert into public.customers (normalized_email, email, first_name, last_name, birth_date)
    values (lower(trim(_email)), trim(_email), _first_name, _last_name, _birth_date) returning id into _cust;
  end if;

  select * into _m from public.memberships where customer_id = _cust and program_id = _program_id;
  if _m.id is not null then _existing := true;
  else
    insert into public.memberships (customer_id, organization_id, program_id, cached_points_balance, acquisition_location_id, acquisition_source_id)
    values (_cust, _org, _program_id, greatest(_prog.initial_points,0), _location_id, _source_id) returning * into _m;

    if _prog.initial_points > 0 then
      insert into public.point_transactions (membership_id, organization_id, location_id, type, points_delta, previous_balance, resulting_balance, note)
      values (_m.id, _org, _location_id, 'initial_bonus', _prog.initial_points, 0, _prog.initial_points, 'Saldo inicial del programa');
    end if;

    _token := encode(extensions.gen_random_bytes(24), 'hex');
    _short := upper(substr(replace(encode(extensions.gen_random_bytes(8),'hex'),'0','X'), 1, 8));
    insert into public.membership_tokens (membership_id, token_hash, short_code) values (_m.id, public.hash_token(_token), _short);

    insert into public.wallet_passes (membership_id, provider, status, serial_number)
    values (_m.id,'apple','pending_generation', _m.public_id::text), (_m.id,'google','pending_generation', _m.public_id::text);

    insert into public.customer_consents (customer_id, organization_id, consent_type, granted, source)
    values (_cust, _org, 'terms_privacy', true, 'landing'), (_cust, _org, 'marketing', coalesce(_marketing,false), 'landing');

    insert into public.acquisition_events (organization_id, source_id, location_id, event_type, customer_id)
    values (_org, _source_id, _location_id, 'registration_completed', _cust);
  end if;

  return jsonb_build_object('existing', _existing, 'membership_public_id', _m.public_id,
    'token', _token, 'customer_id', _cust);
end; $$;
revoke execute on function public.register_customer_and_membership(uuid,text,text,text,date,uuid,uuid,boolean) from public, anon, authenticated;

create or replace function public.resolve_membership_qr(_token text, _location_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare _mt public.membership_tokens; _m public.memberships; _prog public.loyalty_programs; _c public.customers;
begin
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;
  select * into _mt from public.membership_tokens
    where token_hash = public.hash_token(_token) or short_code = upper(trim(_token));
  if _mt is null then raise exception 'TOKEN_NOT_FOUND'; end if;
  if _mt.status <> 'active' then raise exception 'TOKEN_REVOKED'; end if;
  select * into _m from public.memberships where id = _mt.membership_id;
  if _m.status <> 'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  if _prog.status <> 'active' then raise exception 'PROGRAM_PAUSED'; end if;
  if not exists (select 1 from public.program_locations pl where pl.program_id = _prog.id and pl.location_id = _location_id)
    then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;
  select * into _c from public.customers where id = _m.customer_id;

  return jsonb_build_object(
    'membership_id', _m.id, 'public_id', _m.public_id, 'balance', _m.cached_points_balance,
    'customer_name', trim(coalesce(_c.first_name,'')||' '||coalesce(_c.last_name,'')),
    'customer_email', _c.email, 'short_code', _mt.short_code,
    'program', jsonb_build_object('id',_prog.id,'name',_prog.public_name,'earning_mode',_prog.earning_mode,
      'earning_value',_prog.earning_value,'rounding_mode',_prog.rounding_mode,'allow_earning',_prog.allow_earning,'allow_redeeming',_prog.allow_redeeming),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'points_cost',r.points_cost,
        'available', _m.cached_points_balance >= r.points_cost) order by r.display_order, r.points_cost)
      from public.rewards r where r.program_id = _prog.id and r.status = 'active'
        and (not exists (select 1 from public.reward_locations rl where rl.reward_id = r.id)
             or exists (select 1 from public.reward_locations rl where rl.reward_id = r.id and rl.location_id = _location_id))), '[]'::jsonb),
    'last_transaction', (select jsonb_build_object('type',t.type,'points_delta',t.points_delta,'created_at',t.created_at)
      from public.point_transactions t where t.membership_id = _m.id order by t.created_at desc limit 1)
  );
end; $$;
revoke execute on function public.resolve_membership_qr(text,uuid) from public, anon;

create or replace function public.queue_wallet_update(_membership uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p record;
begin
  for p in select * from public.wallet_passes where membership_id = _membership loop
    update public.wallet_passes set status = case when status = 'revoked' then status else 'update_pending' end,
      last_update_requested_at = now() where id = p.id;
    insert into public.wallet_jobs (wallet_pass_id, job_type, status, error) values (p.id, 'update', 'pending', null);
  end loop;
end; $$;
revoke execute on function public.queue_wallet_update(uuid,text) from public, anon, authenticated;

create or replace function public.record_purchase(
  _membership_id uuid, _location_id uuid, _amount_cents integer,
  _ticket_reference text default null, _note text default null, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _m public.memberships; _prog public.loyalty_programs; _pts integer; _prev integer; _new integer; _t public.point_transactions;
begin
  if _amount_cents is null or _amount_cents <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if _amount_cents > 1000000 then raise exception 'AMOUNT_TOO_LARGE'; end if;
  if _idempotency_key is not null then
    select * into _t from public.point_transactions where idempotency_key = _idempotency_key;
    if _t.id is not null then return jsonb_build_object('duplicate', true, 'transaction_id', _t.id, 'resulting_balance', _t.resulting_balance); end if;
  end if;
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;

  select * into _m from public.memberships where id = _membership_id for update;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if _m.status <> 'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  if _prog.status <> 'active' or not _prog.allow_earning then raise exception 'PROGRAM_PAUSED'; end if;
  if not exists (select 1 from public.program_locations pl where pl.program_id = _prog.id and pl.location_id = _location_id and pl.can_earn)
    then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;

  _pts := public.compute_points(_amount_cents, _prog.earning_mode, _prog.earning_value, _prog.rounding_mode);
  _prev := _m.cached_points_balance; _new := _prev + _pts;

  insert into public.point_transactions (membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, amount_cents, currency, previous_balance, resulting_balance, earning_rule_snapshot, ticket_reference, note, idempotency_key)
  values (_m.id, _m.organization_id, _location_id, auth.uid(), 'purchase', _pts, _amount_cents, _prog.currency, _prev, _new,
    jsonb_build_object('earning_mode',_prog.earning_mode,'earning_value',_prog.earning_value,'rounding_mode',_prog.rounding_mode),
    _ticket_reference, _note, _idempotency_key) returning * into _t;

  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  perform public.queue_wallet_update(_m.id, 'purchase');
  insert into public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _m.organization_id, 'purchase_recorded', 'point_transaction', _t.id,
    jsonb_build_object('amount_cents',_amount_cents,'points',_pts,'previous',_prev,'resulting',_new));

  return jsonb_build_object('duplicate', false, 'transaction_id', _t.id, 'points_awarded', _pts,
    'previous_balance', _prev, 'resulting_balance', _new);
end; $$;
revoke execute on function public.record_purchase(uuid,uuid,integer,text,text,text) from public, anon;

create or replace function public.redeem_reward(
  _membership_id uuid, _reward_id uuid, _location_id uuid, _idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _m public.memberships; _r public.rewards; _prog public.loyalty_programs; _prev integer; _new integer;
        _t public.point_transactions; _red uuid;
begin
  if _idempotency_key is not null then
    select * into _t from public.point_transactions where idempotency_key = _idempotency_key;
    if _t.id is not null then return jsonb_build_object('duplicate', true, 'transaction_id', _t.id, 'resulting_balance', _t.resulting_balance); end if;
  end if;
  if not public.can_access_location(_location_id) then raise exception 'NO_LOCATION_ACCESS'; end if;

  select * into _m from public.memberships where id = _membership_id for update;
  if _m.status <> 'active' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  select * into _r from public.rewards where id = _reward_id;
  if _r is null or _r.status <> 'active' then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  if _r.program_id <> _m.program_id then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  if _prog.status <> 'active' or not _prog.allow_redeeming then raise exception 'PROGRAM_PAUSED'; end if;
  if not exists (select 1 from public.program_locations pl where pl.program_id = _prog.id and pl.location_id = _location_id and pl.can_redeem)
    then raise exception 'LOCATION_NOT_PARTICIPATING'; end if;
  if exists (select 1 from public.reward_locations rl where rl.reward_id = _r.id)
     and not exists (select 1 from public.reward_locations rl where rl.reward_id = _r.id and rl.location_id = _location_id)
    then raise exception 'REWARD_NOT_AVAILABLE'; end if;

  _prev := _m.cached_points_balance;
  if _prev < _r.points_cost then raise exception 'INSUFFICIENT_POINTS'; end if;
  _new := _prev - _r.points_cost;

  insert into public.point_transactions (membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, previous_balance, resulting_balance, note, idempotency_key)
  values (_m.id, _m.organization_id, _location_id, auth.uid(), 'redemption', -_r.points_cost, _prev, _new, _r.name, _idempotency_key)
  returning * into _t;

  insert into public.redemptions (transaction_id, reward_id, membership_id, organization_id, location_id, performed_by_user_id, points_spent)
  values (_t.id, _r.id, _m.id, _m.organization_id, _location_id, auth.uid(), _r.points_cost) returning id into _red;

  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  perform public.queue_wallet_update(_m.id, 'redemption');
  insert into public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _m.organization_id, 'reward_redeemed', 'redemption', _red,
    jsonb_build_object('reward',_r.name,'points',_r.points_cost,'previous',_prev,'resulting',_new));

  return jsonb_build_object('duplicate', false, 'transaction_id', _t.id, 'reward_name', _r.name,
    'points_spent', _r.points_cost, 'previous_balance', _prev, 'resulting_balance', _new);
end; $$;
revoke execute on function public.redeem_reward(uuid,uuid,uuid,text) from public, anon;

create or replace function public.adjust_points(_membership_id uuid, _delta integer, _reason text, _note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _m public.memberships; _prev integer; _new integer; _t public.point_transactions; _allowed boolean;
begin
  if _delta = 0 then raise exception 'INVALID_AMOUNT'; end if;
  if _reason is null or length(trim(_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;
  select * into _m from public.memberships where id = _membership_id for update;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  select public.is_superadmin() or exists (select 1 from public.organization_users ou
    where ou.organization_id = _m.organization_id and ou.user_id = auth.uid() and ou.status='active'
      and (ou.role = 'admin' or ou.can_adjust_points)) into _allowed;
  if not _allowed then raise exception 'NOT_AUTHORIZED'; end if;

  _prev := _m.cached_points_balance; _new := greatest(_prev + _delta, 0);
  insert into public.point_transactions (membership_id, organization_id, performed_by_user_id, type, points_delta,
    previous_balance, resulting_balance, reason, note)
  values (_m.id, _m.organization_id, auth.uid(), 'manual_adjustment', _new - _prev, _prev, _new, _reason, _note) returning * into _t;
  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  perform public.queue_wallet_update(_m.id, 'adjustment');
  insert into public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _m.organization_id, 'points_adjusted', 'point_transaction', _t.id,
    jsonb_build_object('delta',_new-_prev,'reason',_reason,'previous',_prev,'resulting',_new));
  return jsonb_build_object('transaction_id', _t.id, 'previous_balance', _prev, 'resulting_balance', _new);
end; $$;
revoke execute on function public.adjust_points(uuid,integer,text,text) from public, anon;

create or replace function public.reverse_transaction(_transaction_id uuid, _reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _o public.point_transactions; _m public.memberships; _prev integer; _new integer; _t public.point_transactions;
begin
  select * into _o from public.point_transactions where id = _transaction_id;
  if _o is null then raise exception 'TRANSACTION_NOT_FOUND'; end if;
  if _o.reversed_at is not null then raise exception 'ALREADY_REVERSED'; end if;
  if _o.type = 'reversal' then raise exception 'CANNOT_REVERSE_REVERSAL'; end if;
  if not public.is_org_admin(_o.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  select * into _m from public.memberships where id = _o.membership_id for update;
  _prev := _m.cached_points_balance; _new := greatest(_prev - _o.points_delta, 0);
  insert into public.point_transactions (membership_id, organization_id, location_id, performed_by_user_id, type,
    points_delta, previous_balance, resulting_balance, reason, reversal_of_transaction_id)
  values (_m.id, _o.organization_id, _o.location_id, auth.uid(), 'reversal', _new - _prev, _prev, _new, _reason, _o.id) returning * into _t;
  update public.point_transactions set reversed_at = now() where id = _o.id;
  update public.memberships set cached_points_balance = _new, updated_at = now() where id = _m.id;
  perform public.queue_wallet_update(_m.id, 'reversal');
  insert into public.audit_logs (actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _o.organization_id, 'transaction_reversed', 'point_transaction', _t.id, jsonb_build_object('reason',_reason,'original',_o.id));
  return jsonb_build_object('transaction_id', _t.id, 'resulting_balance', _new);
end; $$;
revoke execute on function public.reverse_transaction(uuid,text) from public, anon;

create or replace function public.request_wallet_update(_membership_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _m public.memberships;
begin
  select * into _m from public.memberships where id = _membership_id;
  if _m is null then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  if not public.is_org_member(_m.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  perform public.queue_wallet_update(_m.id, 'manual');
  return jsonb_build_object('ok', true);
end; $$;
revoke execute on function public.request_wallet_update(uuid) from public, anon;

create or replace function public.get_membership_portal(_public_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare _m public.memberships; _c public.customers; _prog public.loyalty_programs; _org public.organizations;
begin
  select * into _m from public.memberships where public_id = _public_id;
  if _m is null then return null; end if;
  select * into _c from public.customers where id = _m.customer_id;
  select * into _prog from public.loyalty_programs where id = _m.program_id;
  select * into _org from public.organizations where id = _m.organization_id;
  return jsonb_build_object(
    'membership', jsonb_build_object('public_id',_m.public_id,'balance',_m.cached_points_balance,'status',_m.status,'joined_at',_m.joined_at),
    'customer', jsonb_build_object('first_name',_c.first_name,'last_name',_c.last_name,'email',_c.email),
    'organization', jsonb_build_object('display_name',_org.display_name,'slug',_org.slug),
    'branding', (select to_jsonb(b) from public.organization_branding b where b.organization_id = _org.id),
    'program', jsonb_build_object('public_name',_prog.public_name,'description',_prog.description,'earning_mode',_prog.earning_mode,'earning_value',_prog.earning_value,'terms',_prog.terms),
    'short_code', (select short_code from public.membership_tokens where membership_id = _m.id and status='active' limit 1),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'description',r.description,'points_cost',r.points_cost,
        'available', _m.cached_points_balance >= r.points_cost) order by r.points_cost)
      from public.rewards r where r.program_id = _prog.id and r.status='active'), '[]'::jsonb),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name',l.name,'address_line',l.address_line,'city',l.city))
      from public.locations l join public.program_locations pl on pl.location_id = l.id
      where pl.program_id = _prog.id and l.status='active'), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'type',t.type,'points_delta',t.points_delta,
        'amount_cents',t.amount_cents,'note',t.note,'created_at',t.created_at) order by t.created_at desc)
      from (select * from public.point_transactions where membership_id = _m.id order by created_at desc limit 30) t), '[]'::jsonb),
    'passes', coalesce((select jsonb_agg(jsonb_build_object('provider',p.provider,'status',p.status,'is_sandbox',p.is_sandbox,'last_updated_at',p.last_updated_at))
      from public.wallet_passes p where p.membership_id = _m.id), '[]'::jsonb)
  );
end; $$;

-- ============ DEMO DATA ============
insert into public.platform_invitations (email, role) values ('super@cafenorte.es','superadmin');

insert into public.organizations (id, legal_name, display_name, slug, contact_email, contact_phone, status)
values ('11111111-1111-4111-8111-111111111111','Grupo Café Norte S.L.','Café Norte','cafe-norte','hola@cafenorte.es','+34 910 000 000','active');

insert into public.organization_branding (organization_id, primary_color, secondary_color, background_color, text_color, font_family, border_style, welcome_message, program_description, website, instagram)
values ('11111111-1111-4111-8111-111111111111','#7A4A2B','#D9A441','#FBF7F0','#1F1A16','inter','medium',
'Bienvenido al Club Café Norte','Acumula 1 punto por cada euro y consigue cafés y desayunos gratis.','https://cafenorte.es','@cafenorte');

insert into public.locations (id, organization_id, name, slug, address_line, city, postal_code, contact_phone, opening_hours, status) values
('22222222-2222-4222-8222-222222222221','11111111-1111-4111-8111-111111111111','Café Norte Malasaña','malasana','Calle Fuencarral 45','Madrid','28004','+34 910 000 001','L-D 08:00-21:00','active'),
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Café Norte Chamberí','chamberi','Calle Ponzano 12','Madrid','28003','+34 910 000 002','L-S 08:00-20:00','active');

insert into public.organization_users (id, organization_id, invited_email, full_name, role, status, can_adjust_points) values
('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111','admin@cafenorte.es','Lucía Prado','admin','active',true),
('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111','malasana@cafenorte.es','Diego Ferrer','manager','active',true),
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','empleado@cafenorte.es','Marta Ruiz','staff','active',false);

insert into public.user_location_assignments (organization_user_id, location_id) values
('33333333-3333-4333-8333-333333333332','22222222-2222-4222-8222-222222222221'),
('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222221');

insert into public.loyalty_programs (id, organization_id, internal_name, public_name, description, earning_mode, earning_value, rounding_mode, status, terms)
values ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','Programa principal','Club Café Norte',
'1 € gastado = 1 punto. Canjea tus puntos por cafés y desayunos.','points_per_currency_unit',1,'floor','active',
'Puntos sin caducidad. No canjeable por dinero.');

insert into public.program_locations (program_id, location_id) values
('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222221'),
('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222');

insert into public.rewards (id, program_id, name, description, points_cost, display_order) values
('55555555-5555-4555-8555-555555555551','44444444-4444-4444-8444-444444444444','Café gratis','Cualquier café de la carta',100,1),
('55555555-5555-4555-8555-555555555552','44444444-4444-4444-8444-444444444444','Desayuno gratis','Café + tostada',250,2),
('55555555-5555-4555-8555-555555555553','44444444-4444-4444-8444-444444444444','10 % de descuento','Descuento en tu próxima compra',400,3);

insert into public.acquisition_sources (organization_id, location_id, name, slug) values
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','Barra','barra'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','Carta','carta'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Escaparate','escaparate');

do $$
declare demo record; _cust uuid; _mid uuid; _pub uuid; i int := 0;
begin
  for demo in select * from (values
    ('ana.gil@example.com','Ana','Gil',0,'active','ANA00001','demo-token-ana'),
    ('bruno.saez@example.com','Bruno','Sáez',76,'active','BRU00002','demo-token-bruno'),
    ('carla.mora@example.com','Carla','Mora',132,'active','CAR00003','demo-token-carla'),
    ('diego.lara@example.com','Diego','Lara',318,'active','DIE00004','demo-token-diego'),
    ('elena.paz@example.com','Elena','Paz',45,'suspended','ELE00005','demo-token-elena')
  ) as t(email,fn,ln,bal,st,code,tok) loop
    i := i + 1;
    insert into public.customers (normalized_email, email, first_name, last_name)
      values (demo.email, demo.email, demo.fn, demo.ln) returning id into _cust;
    insert into public.memberships (customer_id, organization_id, program_id, status, cached_points_balance, acquisition_location_id)
      values (_cust,'11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444', demo.st::public.membership_status, demo.bal,
        '22222222-2222-4222-8222-222222222221') returning id, public_id into _mid, _pub;
    insert into public.membership_tokens (membership_id, token_hash, short_code)
      values (_mid, public.hash_token(demo.tok), demo.code);
    insert into public.wallet_passes (membership_id, provider, status, serial_number, last_generated_at)
      values (_mid,'apple','active',_pub::text, now()), (_mid,'google','active',_pub::text, now());
    insert into public.customer_consents (customer_id, organization_id, consent_type, granted, source)
      values (_cust,'11111111-1111-4111-8111-111111111111','terms_privacy',true,'demo'),
             (_cust,'11111111-1111-4111-8111-111111111111','marketing', i % 2 = 0,'demo');
    if demo.bal > 0 then
      insert into public.point_transactions (membership_id, organization_id, location_id, type, points_delta, amount_cents,
        previous_balance, resulting_balance, earning_rule_snapshot, note)
      values (_mid,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','purchase', demo.bal, demo.bal*100,
        0, demo.bal, '{"earning_mode":"points_per_currency_unit","earning_value":1,"rounding_mode":"floor"}'::jsonb,'Compra registrada');
    end if;
  end loop;

  insert into public.point_transactions (membership_id, organization_id, location_id, type, points_delta, previous_balance, resulting_balance, note)
  select m.id,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','redemption',-100, 418, 318,'Café gratis'
  from public.memberships m join public.customers c on c.id = m.customer_id where c.normalized_email = 'diego.lara@example.com';

  insert into public.redemptions (transaction_id, reward_id, membership_id, organization_id, location_id, points_spent)
  select t.id,'55555555-5555-4555-8555-555555555551', t.membership_id, t.organization_id, t.location_id, 100
  from public.point_transactions t where t.type='redemption' and t.note='Café gratis';

  insert into public.acquisition_events (organization_id, source_id, location_id, event_type)
  select '11111111-1111-4111-8111-111111111111', s.id, s.location_id, 'scan'
  from public.acquisition_sources s, generate_series(1,12);
end $$;