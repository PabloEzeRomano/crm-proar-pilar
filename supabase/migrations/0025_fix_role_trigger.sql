-- =============================================================================
-- 0025_fix_role_trigger.sql
-- Fix fn_prevent_self_role_elevation to allow dashboard/service_role/postgres
-- updates while still blocking authenticated users from elevating their own role.
--
-- Root cause: the old guard used `current_setting('role') != 'service_role'`
-- which fires in the Supabase SQL Editor where `current_setting('role')` returns
-- 'postgres', not 'service_role'. This silently reset the role on every dashboard
-- UPDATE.
--
-- Fix: only block the change when an authenticated user (auth.uid() IS NOT NULL)
-- is updating their own row (auth.uid() = NEW.id). Dashboard and service_role
-- operations run as postgres where auth.uid() is NULL.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_prevent_self_role_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block self-elevation: authenticated user updating their own row
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id AND NEW.role != OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
