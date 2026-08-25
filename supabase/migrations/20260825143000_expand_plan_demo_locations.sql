-- Give every paid-plan demo a realistic location matrix.
-- The migration is idempotent so it can also be used to refresh the demos.

insert into public.locations (
  id,
  organization_id,
  name,
  slug,
  address_line,
  city,
  postal_code,
  contact_email,
  contact_phone,
  opening_hours,
  status,
  archived_at
) values
  -- Basic: 1 location.
  ('d2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'Demo Básico · Centro', 'centro', 'Calle de Preciados 18', 'Madrid', '28013', 'centro@demo-basico.fideleo.app', '+34 910 100 001', 'L-S 09:00-21:00', 'active', null),

  -- Pro: 3 locations.
  ('d2000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000003', 'Demo Pro · Chamberí', 'chamberi', 'Calle de Ponzano 42', 'Madrid', '28003', 'chamberi@demo-pro.fideleo.app', '+34 910 200 001', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000003', 'Demo Pro · Retiro', 'retiro', 'Avenida de Menéndez Pelayo 37', 'Madrid', '28009', 'retiro@demo-pro.fideleo.app', '+34 910 200 002', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000003', 'Demo Pro · Salamanca', 'salamanca', 'Calle de Goya 64', 'Madrid', '28001', 'salamanca@demo-pro.fideleo.app', '+34 910 200 003', 'L-D 08:00-22:00', 'active', null),

  -- Ultra: 10 locations.
  ('d2000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Madrid Centro', 'madrid-centro', 'Gran Vía 32', 'Madrid', '28013', 'madrid@demo-ultra.fideleo.app', '+34 910 300 001', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Barcelona Eixample', 'barcelona-eixample', 'Carrer de Mallorca 214', 'Barcelona', '08008', 'barcelona@demo-ultra.fideleo.app', '+34 930 300 002', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Valencia Ruzafa', 'valencia-ruzafa', 'Carrer de Cadis 48', 'Valencia', '46006', 'valencia@demo-ultra.fideleo.app', '+34 960 300 003', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000009', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Sevilla Triana', 'sevilla-triana', 'Calle San Jacinto 55', 'Sevilla', '41010', 'sevilla@demo-ultra.fideleo.app', '+34 950 300 004', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Málaga Centro', 'malaga-centro', 'Calle Granada 21', 'Málaga', '29015', 'malaga@demo-ultra.fideleo.app', '+34 950 300 005', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000011', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Bilbao Abando', 'bilbao-abando', 'Rodríguez Arias Kalea 28', 'Bilbao', '48011', 'bilbao@demo-ultra.fideleo.app', '+34 940 300 006', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000012', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Zaragoza Centro', 'zaragoza-centro', 'Paseo de la Independencia 19', 'Zaragoza', '50001', 'zaragoza@demo-ultra.fideleo.app', '+34 970 300 007', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000013', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Alicante Ensanche', 'alicante-ensanche', 'Avenida Maisonnave 30', 'Alicante', '03003', 'alicante@demo-ultra.fideleo.app', '+34 960 300 008', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000014', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Murcia Catedral', 'murcia-catedral', 'Calle Trapería 15', 'Murcia', '30001', 'murcia@demo-ultra.fideleo.app', '+34 960 300 009', 'L-D 08:00-22:00', 'active', null),
  ('d2000000-0000-4000-8000-000000000015', 'd1000000-0000-4000-8000-000000000004', 'Demo Ultra · Palma Santa Catalina', 'palma-santa-catalina', 'Carrer de Sant Magí 54', 'Palma', '07013', 'palma@demo-ultra.fideleo.app', '+34 970 300 010', 'L-D 08:00-22:00', 'active', null)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  slug = excluded.slug,
  address_line = excluded.address_line,
  city = excluded.city,
  postal_code = excluded.postal_code,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  opening_hours = excluded.opening_hours,
  status = excluded.status,
  archived_at = null,
  updated_at = now();

-- Keep the paid demo organizations at the exact requested active counts.
update public.locations
set status = 'archived', archived_at = now(), updated_at = now()
where organization_id in (
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003',
  'd1000000-0000-4000-8000-000000000004'
)
and id not in (
  'd2000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000003',
  'd2000000-0000-4000-8000-000000000004',
  'd2000000-0000-4000-8000-000000000005',
  'd2000000-0000-4000-8000-000000000006',
  'd2000000-0000-4000-8000-000000000007',
  'd2000000-0000-4000-8000-000000000008',
  'd2000000-0000-4000-8000-000000000009',
  'd2000000-0000-4000-8000-000000000010',
  'd2000000-0000-4000-8000-000000000011',
  'd2000000-0000-4000-8000-000000000012',
  'd2000000-0000-4000-8000-000000000013',
  'd2000000-0000-4000-8000-000000000014',
  'd2000000-0000-4000-8000-000000000015'
);

-- Managers and staff can see every active location in their plan demo.
delete from public.user_location_assignments assignment
using public.organization_users organization_user, public.locations location
where assignment.organization_user_id = organization_user.id
  and assignment.location_id = location.id
  and organization_user.id in (
    'd3000000-0000-4000-8000-000000000005',
    'd3000000-0000-4000-8000-000000000006',
    'd3000000-0000-4000-8000-000000000008',
    'd3000000-0000-4000-8000-000000000009',
    'd3000000-0000-4000-8000-000000000011',
    'd3000000-0000-4000-8000-000000000012'
  )
  and location.status <> 'active';

insert into public.user_location_assignments (organization_user_id, location_id)
select organization_user.id, location.id
from public.organization_users organization_user
join public.locations location
  on location.organization_id = organization_user.organization_id
 and location.status = 'active'
where organization_user.id in (
  'd3000000-0000-4000-8000-000000000005',
  'd3000000-0000-4000-8000-000000000006',
  'd3000000-0000-4000-8000-000000000008',
  'd3000000-0000-4000-8000-000000000009',
  'd3000000-0000-4000-8000-000000000011',
  'd3000000-0000-4000-8000-000000000012'
)
on conflict (organization_user_id, location_id) do nothing;

-- Attach the locations to any demo programs and campaigns that already exist.
insert into public.program_locations (program_id, location_id, can_earn, can_redeem)
select program.id, location.id, true, true
from public.loyalty_programs program
join public.locations location
  on location.organization_id = program.organization_id
 and location.status = 'active'
where program.organization_id in (
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003',
  'd1000000-0000-4000-8000-000000000004'
)
on conflict (program_id, location_id) do update set
  can_earn = true,
  can_redeem = true;

insert into public.campaign_locations (campaign_id, location_id)
select campaign.id, location.id
from public.campaigns campaign
join public.locations location
  on location.organization_id = campaign.organization_id
 and location.status = 'active'
where campaign.organization_id in (
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003',
  'd1000000-0000-4000-8000-000000000004'
)
on conflict (campaign_id, location_id) do nothing;
