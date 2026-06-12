-- Migration 0040: Merge sale + quote into sales_orders
--
-- All product/quote/sale functionality now lives under the 'sales_orders' type.
-- Existing sale/quote rows are migrated to sales_orders.
-- The CHECK constraint is rewritten to exclude sale and quote.

-- 1. Migrate existing data
UPDATE public.visits SET type = 'sales_orders' WHERE type IN ('sale', 'quote');

-- 2. Drop old CHECK and add new one without sale/quote
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_type_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_type_check
    CHECK (type IN (
      'customer_service',
      'sales_orders',
      'new_projects',
      'payments',
      'technical_service',
      'other'
    ));
