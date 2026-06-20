-- 0047_clients_update_assigned.sql
--
-- Let a salesperson update clients that are assigned to them (via
-- client_assignments), not just clients they own. Permissive policy — it ORs
-- with the existing owner/admin update policy.
--
-- Note: column-level restrictions (vendedor must not change name/dni/branch)
-- are enforced in the app UI (ClientForm canEditIdentity). RLS only gates the
-- row. A DB-level column guard (trigger) can be added later if needed.

CREATE POLICY clients_update_assigned ON public.clients
  FOR UPDATE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.client_assignments a
      WHERE a.client_id = clients.id
        AND a.assigned_to = auth.uid()
    )
  )
  WITH CHECK (company_id = public.my_company_id());
