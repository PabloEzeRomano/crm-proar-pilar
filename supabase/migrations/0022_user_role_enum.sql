-- =============================================================================
-- 0022_user_role_enum.sql
-- Replaces the CHECK constraint on profiles.role with a proper PostgreSQL enum.
--
-- Steps:
--  1. Create public.user_role enum type ('user', 'admin', 'root')
--  2. Drop the old check_role_valid CHECK constraint
--  3. Migrate profiles.role from TEXT → user_role using USING cast
--  4. Update handle_new_user trigger to cast metadata value to user_role
--  5. Update fn_prevent_self_role_elevation (public schema — no permission issue)
--
-- NOTE: auth.is_admin() is NOT recreated here. The function was created in
-- migration 0015 using string literals ('admin', 'root'). Postgres automatically
-- casts those literals to public.user_role for comparison after the column type
-- change, so the existing function continues to work without modification.
-- Recreating auth.* functions requires the dashboard SQL Editor (elevated perms)
-- which the CLI migration runner does not have.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create enum type
-- -----------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'root');

-- -----------------------------------------------------------------------------
-- 2. Drop the old CHECK constraint
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_role_valid;

-- -----------------------------------------------------------------------------
-- 3. Migrate profiles.role column TEXT → user_role enum
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.user_role
    USING role::public.user_role,
  ALTER COLUMN role SET DEFAULT 'user'::public.user_role;

-- -----------------------------------------------------------------------------
-- 4. Update handle_new_user trigger function to cast metadata to enum
--    Reads 'role' from raw_user_meta_data; falls back to 'user' if absent/invalid.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Safely cast the metadata role string to the enum; default to 'user'
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'user'::public.user_role;
  END;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Update fn_prevent_self_role_elevation
--    Enum inequality (!=) works identically to TEXT inequality — no logic change.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_self_role_elevation()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') != 'service_role' AND NEW.role != OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Post-migration note for auth.is_admin():
-- If you want to explicitly update the function body to use enum casts, run
-- the following in the Supabase dashboard SQL Editor (requires elevated perms):
--
--   CREATE OR REPLACE FUNCTION auth.is_admin()
--   RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
--     SELECT EXISTS(
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid()
--         AND role IN ('admin'::public.user_role, 'root'::public.user_role)
--     );
--   $$;
-- =============================================================================
