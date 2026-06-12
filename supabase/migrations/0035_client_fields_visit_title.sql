-- Migration 0035: Add new client fields (cuit, site, zone, commercial_classification)
-- and visit title field (#2b, #3, #4)

-- ── Clients: new fields ──────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS zone TEXT,
  ADD COLUMN IF NOT EXISTS commercial_classification TEXT;

COMMENT ON COLUMN public.clients.cuit IS 'CUIT fiscal identifier';
COMMENT ON COLUMN public.clients.site IS 'Planta / Sitio — physical location or branch';
COMMENT ON COLUMN public.clients.zone IS 'Ronda / Zona — sales route or geographic zone';
COMMENT ON COLUMN public.clients.commercial_classification IS 'Clasificación Comercial — client tier or category';

-- ── Visits: title field ──────────────────────────────────────────────────────

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.visits.title IS 'Short title or reference for the gestión';
