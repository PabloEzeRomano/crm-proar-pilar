-- Migration 0041: Allow admin/root to update other users' profiles (role field)
--
-- The existing profiles UPDATE policy only allows auth.uid() = id (self-update).
-- Admin/root need to update other users' roles. The trigger
-- fn_prevent_self_role_elevation (from 0039) enforces hierarchy rules server-side,
-- so this policy just opens the door for the UPDATE to reach the trigger.

CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'root')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'root')
    )
  );
