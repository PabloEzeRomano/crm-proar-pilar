-- 0054_profiles_admin_update.sql
--
-- Allows admins and root to update profiles within their own company.
-- Previously the only UPDATE policy was (id = auth.uid()), which meant
-- admins couldn't set branch_id on collaborators — causing the auto-assign
-- by branch feature to silently fail (0 rows updated, no error returned).
--
-- The existing trg_prevent_self_role_elevation trigger blocks unauthorized
-- role escalation, so giving admins UPDATE on profiles is safe.

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;

CREATE POLICY profiles_admin_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    AND company_id = public.my_company_id()
  )
  WITH CHECK (
    public.is_admin()
    AND company_id = public.my_company_id()
  );
