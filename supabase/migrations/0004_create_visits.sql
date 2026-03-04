-- =============================================================================
-- 0004_create_visits.sql
-- Creates the visits table.
-- Each visit belongs to one user (owner_user_id) and one client (client_id).
-- Deleting a client cascades and removes all its visits.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  -- Allowed statuses: pending (default), completed, canceled
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'completed', 'canceled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
-- Fast lookup of all visits belonging to a user
CREATE INDEX visits_owner_user_id_idx ON public.visits(owner_user_id);

-- Fast lookup of all visits for a specific client
CREATE INDEX visits_client_id_idx ON public.visits(client_id);

-- Supports agenda/calendar queries: visits for a user ordered by date
CREATE INDEX visits_scheduled_at_idx ON public.visits(owner_user_id, scheduled_at DESC);

-- Supports status filter queries (e.g. show all pending visits for a user)
CREATE INDEX visits_status_idx ON public.visits(owner_user_id, status);

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Users may SELECT only their own visits
CREATE POLICY visits_select_policy
  ON public.visits
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Users may INSERT only rows they own
CREATE POLICY visits_insert_policy
  ON public.visits
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Users may UPDATE only their own visits
CREATE POLICY visits_update_policy
  ON public.visits
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Users may DELETE only their own visits
CREATE POLICY visits_delete_policy
  ON public.visits
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
