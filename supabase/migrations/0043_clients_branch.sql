-- 0043_clients_branch.sql
--
-- Link clients to a branch ("sucursal" / "apertura en"). Nullable so existing
-- imported clients stay valid until backfilled. Enables filtering the assign
-- screen by branch and, later, automatic assignment by branch.

ALTER TABLE public.clients
  ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX idx_clients_branch_id ON public.clients (branch_id);
