-- =============================================================================
-- 0029_company_crm_type.sql
-- Adds crm_type to company_config to distinguish field-sales (Proar) from
-- campaign-management (Sensei) companies.
-- Default 'field-sales' so existing Proar companies are unaffected.
-- =============================================================================

ALTER TABLE public.company_config
  ADD COLUMN IF NOT EXISTS crm_type TEXT NOT NULL DEFAULT 'field-sales'
  CHECK (crm_type IN ('field-sales', 'campaign-management'));

COMMENT ON COLUMN public.company_config.crm_type
  IS 'field-sales = Proar (visit-based), campaign-management = Sensei (interaction-based)';
