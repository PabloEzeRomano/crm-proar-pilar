-- Re-introduce 'quote' (Cotizaciones) as a distinct visit type, separate
-- from 'sales_orders' (Ventas y pedidos). Migration 0040 merged them; this
-- splits them back out per product request — Cotizaciones now tracks
-- pre-sale quotes, while sales_orders keeps covering closed ventas/pedidos.
-- No data migration needed: existing sales_orders rows stay as-is, 'quote'
-- is simply now available again for new gestiones.
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_type_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_type_check
    CHECK (type IN (
      'customer_service',
      'quote',
      'sales_orders',
      'new_projects',
      'payments',
      'technical_service',
      'other'
    ));

-- Add freight_usd to product_presentations — a per-unit/kg freight rate,
-- same shape as price_usd. Quote items snapshot this at quote time and add
-- it on top of the margin-adjusted price (freight isn't marked up).
ALTER TABLE public.product_presentations
  ADD COLUMN freight_usd NUMERIC(12,4);
