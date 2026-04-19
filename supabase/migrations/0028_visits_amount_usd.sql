ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS items JSONB DEFAULT NULL;

COMMENT ON COLUMN public.visits.amount IS 'Total amount in USD (auto-calculated from items)';
COMMENT ON COLUMN public.visits.items IS 'QuoteItem[] — line items for quote and sale type visits';
