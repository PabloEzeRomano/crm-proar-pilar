-- 0042_company_id_defaults.sql
--
-- Fix: INSERTs into company-scoped tables failed RLS with
--   "new row violates row-level security policy"
-- because the client never sent company_id, leaving it NULL, which fails the
-- WITH CHECK (company_id = public.my_company_id()) policy.
--
-- Set a column DEFAULT of public.my_company_id() so the caller's company is
-- filled automatically. RLS still validates the value. Applies to the three
-- tables that carry their own company_id (branches, campaigns,
-- rejection_reasons); child tables (campaign_offers, client_assignments,
-- interactions) derive company scope via their parent campaign.

ALTER TABLE public.branches
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

ALTER TABLE public.campaigns
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();

ALTER TABLE public.rejection_reasons
  ALTER COLUMN company_id SET DEFAULT public.my_company_id();
