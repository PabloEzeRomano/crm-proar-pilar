-- Migration 0056: Lead Finder — Google Places + AI analysis pipeline
-- Idempotent: uses IF NOT EXISTS / DO $$ pattern

-- ── lead_searches ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'done', 'error')),
  query           TEXT NOT NULL,
  location_text   TEXT NOT NULL,
  radius_meters   INT  NOT NULL DEFAULT 5000,
  min_rating      FLOAT,
  min_reviews     INT,
  total_found     INT  NOT NULL DEFAULT 0,
  processed       INT  NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_searches_select" ON public.lead_searches;
DROP POLICY IF EXISTS "lead_searches_insert" ON public.lead_searches;
DROP POLICY IF EXISTS "lead_searches_update" ON public.lead_searches;
DROP POLICY IF EXISTS "lead_searches_delete" ON public.lead_searches;

CREATE POLICY "lead_searches_select" ON public.lead_searches
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "lead_searches_insert" ON public.lead_searches
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "lead_searches_update" ON public.lead_searches
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "lead_searches_delete" ON public.lead_searches
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ── lead_places ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_places (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id       UUID NOT NULL REFERENCES public.lead_searches(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT,
  rating          FLOAT,
  review_count    INT,
  address         TEXT,
  lat             FLOAT,
  lng             FLOAT,
  phone           TEXT,
  website         TEXT,
  opening_hours   JSONB,
  reviews         JSONB,
  ai_analysis     JSONB,
  prospect_id     UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  imported_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_places_company_place_unique UNIQUE (company_id, google_place_id)
);

ALTER TABLE public.lead_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_places_select" ON public.lead_places;
DROP POLICY IF EXISTS "lead_places_insert" ON public.lead_places;
DROP POLICY IF EXISTS "lead_places_update" ON public.lead_places;
DROP POLICY IF EXISTS "lead_places_delete" ON public.lead_places;

CREATE POLICY "lead_places_select" ON public.lead_places
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "lead_places_insert" ON public.lead_places
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "lead_places_update" ON public.lead_places
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "lead_places_delete" ON public.lead_places
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ── indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lead_searches_company ON public.lead_searches(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_searches_created_by ON public.lead_searches(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_places_search ON public.lead_places(search_id);
CREATE INDEX IF NOT EXISTS idx_lead_places_company ON public.lead_places(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_places_prospect ON public.lead_places(prospect_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_lead_searches_updated_at ON public.lead_searches;
CREATE TRIGGER trg_lead_searches_updated_at
  BEFORE UPDATE ON public.lead_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_places_updated_at ON public.lead_places;
CREATE TRIGGER trg_lead_places_updated_at
  BEFORE UPDATE ON public.lead_places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
