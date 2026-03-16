-- DEV ONLY: Do not run in production.
-- Run manually in the Supabase SQL editor for local testing.
-- Creates a test client and visit for the authenticated user.

-- NOTE: Updated after migration 0010 to use contacts JSONB instead of flat columns

-- ─────────────────────────────────────────────────────────────────────────────
-- Test client
-- auth.uid() resolves to whoever runs this script in the SQL editor
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.clients (owner_user_id, name, industry, address, city, contacts, notes)
VALUES (
  auth.uid(),
  'Test Client S.A.',
  'LACTEOS',
  'Av. Corrientes 1234',
  'Buenos Aires',
  '[{"name":"Juan Pérez","phone":"11-1234-5678","email":"juan@testclient.com"}]'::jsonb,
  'Test client for local development'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Test visit — scheduled for today at 10:00 local time
-- Uses a subquery to look up the client just inserted above
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.visits (owner_user_id, client_id, scheduled_at, status, notes)
SELECT
  auth.uid(),
  id,
  now()::date + interval '10 hours',
  'pending',
  'Visita de prueba generada por el seed.'
FROM public.clients
WHERE owner_user_id = auth.uid()
  AND name = 'Test Client S.A.'
LIMIT 1
ON CONFLICT DO NOTHING;
