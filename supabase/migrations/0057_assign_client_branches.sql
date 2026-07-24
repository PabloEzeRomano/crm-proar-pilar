-- 0057_assign_client_branches.sql
-- Assigns branch_id to clients by matching city (uppercase, no accents) to branches.name
-- Uses unaccent + lower for accent/case-insensitive matching.
-- Idempotent: only touches rows where branch_id IS NULL.

CREATE EXTENSION IF NOT EXISTS unaccent;

UPDATE public.clients c
SET branch_id = b.id
FROM public.branches b
WHERE c.branch_id IS NULL
  AND lower(unaccent(c.city)) = lower(unaccent(b.name));
