-- Migration 0039: product_manager role hierarchy + RLS policies
--
-- Depends on 0038 (enum value must exist in a prior transaction).
--
-- 1. role_level() helper function
-- 2. Rewrite fn_prevent_self_role_elevation with hierarchy enforcement
-- 3. is_product_manager() helper
-- 4. Products + presentations RLS for product_manager

-- ── 1. Role hierarchy helper ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.role_level(r public.user_role)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE r
    WHEN 'user'            THEN 1
    WHEN 'product_manager' THEN 1
    WHEN 'admin'           THEN 2
    WHEN 'root'            THEN 3
    ELSE 0
  END;
$$;

-- ── 2. Replace self-elevation trigger with hierarchy enforcement ─────────────
-- Rules:
--   a) Nobody can change their own role (self-elevation prevention)
--   b) Admin can only change roles of users below admin level (level < 2)
--   c) Root can change anyone's role (except promoting to root)
--   d) Dashboard/service_role (auth.uid() IS NULL) can do anything

CREATE OR REPLACE FUNCTION fn_prevent_self_role_elevation()
RETURNS TRIGGER AS $$
DECLARE
  caller_role public.user_role;
  caller_level INTEGER;
  target_old_level INTEGER;
  target_new_level INTEGER;
BEGIN
  -- Skip if role not changing
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Dashboard / service_role — allow anything
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Self-change — block
  IF auth.uid() = NEW.id THEN
    NEW.role := OLD.role;
    RETURN NEW;
  END IF;

  -- Get caller info
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  caller_level := public.role_level(caller_role);
  target_old_level := public.role_level(OLD.role);
  target_new_level := public.role_level(NEW.role);

  -- Non-admin users cannot change anyone's role
  IF caller_level < 2 THEN
    NEW.role := OLD.role;
    RETURN NEW;
  END IF;

  -- Admin (level 2): can only change users below admin level,
  -- and cannot promote to admin or above
  IF caller_level = 2 THEN
    IF target_old_level >= 2 OR target_new_level >= 2 THEN
      NEW.role := OLD.role;
      RETURN NEW;
    END IF;
  END IF;

  -- Root (level 3): can change anyone to anything (except making someone root,
  -- which should only be done via SQL Editor)
  IF caller_level = 3 AND target_new_level >= 3 THEN
    NEW.role := OLD.role;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from migration 0015/0025, just replaced the function.

-- ── 3. Products RLS — allow product_manager ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_product_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'product_manager'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_product_manager() TO authenticated;

-- Rewrite products INSERT/UPDATE/DELETE to include product_manager
DROP POLICY IF EXISTS products_insert ON public.products;
DROP POLICY IF EXISTS products_update ON public.products;
DROP POLICY IF EXISTS products_delete ON public.products;

CREATE POLICY products_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.my_company_id()
    AND (public.is_admin() OR public.is_product_manager())
  );

CREATE POLICY products_update ON public.products
  FOR UPDATE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (public.is_admin() OR public.is_product_manager())
  );

CREATE POLICY products_delete ON public.products
  FOR DELETE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (public.is_admin() OR public.is_product_manager())
  );

-- Same for product_presentations
DROP POLICY IF EXISTS presentations_insert ON public.product_presentations;
DROP POLICY IF EXISTS presentations_update ON public.product_presentations;
DROP POLICY IF EXISTS presentations_delete ON public.product_presentations;

CREATE POLICY presentations_insert ON public.product_presentations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.my_company_id()
    AND (public.is_admin() OR public.is_product_manager())
  );

CREATE POLICY presentations_update ON public.product_presentations
  FOR UPDATE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (public.is_admin() OR public.is_product_manager())
  );

CREATE POLICY presentations_delete ON public.product_presentations
  FOR DELETE TO authenticated
  USING (
    company_id = public.my_company_id()
    AND (public.is_admin() OR public.is_product_manager())
  );
