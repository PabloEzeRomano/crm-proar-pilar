-- Optional amount field, only meaningful for quote and sale types
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT NULL;

-- Self-referencing FK: links a sale back to its originating quote
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS quote_id UUID DEFAULT NULL
  REFERENCES public.visits(id) ON DELETE SET NULL;

-- Index for fast reverse lookup (which sales came from a given quote)
CREATE INDEX IF NOT EXISTS visits_quote_id_idx
  ON public.visits(quote_id)
  WHERE quote_id IS NOT NULL;
