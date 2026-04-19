-- =============================================================================
-- 0027_products.sql
-- Products table, product_presentations, and client_products.
--
-- Products are company-wide (no owner_user_id).
-- All authenticated users can read; only admin/root can write.
-- Presentations are child rows of products with independent pricing (USD).
-- Client habitual products link a client to a product+presentation pair.
--
-- Note: auth.is_admin() is not used here because it requires dashboard perms
-- to create. The admin check is inlined as a subquery against public.profiles.
-- =============================================================================

-- Helper: returns true if the calling user is admin or root.
-- Defined in public schema (writable by CLI migrations) rather than auth.
-- Mirrors auth.is_admin() from migration 0015.
CREATE OR REPLACE FUNCTION public.fn_is_admin()
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

GRANT EXECUTE ON FUNCTION public.fn_is_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
CREATE TABLE public.products (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  code       TEXT,
  type       TEXT        NOT NULL CHECK (type IN ('commodity', 'formulated')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (public.fn_is_admin());

CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (public.fn_is_admin());

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Product presentations (packaging sizes with USD prices)
-- -----------------------------------------------------------------------------
CREATE TABLE public.product_presentations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL,
  unit       TEXT        NOT NULL,
  quantity   NUMERIC(10,3),
  price_usd  NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presentations_select" ON public.product_presentations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "presentations_insert" ON public.product_presentations
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin());

CREATE POLICY "presentations_update" ON public.product_presentations
  FOR UPDATE TO authenticated USING (public.fn_is_admin());

CREATE POLICY "presentations_delete" ON public.product_presentations
  FOR DELETE TO authenticated USING (public.fn_is_admin());

CREATE TRIGGER set_updated_at_product_presentations
  BEFORE UPDATE ON public.product_presentations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Client habitual products
-- -----------------------------------------------------------------------------
CREATE TABLE public.client_products (
  id                      UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_presentation_id UUID NOT NULL REFERENCES public.product_presentations(id) ON DELETE CASCADE,
  UNIQUE (client_id, product_id, product_presentation_id)
);

ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_products_select" ON public.client_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
        AND (c.owner_user_id = auth.uid() OR public.fn_is_admin())
    )
  );

CREATE POLICY "client_products_insert" ON public.client_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
        AND (c.owner_user_id = auth.uid() OR public.fn_is_admin())
    )
  );

CREATE POLICY "client_products_delete" ON public.client_products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
        AND (c.owner_user_id = auth.uid() OR public.fn_is_admin())
    )
  );
