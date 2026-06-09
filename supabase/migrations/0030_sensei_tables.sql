-- =============================================================================
-- 0030_sensei_tables.sql
-- Creates all Sensei (campaign-management) tables:
--   branches, campaigns, campaign_offers, client_assignments,
--   rejection_reasons, interactions.
--
-- RLS pattern: company-scoped via public.my_company_id().
-- Admin (admin/root) can CRUD everything within their company.
-- Regular users can SELECT company data and manage their own assignments/interactions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Branches (sucursales)
-- -----------------------------------------------------------------------------
CREATE TABLE public.branches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  address    TEXT,
  city       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY branches_select ON public.branches
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY branches_insert ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY branches_update ON public.branches
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY branches_delete ON public.branches
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE TRIGGER set_updated_at_branches
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Campaigns
-- -----------------------------------------------------------------------------
CREATE TABLE public.campaigns (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'completed')),
  start_date  DATE,
  end_date    DATE,
  priority    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY campaigns_insert ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY campaigns_update ON public.campaigns
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY campaigns_delete ON public.campaigns
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Campaign offers (product/promotion being pushed per campaign)
-- -----------------------------------------------------------------------------
CREATE TABLE public.campaign_offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  payment_methods TEXT[],
  financing       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaign_offers ENABLE ROW LEVEL SECURITY;

-- All company users can see offers (needed to fill interaction forms)
CREATE POLICY campaign_offers_select ON public.campaign_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_offers.campaign_id
        AND c.company_id = public.my_company_id()
    )
  );

CREATE POLICY campaign_offers_insert ON public.campaign_offers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_offers.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY campaign_offers_update ON public.campaign_offers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_offers.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY campaign_offers_delete ON public.campaign_offers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_offers.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND public.is_admin()
  );

CREATE TRIGGER set_updated_at_campaign_offers
  BEFORE UPDATE ON public.campaign_offers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Client assignments (base de clientes → vendedor per campaign)
-- -----------------------------------------------------------------------------
CREATE TABLE public.client_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID        NOT NULL REFERENCES auth.users(id),
  assigned_by UUID        NOT NULL REFERENCES auth.users(id),
  branch_id   UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, client_id, assigned_to)
);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

-- Admin sees all assignments in company; user sees own
CREATE POLICY client_assignments_select ON public.client_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = client_assignments.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND (assigned_to = auth.uid() OR public.is_admin())
  );

-- Only admin can assign
CREATE POLICY client_assignments_insert ON public.client_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = client_assignments.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY client_assignments_update ON public.client_assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = client_assignments.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND (assigned_to = auth.uid() OR public.is_admin())
  );

CREATE POLICY client_assignments_delete ON public.client_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = client_assignments.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND public.is_admin()
  );

CREATE TRIGGER set_updated_at_client_assignments
  BEFORE UPDATE ON public.client_assignments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Rejection reasons (company-specific lookup)
-- -----------------------------------------------------------------------------
CREATE TABLE public.rejection_reasons (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  value      TEXT        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY rejection_reasons_select ON public.rejection_reasons
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

CREATE POLICY rejection_reasons_insert ON public.rejection_reasons
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY rejection_reasons_update ON public.rejection_reasons
  FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

CREATE POLICY rejection_reasons_delete ON public.rejection_reasons
  FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() AND public.is_admin());

-- -----------------------------------------------------------------------------
-- Interactions (gestiones — core contact records)
-- -----------------------------------------------------------------------------
CREATE TABLE public.interactions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID          REFERENCES public.client_assignments(id) ON DELETE SET NULL,
  user_id             UUID          NOT NULL REFERENCES auth.users(id),
  campaign_id         UUID          NOT NULL REFERENCES public.campaigns(id),
  client_id           UUID          NOT NULL REFERENCES public.clients(id),

  -- Structured outcome
  contact_result      TEXT          NOT NULL
                                    CHECK (contact_result IN ('contacted', 'not_contacted', 'no_answer', 'wrong_number')),
  interest_result     TEXT          CHECK (interest_result IN ('interested', 'not_interested', 'not_qualified', 'follow_up', 'sale')),
  rejection_reason_id UUID          REFERENCES public.rejection_reasons(id) ON DELETE SET NULL,

  -- Sale details (populated when interest_result = 'sale')
  offer_id            UUID          REFERENCES public.campaign_offers(id) ON DELETE SET NULL,
  payment_method      TEXT,
  financing           TEXT,
  invoice_number      TEXT,
  amount              NUMERIC(12,2),

  -- Contact details
  channel             TEXT          NOT NULL
                                    CHECK (channel IN ('phone', 'whatsapp', 'in_person', 'email')),
  notes               TEXT,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Admin sees all company interactions; user sees own
CREATE POLICY interactions_select ON public.interactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = interactions.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND (user_id = auth.uid() OR public.is_admin())
  );

-- Users create their own interactions
CREATE POLICY interactions_insert ON public.interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = interactions.campaign_id
        AND c.company_id = public.my_company_id()
    )
  );

-- Users update their own; admin can update any
CREATE POLICY interactions_update ON public.interactions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = interactions.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND (user_id = auth.uid() OR public.is_admin())
  );

-- Only admin can delete
CREATE POLICY interactions_delete ON public.interactions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = interactions.campaign_id
        AND c.company_id = public.my_company_id()
    )
    AND public.is_admin()
  );

CREATE TRIGGER set_updated_at_interactions
  BEFORE UPDATE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Indexes for common queries
-- -----------------------------------------------------------------------------
CREATE INDEX idx_branches_company ON public.branches(company_id);
CREATE INDEX idx_campaigns_company ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_offers_campaign ON public.campaign_offers(campaign_id);
CREATE INDEX idx_client_assignments_campaign ON public.client_assignments(campaign_id);
CREATE INDEX idx_client_assignments_assigned_to ON public.client_assignments(assigned_to);
CREATE INDEX idx_client_assignments_client ON public.client_assignments(client_id);
CREATE INDEX idx_client_assignments_status ON public.client_assignments(status);
CREATE INDEX idx_rejection_reasons_company ON public.rejection_reasons(company_id);
CREATE INDEX idx_interactions_campaign ON public.interactions(campaign_id);
CREATE INDEX idx_interactions_user ON public.interactions(user_id);
CREATE INDEX idx_interactions_client ON public.interactions(client_id);
CREATE INDEX idx_interactions_assignment ON public.interactions(assignment_id);
CREATE INDEX idx_interactions_contact_result ON public.interactions(contact_result);
