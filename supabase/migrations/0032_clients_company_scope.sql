-- =============================================================================
-- 0032_clients_company_scope.sql
-- Adds company_id to clients table and rewrites RLS to be company-scoped.
-- Fixes: Sensei users were seeing Proar clients (no company isolation).
-- =============================================================================

-- 1. Add column (nullable first for backfill)
ALTER TABLE public.clients
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Backfill from owner's profile
UPDATE public.clients c
SET company_id = p.company_id
FROM public.profiles p
WHERE c.owner_user_id = p.id;

-- 3. Make NOT NULL with default for future inserts
ALTER TABLE public.clients
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

-- 4. Index for company-scoped queries
CREATE INDEX clients_company_id_idx ON public.clients(company_id);

-- =============================================================================
-- 5. Rewrite all RLS policies (company-scoped)
-- =============================================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS clients_select_policy ON public.clients;
DROP POLICY IF EXISTS clients_insert_policy ON public.clients;
DROP POLICY IF EXISTS clients_update_policy ON public.clients;
DROP POLICY IF EXISTS clients_delete_policy ON public.clients;
DROP POLICY IF EXISTS clients_assignment_select ON public.clients;

-- SELECT: own clients OR admin sees all company clients OR assigned via campaign
CREATE POLICY clients_select_policy ON public.clients
  FOR SELECT TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (
      owner_user_id = auth.uid()
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.client_assignments ca
        WHERE ca.client_id = clients.id
          AND ca.assigned_to = auth.uid()
      )
    )
  );

-- INSERT: must belong to user's company
CREATE POLICY clients_insert_policy ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.my_company_id()
  );

-- UPDATE: own clients or admin, within company
CREATE POLICY clients_update_policy ON public.clients
  FOR UPDATE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  )
  WITH CHECK (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  );

-- DELETE: own clients or admin, within company
CREATE POLICY clients_delete_policy ON public.clients
  FOR DELETE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  );

-- =============================================================================
-- Summary:
-- - clients now scoped by company_id (auto-filled via DEFAULT my_company_id())
-- - SELECT: user sees own + assigned clients within company; admin sees all in company
-- - INSERT: only into own company
-- - UPDATE/DELETE: own clients or admin, within company
-- - No cross-company data leakage
-- =============================================================================
