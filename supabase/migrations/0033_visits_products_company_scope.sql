-- =============================================================================
-- 0033_visits_products_company_scope.sql
-- Adds company_id to visits, products, product_presentations, client_products.
-- Rewrites RLS to be company-scoped (same pattern as 0032 for clients).
-- =============================================================================

-- #############################################################################
-- VISITS
-- #############################################################################

ALTER TABLE public.visits
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.visits v
SET company_id = p.company_id
FROM public.profiles p
WHERE v.owner_user_id = p.id;

ALTER TABLE public.visits
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

CREATE INDEX visits_company_id_idx ON public.visits(company_id);

-- Rewrite visits RLS
DROP POLICY IF EXISTS visits_select_policy ON public.visits;
DROP POLICY IF EXISTS visits_insert_policy ON public.visits;
DROP POLICY IF EXISTS visits_update_policy ON public.visits;
DROP POLICY IF EXISTS visits_delete_policy ON public.visits;

CREATE POLICY visits_select_policy ON public.visits
  FOR SELECT TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  );

CREATE POLICY visits_insert_policy ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY visits_update_policy ON public.visits
  FOR UPDATE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  )
  WITH CHECK (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  );

CREATE POLICY visits_delete_policy ON public.visits
  FOR DELETE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (owner_user_id = auth.uid() OR public.is_admin())
  );

-- #############################################################################
-- PRODUCTS (no owner_user_id — company-wide, admin writes)
-- #############################################################################

ALTER TABLE public.products
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill: assign all products to the first company (single-tenant so far).
-- If multiple companies exist, adjust manually after migration.
UPDATE public.products
SET company_id = (SELECT id FROM public.companies LIMIT 1);

ALTER TABLE public.products
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

CREATE INDEX products_company_id_idx ON public.products(company_id);

-- Rewrite products RLS
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY products_select ON public.products
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY products_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY products_update ON public.products
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY products_delete ON public.products
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

-- #############################################################################
-- PRODUCT_PRESENTATIONS
-- #############################################################################

ALTER TABLE public.product_presentations
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.product_presentations pp
SET company_id = p.company_id
FROM public.products p
WHERE pp.product_id = p.id;

ALTER TABLE public.product_presentations
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

-- Rewrite product_presentations RLS
DROP POLICY IF EXISTS "presentations_select" ON public.product_presentations;
DROP POLICY IF EXISTS "presentations_insert" ON public.product_presentations;
DROP POLICY IF EXISTS "presentations_update" ON public.product_presentations;
DROP POLICY IF EXISTS "presentations_delete" ON public.product_presentations;

CREATE POLICY presentations_select ON public.product_presentations
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY presentations_insert ON public.product_presentations
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY presentations_update ON public.product_presentations
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY presentations_delete ON public.product_presentations
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

-- #############################################################################
-- CLIENT_PRODUCTS
-- #############################################################################

ALTER TABLE public.client_products
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.client_products cp
SET company_id = c.company_id
FROM public.clients c
WHERE cp.client_id = c.id;

-- For any orphans, use products table
UPDATE public.client_products cp
SET company_id = p.company_id
FROM public.products p
WHERE cp.product_id = p.id
  AND cp.company_id IS NULL;

ALTER TABLE public.client_products
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

-- Rewrite client_products RLS
DROP POLICY IF EXISTS "client_products_select" ON public.client_products;
DROP POLICY IF EXISTS "client_products_insert" ON public.client_products;
DROP POLICY IF EXISTS "client_products_update" ON public.client_products;
DROP POLICY IF EXISTS "client_products_delete" ON public.client_products;

CREATE POLICY client_products_select ON public.client_products
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY client_products_insert ON public.client_products
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY client_products_update ON public.client_products
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY client_products_delete ON public.client_products
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id());

-- =============================================================================
-- Summary:
-- All remaining user-facing tables now have company_id with:
--   - DEFAULT public.my_company_id() (auto-fills on insert)
--   - Company-scoped RLS (no cross-company access, even for root)
--   - Backfill from existing data
-- =============================================================================
