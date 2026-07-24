-- 0058_auto_assign_branch_trigger.sql
-- Trigger: auto-assign branch_id on clients INSERT/UPDATE when city matches a branch name.
-- Matching is accent- and case-insensitive via unaccent+lower.
-- Does NOT overwrite an explicitly set branch_id.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.fn_auto_assign_client_branch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only resolve if branch_id not explicitly provided and city is set
  IF NEW.branch_id IS NULL AND NEW.city IS NOT NULL THEN
    SELECT id INTO NEW.branch_id
    FROM public.branches
    WHERE lower(unaccent(NEW.city)) = lower(unaccent(name))
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_client_branch
  BEFORE INSERT OR UPDATE OF city, branch_id
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_assign_client_branch();
