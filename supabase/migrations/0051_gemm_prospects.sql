-- Migration 0051: gemm-apps CRM — prospects pipeline + interactions
-- Idempotent: uses IF NOT EXISTS / DO $$ pattern

-- ── Extend crm_type constraint to include 'pipeline' ──────────────────────────
ALTER TABLE public.company_config
  DROP CONSTRAINT IF EXISTS company_config_crm_type_check;

ALTER TABLE public.company_config
  ADD CONSTRAINT company_config_crm_type_check
  CHECK (crm_type IN ('field-sales', 'campaign-management', 'pipeline'));

-- ── Types ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE prospect_stage AS ENUM (
    'lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prospect_product AS ENUM ('crm', 'miturno', 'qrtify');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interaction_type AS ENUM ('note', 'call', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── prospects ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  company_name    TEXT,
  email           TEXT,
  phone           TEXT,
  product         prospect_product NOT NULL,
  stage           prospect_stage NOT NULL DEFAULT 'lead',
  notes           TEXT,
  next_follow_up  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospects_company_select" ON public.prospects;
DROP POLICY IF EXISTS "prospects_company_insert" ON public.prospects;
DROP POLICY IF EXISTS "prospects_company_update" ON public.prospects;
DROP POLICY IF EXISTS "prospects_company_delete" ON public.prospects;

CREATE POLICY "prospects_company_select" ON public.prospects
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "prospects_company_insert" ON public.prospects
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "prospects_company_update" ON public.prospects
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "prospects_company_delete" ON public.prospects
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── prospect_interactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospect_interactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         interaction_type NOT NULL,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pinteractions_select" ON public.prospect_interactions;
DROP POLICY IF EXISTS "pinteractions_insert" ON public.prospect_interactions;
DROP POLICY IF EXISTS "pinteractions_delete" ON public.prospect_interactions;

CREATE POLICY "pinteractions_select" ON public.prospect_interactions
  FOR SELECT USING (
    prospect_id IN (
      SELECT id FROM public.prospects
      WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "pinteractions_insert" ON public.prospect_interactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND prospect_id IN (
      SELECT id FROM public.prospects
      WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "pinteractions_delete" ON public.prospect_interactions
  FOR DELETE USING (user_id = auth.uid());

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospects_updated_at ON public.prospects;
CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_prospects_company_id ON public.prospects(company_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON public.prospects(stage);
CREATE INDEX IF NOT EXISTS idx_prospects_owner ON public.prospects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pinteractions_prospect ON public.prospect_interactions(prospect_id);
