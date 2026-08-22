alter table public.customers
  add column if not exists gender text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country text;

alter table public.organizations
  add column if not exists tax_id text,
  add column if not exists registry_details text;

alter table public.organization_branding
  add column if not exists legal_notice text,
  add column if not exists privacy_policy text,
  add column if not exists cookie_policy text;

create or replace function public.register_verified_customer_and_membership(
  _program_id uuid,
  _email text,
  _first_name text,
  _last_name text default null,
  _birth_date date default null,
  _location_id uuid default null,
  _source_id uuid default null,
  _marketing boolean default false,
  _phone text default null,
  _terms_accepted boolean default false,
  _gender text default null,
  _address_line text default null,
  _city text default null,
  _postal_code text default null,
  _country text default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  _org uuid;
  _cust uuid;
  _m public.memberships;
  _existing boolean := false;
  _prog public.loyalty_programs;
  _token text;
  _short text;
  _normalized_phone text;
  _verified_email text;
begin
  _verified_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if auth.uid() is null or _verified_email = '' or _verified_email <> lower(trim(coalesce(_email, ''))) then
    raise exception 'EMAIL_VERIFICATION_REQUIRED';
  end if;
  if not _terms_accepted then raise exception 'TERMS_REQUIRED'; end if;
  if trim(coalesce(_first_name, '')) = '' then raise exception 'NAME_REQUIRED'; end if;
  if _gender is not null and _gender not in ('Masculino', 'Femenino', 'Otro', 'Prefiero no decir') then
    raise exception 'INVALID_GENDER';
  end if;

  _normalized_phone := nullif(regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g'), '');
  if _normalized_phone is not null and length(_normalized_phone) < 7 then raise exception 'INVALID_PHONE'; end if;

  select * into _prog from public.loyalty_programs where id = _program_id;
  if _prog is null or _prog.status <> 'active' then raise exception 'PROGRAM_NOT_AVAILABLE'; end if;
  _org := _prog.organization_id;
  if _location_id is not null and not exists (
    select 1 from public.locations where id = _location_id and organization_id = _org and status = 'active'
  ) then raise exception 'LOCATION_NOT_AVAILABLE'; end if;

  select id into _cust from public.customers
   where organization_id = _org and normalized_email = lower(trim(_email));

  if _cust is null then
    insert into public.customers (
      organization_id, normalized_email, email, first_name, last_name, birth_date,
      phone, normalized_phone, gender, address_line, city, postal_code, country
    ) values (
      _org, lower(trim(_email)), trim(_email), trim(_first_name), nullif(trim(_last_name), ''),
      _birth_date, nullif(trim(_phone), ''), _normalized_phone, nullif(trim(_gender), ''),
      nullif(trim(_address_line), ''), nullif(trim(_city), ''), nullif(trim(_postal_code), ''),
      nullif(trim(_country), '')
    ) returning id into _cust;
  else
    update public.customers set
      first_name = trim(_first_name),
      last_name = nullif(trim(_last_name), ''),
      birth_date = coalesce(_birth_date, birth_date),
      phone = coalesce(nullif(trim(_phone), ''), phone),
      normalized_phone = coalesce(_normalized_phone, normalized_phone),
      gender = coalesce(nullif(trim(_gender), ''), gender),
      address_line = coalesce(nullif(trim(_address_line), ''), address_line),
      city = coalesce(nullif(trim(_city), ''), city),
      postal_code = coalesce(nullif(trim(_postal_code), ''), postal_code),
      country = coalesce(nullif(trim(_country), ''), country),
      updated_at = now()
    where id = _cust;
  end if;

  select * into _m from public.memberships where customer_id = _cust and program_id = _program_id;
  if _m.id is not null then
    _existing := true;
  else
    insert into public.memberships (
      customer_id, organization_id, program_id, cached_points_balance,
      acquisition_location_id, acquisition_source_id
    ) values (
      _cust, _org, _program_id, greatest(_prog.initial_points, 0), _location_id, _source_id
    ) returning * into _m;

    if _prog.initial_points > 0 then
      insert into public.point_transactions (
        membership_id, organization_id, location_id, type, points_delta,
        previous_balance, resulting_balance, note
      ) values (
        _m.id, _org, _location_id, 'initial_bonus', _prog.initial_points,
        0, _prog.initial_points, 'Saldo inicial del programa'
      );
    end if;

    _token := encode(extensions.gen_random_bytes(24), 'hex');
    _short := upper(substr(replace(encode(extensions.gen_random_bytes(8), 'hex'), '0', 'X'), 1, 8));
    insert into public.membership_tokens (membership_id, token_hash, short_code)
    values (_m.id, public.hash_token(_token), _short);
    insert into public.wallet_passes (membership_id, provider, status, serial_number)
    values
      (_m.id, 'apple', 'pending_generation', _m.public_id::text),
      (_m.id, 'google', 'pending_generation', _m.public_id::text);
    insert into public.customer_consents (customer_id, organization_id, consent_type, granted, source)
    values
      (_cust, _org, 'terms_privacy', true, 'landing_email_verified'),
      (_cust, _org, 'marketing', coalesce(_marketing, false), 'landing_email_verified');
    insert into public.acquisition_events (organization_id, source_id, location_id, event_type, customer_id)
    values (_org, _source_id, _location_id, 'registration_completed', _cust);
  end if;

  return jsonb_build_object(
    'existing', _existing,
    'membership_public_id', _m.public_id,
    'token', _token,
    'customer_id', _cust
  );
end;
$$;

revoke all on function public.register_verified_customer_and_membership(
  uuid, text, text, text, date, uuid, uuid, boolean, text, boolean, text, text, text, text, text
) from public, anon;
grant execute on function public.register_verified_customer_and_membership(
  uuid, text, text, text, date, uuid, uuid, boolean, text, boolean, text, text, text, text, text
) to authenticated;

revoke execute on function public.register_customer_and_membership(
  uuid, text, text, text, date, uuid, uuid, boolean, text, boolean
) from anon, authenticated;
