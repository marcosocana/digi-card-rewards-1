-- A loyalty program now belongs operationally to one establishment. Existing
-- programs shared by several locations are split while preserving memberships
-- and balances for every customer.
do $$
declare
  shared_program record;
  scoped_location record;
  reward record;
  first_location uuid;
  cloned_program_id uuid;
  cloned_reward_id uuid;
begin
  for shared_program in
    select program.*, count(program_location.location_id) as location_count
    from public.loyalty_programs program
    join public.program_locations program_location on program_location.program_id = program.id
    group by program.id
    having count(program_location.location_id) > 1
  loop
    select location_id into first_location
    from public.program_locations
    where program_id = shared_program.id
    order by location_id
    limit 1;

    for scoped_location in
      select location_id, can_earn, can_redeem
      from public.program_locations
      where program_id = shared_program.id and location_id <> first_location
      order by location_id
    loop
      insert into public.loyalty_programs (
        organization_id, internal_name, public_name, description, currency,
        earning_mode, earning_value, rounding_mode, initial_points,
        points_expiry_months, allow_earning, allow_redeeming, status, starts_at,
        ends_at, terms, mechanic_type, mechanic_config,
        minimum_purchase_cents, maximum_progress_per_purchase
      ) values (
        shared_program.organization_id,
        shared_program.internal_name || ' · ' || (
          select name from public.locations where id = scoped_location.location_id
        ),
        shared_program.public_name, shared_program.description, shared_program.currency,
        shared_program.earning_mode, shared_program.earning_value,
        shared_program.rounding_mode, shared_program.initial_points,
        shared_program.points_expiry_months, shared_program.allow_earning,
        shared_program.allow_redeeming, shared_program.status, shared_program.starts_at,
        shared_program.ends_at, shared_program.terms, shared_program.mechanic_type,
        shared_program.mechanic_config, shared_program.minimum_purchase_cents,
        shared_program.maximum_progress_per_purchase
      ) returning id into cloned_program_id;

      insert into public.program_locations (program_id, location_id, can_earn, can_redeem)
      values (
        cloned_program_id, scoped_location.location_id,
        scoped_location.can_earn, scoped_location.can_redeem
      );

      for reward in
        select * from public.rewards where program_id = shared_program.id
      loop
        if not exists(select 1 from public.reward_locations where reward_id = reward.id)
          or exists(
            select 1 from public.reward_locations
            where reward_id = reward.id and location_id = scoped_location.location_id
          )
        then
          insert into public.rewards (
            program_id, name, description, image_url, points_cost, status,
            starts_at, ends_at, display_order, terms, archived_at
          ) values (
            cloned_program_id, reward.name, reward.description, reward.image_url,
            reward.points_cost, reward.status, reward.starts_at, reward.ends_at,
            reward.display_order, reward.terms, reward.archived_at
          ) returning id into cloned_reward_id;

          insert into public.reward_locations (reward_id, location_id)
          values (cloned_reward_id, scoped_location.location_id);
        end if;
      end loop;

      update public.memberships
      set program_id = cloned_program_id
      where program_id = shared_program.id
        and acquisition_location_id = scoped_location.location_id;

      update public.loyalty_accounts account
      set program_id = cloned_program_id
      from public.memberships membership
      where account.membership_id = membership.id
        and membership.program_id = cloned_program_id;

      delete from public.reward_locations
      where location_id = scoped_location.location_id
        and reward_id in (
          select id from public.rewards where program_id = shared_program.id
        );
      delete from public.program_locations
      where program_id = shared_program.id
        and location_id = scoped_location.location_id;
    end loop;
  end loop;
end;
$$;
