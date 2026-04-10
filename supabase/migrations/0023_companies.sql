-- =============================================================================
-- 0023_companies.sql
-- Creates the companies and company_config tables.
--
-- companies    — one row per tenant organisation
-- company_config — per-company settings (max_users seat limit)
--
-- NOTE: RLS policies that reference profiles.company_id are deferred to
-- migration 0024, where that column is added. Creating them here would fail
-- because profiles.company_id does not exist yet at this point in the sequence.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. companies table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Policies that filter by profiles.company_id are added in migration 0024
-- after the column exists. No policies here means only service-role can access
-- until 0024 runs (both migrations apply in the same push).

-- -----------------------------------------------------------------------------
-- 2. company_config table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_config (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  max_users  INTEGER     NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_config_company_unique UNIQUE (company_id)
);

CREATE OR REPLACE TRIGGER company_config_updated_at
  BEFORE UPDATE ON public.company_config
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.company_config ENABLE ROW LEVEL SECURITY;

-- Policies added in migration 0024 (same reason as companies above).

-- =============================================================================
-- Notes:
-- - After applying migrations 0022-0024, run the bootstrap SQL from CLAUDE.md:
--     INSERT INTO public.companies (name) VALUES ('Proar Pilar');
--     INSERT INTO public.company_config (company_id, max_users) VALUES ('<uuid>', 5);
--     UPDATE public.profiles SET company_id = '<uuid>';
-- =============================================================================
