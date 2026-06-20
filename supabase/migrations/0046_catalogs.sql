-- 0046_catalogs.sql
--
-- Configurable catalogs for sensei: payment methods and financiers, plus a
-- branch code (sigla). Same company-scoped pattern as rejection_reasons, with
-- a default of public.my_company_id() so inserts don't need to pass company_id.
-- Seeds the canonical lists for every campaign-management (sensei) company.

-- ── Branch code ─────────────────────────────────────────────────────────────
ALTER TABLE public.branches
  ADD COLUMN code TEXT;

-- ── Payment methods catalog ─────────────────────────────────────────────────
CREATE TABLE public.payment_methods (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL DEFAULT public.my_company_id()
               REFERENCES public.companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_methods_select ON public.payment_methods
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY payment_methods_insert ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY payment_methods_update ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY payment_methods_delete ON public.payment_methods
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

-- ── Financiers catalog ──────────────────────────────────────────────────────
CREATE TABLE public.financiers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL DEFAULT public.my_company_id()
               REFERENCES public.companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY financiers_select ON public.financiers
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY financiers_insert ON public.financiers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY financiers_update ON public.financiers
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY financiers_delete ON public.financiers
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

-- ── Seed canonical catalogs for every sensei (campaign-management) company ───
INSERT INTO public.payment_methods (company_id, name)
SELECT cc.company_id, pm.name
FROM public.company_config cc
CROSS JOIN (
  VALUES
    ('Contado'),
    ('Tarjetas Bancarias'),
    ('Tarjeta Naranja'),
    ('Financieras'),
    ('Crédito Personal')
) AS pm(name)
WHERE cc.crm_type = 'campaign-management';

INSERT INTO public.financiers (company_id, name)
SELECT cc.company_id, f.name
FROM public.company_config cc
CROSS JOIN (
  VALUES
    ('Crédito Argentino'),
    ('Santander'),
    ('Directo'),
    ('Credicuotas'),
    ('Creditech'),
    ('Cuota Ya'),
    ('Credicompras'),
    ('Argenpesos'),
    ('Pareto')
) AS f(name)
WHERE cc.crm_type = 'campaign-management';
