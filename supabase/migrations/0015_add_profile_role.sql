-- =============================================================================
-- 0015_add_profile_role.sql
-- Adds role-based access control to profiles table.
-- - Adds 'role' column with CHECK constraint (user, admin, root)
-- - Creates auth.is_admin() SECURITY DEFINER function for safe role checks
-- - Implements BEFORE UPDATE trigger to prevent users from self-elevating
-- - Only service-role can bypass the guard
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add role column to profiles table
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Enforce role values: only 'user', 'admin', 'root' are allowed
ALTER TABLE public.profiles ADD CONSTRAINT check_role_valid
  CHECK (role IN ('user', 'admin', 'root'));

-- Set initial role to 'user' for all existing profiles (already done via DEFAULT)
-- but explicitly update any NULL values just to be safe
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Create auth.is_admin() SECURITY DEFINER function
-- Executes with definer privileges (bypass RLS for role checks).
-- SET search_path = public avoids infinite RLS recursion.
-- Returns true if current user's role is 'admin' or 'root'.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'root')
  );
$$;

-- Grant EXECUTE on the function to authenticated users
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;

-- =============================================================================
-- 3. Create BEFORE UPDATE trigger to prevent self-elevation
-- If caller is NOT service-role, reset role to its previous value.
-- Service-role (internal only) can bypass this guard.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_prevent_self_role_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the caller is service-role (internal/admin operations), allow the change
  -- Otherwise, reset the role to its original value to prevent self-elevation
  IF current_setting('role') != 'service_role' AND NEW.role != OLD.role THEN
    -- Caller is trying to change their own role and is not service-role
    -- Reset role to original value
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on profiles table
CREATE TRIGGER trg_prevent_self_role_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_self_role_elevation();

-- =============================================================================
-- Notes:
-- - Existing users get role = 'user' on next deployment
-- - To promote a user to admin/root: use service-role key (backend only)
-- - Users cannot self-elevate their role via the API (RLS + trigger guard)
-- - auth.is_admin() can be called from Edge Functions and backend
-- =============================================================================
