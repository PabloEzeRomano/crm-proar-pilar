-- =============================================================================
-- 0001_updated_at_trigger.sql
-- Reusable trigger function: sets updated_at = now() on every UPDATE.
-- Attach this trigger to any table that has an updated_at column.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
