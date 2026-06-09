-- =============================================================================
-- 0031_clients_assignment_rls.sql
-- Additive RLS policy on clients: Sensei vendedores can see clients assigned
-- to them via client_assignments, even if they don't own the client.
-- This does NOT affect existing Proar policies (owner_user_id-based).
-- =============================================================================

CREATE POLICY clients_assignment_select ON public.clients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_assignments ca
      WHERE ca.client_id = clients.id
        AND ca.assigned_to = auth.uid()
    )
  );
