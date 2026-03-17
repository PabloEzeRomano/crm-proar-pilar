-- =============================================================================
-- 0016_admin_rls.sql
-- Adds admin RLS bypass to clients and visits tables.
-- Admins (role = 'admin' or 'root') can now SELECT, UPDATE, DELETE all rows.
-- Requires migration 0015 (auth.is_admin() function) to be applied first.
-- =============================================================================

-- =============================================================================
-- 1. Clients table — drop old policies and recreate with admin bypass
-- =============================================================================

-- Drop existing policies (SELECT, UPDATE, DELETE)
DROP POLICY clients_select_policy ON public.clients;
DROP POLICY clients_update_policy ON public.clients;
DROP POLICY clients_delete_policy ON public.clients;

-- Recreate SELECT policy with admin bypass
CREATE POLICY clients_select_policy
  ON public.clients
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = auth.uid()) OR auth.is_admin());

-- Recreate UPDATE policy with admin bypass
CREATE POLICY clients_update_policy
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = auth.uid()) OR auth.is_admin())
  WITH CHECK ((owner_user_id = auth.uid()) OR auth.is_admin());

-- Recreate DELETE policy with admin bypass
CREATE POLICY clients_delete_policy
  ON public.clients
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = auth.uid()) OR auth.is_admin());

-- NOTE: clients_insert_policy remains unchanged (no admin bypass for INSERT)
-- Users may only insert rows they own

-- =============================================================================
-- 2. Visits table — drop old policies and recreate with admin bypass
-- =============================================================================

-- Drop existing policies (SELECT, UPDATE, DELETE)
DROP POLICY visits_select_policy ON public.visits;
DROP POLICY visits_update_policy ON public.visits;
DROP POLICY visits_delete_policy ON public.visits;

-- Recreate SELECT policy with admin bypass
CREATE POLICY visits_select_policy
  ON public.visits
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = auth.uid()) OR auth.is_admin());

-- Recreate UPDATE policy with admin bypass
CREATE POLICY visits_update_policy
  ON public.visits
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = auth.uid()) OR auth.is_admin())
  WITH CHECK ((owner_user_id = auth.uid()) OR auth.is_admin());

-- Recreate DELETE policy with admin bypass
CREATE POLICY visits_delete_policy
  ON public.visits
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = auth.uid()) OR auth.is_admin());

-- NOTE: visits_insert_policy remains unchanged (no admin bypass for INSERT)
-- Users may only insert rows they own

-- =============================================================================
-- Summary:
-- - Admins can now SELECT, UPDATE, DELETE all clients and visits
-- - Regular users still see and manage only their own data
-- - INSERT policies unchanged: only creators can insert rows (owner_user_id must be current user)
-- - Uses auth.is_admin() SECURITY DEFINER function (safe, non-recursive)
-- =============================================================================
