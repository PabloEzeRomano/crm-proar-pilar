-- 0059_clients_unique_cuit_per_company.sql
-- Prevents duplicate clients by DNI/CUIT within the same company.
-- Partial index: only enforces uniqueness when cuit IS NOT NULL
-- (clients without DNI can still coexist).

CREATE UNIQUE INDEX IF NOT EXISTS clients_company_cuit_unique
ON public.clients (company_id, cuit)
WHERE cuit IS NOT NULL;
