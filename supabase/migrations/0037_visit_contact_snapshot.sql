-- Migration 0037: Add contact_snapshot to visits
-- Stores a snapshot of the client contact involved in the gestión.
-- Format: { "name": "...", "phone": "...", "email": "..." }

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS contact_snapshot JSONB;

COMMENT ON COLUMN public.visits.contact_snapshot IS 'Snapshot of the client contact involved in this gestión';
