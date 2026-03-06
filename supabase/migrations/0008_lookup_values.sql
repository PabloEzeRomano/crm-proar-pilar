-- =============================================================================
-- 0008_lookup_values.sql
--
-- Shared lookup lists for Rubro (industry) and Localidad (city).
-- Readable by all authenticated users — no owner_user_id (global/shared).
-- Seeded from distinct values already present in the clients table.
-- =============================================================================

create table if not exists lookup_values (
  id    uuid primary key default gen_random_uuid(),
  type  text not null,   -- 'rubro' | 'localidad'
  value text not null,
  constraint lookup_values_type_value_unique unique (type, value)
);

-- RLS: all authenticated users can read; no one can write via client API
-- (values are managed via migrations or the Supabase dashboard)
alter table lookup_values enable row level security;

create policy "Authenticated users can read lookup values"
  on lookup_values for select
  using (auth.role() = 'authenticated');

-- Seed from existing client data
insert into lookup_values (type, value)
select distinct 'rubro', trim(industry)
from clients
where industry is not null and trim(industry) <> ''
on conflict (type, value) do nothing;

insert into lookup_values (type, value)
select distinct 'localidad', trim(city)
from clients
where city is not null and trim(city) <> ''
on conflict (type, value) do nothing;
