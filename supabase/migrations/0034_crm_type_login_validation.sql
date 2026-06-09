-- =============================================================================
-- 0034_crm_type_login_validation.sql
-- 1. Allow all authenticated users to read their own company_config
--    (needed for CRM type validation on login via EXPO_PUBLIC_CRM_TYPE).
-- 2. Make profiles.company_id NOT NULL (every user must belong to a company).
-- =============================================================================

-- #############################################################################
-- COMPANY_CONFIG — allow all authenticated users to read own company config
-- Existing policy only allows admin SELECT.
-- #############################################################################

CREATE POLICY company_config_user_select_policy ON public.company_config
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

-- Drop the admin-only policy (now redundant — new policy covers all users)
DROP POLICY IF EXISTS company_config_admin_select_policy ON public.company_config;

-- #############################################################################
-- PROFILES — make company_id NOT NULL (every user must belong to a company)
-- #############################################################################

-- Backfill any NULL company_id profiles with the first company
UPDATE public.profiles
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN company_id SET NOT NULL;

-- =============================================================================
-- Summary:
-- - company_config readable by all users in their company (for login validation)
-- - profiles.company_id is now NOT NULL
-- - Root users must belong to a company (use separate accounts per company)
-- =============================================================================
