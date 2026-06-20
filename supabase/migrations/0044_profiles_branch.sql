-- 0044_profiles_branch.sql
--
-- Assign a salesperson ("vendedor") to a branch. Nullable so existing users
-- and non-sensei (proar) users stay valid. Enables branch-scoped visibility
-- and automatic assignment by branch.

ALTER TABLE public.profiles
  ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_branch_id ON public.profiles (branch_id);
