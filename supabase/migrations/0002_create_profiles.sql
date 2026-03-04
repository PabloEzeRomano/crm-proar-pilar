-- =============================================================================
-- 0002_create_profiles.sql
-- Creates the profiles table — one row per auth.users entry.
-- A new row is auto-inserted via the handle_new_user trigger on signup.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary key mirrors auth.users so joins are trivial
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  -- JSON config for outbound email: sender address, recipient list, enabled flag
  email_config JSONB      NOT NULL DEFAULT '{"sender": null, "recipients": [], "enabled": false}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Each authenticated user may only SELECT their own profile row
CREATE POLICY profiles_select_policy
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Each authenticated user may only INSERT their own profile row
CREATE POLICY profiles_insert_policy
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Each authenticated user may only UPDATE their own profile row
CREATE POLICY profiles_update_policy
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create profile on new user signup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
