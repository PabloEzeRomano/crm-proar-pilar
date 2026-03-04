-- =============================================================================
-- 0003_create_clients.sql
-- Creates the clients table.
-- Each client belongs to exactly one authenticated user (owner_user_id).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  industry      TEXT,
  address       TEXT,
  city          TEXT,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
-- Fast lookup of all clients belonging to a user
CREATE INDEX clients_owner_user_id_idx ON public.clients(owner_user_id);

-- Composite index supports filtered searches by name within a user's data
CREATE INDEX clients_name_idx ON public.clients(owner_user_id, name);

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Users may SELECT only their own clients
CREATE POLICY clients_select_policy
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Users may INSERT only rows they own
CREATE POLICY clients_insert_policy
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Users may UPDATE only their own clients
CREATE POLICY clients_update_policy
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Users may DELETE only their own clients
CREATE POLICY clients_delete_policy
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
