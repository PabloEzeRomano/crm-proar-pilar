-- Migration 0036: Expand gestión types
--
-- Old types: sale, visit, call, quote
-- New types: sale, quote (kept), customer_service, sales_orders, new_projects,
--            payments, technical_service, other
--
-- Migrate existing data: visit → customer_service, call → customer_service

-- 1. Drop the old CHECK constraint
ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_type_check;

-- 2. Migrate existing rows
UPDATE public.visits SET type = 'customer_service' WHERE type IN ('visit', 'call');

-- 3. Add new CHECK constraint with expanded types
ALTER TABLE public.visits
  ADD CONSTRAINT visits_type_check
    CHECK (type IN (
      'sale',
      'quote',
      'customer_service',
      'sales_orders',
      'new_projects',
      'payments',
      'technical_service',
      'other'
    ));

-- 4. Update default for new rows
ALTER TABLE public.visits
  ALTER COLUMN type SET DEFAULT 'customer_service';
