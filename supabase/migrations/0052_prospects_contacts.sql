-- Migration 0052: Align prospects table with client contact structure
-- Replaces email/phone/company_name with contacts JSONB + adds industry/address/zone/cuit
-- Idempotent: column additions are guarded with IF NOT EXISTS via DO blocks

-- ── Add new columns ───────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.prospects ADD COLUMN contacts JSONB NOT NULL DEFAULT '[]'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prospects ADD COLUMN industry TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prospects ADD COLUMN address TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prospects ADD COLUMN zone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prospects ADD COLUMN cuit TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Migrate existing email/phone/company_name into contacts[0] ────────────────

UPDATE public.prospects
SET contacts = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'name',  company_name,
    'phone', phone,
    'email', email
  ))
)
WHERE
  (email IS NOT NULL OR phone IS NOT NULL OR company_name IS NOT NULL)
  AND (contacts = '[]'::jsonb OR contacts IS NULL);

-- ── Drop old columns ──────────────────────────────────────────────────────────

ALTER TABLE public.prospects
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS company_name;
