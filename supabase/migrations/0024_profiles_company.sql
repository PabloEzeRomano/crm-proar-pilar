-- =============================================================================
-- 0024_profiles_company.sql
-- Extends profiles with company_id + adds helper functions + RLS policies.
--
-- 1. Add company_id column to profiles (nullable — root users may have NULL)
-- 2. Update handle_new_user trigger to read company_id from invite metadata
-- 3. public.my_company_id() SECURITY DEFINER helper
-- 4. public.is_root()       SECURITY DEFINER helper
-- 5. public.is_admin()      SECURITY DEFINER helper (replaces auth.is_admin()
--                           which may not exist if 0015 was only partially
--                           applied — CLI cannot write to auth schema)
-- 6. Companies + company_config RLS policies (deferred from 0023)
-- 7. Profiles admin-select policy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add company_id to profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON public.profiles(company_id);

-- -----------------------------------------------------------------------------
-- 2. Update handle_new_user trigger to read role + company_id from metadata
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role       public.user_role;
  v_company_id UUID;
BEGIN
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'user'::public.user_role;
  END;

  BEGIN
    v_company_id := (NEW.raw_user_meta_data ->> 'company_id')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    v_company_id := NULL;
  END;

  INSERT INTO public.profiles (id, full_name, role, company_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    v_role,
    v_company_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. public.my_company_id()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_company_id() TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. public.is_root()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_root()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'root'::public.user_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_root() TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. public.is_admin()
--    Returns true for 'admin' or 'root' roles.
--    Created here in public schema because the CLI migration runner cannot
--    write to the auth schema. All new policies use public.is_admin().
--    The existing auth.is_admin() in migrations 0015/0016 may also exist if
--    those were applied via the dashboard — both can coexist.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'root'::public.user_role)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Companies + company_config RLS policies (deferred from 0023)
-- -----------------------------------------------------------------------------

CREATE POLICY companies_select_policy
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (id = public.my_company_id());

CREATE POLICY company_config_admin_select_policy
  ON public.company_config
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.my_company_id()
    AND public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 7. Profiles admin-select policy
-- -----------------------------------------------------------------------------
CREATE POLICY profiles_admin_select_policy
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.my_company_id()
    AND public.is_admin()
  );

-- =============================================================================
-- Notes:
-- - company_id is nullable so existing profiles and root users are unaffected
-- - After applying: run bootstrap SQL from CLAUDE.md to create company rows
--   and assign company_id to existing profiles
-- - All new policies use public.is_admin() / public.my_company_id() /
--   public.is_root() — no dependency on auth.* schema
-- =============================================================================
